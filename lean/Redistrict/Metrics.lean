import Redistrict.Model

/-!
# The metrics a requirement can constrain

Each metric comes in two forms: a `Bool`-valued computation and a `Prop` that
says the computation returned `true`. The split is not decoration. Stating the
`Prop` as `f p = true` means `decide` has one job — reduce a `Bool` — instead of
navigating a tower of `Decidable` instances, and it is the difference between an
obligation the kernel discharges in milliseconds and one it does not discharge at
all.

Thresholds are in basis points (1 bp = 0.01%) and comparisons are
cross-multiplied, so nothing here divides and nothing rounds.
-/

namespace Redistrict
namespace Plan

/-! ## Contiguity -/

/-- One round of flood fill. A precinct joins the reached set if it is inside
`mask` and adjacent to something already reached.

The whole state of the search is two `Nat` bitmasks, so each edge costs a handful
of GMP-backed bit operations rather than a list traversal. -/
def expand (adj : List (Nat × Nat)) (mask reached : Nat) : Nat :=
  adj.foldl (init := reached) fun r e =>
    let (a, b) := e
    if mask.testBit a && mask.testBit b then
      if r.testBit a then r ||| (1 <<< b)
      else if r.testBit b then r ||| (1 <<< a)
      else r
    else r

/-- Flood fill to a fixed point, with `fuel` bounding the number of rounds.

Each round adds at least one precinct or the search has converged, so `fuel` set
to the precinct count is always enough. The early exit on `r == reached` means
the usual cost is the graph's diameter, not its size. -/
def floodFill (adj : List (Nat × Nat)) (mask : Nat) : Nat → Nat → Nat
  | 0, reached => reached
  | fuel + 1, reached =>
      let r := expand adj mask reached
      if r == reached then r else floodFill adj mask fuel r

/-- District `d` is nonempty and connected in the adjacency graph. -/
def districtContiguousB (p : Plan) (d : Nat) : Bool :=
  let mask := p.districtMask d
  let seed := p.districtSeed d
  seed != 0 && floodFill p.adjacency mask p.size seed == mask

/-- Every district is a single connected piece. -/
def contiguousB (p : Plan) : Bool :=
  (List.range p.districtCount).all p.districtContiguousB

/-! ## Population equality -/

/-- No district's population departs from the ideal by more than `bp` basis
points.

The ideal is `total / districtCount`, so the deviation condition
`|pop_d - ideal| / ideal ≤ bp/10000` is cleared of both divisions at once as
`10000 * |pop_d * districtCount - total| ≤ bp * total`. Exact, and it says the
same thing whatever the population happens to be divisible by. -/
def popDevOkB (p : Plan) (bp : Nat) : Bool :=
  let total := p.totalPopulation
  let dc := p.districtCount
  (List.range dc).all fun d =>
    let scaled := p.districtPopulation d * dc
    let dev := if scaled ≥ total then scaled - total else total - scaled
    10000 * dev ≤ bp * total

/-! ## County integrity -/

/-- No county is divided among more than `k + 1` districts. -/
def countySplitsOkB (p : Plan) (k : Nat) : Bool :=
  (List.range p.countyCount).all fun c => p.countySplits c ≤ k

/-! ## Structural well-formedness

Not a fairness criterion — a precondition. A requirement that quantified over
malformed plans would be vacuous or nonsense, and a state should not be able to
discharge an obligation by submitting a plan whose assignment list is the wrong
length. -/

/-- Every precinct has exactly one district, every district index is in range,
every district is nonempty, and every adjacency endpoint exists. -/
def structureOkB (p : Plan) : Bool :=
  p.precincts.length == p.district.length
    && p.size > 0
    && p.districtCount > 0
    && p.district.all (· < p.districtCount)
    && p.precincts.all (·.county < p.countyCount)
    && p.adjacency.all (fun e => e.1 < p.size && e.2 < p.size)
    && (List.range p.districtCount).all (fun d => p.districtMask d != 0)

/-- No district has zero turnout.

Split out from the rest because the swing theorem needs exactly this fact and
nothing else about well-formedness, and digging it back out of a seven-way
conjunction at every use site is worse than naming it. -/
def talliesPosB (p : Plan) : Bool := p.tallies.all fun dt => 0 < dt.t

/-- The plan is structurally sound and every district has voters in it. -/
def wellFormedB (p : Plan) : Bool := p.structureOkB && p.talliesPosB

end Plan

/-! ## The propositions

Wrappers giving each metric a name a requirement can use. -/

/-- Every district is a single connected piece in the plan's adjacency graph. -/
def Contiguous (p : Plan) : Prop := p.contiguousB = true

/-- No district's population departs from the ideal by more than `bp` basis points. -/
def PopulationDeviationAtMost (p : Plan) (bp : Nat) : Prop := p.popDevOkB bp = true

/-- No county is divided among more than `k + 1` districts. -/
def CountySplitsAtMost (p : Plan) (k : Nat) : Prop := p.countySplitsOkB k = true

/-- The plan's assignment, adjacency and tallies are structurally sound. -/
def WellFormed (p : Plan) : Prop := p.wellFormedB = true

/-- The efficiency gap of the plan's own results is within `bp` basis points. -/
def EfficiencyGapAtMost (p : Plan) (bp : Int) : Prop := EgAtMost p.tallies bp

/-- The only consequence of well-formedness the swing theory needs. -/
theorem tallies_pos_of_wellFormed {p : Plan} (h : WellFormed p) :
    ∀ dt ∈ p.tallies, 0 < dt.t := by
  simp only [WellFormed, Plan.wellFormedB, Bool.and_eq_true, Plan.talliesPosB,
    List.all_eq_true, decide_eq_true_eq] at h
  exact h.2

instance (p : Plan) : Decidable (Contiguous p) := inferInstanceAs (Decidable (_ = true))
instance (p : Plan) (bp : Nat) : Decidable (PopulationDeviationAtMost p bp) :=
  inferInstanceAs (Decidable (_ = true))
instance (p : Plan) (k : Nat) : Decidable (CountySplitsAtMost p k) :=
  inferInstanceAs (Decidable (_ = true))
instance (p : Plan) : Decidable (WellFormed p) := inferInstanceAs (Decidable (_ = true))
instance (p : Plan) (bp : Int) : Decidable (EfficiencyGapAtMost p bp) :=
  inferInstanceAs (Decidable (EgAtMost _ _))

end Redistrict
