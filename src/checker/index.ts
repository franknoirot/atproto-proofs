/**
 * The checker.
 *
 * Takes a `dev.provable.proof` record and produces a `dev.provable.verdict`.
 * Nothing about it is privileged: it reads only published records, it runs only
 * the theory the regulator published, and its output is a report of a
 * computation rather than a ruling. Anyone holding the same three CIDs can run
 * the same steps and get the same answer, and publish a contradicting verdict if
 * they do not.
 *
 * That is the whole argument for putting this on atproto rather than behind an
 * agency's API. A verdict here is not "the government says so"; it is "here is a
 * computation, here are its inputs by hash, check it yourself".
 *
 * ## Order of operations
 *
 * The cheap structural checks come first, and they come first for a reason
 * beyond speed: a stale reference or a mismatched theory means the proof is not
 * about what it claims to be about, and running the kernel on it would produce a
 * confident answer to the wrong question.
 */

import { rm } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'
import { createHash } from 'node:crypto'
import { Network, StaleRefError } from '../atp/network.js'
import type { StrongRef, Stored } from '../atp/network.js'
import { screen } from './screen.js'
import { EmitError } from './emit.js'
import {
  checkLeanName,
  diagnoseModule,
  proofModule,
  statementModule,
  type ObligationInputs,
} from './generate.js'
import { leanEnv, runLean, writeModule, SANDBOX_DESCRIPTION, type LeanEnv } from './lean.js'

export const CHECKER_NAME = 'provable-redistrict-checker'
export const CHECKER_VERSION = '0.1.0'

export type Outcome = 'verified' | 'refuted' | 'malformed' | 'stale' | 'timeout' | 'unsupported'

export type ClauseResult = { clause: string; status: 'holds' | 'refuted' | 'undecided' }

export type Verdict = {
  outcome: Outcome
  /** Why, in one line, for a human. */
  detail: string
  /** Which named clause of the requirement went unproved, when localizable. */
  failedClause?: string
  clauses: ClauseResult[]
  /** Reporting figures computed by the theory, not by the checker. */
  summary?: Record<string, number>
  axioms: string[]
  obligationDigest?: string
  durationMs: number
  log: string
}

export type CheckOptions = {
  /** Axioms a proof may depend on. Widening this is a policy choice a verdict records. */
  allowedAxioms?: string[]
  timeoutMs?: number
  /** Keep the generated modules for inspection instead of deleting them. */
  keepWork?: boolean
  workRoot?: string
}

const DEFAULT_AXIOMS = ['propext', 'Classical.choice', 'Quot.sound']

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

function fail(outcome: Outcome, detail: string, durationMs = 0, log = ''): Verdict {
  return { outcome, detail, clauses: [], axioms: [], durationMs, log }
}

/**
 * Check one proof record.
 *
 * `env` is passed in rather than derived per call so that a batch of proofs is
 * demonstrably checked against one environment.
 */
