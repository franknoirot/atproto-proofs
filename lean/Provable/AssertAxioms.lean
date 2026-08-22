import Lean

/-!
# Axiom auditing

`#print axioms foo` reports what a theorem really rests on, but it reports it to
*stdout*, and a checker built on scraping stdout fails open: change the message
format, drop the output, mis-parse a name, and an unproved theorem sails through
as verified. The whole point of an automated checker is that its failures should
be loud.

`#assert_axioms` performs the same query and turns a bad answer into a build
error. `lake build` exits nonzero, and a checker that ignores exit codes was
never going to work anyway.

## What counts as bad

Anything outside the declared allowance. In practice the allowance is Lean's
three standard axioms — `propext`, `Classical.choice`, `Quot.sound` — and the
things that must not appear are:

* **`sorryAx`** — the proof has a hole. This is the obvious one.
* **native evaluation axioms** — introduced by `decide +native` and
  `@[implemented_by]`. These are not holes: they are claims that Lean's compiler
  and its kernel agree about a computation. Usually true, but it moves the
  compiler into the trusted base, and a regulator's checker should be able to say
  whether a given verdict depends on that. Since Lean 4.29 each such use
  contributes its own named axiom rather than one blanket `Lean.trustCompiler`,
  so the report says precisely which computations were taken on trust.
* **anything the prover declared with `axiom`** — a prover who can add axioms can
  prove anything.

## What this does not do

This runs inside the same Lean process that elaborated the proof, so it inherits
that process's assumptions. It is the middle rung of the ladder in Lean's own
guidance: above `#print axioms` read by eye, below `lean4checker --fresh`
replaying the environment through a clean kernel, and well below exporting the
proof term for an independent implementation to check. `DESIGN.md` records which
rung this project stops at and why.
-/

namespace Provable

open Lean Elab Command

/-- The axioms a proof may depend on without comment. -/
def standardAxioms : List Name := [``propext, ``Classical.choice, ``Quot.sound]

/-- Report the axioms a declaration depends on, and fail the build if any of them
falls outside the allowed list.

```
#assert_axioms Obligation.proof
#assert_axioms Obligation.proof allowing [propext, Classical.choice, Quot.sound]
```

With no `allowing` clause the allowance is `standardAxioms`. Naming an allowance
explicitly is the honest way to accept a weaker trust level: a verdict issued
under a widened allowance can say so, rather than quietly depending on something
its reader would not have granted. -/
syntax (name := assertAxioms) "#assert_axioms " ident (" allowing " "[" ident,* "]")? : command

elab_rules : command
  | `(command| #assert_axioms $declId:ident $[allowing [$allowed?,*]]?) => do
      let declName ← liftCoreM <| realizeGlobalConstNoOverload declId
      let allowed : List Name ← match allowed? with
        | none => pure standardAxioms
        | some ids => ids.getElems.toList.mapM fun i =>
            liftCoreM <| realizeGlobalConstNoOverload (i : Ident)
      let found := (← collectAxioms declName).qsort Name.lt
      let offending := found.filter fun a => !allowed.contains a
      unless offending.isEmpty do
        throwError
          "'{declName}' depends on axioms outside the allowed set: \
           {offending.toList.map (·.toString)}\n\
           allowed: {allowed.map (·.toString)}\n\
           all axioms found: {found.toList.map (·.toString)}"
      if found.isEmpty then
        logInfo m!"'{declName}' depends on no axioms"
      else
        logInfo m!"'{declName}' depends on axioms: {found.toList.map (·.toString)}"

end Provable
