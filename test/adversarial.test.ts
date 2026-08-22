/**
 * Attacks on the checker.
 *
 * These are the tests that decide whether anything else in this project means
 * anything. A pipeline that produces `proof-verified` labels is easy; producing
 * them only when a proof exists is the hard part, and every claim made in
 * DESIGN.md about how substitution is prevented is asserted here against a real
 * checker rather than argued in prose.
 *
 * Several attacks are stopped by more than one mechanism. Where that is so, the
 * test checks each mechanism *on its own*, by routing around the earlier ones —
 * otherwise the suite would pass on the strength of the cheap lexical screen
 * while the structural defenses quietly rotted.
 */

import { resolve } from 'node:path'
import { rm } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { seed, type Seeded } from '../src/seed/publish.js'
import { checkProof, leanEnv, type LeanEnv } from '../src/checker/index.js'
import { proofModule, statementModule } from '../src/checker/generate.js'
import { runLean, writeModule } from '../src/checker/lean.js'
import { screen } from '../src/checker/screen.js'
import type { StrongRef } from '../src/atp/network.js'

const LEAN_DIR = resolve(import.meta.dirname, '../lean')
const AXIOMS = ['propext', 'Classical.choice', 'Quot.sound']
const MINUTE = 60_000

let s: Seeded
let env: LeanEnv

beforeAll(async () => {
  env = await leanEnv(LEAN_DIR)
  s = await seed(LEAN_DIR)
}, 2 * MINUTE)

/** Publish a proof record as the given state and check it. */
async function submit(
  who: 'fairfax' | 'gerryland',
  rkey: string,
  fields: Record<string, unknown>,
) {
  const ref = await s[who].put('dev.provable.proof', rkey, {
    $type: 'dev.provable.proof',
    theory: s.theory,
    toolchain: 'leanprover/lean4:v4.33.1',
    createdAt: '2026-01-07T12:00:00Z',
    ...fields,
  })
  return { ref, verdict: await checkProof(s.net, env, ref) }
}

describe('the lexical screen', () => {
  // Defense in depth only. It exists so a hopeless payload fails fast with a
  // legible message; the guarantees are tested separately below.
  it.each([
    ['a hole', 'by sorry'],
    ['a declared axiom', 'by exact myAx\naxiom myAx : Obligation.stmt'],
    ['native evaluation', 'by native_decide'],
    ['the native decide option', 'by decide +native'],
    ['a compiled implementation', 'by exact f\n@[implemented_by g] def f := 1'],
    ['an escape from the splice point', 'by decide\nend Obligation.Prover'],
    ['an elaborator option change', 'by set_option maxHeartbeats 0 in decide'],
    ['metaprogramming', 'by macro_rules | `(tactic| foo) => `(tactic| decide)'],
    ['effects', 'by run_cmd IO.println "hi"'],
  ])('rejects %s', (_what, payload) => {
    expect(screen(payload).ok).toBe(false)
  })

  it('accepts an ordinary proof, and one mentioning a rejected word in prose', () => {
    expect(screen('by decide').ok).toBe(true)
    expect(screen('-- no sorry here\nby decide').ok).toBe(true)
  })

  it('turns a screened payload into a malformed verdict, without running Lean', async () => {
    const { verdict } = await submit('fairfax', 'attack-screened', {
      requirement: s.section2,
      artifact: s.plans.fairfax,
      payload: 'by sorry',
    })
    expect(verdict.outcome).toBe('malformed')
    expect(verdict.detail).toContain('hole')
    // Nothing was elaborated, so there is no obligation digest to report.
    expect(verdict.obligationDigest).toBeUndefined()
  })
})

