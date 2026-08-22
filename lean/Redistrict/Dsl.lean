import Lean
import Redistrict.Swing

/-!
# The requirement language

Surface syntax so that a requirement reads as a rule rather than as a term:

```
requirement section2 titled "Fair Districting Act § 2" for plan P where
  · the plan is well formed
  · every district is contiguous
  · population deviation is at most 0.50%
  · the efficiency gap is at most 7.00%
  · no county is split more than 1 time
```

## Why this is not decoration

The published `dev.provable.requirement` record carries this text in its
`statement` field, and the text is the *same source* the theory package compiles.
There is no informal restatement of the rule sitting alongside a formal one, so
there is no gap for the two to drift apart in. A reader who checks that the
record's `statement` matches the theory's source has checked everything; there is
no third artifact to audit.

## Named clauses

Each line elaborates to a conjunct wrapped in `Named`, and the command emits a
companion `.clauses` function that evaluates each conjunct on its own.

That companion is what lets a refutation say *which* part of the rule a plan
broke. Without it a checker can only report that a conjunction failed, which is
no use to the state that has to fix the map or to the public trying to understand
why. And because the obligation and the clause list are generated from one
source, the names in a verdict cannot fall out of step with the rule.

## Units

Thresholds may be written as a percentage (`7.00%`) or in basis points
(`700 bp`); both elaborate to the same integer. Percentages are accepted only to
two decimal places, because that is the precision basis points have — the DSL
refuses to parse a threshold it cannot represent exactly rather than silently
rounding a legal limit.
-/

namespace Redistrict

/-- A conjunct tagged with the clause name it came from.

Reducible, so `decide` and the kernel see straight through it to `P`, while the
elaborated statement still displays the clause names for anyone reading it. -/
@[reducible] def Named (_name : String) (P : Prop) : Prop := P

/-- What evaluating a single clause established.

The three-way split matters. A tier-1 clause is decidable, so evaluation settles
it either way. A tier-2 clause quantifies over an unbounded range and evaluation
can only ever *refute* it — by exhibiting a swing that breaks the bound — never
confirm it. Collapsing `undecided` into `refuted` would report every unproved
durability clause as a violation, and collapsing it into `holds` would report
every unproved one as satisfied. Both are lies about what was checked. -/
inductive ClauseStatus where
  /-- Evaluation established the clause. -/
  | holds
  /-- Evaluation established that the clause fails. -/
  | refuted
  /-- Evaluation cannot settle this clause; only a proof can. -/
  | undecided
  deriving Repr, DecidableEq, Inhabited

namespace ClauseStatus

def ofDecide (b : Bool) : ClauseStatus := if b then .holds else .refuted

def toString : ClauseStatus → String
  | .holds => "holds"
  | .refuted => "refuted"
  | .undecided => "undecided"

instance : ToString ClauseStatus := ⟨toString⟩

end ClauseStatus

/-- A sound refutation check for a swing-durability clause.

Samples the band at its edges, its quarter points and zero. A failure at any
sample refutes the clause outright, because the clause quantifies over every
swing in the band and a sample is one of them. Passing every sample establishes
nothing: the gap could still break the bound between samples, and settling that
is what `swingRobust_of_chain` is for. Hence `undecided` rather than `holds`. -/
def swingProbe (p : Plan) (S bp : Int) : ClauseStatus :=
  let samples := [-S, -S / 2, 0, S / 2, S]
  if samples.all fun s => decide (EgAtMost (p.tallies.map (Tally.swing s)) bp)
  then .undecided else .refuted

open Lean Elab Command Term

/-! ### A note on tokens

Every English word below is written `&"word"` rather than `"word"`. Lean's token
table is global, so a plain string atom reserves that word as a keyword in every
file downstream — spelling requirements in English with plain atoms would make
`plan`, `gap`, `time` and `bp` unusable as ordinary identifiers in anything that
imports this theory. `&"..."` matches the word without reserving it.

A syntax category cannot *begin* with a non-reserved word, though, because the
parser dispatches on the leading token. Hence the `·` bullet: it is already a
Lean token, so it costs nothing, it gives the category something to dispatch on,
and a bulleted list is what legal text looks like anyway. -/

/-- A threshold, in basis points or as a percentage. -/
declare_syntax_cat rdThreshold
syntax num &"bp" : rdThreshold
syntax scientific "%" : rdThreshold
syntax num "%" : rdThreshold

/-- One line of a requirement. -/
declare_syntax_cat rdClause
syntax "·" &"the" &"plan" &"is" &"well" &"formed" : rdClause
syntax "·" &"every" &"district" &"is" &"contiguous" : rdClause
syntax "·" &"population" &"deviation" &"is" &"at" &"most" rdThreshold : rdClause
syntax "·" &"the" &"efficiency" &"gap" &"is" &"at" &"most" rdThreshold : rdClause
syntax "·" &"no" &"county" &"is" &"split" &"more" &"than" num &"time" : rdClause
syntax "·" &"no" &"county" &"is" &"split" &"more" &"than" num &"times" : rdClause
syntax "·" &"the" &"efficiency" &"gap" &"stays" &"within" rdThreshold
  &"under" &"every" &"uniform" &"swing" &"of" &"at" &"most" rdThreshold : rdClause

/-- Resolve a threshold to basis points.

