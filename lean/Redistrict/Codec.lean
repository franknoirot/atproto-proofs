import Redistrict.Metrics

/-!
# From a published record to a value the theory can talk about

A proof is about a Lean value. An artifact is a `gov.redistrict.plan` record —
a tree of strings and integers, content-addressed by CID. If those two can drift
apart, a proof certifies nothing in particular, so something has to fix the
correspondence, and it matters *who*.

Putting the decode in the checker would mean every checker has its own opinion
about what a record means, and two honest checkers could reach opposite verdicts
about the same CID without either being wrong. So the decode lives here, in the
regulator's theory package, named by the `decoder` field of the published
`dev.provable.theory` record. The checker's remaining job is a transliteration:
DRISL/CBOR into the `Raw` structure below, field for field, with no decisions in
it. Everything with a judgment call — how precincts are ordered, how counties
are numbered, what counts as a malformed plan — is in Lean and is kernel-checked
along with the rest of the obligation.

## Failure is not an escape hatch

`decodePlanD` is total: a record that does not decode yields `Plan.rejected`,
which has no precincts and therefore fails `WellFormed`, and every published
requirement opens with a well-formedness clause. So a malformed artifact cannot
be certified — not by checker etiquette, but because the obligation is false. A
prover who submits garbage has to prove something untrue.

## Indices are assigned here

The theory is index-based (see `Redistrict.Model`) and records are name-based.
The translation is fixed by two canonical rules: a precinct's index is its
position in the record's `precincts` array, and a county's index is the position
of its first appearance scanning that array in order. Both are total functions of
the record's bytes, so the same CID always yields the same plan.
-/

namespace Redistrict
namespace Codec

/-! ## The wire shape

These mirror `gov.redistrict.plan` and `gov.redistrict.defs` exactly. They exist
so the checker has nothing to decide. -/

structure RawPrecinct where
  id : String
  county : String
  population : Nat
  votesA : Nat
  votesB : Nat
  deriving Repr, DecidableEq, Inhabited

structure RawEdge where
  a : String
  b : String
  deriving Repr, DecidableEq, Inhabited

structure RawAssignment where
  precinct : String
  district : Nat
  deriving Repr, DecidableEq, Inhabited

structure Raw where
  districtCount : Nat
  precincts : List RawPrecinct
  adjacency : List RawEdge
  assignment : List RawAssignment
  deriving Repr, DecidableEq, Inhabited

/-! ## Name resolution

Both lookups are linear scans over association lists. That is quadratic in the
number of precincts, and it is the one part of this theory that is not written
for the kernel's benefit — but it runs once per artifact, against string literals
the kernel compares natively, where the metrics run once per district per
evaluation. -/

/-- Position of `s` in `l`, or `none`. -/
def indexOf? (l : List String) (s : String) : Option Nat :=
  let rec go : List String → Nat → Option Nat
    | [], _ => none
    | x :: xs, i => if x == s then some i else go xs (i + 1)
  go l 0

/-- Distinct county names in order of first appearance. This ordering is the
canonical numbering of counties; nothing else determines it. -/
def countyNames (ps : List RawPrecinct) : List String :=
  ps.foldl (init := []) fun acc p =>
    if acc.contains p.county then acc else acc ++ [p.county]

/-- Look up a precinct's district in the assignment list. -/
def districtOf? (asg : List RawAssignment) (id : String) : Option Nat :=
  match asg.find? (fun a => a.precinct == id) with
  | some a => some a.district
  | none => none

/-! ## The decoder -/

/-- The plan a record decodes to when it does not decode.

No precincts, so `WellFormed` fails, so every requirement that opens with a
well-formedness clause is false of it. -/
def rejected : Plan :=
  { districtCount := 0, countyCount := 0, precincts := [], adjacency := [], district := [] }

/-- Decode a published plan record.

Rejects, rather than silently repairing:
* a precinct with no assignment, or two precincts sharing an id;
* an adjacency edge naming a precinct that does not exist;
* an assignment naming a district outside `districtCount`.

Each of these is a record that means something different depending on how it is
read, and a theory that guessed would let two checkers disagree. -/
def decodePlan (r : Raw) : Except String Plan := do
  let ids := r.precincts.map (·.id)
  let counties := countyNames r.precincts
  if ids.eraseDups.length != ids.length then
    throw "duplicate precinct id"
  let district ← ids.mapM fun id =>
    match districtOf? r.assignment id with
    | some d =>
        if d < r.districtCount then pure d
        else throw s!"precinct {id} assigned to district {d}, which does not exist"
    | none => throw s!"precinct {id} has no district assignment"
  let precincts ← r.precincts.mapM fun p =>
    match indexOf? counties p.county with
    | some c => pure ({ population := p.population, votesA := p.votesA,
                        votesB := p.votesB, county := c } : Precinct)
    | none => throw s!"unreachable: county {p.county} not in its own index"
  let adjacency ← r.adjacency.mapM fun e =>
    match indexOf? ids e.a, indexOf? ids e.b with
    | some i, some j => pure (i, j)
    | _, _ => throw s!"adjacency edge names an unknown precinct: {e.a}–{e.b}"
  return { districtCount := r.districtCount
           countyCount := counties.length
           precincts := precincts
           adjacency := adjacency
           district := district }

/-- Total form of `decodePlan`, for use in a proof obligation.

An obligation has to be a single proposition about a single plan, and it must not
become vacuously true when a record is malformed. Mapping failure to `rejected`
gives both: the obligation stays a plain statement about one value, and a record
that does not decode produces a value no requirement holds of. -/
def decodePlanD (r : Raw) : Plan :=
  match decodePlan r with
  | .ok p => p
  | .error _ => rejected

/-- A rejected plan satisfies no requirement that checks well-formedness. -/
theorem rejected_not_wellFormed : ¬ WellFormed rejected := by decide

end Codec
end Redistrict
