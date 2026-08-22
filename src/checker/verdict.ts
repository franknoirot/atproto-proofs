/**
 * Publishing a verdict, and the label that indexes it.
 *
 * Two records, because a label cannot carry evidence. The atproto label spec
 * constrains `val` to a bare kebab-case token of at most 128 bytes — no fields,
 * no structure. So `proof-refuted` can propagate cheaply to everyone subscribed
 * to a labeler, and the thing that says *which clause failed, with what
 * efficiency gap, under which toolchain, in how long* has to be a record with
 * fields. The label points at the proof; the verdict points at the proof and
 * carries the evidence; a reader who wants more than a token follows the link.
 *
 * Both are published into the checker's own repository, not the prover's. A
 * verdict is the checker's speech about someone else's record, and putting it
 * anywhere else would misattribute it. It also means anyone can run this: a
 * watchdog with no special standing publishes verdicts the same way the
 * regulator does, and a reader decides which sources to believe — which is the
 * argument for doing this on a protocol rather than behind an agency's API.
 */

import type { Actor, Label, Network, StrongRef } from '../atp/network.js'
import { CHECKER_NAME, CHECKER_VERSION, type Outcome, type Verdict } from './index.js'
import { SANDBOX_DESCRIPTION } from './lean.js'
import { createHash } from 'node:crypto'

/** Which label a verdict earns. Total, so no outcome silently goes unlabelled. */
const LABEL_FOR: Record<Outcome, string> = {
  verified: 'proof-verified',
  refuted: 'proof-refuted',
  malformed: 'proof-malformed',
  stale: 'proof-stale',
  timeout: 'proof-timeout',
  unsupported: 'proof-timeout',
}

export type Published = { verdict: StrongRef; label: Label }

export async function publishVerdict(
  net: Network,
  checker: Actor,
  proofRef: StrongRef,
  proof: Record<string, unknown>,
  result: Verdict,
  toolchain: string,
  when: string,
): Promise<Published> {
  const log = await net.putBlob(Buffer.from(result.log, 'utf8'), 'text/plain')

  const verdict = await checker.put(
    'dev.provable.verdict',
    verdictRkey(proofRef, checker.did),
    {
      $type: 'dev.provable.verdict',
      proof: proofRef,
      requirement: proof.requirement as StrongRef,
      artifact: proof.artifact as StrongRef,
      outcome: result.outcome,
      ...(result.failedClause ? { failedClause: result.failedClause } : {}),
      axioms: result.axioms,
      ...(result.obligationDigest ? { obligationDigest: result.obligationDigest } : {}),
      checker: {
        name: CHECKER_NAME,
        version: CHECKER_VERSION,
        toolchain,
        // Stated rather than assumed. Elaborating a stranger's Lean is running
        // their code, and a verdict from an unsandboxed checker is a weaker
        // claim than one from a sandboxed checker. A reader is entitled to know
        // which they are looking at.
        sandbox: SANDBOX_DESCRIPTION,
      },
      durationMs: result.durationMs,
      log,
      logDigest: createHash('sha256').update(result.log, 'utf8').digest('hex'),
      checkedAt: when,
    },
  )

  // The label's subject is the proof's uri *and* cid. Rewrite the proof and the
  // label stops applying, rather than following the edit to text nobody checked.
  const label = await net.label(checker, proofRef, LABEL_FOR[result.outcome], { cts: when })
  return { verdict, label }
}

/**
 * A record key that is a function of what the verdict is about and who issued
 * it, so re-checking the same proof updates one verdict instead of accumulating
 * a pile of them, and two checkers never collide.
 */
function verdictRkey(proofRef: StrongRef, checkerDid: string): string {
  return createHash('sha256')
    .update(`${proofRef.uri}\n${proofRef.cid}\n${checkerDid}`)
    .digest('hex')
    .slice(0, 24)
}
