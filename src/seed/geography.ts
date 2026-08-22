/**
 * Demo data: two states, three maps.
 *
 * Both states sit on a 6×10 grid of precincts with 1000 voters each, so
 * population equality and contiguity are never what distinguishes the maps.
 * Only the districting and the votes differ, which keeps the demo's attention on
 * partisan fairness.
 *
 * The numbers are not arbitrary. Each map is built to land on a specific side of
 * a specific clause:
 *
 * | map           | § 2 (snapshot) | § 5 (durability) |
 * |---------------|----------------|------------------|
 * | Fairfax       | passes         | passes           |
 * | Crackland v1  | fails: efficiencyGap (+18%) | — |
 * | Crackland v2  | passes (−2%)   | fails: safe seats |
 *
 * Crackland v2 is the case the demo exists for. It has *exactly the same*
 * efficiency gap as Fairfax — −2% in both — and it is built out of safe seats,
 * so a two-point shift in opinion pushes it past the statutory limit while
 * Fairfax absorbs a five-point shift. A snapshot metric cannot tell the two
 * apart. The durability theorem can.
 */

export type SeedPrecinct = {
  id: string
  county: string
  population: number
  votesA: number
  votesB: number
}

export type SeedPlan = {
  rkey: string
  name: string
  jurisdiction: string
  districtCount: number
  precincts: SeedPrecinct[]
  adjacency: { a: string; b: string }[]
  assignment: { precinct: string; district: number }[]
}

const ROWS = 6
const COLS = 10
const VOTERS = 1000

const pid = (r: number, c: number) => `P${String(r)}${String(c).padStart(2, '0')}`
const county = (c: number) => `County-${String.fromCharCode(65 + c)}`

/** Rook adjacency on the grid. Undirected, each pair listed once. */
function gridAdjacency(): { a: string; b: string }[] {
  const edges: { a: string; b: string }[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) edges.push({ a: pid(r, c), b: pid(r, c + 1) })
      if (r + 1 < ROWS) edges.push({ a: pid(r, c), b: pid(r + 1, c) })
    }
  }
  return edges
}

/**
 * Build the precinct list from a per-precinct table of votes for party A.
 * Counties are columns throughout, so a column-shaped district splits no county.
 */
function precinctsFrom(votesA: number[][]): SeedPrecinct[] {
  const out: SeedPrecinct[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = votesA[r]![c]!
      out.push({
        id: pid(r, c),
        county: county(c),
        population: VOTERS,
        votesA: a,
        votesB: VOTERS - a,
      })
    }
  }
  return out
}

/** Districts are whole columns: district `c` is column `c`. */
function columnAssignment(): { precinct: string; district: number }[] {
  const out: { precinct: string; district: number }[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) out.push({ precinct: pid(r, c), district: c })
  }
  return out
}

/**
 * Districts are 3×2 blocks: columns are paired, and each pair is cut into a top
 * half and a bottom half. Every district is contiguous and every county (that
 * is, every column) is split exactly once, so this shape clears § 2's structural
 * clauses and is distinguished only by what it does to the vote.
 */
function blockAssignment(): { precinct: string; district: number }[] {
  const out: { precinct: string; district: number }[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const pair = Math.floor(c / 2)
      const half = r < 3 ? 0 : 1
      out.push({ precinct: pid(r, c), district: pair * 2 + half })
    }
  }
  return out
}

/** Split `total` votes across `n` precincts as evenly as whole votes allow. */
function spread(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  const extra = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0))
}

/* -------------------------------------------------------------------------- */
/* State A — Fairfax                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Per-column share of the vote for party A, in basis points.
 *
 * Two columns are competitive and the rest are not, and the competitive ones are
 * placed so that one seat changes hands at a 1.5-point swing and another at a
 * 3.5-point swing. Those two flips are what hold the efficiency gap inside ±5%
 * across the whole ±5-point band: between flips the gap drifts at twice the
 * swing, and each flip pushes it back the other way.
 */
const FAIRFAX_COLUMN_SHARES_BP = [5150, 4650, 6200, 6200, 6200, 6200, 6200, 4400, 4400, 4400]

function fairfaxVotes(): number[][] {
  return Array.from({ length: ROWS }, () =>
    FAIRFAX_COLUMN_SHARES_BP.map((bp) => (bp * VOTERS) / 10000),
  )
}

/* -------------------------------------------------------------------------- */
/* State B — Crackland                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Crackland's votes are chosen so that two different legal maps over the *same*
 * precincts produce opposite results.
 *
 * `TOP`/`BOTTOM` give party A's votes in the top three and bottom three rows of
 * each column. Read as columns they give six safe A seats and four safe B seats.
 * Read as 3×2 blocks they give A four packed seats and six cracked ones. Same
 * voters, same turnout, same 54% statewide — the map is doing all the work,
 * which is the thing a districting rule is supposed to be about.
 */
const CRACKLAND_TOP = [2400, 2100, 2400, 2100, 2400, 2100, 1700, 1500, 1400, 1200]
const CRACKLAND_BOTTOM = [1320, 1620, 1320, 1620, 1320, 1620, 820, 1020, 1120, 1320]

function cracklandVotes(): number[][] {
  const rows: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  for (let c = 0; c < COLS; c++) {
    const top = spread(CRACKLAND_TOP[c]!, 3)
    const bottom = spread(CRACKLAND_BOTTOM[c]!, 3)
    for (let r = 0; r < 3; r++) rows[r]![c] = top[r]!
    for (let r = 3; r < ROWS; r++) rows[r]![c] = bottom[r - 3]!
  }
  return rows
}

/* -------------------------------------------------------------------------- */

const fairfaxPrecincts = precinctsFrom(fairfaxVotes())
const cracklandPrecincts = precinctsFrom(cracklandVotes())
const adjacency = gridAdjacency()

export const FAIRFAX: SeedPlan = {
  rkey: 'fairfax-2026',
  name: 'Fairfax 2026 Congressional Plan',
  jurisdiction: 'State of Fairfax',
  districtCount: COLS,
  precincts: fairfaxPrecincts,
  adjacency,
  assignment: columnAssignment(),
}

export const CRACKLAND_V1: SeedPlan = {
  rkey: 'crackland-2026',
  name: 'Crackland 2026 Congressional Plan',
  jurisdiction: 'State of Crackland',
  districtCount: COLS,
  precincts: cracklandPrecincts,
  adjacency,
  assignment: blockAssignment(),
}

export const CRACKLAND_V2: SeedPlan = {
  rkey: 'crackland-2026-revised',
  name: 'Crackland 2026 Congressional Plan (Revised)',
  jurisdiction: 'State of Crackland',
  districtCount: COLS,
  precincts: cracklandPrecincts,
  adjacency,
  assignment: columnAssignment(),
}

/**
 * Breakpoints for Fairfax's § 5 certificate, excluding the opening `-500`.
 *
 * A seat changes hands just after −150 and just after +350, so the chain names
 * the last swing before each change and the first swing after. Between those
 * pairs the set of seats held is constant and the durability theorem covers the
 * interior; across them the two values are adjacent integers with nothing in
 * between. Six evaluations stand in for 1001.
 */
export const FAIRFAX_SWING_BREAKPOINTS = [-150, -149, 350, 351, 500]