export async function checkProof(
  net: Network,
  env: LeanEnv,
  proofRef: StrongRef,
  opts: CheckOptions = {},
): Promise<Verdict> {
  const started = Date.now()
  const allowedAxioms = opts.allowedAxioms ?? DEFAULT_AXIOMS
  const workRoot = opts.workRoot ?? '.work'

  // 1. The proof itself, pinned. A verdict is about a version, not a URI.
  let proofRec: Stored
  try {
    proofRec = await net.resolve(proofRef)
  } catch (e) {
    if (e instanceof StaleRefError) return fail('stale', e.message)
    throw e
  }
  const proof = proofRec.value as Record<string, unknown>

  // 2. Its three citations. Any one of them having moved means the proof is no
  //    longer a proof about current law, current theory, or the current map.
  let requirement: Stored, artifact: Stored, theory: Stored
  try {
    requirement = await net.resolve(proof.requirement as StrongRef)
    artifact = await net.resolve(proof.artifact as StrongRef)
    theory = await net.resolve(proof.theory as StrongRef)
  } catch (e) {
    if (e instanceof StaleRefError) {
      return fail(
        'stale',
        `${e.message} The proof cites a record that has since been rewritten, so it no ` +
          `longer establishes anything about what is published now.`,
      )
    }
    throw e
  }

  const req = requirement.value as Record<string, unknown>
  const reqTheory = req.theory as StrongRef

  // 3. The proof and the requirement must agree about which theory is in force.
  //    Otherwise the words in the requirement and the meanings in the proof come
  //    from different documents.
  const proofTheory = proof.theory as StrongRef
  if (reqTheory.uri !== proofTheory.uri || reqTheory.cid !== proofTheory.cid) {
    return fail(
      'malformed',
      `the proof cites theory ${proofTheory.cid} but its requirement is stated in ` +
        `${reqTheory.cid}; the two do not mean the same thing by the same words`,
    )
  }

  // 4. The artifact must be of the type the requirement quantifies over.
  const artifactType = req.artifactType as string
  const artifactCollection = /^at:\/\/[^/]+\/([^/]+)\//.exec(artifact.uri)?.[1]
  if (artifactCollection !== artifactType) {
    return fail(
      'malformed',
      `the requirement is about ${artifactType} records, but the artifact is a ` +
        `${artifactCollection ?? 'unknown'} record`,
    )
  }

  // 5. The pinned toolchain must be one this checker can honor. Declining is
  //    the right answer; substituting a nearby version and reporting `verified`
  //    would be a claim about a proof nobody checked.
  const theoryToolchain = (theory.value as Record<string, unknown>).toolchain as string
  if (proof.toolchain !== theoryToolchain) {
    return fail(
      'malformed',
      `the proof was written against ${String(proof.toolchain)} but its theory pins ` +
        `${theoryToolchain}`,
    )
  }
  if (env.toolchain !== theoryToolchain) {
    return fail(
      'unsupported',
      `this checker has ${env.toolchain}; the theory pins ${theoryToolchain}. ` +
        `Declining rather than checking against a different prover.`,
    )
  }

  // 6. Screen the payload. Defense in depth; see screen.ts on why this is not
  //    the thing keeping the system sound.
  const payload = String(proof.payload ?? '')
  const lemmas = proof.lemmas ? String(proof.lemmas) : undefined
  for (const [label, text] of [
    ['payload', payload],
    ['lemmas', lemmas],
  ] as const) {
    if (!text) continue
    const s = screen(text)
    if (!s.ok) {
      return fail('malformed', `${label} rejected before elaboration: ${s.reason} (\`${s.matched}\`)`)
    }
  }

  // 7. Generate the obligation. The statement is derived here, never supplied.
  let inputs: ObligationInputs
  try {
    inputs = {
      artifact: proof.artifact as StrongRef,
      requirement: proof.requirement as StrongRef,
      theory: proofTheory,
      leanProp: checkLeanName(req.leanProp as string, 'requirement.leanProp'),
      artifactRecord: artifact.value,
    }
  } catch (e) {
    return fail('malformed', (e as Error).message)
  }

  let statementSrc: string
  try {
    statementSrc = statementModule(inputs)
  } catch (e) {
    if (e instanceof EmitError) {
      return fail('malformed', `artifact cannot be transliterated: ${e.message}`)
    }
    throw e
  }

  // The scratch directory is keyed by the digest of the statement, so two runs
  // of the same obligation land in the same place and a stale directory from a
  // different obligation can never be picked up by mistake. Absolute, because
  // Lean is invoked with this directory as its working directory and a relative
  // entry on LEAN_PATH would resolve against the wrong root.
  const obligationDigest = sha256(statementSrc)
  const workDir = resolvePath(workRoot, obligationDigest.slice(0, 16))
  const log: string[] = []

  try {
    await writeModule(workDir, 'Obligation.Statement', statementSrc)
    const stmtRun = await runLean(env, workDir, 'Obligation.Statement', {
      olean: true,
      timeoutMs: opts.timeoutMs,
    })
    log.push('== statement ==', stmtRun.stdout, stmtRun.stderr)
    if (!stmtRun.ok) {
      // The checker wrote this module, so a failure here is the checker's bug or
      // an artifact that cannot be represented — never the prover's fault.
      return {
        ...fail(
          'malformed',
          'the generated statement did not elaborate: ' + firstLeanError(stmtRun.stdout + stmtRun.stderr),
          Date.now() - started,
          log.join('\n'),
        ),
        obligationDigest,
      }
    }

    // 8. Diagnose before proving. Clause-level results are worth having whether
    //    the proof succeeds, fails, or times out.
    await writeModule(workDir, 'Obligation.Diagnose', diagnoseModule(inputs))
    const diagRun = await runLean(env, workDir, 'Obligation.Diagnose', {
      timeoutMs: opts.timeoutMs,
    })
    log.push('== diagnose ==', diagRun.stdout, diagRun.stderr)
    const clauses = parseClauses(diagRun.stdout)
    const summary = parseSummary(diagRun.stdout)

    // 9. The proof.
    await writeModule(
      workDir,
      'Obligation.Proof',
      proofModule(inputs, payload, lemmas, allowedAxioms),
    )
    const proofRun = await runLean(env, workDir, 'Obligation.Proof', {
      timeoutMs: opts.timeoutMs,
    })
    log.push('== proof ==', proofRun.stdout, proofRun.stderr)

    const axioms = parseAxioms(proofRun.stdout)
    const durationMs = Date.now() - started
    const base = { clauses, summary, axioms, obligationDigest, durationMs, log: log.join('\n') }

    if (proofRun.timedOut) {
      return {
        ...base,
        outcome: 'timeout',
        detail:
          'the kernel did not finish within the time budget. This is not evidence ' +
          'either way about the map.',
      }
    }

    if (!proofRun.ok) {
      const failedClause = firstFailing(clauses)
      return {
        ...base,
        outcome: 'refuted',
        failedClause,
        detail: refutationDetail(proofRun.stdout + proofRun.stderr, failedClause, clauses),
      }
    }

    return {
      ...base,
      outcome: 'verified',
      detail:
        `the kernel accepted the proof, and it depends on no axioms beyond ` +
        `${allowedAxioms.join(', ')}`,
    }
  } finally {
    if (!opts.keepWork) await rm(workDir, { recursive: true, force: true })
  }
}