describe('the axiom audit', () => {
  /**
   * The screen is bypassed deliberately here.
   *
   * `#assert_axioms` is what actually stands between a hole and a
   * `proof-verified` label, and a suite that only ever tested the denylist would
   * pass even if the audit were deleted. So this drives the generator and Lean
   * directly with a payload the screen would have refused.
   */
  async function elaborate(payload: string, dir: string) {
    const inputs = {
      artifact: s.plans.fairfax,
      requirement: s.section2,
      theory: s.theory,
      leanProp: 'Redistrict.FairDistrictingAct.section2',
      artifactRecord: (await s.net.resolve(s.plans.fairfax)).value,
    }
    const work = resolve('.work/test-' + dir)
    await rm(work, { recursive: true, force: true })
    await writeModule(work, 'Obligation.Statement', statementModule(inputs))
    const stmt = await runLean(env, work, 'Obligation.Statement', { olean: true })
    expect(stmt.ok, stmt.stderr).toBe(true)
    await writeModule(work, 'Obligation.Proof', proofModule(inputs, payload, undefined, AXIOMS))
    const run = await runLean(env, work, 'Obligation.Proof')
    await rm(work, { recursive: true, force: true })
    return run
  }

  it('fails the build when the proof is a hole', async () => {
    const run = await elaborate('by sorry', 'sorry')
    expect(run.ok).toBe(false)
    expect(run.stdout + run.stderr).toContain('sorryAx')
  }, 3 * MINUTE)

  it('accepts a genuine proof of the same obligation', async () => {
    const run = await elaborate('by decide', 'genuine')
    expect(run.ok, run.stderr).toBe(true)
    expect(run.stdout).toContain('propext')
  }, 3 * MINUTE)
})

describe('substituting the statement', () => {
  /**
   * The attack the whole design is arranged around: prove something easier and
   * let the label say you proved the requirement.
   *
   * `def`/`theorem` are not on the denylist, so this payload reaches Lean. It
   * fails anyway, twice over — `Obligation.stmt` is imported so redefining it is
   * a duplicate declaration, and the signature the checker wrote still refers to
   * the imported one.
   */
  it('cannot redefine the obligation', async () => {
    const { verdict } = await submit('gerryland', 'attack-shadow', {
      requirement: s.section2,
      artifact: s.plans.gerryland1,
      payload: 'trivial',
      lemmas: 'def stmt : Prop := True',
    })
    expect(verdict.outcome).toBe('refuted')
    expect(verdict.log).toMatch(/already been declared|Type mismatch/)
  }, 3 * MINUTE)

  it('cannot swap in a different artifact than the one proved about', async () => {
    // A proof of § 2 that would succeed for Fairfax, submitted against
    // Gerryland's map. The obligation is generated from the *artifact* CID, so
    // the goal is Gerryland's goal and the proof fails.
    const { verdict } = await submit('gerryland', 'attack-artifact-swap', {
      requirement: s.section2,
      artifact: s.plans.gerryland1,
      payload: 'by decide',
    })
    expect(verdict.outcome).toBe('refuted')
    expect(verdict.failedClause).toBe('efficiencyGap')
  }, 3 * MINUTE)

  it('rejects a requirement whose leanProp is not a plain name', async () => {
    // `leanProp` is spliced into generated source, so it is the one field of a
    // published record that could inject Lean. It must be a dotted identifier
    // and nothing else.
    const bad = await s.fedgov.put('dev.provable.requirement', 'injected', {
      ...(await s.net.resolve(s.section2)).value,
      leanProp: 'Redistrict.FairDistrictingAct.section2 Obligation.plan ∨ True; def evil',
    })
    const { verdict } = await submit('gerryland', 'attack-injection', {
      requirement: bad,
      artifact: s.plans.gerryland1,
      payload: 'by decide',
    })
    expect(verdict.outcome).toBe('malformed')
    expect(verdict.detail).toContain('not a plain Lean name')
  })
})

