/**
 * An independent check on the theory's arithmetic.
 *
 * The efficiency gap is reimplemented here from the definition, in TypeScript,
 * with no reference to the Lean code. A subtly wrong implementation — the wrong
 * wasted-vote threshold, a sign error, the doubling dropped somewhere — would
 * sail through every proof in this project, because the proofs establish that a
 * plan satisfies the predicate as written, not that the predicate says what
 * anyone meant. Two independent implementations agreeing is the only evidence
 * available for that, and it is the check with the best odds of catching the
 * kind of error a proof assistant cannot.
 *
 * The expected figures below are also derived by hand from the identity
 * `EG = 2·(V − ½) − (S − ½)`, which holds when every district has equal
 * turnout, so a third derivation has to agree as well.
 */

import { describe, expect, it } from 'vitest'
import { CRACKLAND_V1, CRACKLAND_V2, FAIRFAX, type SeedPlan } from '../src/seed/geography.js'

type Tally = { a: number; t: number }

/** District tallies, straight from the seed plan. */
function tallies(plan: SeedPlan): Tally[] {
  const byId = new Map(plan.precincts.map((p) => [p.id, p]))
  const out: Tally[] = Array.from({ length: plan.districtCount }, () => ({ a: 0, t: 0 }))
  for (const { precinct, district } of plan.assignment) {
    const p = byId.get(precinct)!
    out[district]!.a += p.votesA
    out[district]!.t += p.votesA + p.votesB
  }
  return out
}

/**
 * Efficiency gap in basis points, computed directly from wasted votes rather
 * than from the doubled-difference shortcut the theory uses.
 *
 * Positive means party A wastes more votes, that is, party A is disadvantaged.
 */
function efficiencyGapBp(ts: Tally[]): number {
  let wastedA = 0
  let wastedB = 0
  let total = 0
  for (const { a, t } of ts) {
    const b = t - a
    const half = t / 2
    if (a > b) {
      wastedA += a - half
      wastedB += b
    } else {
      wastedA += a
      wastedB += b - half
    }
    total += t
  }
  return Math.trunc((10000 * (wastedA - wastedB)) / total)
}

const seats = (ts: Tally[]) => ts.filter((d) => 2 * d.a > d.t).length
const voteShareBp = (ts: Tally[]) =>
  Math.trunc((10000 * ts.reduce((s, d) => s + d.a, 0)) / ts.reduce((s, d) => s + d.t, 0))

/** The same figure from the seats-and-votes identity, valid at equal turnout. */
function identityBp(ts: Tally[]): number {
  const S = (10000 * seats(ts)) / ts.length
  return 2 * (voteShareBp(ts) - 5000) - (S - 5000)
}

describe('seed geography', () => {
  const cases = [
    { name: 'Fairfax', plan: FAIRFAX, seats: 6, egBp: -200 },
    { name: 'Crackland v1', plan: CRACKLAND_V1, seats: 4, egBp: 1800 },
    { name: 'Crackland v2', plan: CRACKLAND_V2, seats: 6, egBp: -200 },
  ] as const

  for (const c of cases) {
    describe(c.name, () => {
      const ts = tallies(c.plan)

      it('has one assignment per precinct and equal-sized districts', () => {
        expect(c.plan.assignment).toHaveLength(c.plan.precincts.length)
        const sizes = new Map<number, number>()
        for (const { district } of c.plan.assignment) {
          sizes.set(district, (sizes.get(district) ?? 0) + 1)
        }
        expect(sizes.size).toBe(c.plan.districtCount)
        expect(new Set(sizes.values())).toEqual(new Set([6]))
      })

      it('has equal turnout in every district', () => {
        expect(new Set(ts.map((d) => d.t))).toEqual(new Set([6000]))
      })

      it(`gives party A ${c.seats} of ${c.plan.districtCount} seats`, () => {
        expect(seats(ts)).toBe(c.seats)
      })

      it('has a 54% statewide vote share, as every map here does', () => {
        // All three maps share this, so nothing below can be explained by one
        // state's electorate differing from another's — only by the districting.
        expect(voteShareBp(ts)).toBe(5400)
      })

      it(`has an efficiency gap of ${c.egBp} bp`, () => {
        expect(efficiencyGapBp(ts)).toBe(c.egBp)
      })

      it('agrees with the seats-and-votes identity', () => {
        expect(identityBp(ts)).toBe(c.egBp)
      })
    })
  }

  it('gives Fairfax and the revised Crackland map identical efficiency gaps', () => {
    // The premise of the whole demo: § 2 cannot tell these two apart, so a rule
    // that stops at § 2 does not distinguish a durable map from a fragile one.
    expect(efficiencyGapBp(tallies(FAIRFAX))).toBe(efficiencyGapBp(tallies(CRACKLAND_V2)))
  })

  it('gives Fairfax competitive seats and the revised Crackland map safe ones', () => {
    // Where they differ. A seat changes hands under swing `s` when its share of
    // the vote crosses half, that is, at `s = 5000 − share`. Fairfax has two
    // such crossings inside the ±500 bp band; Crackland v2 has none, which is
    // exactly why one satisfies § 5 and the other cannot.
    const crossings = (plan: SeedPlan) =>
      tallies(plan)
        .map((d) => 5000 - Math.round((10000 * d.a) / d.t))
        .filter((s) => -500 <= s && s <= 500)
        .sort((x, y) => x - y)

    expect(crossings(FAIRFAX)).toEqual([-150, 350])
    expect(crossings(CRACKLAND_V2)).toEqual([])
  })

  it('shares precincts between the two Crackland maps', () => {
    // Only the districting differs between v1 and v2. If the votes differed too,
    // the comparison would prove nothing about maps.
    expect(CRACKLAND_V1.precincts).toEqual(CRACKLAND_V2.precincts)
    expect(CRACKLAND_V1.assignment).not.toEqual(CRACKLAND_V2.assignment)
  })
})
