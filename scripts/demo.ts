/**
 * The demo.
 *
 * Publishes a regulator's theory and two requirements, two states' maps, and the
 * states' attempts to prove they comply; checks each proof; and issues verdicts
 * and labels. Everything runs offline against real CIDs and real signatures.
 *
 * The story it tells, in order:
 *
 *   1. Fairfax proves both requirements and is certified.
 *   2. Gerryland's first map is refuted on one named clause — a state can see
 *      exactly what to fix.
 *   3. Gerryland redraws. The new map passes § 2 with the *same* efficiency gap
 *      as Fairfax's, and fails § 5, because it is built of safe seats. This is
 *      the case the durability requirement exists for and the one a snapshot
 *      metric cannot see.
 *   4. An unaffiliated watchdog re-checks Fairfax's proof and gets a byte-
 *      identical obligation. The verdict was a computation, not an assertion.
 *   5. Gerryland edits a published map. Its verified proof goes stale, because
 *      the proof was bound to a hash rather than to a name.
 */

import { resolve } from 'node:path'
import { seed } from '../src/seed/publish.js'
import { FAIRFAX_SWING_BREAKPOINTS } from '../src/seed/geography.js'
import { checkProof, leanEnv, type Verdict } from '../src/checker/index.js'
import { publishVerdict } from '../src/checker/verdict.js'
import type { Actor, StrongRef } from '../src/atp/network.js'

const LEAN_DIR = resolve(import.meta.dirname, '../lean')