describe('binding to specific versions', () => {
  it('reports a proof stale once its artifact is rewritten', async () => {
    const { ref, verdict } = await submit('fairfax', 'attack-mutate', {
      requirement: s.section2,
      artifact: s.plans.fairfax,
      payload: 'by decide',
    })
    expect(verdict.outcome).toBe('verified')

    // Change one number in the published map, long after the proof was accepted.
    const plan = (await s.net.resolve(s.plans.fairfax)).value
    const precincts = (plan.precincts as Record<string, unknown>[]).map((p, i) =>
      i === 0 ? { ...p, votesA: 999 } : p,
    )
    const moved = await s.fairfax.put('gov.redistrict.plan', 'fairfax-2026', { ...plan, precincts })
    expect(moved.cid).not.toBe(s.plans.fairfax.cid)

    const after = await checkProof(s.net, env, ref)
    expect(after.outcome).toBe('stale')
    // Restore, so later tests see the map the rest of the suite expects.
    await s.fairfax.put('gov.redistrict.plan', 'fairfax-2026', plan)
  }, 5 * MINUTE)

  it('refuses a proof that cites a different theory than its requirement', async () => {
    const stale: StrongRef = { uri: s.theory.uri, cid: s.section2.cid }
    const ref = await s.gerryland.put('dev.provable.proof', 'attack-theory', {
      $type: 'dev.provable.proof',
      requirement: s.section2,
      artifact: s.plans.gerryland1,
      theory: stale,
      toolchain: 'leanprover/lean4:v4.33.1',
      payload: 'by decide',
      createdAt: '2026-01-07T12:00:00Z',
    })
    const verdict = await checkProof(s.net, env, ref)
    // Caught as stale: the cited CID is not what lives at that URI. Either
    // outcome is a refusal; what matters is that it is never verified.
    expect(['stale', 'malformed']).toContain(verdict.outcome)
  })

  it('refuses an artifact of the wrong type', async () => {
    const notAPlan = await s.gerryland.put('gov.redistrict.datasource', 'not-a-plan', {
      $type: 'gov.redistrict.datasource',
      kind: 'census',
      title: 'not a districting plan',
      publishedAt: '2026-01-07T12:00:00Z',
    })
    const { verdict } = await submit('gerryland', 'attack-wrong-type', {
      requirement: s.section2,
      artifact: notAPlan,
      payload: 'by decide',
    })
    expect(verdict.outcome).toBe('malformed')
    expect(verdict.detail).toContain('gov.redistrict.plan')
  })

  it('refuses a proof pinned to a toolchain the theory does not name', async () => {
    const { verdict } = await submit('fairfax', 'attack-toolchain', {
      requirement: s.section2,
      artifact: s.plans.fairfax,
      toolchain: 'leanprover/lean4:v4.0.0',
      payload: 'by decide',
    })
    expect(verdict.outcome).toBe('malformed')
    expect(verdict.detail).toContain('v4.0.0')
  })
})

describe('replicability', () => {
  it('produces the same obligation for two independent checkers', async () => {
    // The claim a verdict rests on: it is a computation over three CIDs, not an
    // authority's opinion. Two runs must derive the same theorem, byte for byte,
    // or "check it yourself" means nothing.
    const { ref, verdict: first } = await submit('fairfax', 'replicate', {
      requirement: s.section5,
      artifact: s.plans.fairfax,
      payload:
        '⟨by decide, Redistrict.swingRobust_of_chain [-150, -149, 350, 351, 500] ' +
        '(by decide) (by decide) (by decide)⟩',
    })
    const second = await checkProof(s.net, env, ref)
    expect(first.outcome).toBe('verified')
    expect(second.outcome).toBe('verified')
    expect(second.obligationDigest).toBe(first.obligationDigest)
    expect(second.axioms).toEqual(first.axioms)
  }, 5 * MINUTE)

  it('cannot discharge § 5 by evaluation alone', async () => {
    // § 5 quantifies over an unbounded range, so there is no `Decidable`
    // instance and `decide` has nothing to reduce. If this ever passed, the
    // durability requirement would have quietly become a snapshot rule.
    const { verdict } = await submit('fairfax', 'attack-decide-s5', {
      requirement: s.section5,
      artifact: s.plans.fairfax,
      payload: 'by decide',
    })
    expect(verdict.outcome).toBe('refuted')
  }, 3 * MINUTE)

  it('will not accept a certificate that does not span the whole band', async () => {
    // A chain ending short of +500 leaves swings it says nothing about. The
    // theorem's `lastOf` hypothesis is what catches this, by `decide`.
    const { verdict } = await submit('fairfax', 'attack-short-chain', {
      requirement: s.section5,
      artifact: s.plans.fairfax,
      payload:
        '⟨by decide, Redistrict.swingRobust_of_chain [-150, -149, 350] ' +
        '(by decide) (by decide) (by decide)⟩',
    })
    expect(verdict.outcome).toBe('refuted')
  }, 3 * MINUTE)
})
