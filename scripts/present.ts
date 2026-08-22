/**
 * Capture a real demo run as data for the presentation.
 *
 * The deck is driven entirely by what this script observes: real CIDs, real
 * verdicts, real axiom sets, real generated Lean. Nothing in `presentation/` is
 * typed by hand, because a slide deck full of plausible-looking hashes would
 * undercut the one claim the project is making — that these are computations
 * with named inputs rather than assertions.
 *
 * The swing curves are computed by the Lean theory itself rather than
 * reimplemented here. A chart that disagreed with the obligation would be worse
 * than no chart.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { seed } from '../src/seed/publish.js'
import {
  GERRYLAND_V1,
  GERRYLAND_V2,
  FAIRFAX,
  FAIRFAX_SWING_BREAKPOINTS,
  type SeedPlan,
} from '../src/seed/geography.js'
import { checkProof, leanEnv, type Verdict } from '../src/checker/index.js'
import { publishVerdict } from '../src/checker/verdict.js'
import { proofModule, statementModule } from '../src/checker/generate.js'
import { runLean, writeModule } from '../src/checker/lean.js'
import type { Actor, StrongRef } from '../src/atp/network.js'

const LEAN_DIR = resolve(import.meta.dirname, '../lean')
const OUT = resolve(import.meta.dirname, '../presentation/data.json')

const SECTION2_PAYLOAD = 'by decide'
const SECTION5_PAYLOAD = `⟨by decide,
   Redistrict.swingRobust_of_chain
     [${FAIRFAX_SWING_BREAKPOINTS.join(', ')}]
     (by decide) (by decide) (by decide)⟩`

const T = (n: number) => new Date(Date.UTC(2026, 0, 5 + n, 12, 0, 0)).toISOString()

/** Grid position encoded in a precinct id, `P{row}{col:2}`. */
function gridPos(id: string) {
  return { r: Number(id.slice(1, 2)), c: Number(id.slice(2)) }
}

function planGrid(plan: SeedPlan) {
  const byId = new Map(plan.assignment.map((a) => [a.precinct, a.district]))
  return plan.precincts.map((p) => ({
    ...gridPos(p.id),
    id: p.id,
    county: p.county,
    district: byId.get(p.id)!,
    votesA: p.votesA,
    votesB: p.votesB,
  }))
}

/**
 * Ask the theory for each plan's district shares and swing curve.
 *
 * One Lean run for all three plans, using the same `Codec.decodePlanD` path the
 * obligations use, so the numbers on the slides are the numbers in the proofs.
 */
async function askTheory(
  env: Awaited<ReturnType<typeof leanEnv>>,
  plans: Record<string, Record<string, unknown>>,
) {
  const work = resolve('.work/present')
  await rm(work, { recursive: true, force: true })

  const keys = Object.keys(plans)
  const decls = keys
    .map((k, i) => {
      const stmt = statementModule({
        artifact: { uri: 'at://x/y/z', cid: 'n/a' },
        requirement: { uri: 'at://x/y/z', cid: 'n/a' },
        theory: { uri: 'at://x/y/z', cid: 'n/a' },
        leanProp: 'Redistrict.FairDistrictingAct.section2',
        artifactRecord: plans[k]!,
      })
      // Reuse the checker's transliteration, keeping only the raw literal.
      const raw = stmt.slice(stmt.indexOf('def raw : Redistrict.Codec.Raw :='))
      return raw
        .slice(0, raw.indexOf('/-- The plan those bytes denote'))
        .replace('def raw :', `def raw${i} :`)
    })
    .join('\n')

  const body = keys
    .map(
      (k, i) => `  IO.println ("SHARES ${k} " ++ toString
    ((Redistrict.Codec.decodePlanD raw${i}).districtSharesBp))
  IO.println ("CURVE ${k} " ++ (Redistrict.Codec.decodePlanD raw${i}).swingCurveJson (-500) 500 5)`,
    )
    .join('\n')

  await writeModule(
    work,
    'Obligation.Curves',
    `import Redistrict\nimport Provable\nset_option maxRecDepth 100000\n\n${decls}\n\ndef main : IO Unit := do\n${body}\n\n#eval main\n`,
  )
  const run = await runLean(env, work, 'Obligation.Curves')
  await rm(work, { recursive: true, force: true })
  if (!run.ok) throw new Error('theory query failed:\n' + run.stdout + run.stderr)

  const shares: Record<string, number[]> = {}
  const curves: Record<string, { s: number; egBp: number; seatsA: number }[]> = {}
  for (const line of run.stdout.split('\n')) {
    const s = /^SHARES (\S+) (.*)$/.exec(line.trim())
    if (s) shares[s[1]!] = JSON.parse(s[2]!.replace(/\s+/g, ''))
    const c = /^CURVE (\S+) (.*)$/.exec(line.trim())
    if (c) curves[c[1]!] = JSON.parse(c[2]!)
  }
  return { shares, curves }
}

