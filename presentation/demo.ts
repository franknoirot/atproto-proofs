/**
 * Typed access to the captured run.
 *
 * `data.json` is written by `pnpm present:data` from an actual demo run — real
 * CIDs, real verdicts, real axiom sets, real generated Lean, and swing curves
 * computed by the Lean theory itself. Nothing in the deck is hand-typed, because
 * a talk arguing that verdicts are computations rather than assertions should
 * not quote invented hashes.
 *
 * Everything here is read-only lookup and formatting. Slides reach for these
 * rather than indexing into the JSON, so a change to the capture format breaks
 * in one place instead of thirty.
 */

import raw from './data.json'

export type StrongRef = { uri: string; cid: string }
export type ClauseStatus = 'holds' | 'refuted' | 'undecided'
export type Outcome = 'verified' | 'refuted' | 'malformed' | 'stale' | 'timeout' | 'unsupported'

export type Cell = {
  r: number
  c: number
  id: string
  county: string
  district: number
  votesA: number
  votesB: number
}

export type Plan = {
  key: string
  owner: string
  ref: StrongRef
  name: string
  jurisdiction: string
  districtCount: number
  cells: Cell[]
  /** Party A's share of the two-party vote per district, in basis points. */
  sharesBp: number[]
  swing: { s: number; egBp: number; seatsA: number }[]
}

export type Check = {
  id: string
  prover: string
  checker: string
  artifactKey: string
  requirementKey: string
  payload: string
  proofRef: StrongRef
  verdictRef: StrongRef
  labelVal: string
  outcome: Outcome
  detail: string
  failedClause: string | null
  clauses: { clause: string; status: ClauseStatus }[]
  summary: Record<string, number> | null
  axioms: string[]
  obligationDigest: string | null
  durationMs: number
}

export type Actor = {
  key: string
  role: string
  handle: string
  did: string
  collections: string[]
}

export type Requirement = {
  key: string
  ref: StrongRef
  title: string
  citation: string
  artifactType: string
  statement: string
  leanProp: string
  clauses: { name: string; description: string }[]
}

export const DEMO = raw as unknown as {
  generatedAt: string
  toolchain: string
  actors: Actor[]
  theory: { ref: StrongRef; name: string; version: string; toolchain: string; rootModule: string
    sourceDigest: string; artifactTypes: { lexicon: string; leanType: string; decoder: string }[]
    vocabulary: { phrase: string; leanName: string; doc: string }[] }
  requirements: Requirement[]
  plans: Plan[]
  checks: Check[]
  breakpoints: number[]
  independent: { regulatorDigest: string; watchdogDigest: string; outcome: Outcome
    verdictRef: StrongRef; checker: string }
  staleness: { before: string; after: string; outcome: Outcome; detail: string }
  generated: { statement: string; proof: string }
  labels: { src: string; uri: string; cid: string; val: string; cts: string }[]
  counts: { labels: number; repos: number }
}

/* ------------------------------------------------------------------ lookups */

const need = <T>(x: T | undefined, what: string): T => {
  if (x === undefined) throw new Error(`presentation data has no ${what}`)
  return x
}

export const plan = (key: string) => need(DEMO.plans.find((p) => p.key === key), `plan ${key}`)
export const check = (id: string) => need(DEMO.checks.find((c) => c.id === id), `check ${id}`)
export const actor = (key: string) => need(DEMO.actors.find((a) => a.key === key), `actor ${key}`)
export const requirement = (key: string) =>
  need(DEMO.requirements.find((r) => r.key === key), `requirement ${key}`)

export const PLAN_LABEL: Record<string, string> = {
  fairfax: 'Fairfax',
  crackland1: 'Crackland v1',
  crackland2: 'Crackland v2',
}

/* --------------------------------------------------------------- formatting */

/** Abbreviate a CID for display. The full value is always in the data. */
export const shortCid = (c: string | null | undefined, n = 10) => (c ? c.slice(0, n) + '…' : '—')

/** Basis points as a percentage, with a true minus sign. */
export const pct = (bp: number) => (bp < 0 ? '−' : '') + (Math.abs(bp) / 100).toFixed(2) + '%'

/** Basis points as a signed percentage, for a quantity whose sign carries meaning. */
export const spct = (bp: number) =>
  (bp > 0 ? '+' : bp < 0 ? '−' : '') + (Math.abs(bp) / 100).toFixed(2) + '%'

/** Party A's share of one precinct's two-party vote, in basis points. */
export const cellShareBp = (cell: Cell) =>
  Math.round((10000 * cell.votesA) / (cell.votesA + cell.votesB))

/* ------------------------------------------------------------------- colour */

/**
 * Diverging fill for party lean, midpoint 50%.
 *
 * Blue ↔ orange rather than blue ↔ red: warm/cool poles read as opposite, and
 * red/blue would import a specific party mapping onto what are abstract parties.
 * Validated against the dark surface — the cross-arm pairs a reader must never
 * confuse clear ΔE 18–32 under simulated colour-vision deficiency.
 */
export function leanFill(bp: number): string {
  const d = bp - 5000
  if (d > 900) return 'var(--lean-a-strong)'
  if (d >= 150) return 'var(--lean-a)'
  if (d < -900) return 'var(--lean-b-strong)'
  if (d <= -150) return 'var(--lean-b)'
  return 'var(--even)'
}

/** Categorical identity for the two plans compared in the swing chart. */
export const SWING_SERIES = [
  { key: 'fairfax', label: 'Fairfax', color: 'var(--plan-fairfax)' },
  { key: 'crackland2', label: 'Crackland v2', color: 'var(--plan-crackland)' },
]