Rejects anything finer than 0.01%: a legal limit that cannot be represented
exactly is a limit two implementations could disagree about. -/
private def thresholdBp : TSyntax `rdThreshold → CommandElabM Nat
  | `(rdThreshold| $n:num bp) => return n.getNat
  | `(rdThreshold| $n:num %) => return n.getNat * 100
  | stx@`(rdThreshold| $s:scientific %) => do
      let (m, sign, e) := s.getScientific
      unless sign do
        throwErrorAt stx "a percentage threshold must be a decimal fraction"
      if e > 2 then
        throwErrorAt stx
          "threshold is finer than one basis point; basis points cannot represent it exactly"
      return m * (10 ^ (2 - e))
  | stx => throwErrorAt stx "unrecognized threshold"

/-- What one clause contributes: its machine name, the proposition it asserts,
and how far evaluation alone can get with it.

The machine name is what appears in a verdict's `failedClause` and in the
requirement record's `clauses` array. -/
private structure ClauseSpec where
  name : String
  prop : Term
  probe : Term

/-- Build a spec for a clause that evaluation decides outright. -/
private def decidableClause (n : String) (prop : Term) : CommandElabM ClauseSpec :=
  return { name := n, prop, probe := ← `(ClauseStatus.ofDecide (decide $prop)) }

/-- Translate one clause of the surface syntax. -/
private def clauseInfo (p : Ident) : TSyntax `rdClause → CommandElabM ClauseSpec
  | `(rdClause| · the plan is well formed) => do
      decidableClause "wellFormed" (← `(WellFormed $p))
  | `(rdClause| · every district is contiguous) => do
      decidableClause "contiguity" (← `(Contiguous $p))
  | `(rdClause| · population deviation is at most $t:rdThreshold) => do
      let lim := Syntax.mkNumLit (toString (← thresholdBp t))
      decidableClause "populationDeviation" (← `(PopulationDeviationAtMost $p $lim))
  | `(rdClause| · the efficiency gap is at most $t:rdThreshold) => do
      let lim := Syntax.mkNumLit (toString (← thresholdBp t))
      decidableClause "efficiencyGap" (← `(EfficiencyGapAtMost $p $lim))
  | `(rdClause| · no county is split more than $k:num time) => do
      decidableClause "countySplits" (← `(CountySplitsAtMost $p $k))
  | `(rdClause| · no county is split more than $k:num times) => do
      decidableClause "countySplits" (← `(CountySplitsAtMost $p $k))
  | `(rdClause| · the efficiency gap stays within $t:rdThreshold
        under every uniform swing of at most $s:rdThreshold) => do
      let lim := Syntax.mkNumLit (toString (← thresholdBp t))
      let band := Syntax.mkNumLit (toString (← thresholdBp s))
      -- Unbounded quantification: evaluation can refute this but never confirm it.
      return { name := "swingRobustness"
               prop := ← `(SwingRobust $p $band $lim)
               probe := ← `(swingProbe $p $band $lim) }
  | stx => throwErrorAt stx "unrecognized requirement clause"

/-- Declare a requirement.

Emits three declarations under `name`:
* `name : Plan → Prop` — the obligation, a conjunction of `Named` clauses;
* `name.title : String` — the human title, mirrored by the published record;
* `name.clauses : Plan → List (String × ClauseStatus)` — each clause evaluated
  on its own, as far as evaluation can take it.
-/
-- `titled` and `plan` are non-reserved for the same reason the clause words are:
-- a plain atom would make `plan` a keyword in every file downstream, which would
-- among other things stop the checker from naming a generated definition `plan`.
-- `requirement` stays reserved because a command is dispatched on its first
-- token; `for` and `where` are Lean keywords already.
syntax (name := requirementCmd)
  "requirement " ident &"titled" str "for " &"plan" ident " where"
  withPosition((colGe rdClause)+) : command

elab_rules : command
  | `(command| requirement $name titled $title for plan $p where $cs:rdClause*) => do
      let specs ← cs.mapM (clauseInfo p)
      -- Right-nested conjunction of the tagged clauses.
      let mut body : Option Term := none
      for spec in specs.reverse do
        let tagged ← `(Named $(Syntax.mkStrLit spec.name) $(spec.prop))
        match body with
        | none => body := some tagged
        | some rest => body := some (← `($tagged ∧ $rest))
      let some bodyTerm := body
        | throwError "a requirement needs at least one clause"
      let titleName := mkIdentFrom name (name.getId ++ `title)
      let clausesName := mkIdentFrom name (name.getId ++ `clauses)
      let entries ← specs.mapM fun spec =>
        `(($(Syntax.mkStrLit spec.name), $(spec.probe)))
      -- Reducible so that `Decidable` synthesis can see the conjunction. Without
      -- it, a requirement whose every clause is decidable is still not decidable
      -- as a whole, and `by decide` fails on a tier-1 obligation for a reason
      -- that has nothing to do with the map. Requirements with an undecidable
      -- clause still have no instance, which is correct: § 5 must not fall to
      -- `decide`.
      elabCommand (← `(@[reducible] def $name ($p : Plan) : Prop := $bodyTerm))
      elabCommand (← `(
        /-- Human title of this requirement, mirrored by the published record. -/
        def $titleName : String := $title))
      elabCommand (← `(
        /-- Each clause of this requirement evaluated on its own, so a refutation
        can name the clause that failed rather than only report that the
        conjunction did. Clauses that evaluation cannot settle report
        `undecided` rather than being guessed either way. -/
        def $clausesName ($p : Plan) : List (String × ClauseStatus) := [$entries,*]))

end Redistrict