async function main() {
  console.log('capturing a demo run for the presentation…')
  const env = await leanEnv(LEAN_DIR)
  const s = await seed(LEAN_DIR)
  const { net } = s

  const checks: unknown[] = []

  async function attempt(
    prover: Actor,
    checker: Actor,
    label: string,
    artifactKey: string,
    artifact: StrongRef,
    requirementKey: string,
    requirement: StrongRef,
    payload: string,
    when: string,
  ) {
    const rkey = `${artifact.uri.split('/').pop()}--${requirement.uri.split('/').pop()}`
    const proofRef = await prover.put('dev.provable.proof', rkey, {
      $type: 'dev.provable.proof',
      requirement,
      artifact,
      theory: s.theory,
      toolchain: 'leanprover/lean4:v4.33.1',
      payload,
      declaredAxioms: ['propext', 'Classical.choice', 'Quot.sound'],
      createdAt: when,
    })
    const verdict: Verdict = await checkProof(net, env, proofRef)
    const proof = (await net.resolve(proofRef)).value
    const out = await publishVerdict(net, checker, proofRef, proof, verdict, env.toolchain, when)
    console.log(`  ${label}: ${verdict.outcome}`)
    checks.push({
      id: label,
      prover: prover.handle,
      checker: checker.handle,
      artifactKey,
      requirementKey,
      payload,
      proofRef,
      verdictRef: out.verdict,
      labelVal: out.label.val,
      outcome: verdict.outcome,
      detail: verdict.detail,
      failedClause: verdict.failedClause ?? null,
      clauses: verdict.clauses,
      summary: verdict.summary ?? null,
      axioms: verdict.axioms,
      obligationDigest: verdict.obligationDigest ?? null,
      durationMs: verdict.durationMs,
    })
    return { proofRef, verdict }
  }

  await attempt(s.fairfax, s.fedgov, 'fairfax-s2', 'fairfax', s.plans.fairfax,
    'section2', s.section2, SECTION2_PAYLOAD, T(2))
  const fairfax5 = await attempt(s.fairfax, s.fedgov, 'fairfax-s5', 'fairfax', s.plans.fairfax,
    'section5', s.section5, SECTION5_PAYLOAD, T(2))
  await net.label(s.fedgov, s.plans.fairfax, 'districting-certified', { cts: T(2) })

  await attempt(s.gerryland, s.fedgov, 'gerryland1-s2', 'gerryland1', s.plans.gerryland1,
    'section2', s.section2, SECTION2_PAYLOAD, T(2))
  await attempt(s.gerryland, s.fedgov, 'gerryland2-s2', 'gerryland2', s.plans.gerryland2,
    'section2', s.section2, SECTION2_PAYLOAD, T(4))
  await attempt(s.gerryland, s.fedgov, 'gerryland2-s5', 'gerryland2', s.plans.gerryland2,
    'section5', s.section5, SECTION5_PAYLOAD, T(4))

  // An unaffiliated party repeats the check and publishes its own verdict.
  console.log('  watchdog re-check…')
  const independent = await checkProof(net, env, fairfax5.proofRef)
  const proof5 = (await net.resolve(fairfax5.proofRef)).value
  const wd = await publishVerdict(
    net, s.watchdog, fairfax5.proofRef, proof5, independent, env.toolchain, T(5),
  )

  // A published map is edited after certification.
  const before = s.plans.gerryland2
  const current = (await net.resolveUri(before.uri)).value
  const precincts = (current.precincts as Record<string, unknown>[]).map((p, i) =>
    i === 0 ? { ...p, population: 1001 } : p,
  )
  const after = await s.gerryland.put('gov.redistrict.plan', 'gerryland-2026-revised', {
    ...current,
    precincts,
  })
  const staleProof = `at://${s.gerryland.did}/dev.provable.proof/gerryland-2026-revised--fda-section-2`
  const staleVerdict = await checkProof(net, env, {
    uri: staleProof,
    cid: (await net.resolveUri(staleProof)).cid,
  })
  console.log(`  after edit: ${staleVerdict.outcome}`)
  // Put the map back, so the exported record graph matches the certified state.
  await s.gerryland.put('gov.redistrict.plan', 'gerryland-2026-revised', current)

  // Real generated modules, for the slide about statement substitution.
  const inputs = {
    artifact: s.plans.fairfax,
    requirement: s.section2,
    theory: s.theory,
    leanProp: 'Redistrict.FairDistrictingAct.section2',
    artifactRecord: (await net.resolve(s.plans.fairfax)).value,
  }
  const stmtSrc = statementModule(inputs)
  const proofSrc = proofModule(inputs, SECTION2_PAYLOAD, undefined,
    ['propext', 'Classical.choice', 'Quot.sound'])

  console.log('  asking the theory for swing curves…')
  const planRecords = {
    fairfax: (await net.resolve(s.plans.fairfax)).value,
    gerryland1: (await net.resolve(s.plans.gerryland1)).value,
    gerryland2: (await net.resolve(s.plans.gerryland2)).value,
  }
  const { shares, curves } = await askTheory(env, planRecords)

  const reqRecord = async (ref: StrongRef) => (await net.resolve(ref)).value

  const data = {
    generatedAt: new Date().toISOString(),
    toolchain: env.toolchain,
    actors: [
      { key: 'fedgov', role: 'regulator + labeler', handle: s.fedgov.handle, did: s.fedgov.did,
        collections: ['dev.provable.theory', 'dev.provable.requirement', 'dev.provable.verdict',
          'app.bsky.labeler.service'] },
      { key: 'fairfax', role: 'regulated actor', handle: s.fairfax.handle, did: s.fairfax.did,
        collections: ['gov.redistrict.plan', 'dev.provable.proof'] },
      { key: 'gerryland', role: 'regulated actor', handle: s.gerryland.handle, did: s.gerryland.did,
        collections: ['gov.redistrict.plan', 'dev.provable.proof'] },
      { key: 'watchdog', role: 'independent checker', handle: s.watchdog.handle, did: s.watchdog.did,
        collections: ['dev.provable.verdict'] },
      { key: 'census', role: 'data authority', handle: 'census.gov.example',
        did: net.actor('census.gov.example').did, collections: ['gov.redistrict.datasource'] },
      { key: 'eac', role: 'data authority', handle: 'eac.gov.example',
        did: net.actor('eac.gov.example').did, collections: ['gov.redistrict.datasource'] },
    ],
    theory: { ref: s.theory, ...(await reqRecord(s.theory)) , source: undefined },
    requirements: [
      { key: 'section2', ref: s.section2, ...(await reqRecord(s.section2)) },
      { key: 'section5', ref: s.section5, ...(await reqRecord(s.section5)) },
    ],
    plans: [
      { key: 'fairfax', owner: 'fairfax', ref: s.plans.fairfax, name: FAIRFAX.name,
        jurisdiction: FAIRFAX.jurisdiction, districtCount: FAIRFAX.districtCount,
        cells: planGrid(FAIRFAX), sharesBp: shares.fairfax, swing: curves.fairfax },
      { key: 'gerryland1', owner: 'gerryland', ref: s.plans.gerryland1, name: GERRYLAND_V1.name,
        jurisdiction: GERRYLAND_V1.jurisdiction, districtCount: GERRYLAND_V1.districtCount,
        cells: planGrid(GERRYLAND_V1), sharesBp: shares.gerryland1, swing: curves.gerryland1 },
      { key: 'gerryland2', owner: 'gerryland', ref: s.plans.gerryland2, name: GERRYLAND_V2.name,
        jurisdiction: GERRYLAND_V2.jurisdiction, districtCount: GERRYLAND_V2.districtCount,
        cells: planGrid(GERRYLAND_V2), sharesBp: shares.gerryland2, swing: curves.gerryland2 },
    ],
    checks,
    breakpoints: [-500, ...FAIRFAX_SWING_BREAKPOINTS],
    independent: {
      regulatorDigest: checks.find((c) => (c as { id: string }).id === 'fairfax-s5')
        ? (checks.find((c) => (c as { id: string }).id === 'fairfax-s5') as { obligationDigest: string })
            .obligationDigest
        : null,
      watchdogDigest: independent.obligationDigest ?? null,
      outcome: independent.outcome,
      verdictRef: wd.verdict,
      checker: s.watchdog.handle,
    },
    staleness: {
      before: before.cid,
      after: after.cid,
      outcome: staleVerdict.outcome,
      detail: staleVerdict.detail,
    },
    generated: { statement: stmtSrc, proof: proofSrc },
    labels: net.labels.map((l) => ({ src: l.src, uri: l.uri, cid: l.cid, val: l.val, cts: l.cts })),
    counts: { labels: net.labels.length, repos: net.actors.length },
  }

  await mkdir(resolve(import.meta.dirname, '../presentation'), { recursive: true })
  await writeFile(OUT, JSON.stringify(data, null, 1) + '\n', 'utf8')
  console.log(`\nwrote ${OUT}`)
  console.log('run `pnpm present` to open the deck')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
