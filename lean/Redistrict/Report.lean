import Redistrict.Dsl

/-!
# Human-readable reporting

Display only. Nothing here participates in a proof obligation, and nothing here
is trusted: these are the numbers a verdict quotes so that a refutation is
legible to someone who will never run Lean.

They are computed by the same theory that states the requirements, though, so a
verdict cannot quote an efficiency gap that disagrees with the one the obligation
is about. Recomputing them in the checker would reintroduce exactly the
divergence the theory-side decoder exists to prevent.

This is also the one place in the theory that divides. A displayed percentage is
allowed to round; a legal threshold is not, which is why every requirement is
stated as a cross-multiplied inequality instead.
-/

namespace Redistrict

/-- JSON-escape a string. The reports below are consumed by the checker. -/
private def esc (s : String) : String :=
  s.foldl (init := "") fun acc c =>
    acc ++ (match c with
      | '"' => "\\\""
      | '\\' => "\\\\"
      | '\n' => "\\n"
      | c => c.toString)

/-- Clause-by-clause evaluation, as JSON. -/
def clauseReport (cs : List (String × ClauseStatus)) : String :=
  "[" ++ String.intercalate ","
    (cs.map fun (n, s) => "{\"clause\":\"" ++ esc n ++ "\",\"status\":\"" ++ toString s ++ "\"}")
    ++ "]"

namespace Plan

/-- Efficiency gap in basis points, rounded toward zero. Reporting only. -/
def efficiencyGapBp (p : Plan) : Int :=
  let d := egDen p.tallies
  if d == 0 then 0 else (10000 * egNum p.tallies) / d

/-- Districts won by party A. -/
def seatsA (p : Plan) : Nat :=
  p.tallies.foldl (init := 0) fun n dt => if dt.winsA then n + 1 else n

/-- Party A's statewide two-party vote share, in basis points. -/
def voteShareABp (p : Plan) : Int :=
  let t := totalT p.tallies
  if t == 0 then 0 else (10000 * totalA p.tallies) / t

/-- Largest district population deviation from the ideal, in basis points. -/
def popDevBp (p : Plan) : Nat :=
  let total := p.totalPopulation
  let dc := p.districtCount
  if total == 0 || dc == 0 then 0 else
    (List.range dc).foldl (init := 0) fun worst d =>
      let scaled := p.districtPopulation d * dc
      let dev := if scaled ≥ total then scaled - total else total - scaled
      max worst (10000 * dev / total)

/-- Most times any single county is divided. -/
def worstCountySplit (p : Plan) : Nat :=
  (List.range p.countyCount).foldl (init := 0) fun worst c => max worst (p.countySplits c)

/-- Party A's share of the two-party vote in each district, in basis points. -/
def districtSharesBp (p : Plan) : List Int :=
  p.tallies.map fun dt => if dt.t == 0 then 0 else (10000 * dt.a) / dt.t

/-- The efficiency gap sampled across a band of uniform swings, as JSON.

Exists so that a chart of the gap against the swing is drawn from the theory's
own arithmetic rather than from a second implementation in the presentation
layer. A picture that disagreed with the obligation would be worse than no
picture. -/
def swingCurveJson (p : Plan) (lo hi step : Int) : String :=
  let rec go (s : Int) (fuel : Nat) (acc : List String) : List String :=
    match fuel with
    | 0 => acc.reverse
    | fuel + 1 =>
        if s > hi then acc.reverse
        else
          let swung := p.tallies.map (Tally.swing s)
          let d := egDen swung
          let gap := if d == 0 then 0 else (10000 * egNum swung) / d
          let seats := swung.foldl (init := 0) fun n dt => if dt.winsA then n + 1 else n
          go (s + step) fuel
            (("{\"s\":" ++ toString s ++ ",\"egBp\":" ++ toString gap ++
              ",\"seatsA\":" ++ toString seats ++ "}") :: acc)
  "[" ++ String.intercalate "," (go lo 100000 []) ++ "]"

/-- Everything a verdict quotes about a plan, as JSON. -/
def summaryJson (p : Plan) : String :=
  "{\"districts\":" ++ toString p.districtCount ++
  ",\"precincts\":" ++ toString p.size ++
  ",\"seatsA\":" ++ toString p.seatsA ++
  ",\"voteShareABp\":" ++ toString p.voteShareABp ++
  ",\"efficiencyGapBp\":" ++ toString p.efficiencyGapBp ++
  ",\"popDevBp\":" ++ toString p.popDevBp ++
  ",\"worstCountySplit\":" ++ toString p.worstCountySplit ++ "}"

end Plan
end Redistrict