/* -- output helpers ------------------------------------------------------- */

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`

const short = (cid: string) => cid.slice(0, 12) + '…'
const pct = (bp: number) => `${(bp / 100).toFixed(2)}%`

function heading(n: number, text: string) {
  console.log(`\n${bold(`${n}. ${text}`)}`)
}

function published(what: string, ref: StrongRef) {
  const rkey = ref.uri.split('/').pop()
  console.log(`   ${green('✓')} ${what.padEnd(34)} ${dim(short(ref.cid))} ${dim(rkey ?? '')}`)
}

function verdictLine(result: Verdict) {
  const mark =
    result.outcome === 'verified' ? green('✓') : result.outcome === 'refuted' ? red('✗') : yellow('!')
  console.log(`   ${mark} ${result.outcome.padEnd(11)} ${dim(`${result.durationMs} ms`)}`)
  console.log(`     ${result.detail}`)
  if (result.failedClause) {
    console.log(`     ${bold('failing clause:')} ${result.failedClause}`)
  }
  for (const c of result.clauses) {
    const m = c.status === 'holds' ? green('·') : c.status === 'refuted' ? red('✗') : yellow('?')
    console.log(`       ${m} ${c.clause.padEnd(22)} ${dim(c.status)}`)
  }
  if (result.summary) {
    const s = result.summary
    console.log(
      dim(
        `       seats A ${s.seatsA}/${s.districts}   vote share ${pct(s.voteShareABp!)}   ` +
          `efficiency gap ${pct(s.efficiencyGapBp!)}   pop deviation ${pct(s.popDevBp!)}`,
      ),
    )
  }
}

/* -- proof payloads -------------------------------------------------------- */

/**
 * § 2 is decidable, so the whole payload is one tactic. That is honest about
 * what a tier-1 proof is: a recomputation certificate. Exact and reproducible,
 * but the kernel is doing arithmetic, not mathematics.
 */
const SECTION2_PAYLOAD = 'by decide'

/**
 * § 5 is not decidable, and this is what a real proof looks like in this system.
 *
 * The state supplies a breakpoint certificate — the swings at which a seat
 * changes hands — and closes three decidable side conditions. Everything else is
 * the regulator's `swingRobust_of_chain`, published in the theory package. The
 * general mathematics is written once, by the party that wrote the rule; each
 * state contributes only a cheap fact about its own map.
 *
 * The certificate has six entries and stands in for 1001 evaluations — every
 * whole basis point in the band. Widening the band does not lengthen it much:
 * a chain needs two entries per seat that changes hands, so at most 22 on a
 * ten-district map however wide the band gets, against a sweep that grows
 * without bound. That gap is the reason to want a proof rather than a check.
 */
const SECTION5_PAYLOAD = `⟨by decide,
   Redistrict.swingRobust_of_chain
     [${FAIRFAX_SWING_BREAKPOINTS.join(', ')}]
     (by decide) (by decide) (by decide)⟩`

/* -- main ------------------------------------------------------------------ */

async function main() {
  console.log(bold('\nProof-carrying regulation on atproto'))
  console.log(dim('offline network · real DRISL/CBOR · real CIDs · real signatures\n'))

  const env = await leanEnv(LEAN_DIR)
  console.log(dim(`   toolchain ${env.toolchain}`))

  heading(1, 'The regulator publishes a theory and two requirements')
  const s = await seed(LEAN_DIR)
  const { net, fedgov, fairfax, gerryland, watchdog } = s
  published('dev.provable.theory', s.theory)
  published('dev.provable.requirement §2', s.section2)
  published('dev.provable.requirement §5', s.section5)
  console.log(dim(`   fedgov    ${fedgov.did}`))
  console.log(dim(`   fairfax   ${fairfax.did}`))
  console.log(dim(`   gerryland ${gerryland.did}`))

  const T = (n: number) => new Date(Date.UTC(2026, 0, 5 + n, 12, 0, 0)).toISOString()

  /** Publish a proof, check it, publish the verdict and label. */
  async function attempt(
    prover: Actor,
    checker: Actor,
    artifact: StrongRef,
    requirement: StrongRef,
    payload: string,
    when: string,
    note: string,
  ) {
    const proofRef = await prover.put('dev.provable.proof', rkeyFor(artifact, requirement), {
      $type: 'dev.provable.proof',
      requirement,
      artifact,
      theory: s.theory,
      toolchain: 'leanprover/lean4:v4.33.1',
      payload,
      declaredAxioms: ['propext', 'Classical.choice', 'Quot.sound'],
      note,
      createdAt: when,
    })
    published('dev.provable.proof', proofRef)
    const result = await checkProof(net, env, proofRef, {})
    verdictLine(result)
    const proof = (await net.resolve(proofRef)).value
    const out = await publishVerdict(net, checker, proofRef, proof, result, env.toolchain, when)
    console.log(
      `   ${dim('→ label')} ${bold(net.labelsFor(proofRef).join(', ') || 'none')} ` +
        `${dim('· verdict ' + short(out.verdict.cid))}`,
    )
    return { proofRef, result }
  }

  heading(2, 'Fairfax proves both requirements')
  await attempt(fairfax, fedgov, s.plans.fairfax, s.section2, SECTION2_PAYLOAD, T(2),
    'Every clause of §2 is decidable; the kernel recomputes them.')
  const fairfax5 = await attempt(fairfax, fedgov, s.plans.fairfax, s.section5, SECTION5_PAYLOAD, T(2),
    'Breakpoint certificate for the ±5-point band. Seats change hands just after −1.50% and +3.50%.')

  if (fairfax5.result.outcome === 'verified') {
    await net.label(fedgov, s.plans.fairfax, 'districting-certified', { cts: T(2) })
    console.log(
      `   ${green('✓')} plan labeled ${bold('districting-certified')} ` +
        dim('(derived: every requirement in force has a verified proof)'),
    )
  }

  heading(3, 'Gerryland submits a packed-and-cracked map')
  await attempt(gerryland, fedgov, s.plans.gerryland1, s.section2, SECTION2_PAYLOAD, T(2),
    'Contiguous, population-equal, county-respecting.')
  console.log(
    dim(
      '     The map clears every structural clause. It is refuted on one named clause,\n' +
        '     which is what a state needs in order to know what to change.',
    ),
  )

  heading(4, 'Gerryland redraws — and § 2 no longer sees the problem')
  await attempt(gerryland, fedgov, s.plans.gerryland2, s.section2, SECTION2_PAYLOAD, T(4),
    'Revised plan. Efficiency gap now well inside the limit.')
  console.log(
    dim(
      '     Efficiency gap −2.00% — identical to Fairfax\'s. On the snapshot rule the\n' +
        '     two maps are indistinguishable.',
    ),
  )
  await attempt(gerryland, fedgov, s.plans.gerryland2, s.section5, SECTION5_PAYLOAD, T(4),
    'Attempting the same breakpoint certificate Fairfax used.')
  console.log(
    dim(
      '     But its closest seat needs an eight-point swing to move, so nothing changes\n' +
        '     hands inside the band and the gap drifts at twice the swing: −12.00% at −5%,\n' +
        '     +8.00% at +5%. Durable fairness needs responsive seats, not safe ones.',
    ),
  )

  heading(5, 'An unaffiliated watchdog re-checks Fairfax’s § 5 proof')
  const independent = await checkProof(net, env, fairfax5.proofRef, {})
  const same = independent.obligationDigest === fairfax5.result.obligationDigest
  console.log(`   regulator obligation digest  ${dim(short(fairfax5.result.obligationDigest ?? ''))}`)
  console.log(`   watchdog  obligation digest  ${dim(short(independent.obligationDigest ?? ''))}`)
  console.log(
    `   ${same ? green('✓') : red('✗')} ${
      same
        ? 'identical — both parties checked the same theorem, and agree on the outcome: ' +
          independent.outcome
        : 'DIFFERENT — the two checkers are not checking the same thing'
    }`,
  )
  const proof5 = (await net.resolve(fairfax5.proofRef)).value
  await publishVerdict(net, watchdog, fairfax5.proofRef, proof5, independent, env.toolchain, T(5))
  console.log(
    dim(
      '     The watchdog has no standing and needs none. It read the same three CIDs and\n' +
        '     published its own verdict; a reader compares sources rather than trusting one.',
    ),
  )

  heading(6, 'Gerryland edits a published map')
  const edited = { ...(await net.resolveUri(s.plans.gerryland2.uri)).value }
  const precincts = (edited.precincts as Record<string, unknown>[]).map((p, i) =>
    i === 0 ? { ...p, population: 1001 } : p,
  )
  const newRef = await gerryland.put(
    'gov.redistrict.plan',
    s.plans.gerryland2.uri.split('/').pop()!,
    { ...edited, precincts },
  )
  console.log(`   one precinct's population 1000 → 1001`)
  console.log(`   ${dim('was')} ${short(s.plans.gerryland2.cid)}   ${dim('now')} ${short(newRef.cid)}`)
  const stale = await checkProof(net, env, {
    uri: `at://${gerryland.did}/dev.provable.proof/${rkeyFor(s.plans.gerryland2, s.section2)}`,
    cid: (await net.resolveUri(
      `at://${gerryland.did}/dev.provable.proof/${rkeyFor(s.plans.gerryland2, s.section2)}`,
    )).cid,
  })
  verdictLine(stale)
  console.log(
    dim(
      '     The proof still elaborates; it is simply no longer about anything published.\n' +
        '     Nobody had to notice the edit — the reference was a hash.',
    ),
  )

  heading(7, 'Where the labels ended up')
  for (const [name, ref] of [
    ['fairfax 2026', s.plans.fairfax],
    ['gerryland 2026', s.plans.gerryland1],
    ['gerryland 2026 revised', s.plans.gerryland2],
  ] as const) {
    const labels = net.labelsFor(ref)
    console.log(`   ${name.padEnd(24)} ${labels.length ? green(labels.join(', ')) : dim('none')}`)
  }
  console.log(dim(`\n   ${net.labels.length} signed labels, ${net.actors.length} repositories\n`))
}

/** Stable per-(artifact, requirement) proof key, so re-runs update in place. */
function rkeyFor(artifact: StrongRef, requirement: StrongRef): string {
  const a = artifact.uri.split('/').pop()!
  const r = requirement.uri.split('/').pop()!
  return `${a}--${r}`
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