/** Which clause to name in the verdict: a refuted one, else an unproved one. */
function firstFailing(clauses: ClauseResult[]): string | undefined {
  return (
    clauses.find((c) => c.status === 'refuted')?.clause ??
    clauses.find((c) => c.status === 'undecided')?.clause
  )
}

/**
 * Turn a build failure into something a legislator could act on.
 *
 * The distinction that matters is between a clause evaluation *disproved* and a
 * clause evaluation could not settle. The first says the map breaks the rule.
 * The second says the map may or may not break the rule and this particular
 * proof did not establish which — a different fact, and reporting it as a
 * violation would be a false accusation.
 */
function refutationDetail(
  output: string,
  failedClause: string | undefined,
  clauses: ClauseResult[],
): string {
  const status = clauses.find((c) => c.clause === failedClause)?.status
  if (status === 'refuted') {
    return `the plan violates the ${failedClause} clause; no proof of this requirement exists`
  }
  if (status === 'undecided') {
    return (
      `the ${failedClause} clause cannot be settled by evaluation and the submitted ` +
      `proof did not establish it`
    )
  }
  if (/unknown identifier|unknown constant/i.test(output)) {
    return 'the proof refers to something that does not exist in the theory'
  }
  return 'the kernel did not accept the proof'
}

/** First Lean diagnostic in a build log, for a one-line explanation. */
function firstLeanError(output: string): string {
  const line = output.split('\n').find((l) => /error:/.test(l))
  return line?.trim() ?? 'no diagnostic produced'
}

function parseClauses(stdout: string): ClauseResult[] {
  const line = stdout.split('\n').find((l) => l.trim().startsWith('CLAUSES '))
  if (!line) return []
  try {
    return JSON.parse(line.trim().slice('CLAUSES '.length)) as ClauseResult[]
  } catch {
    return []
  }
}

function parseSummary(stdout: string): Record<string, number> | undefined {
  const line = stdout.split('\n').find((l) => l.trim().startsWith('SUMMARY '))
  if (!line) return undefined
  try {
    return JSON.parse(line.trim().slice('SUMMARY '.length)) as Record<string, number>
  } catch {
    return undefined
  }
}

/**
 * Read the axiom set out of `#assert_axioms`'s report.
 *
 * Only reached when the build *succeeded*, which means the assertion already
 * passed — if an axiom had been outside the allowance, the build would have
 * failed and there would be no verdict of `verified` to attach this to. So this
 * is for the record, not for the decision.
 */
function parseAxioms(stdout: string): string[] {
  const m = /depends on axioms: \[([^\]]*)\]/.exec(stdout)
  if (!m) return /depends on no axioms/.test(stdout) ? [] : []
  return m[1]!
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export { leanEnv, SANDBOX_DESCRIPTION }
export type { LeanEnv }
