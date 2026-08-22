/**
 * Transliterate a published plan record into a Lean `Codec.Raw` literal.
 *
 * This is the checker's entire share of the decode, and it is deliberately
 * mechanical: field for field, string for string, integer for integer, with no
 * reordering, no defaulting, and no interpretation. Everything with a judgement
 * in it — how precincts are numbered, how counties are indexed, what makes a
 * plan malformed — lives in `Redistrict.Codec` inside the regulator's theory,
 * where it is kernel-checked as part of the obligation.
 *
 * The split matters for a reason that is easy to miss: if the checker owned the
 * decode, two honest checkers could reach opposite verdicts about the same CID
 * and neither would be wrong, because nothing published would say which reading
 * was correct. Keeping the checker's part free of decisions is what makes
 * "re-run it yourself" a meaningful invitation.
 */

/** Escape a string for a Lean string literal. */
function leanStr(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new EmitError(`${field} is missing or not an array`)
  return value
}

function requireStr(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new EmitError(`${field} is missing or not a string`)
  return value
}

/**
 * Reject anything that is not a non-negative safe integer.
 *
 * DRISL/CBOR can carry integers Lean's `Nat` cannot round-trip through
 * JavaScript's number type, and a silent precision loss here would mean the
 * proof is about different numbers than the record holds. Refusing is the only
 * safe answer; the alternative is a verdict about a map that does not exist.
 */
function requireNat(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new EmitError(`${field} is not a non-negative integer that survives transliteration`)
  }
  return value
}

/** Raised when a record cannot be transliterated without interpreting it. */
export class EmitError extends Error {}

/**
 * Render a `gov.redistrict.plan` record as Lean source for a `Codec.Raw`.
 *
 * A record that reaches Lean and fails to decode there produces `Codec.rejected`
 * and so fails every requirement — that path is handled by the theory. This
 * function only refuses records it cannot transliterate *at all*, which is a
 * different failure and gets a different verdict outcome (`malformed`).
 */
export function emitRawPlan(record: Record<string, unknown>): string {
  const districtCount = requireNat(record.districtCount, 'districtCount')

  const precincts = requireArray(record.precincts, 'precincts').map((p, i) => {
    const o = p as Record<string, unknown>
    return (
      `    { id := ${leanStr(requireStr(o.id, `precincts[${i}].id`))}, ` +
      `county := ${leanStr(requireStr(o.county, `precincts[${i}].county`))}, ` +
      `population := ${requireNat(o.population, `precincts[${i}].population`)}, ` +
      `votesA := ${requireNat(o.votesA, `precincts[${i}].votesA`)}, ` +
      `votesB := ${requireNat(o.votesB, `precincts[${i}].votesB`)} }`
    )
  })

  const adjacency = requireArray(record.adjacency, 'adjacency').map((e, i) => {
    const o = e as Record<string, unknown>
    return (
      `    { a := ${leanStr(requireStr(o.a, `adjacency[${i}].a`))}, ` +
      `b := ${leanStr(requireStr(o.b, `adjacency[${i}].b`))} }`
    )
  })

  const assignment = requireArray(record.assignment, 'assignment').map((a, i) => {
    const o = a as Record<string, unknown>
    return (
      `    { precinct := ${leanStr(requireStr(o.precinct, `assignment[${i}].precinct`))}, ` +
      `district := ${requireNat(o.district, `assignment[${i}].district`)} }`
    )
  })

  const list = (items: string[]) => (items.length === 0 ? '[]' : `[\n${items.join(',\n')} ]`)

  return [
    '{ districtCount := ' + districtCount,
    '  precincts := ' + list(precincts),
    '  adjacency := ' + list(adjacency),
    '  assignment := ' + list(assignment),
    '}',
  ].join('\n')
}
