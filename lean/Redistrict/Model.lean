import Redistrict.Util
import Redistrict.Tally

/-!
# What a districting plan is

The regulator's ontology. This is the half of the theory that says what the
regulated object *is*, before anything says whether it is acceptable.

## Everything is an index

Precincts, counties and districts are identified by position, never by name.
A plan carries no strings at all. That is a deliberate constraint on the
`gov.redistrict.plan` decoder rather than a convenience: string equality in
Lean's kernel walks a list of characters one constructor at a time, and a
requirement whose truth cannot be evaluated by the kernel on a real plan is not
a requirement anyone can discharge.

Names are display metadata. They live in the record and never reach the theory,
which also means two records that differ only in what they call things are the
same plan as far as the law is concerned — which is correct.

## Parallel arrays

`precincts` and `district` are parallel lists indexed by precinct. Keeping the
assignment separate from the precinct data reflects what is actually under the
state's control: a state cannot choose its populations, only its districts.
-/

namespace Redistrict

/-- One unit of geography. `county` is an index into the plan's counties. -/
structure Precinct where
  population : Nat
  votesA : Nat
  votesB : Nat
  county : Nat
  deriving Repr, DecidableEq, Inhabited

/-- A districting plan.

`adjacency` is an undirected graph on precinct indices, supplied by the plan's
author. Contiguity is defined against this graph and nothing else: the theory has
no notion of geometry, so a plan that lies about which precincts touch can prove
contiguity of a discontiguous map. That is a real limitation and it lives in the
same category as lying about populations — see the `censusSource` field on the
record lexicon. -/
structure Plan where
  districtCount : Nat
  countyCount : Nat
  precincts : List Precinct
  adjacency : List (Nat × Nat)
  district : List Nat
  deriving Repr, DecidableEq, Inhabited

namespace Plan

/-- Number of precincts. -/
def size (p : Plan) : Nat := p.precincts.length

/-- Precincts paired with their district. Every aggregate below is a single fold
over this, which keeps the whole metric suite linear in the number of precincts. -/
def assigned (p : Plan) : List (Precinct × Nat) := p.precincts.zip p.district

/-- Bitmask of the precincts in district `d`. -/
def districtMask (p : Plan) (d : Nat) : Nat :=
  foldIdx p.district 0 fun m i dd => if dd == d then m ||| (1 <<< i) else m

/-- Bitmask containing only the lowest-indexed precinct of district `d`, or `0`
if the district is empty. Used as the seed for the contiguity flood fill; picking
it out during the same pass avoids a separate scan for the low bit. -/
def districtSeed (p : Plan) (d : Nat) : Nat :=
  foldIdx p.district 0 fun m i dd => if dd == d && m == 0 then 1 <<< i else m

/-- Total population of district `d`. -/
def districtPopulation (p : Plan) (d : Nat) : Nat :=
  p.assigned.foldl (init := 0) fun acc (pr, dd) =>
    if dd == d then acc + pr.population else acc

/-- Statewide population. -/
def totalPopulation (p : Plan) : Nat :=
  p.precincts.foldl (init := 0) fun acc pr => acc + pr.population

/-- Two-party result in district `d`. -/
def districtTally (p : Plan) (d : Nat) : Tally :=
  p.assigned.foldl (init := ⟨0, 0⟩) fun tl (pr, dd) =>
    if dd == d then
      ⟨tl.a + (pr.votesA : Int), tl.t + (pr.votesA : Int) + (pr.votesB : Int)⟩
    else tl

/-- Results in every district, in district order. This is the bridge from the
plan representation to the partisan-fairness theory in `Redistrict.Tally`. -/
def tallies (p : Plan) : List Tally :=
  (List.range p.districtCount).map p.districtTally

/-- Bitmask of the districts that county `c` is divided among. -/
def countyDistrictMask (p : Plan) (c : Nat) : Nat :=
  p.assigned.foldl (init := 0) fun m (pr, dd) =>
    if pr.county == c then m ||| (1 <<< dd) else m

/-- How many times county `c` is split: one fewer than the number of districts it
touches. A county wholly inside one district is split zero times. -/
def countySplits (p : Plan) (c : Nat) : Nat :=
  bitCount (p.countyDistrictMask c) p.districtCount - 1

end Plan

end Redistrict
