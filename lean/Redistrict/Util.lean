/-!
# Small helpers

Everything here exists to keep the metrics kernel-cheap. A requirement is only
useful if `decide` can actually evaluate it inside Lean's kernel on a real plan,
and the kernel has no special support for `Array` or `List` — it walks them one
constructor at a time. It *does* have GMP-backed `Nat` arithmetic, including the
bitwise operations. So sets of precincts are represented as `Nat` bitmasks and
set operations become single machine-word ops rather than list traversals.
-/

namespace Redistrict

/-- Fold with the element's position, without repeated indexing.
`List.getD` in a loop turns an O(n) pass into O(n²) kernel reductions; this
keeps it linear. -/
def foldIdx {α β : Type} (l : List α) (init : β) (f : β → Nat → α → β) : β :=
  (l.foldl (fun (s : β × Nat) a => (f s.1 s.2 a, s.2 + 1)) (init, 0)).1

/-- Number of set bits below `bound`. Used to count how many districts a county
is divided among. -/
def bitCount (n : Nat) : Nat → Nat
  | 0 => 0
  | k + 1 => (if n.testBit k then 1 else 0) + bitCount n k

/-- Absolute value on `Int`. Core Lean has `Int.natAbs`, but that changes type,
and mixing `Nat` and `Int` in the middle of an inequality makes `omega`'s job
harder than it needs to be. -/
def iabs (x : Int) : Int := if 0 ≤ x then x else -x

theorem iabs_le_iff {x b : Int} : iabs x ≤ b ↔ (x ≤ b ∧ -b ≤ x) := by
  unfold iabs; split <;> omega

theorem le_iabs (x : Int) : x ≤ iabs x := by unfold iabs; split <;> omega

theorem neg_iabs_le (x : Int) : -iabs x ≤ x := by unfold iabs; split <;> omega

/-- A magnitude bound holding at both ends of a range holds everywhere in it.

Stated with the `10000 *` factor already applied because that is the shape every
threshold in this theory takes: basis points are cleared by scaling rather than
dividing, so the bound is never on `iabs x` alone. -/
theorem iabs_le_of_between {x y z b : Int} (h1 : x ≤ y) (h2 : y ≤ z)
    (hx : 10000 * iabs x ≤ b) (hz : 10000 * iabs z ≤ b) : 10000 * iabs y ≤ b := by
  unfold iabs at hx hz ⊢
  split at hx <;> split at hz <;> split <;> omega

/-- Sum of a list of integers.

Right fold rather than left: `isum (x :: xs) = x + isum xs` then holds by `rfl`,
which turns every induction over a sum in `Redistrict.Swing` into a one-line
unfold. The lists here are one entry per district, so the lost tail recursion
costs nothing. -/
def isum (l : List Int) : Int := l.foldr (· + ·) 0

@[simp] theorem isum_nil : isum [] = 0 := rfl

@[simp] theorem isum_cons (x : Int) (xs : List Int) : isum (x :: xs) = x + isum xs := rfl

theorem isum_nonneg {l : List Int} (h : ∀ x ∈ l, 0 ≤ x) : 0 ≤ isum l := by
  induction l with
  | nil => simp
  | cons x xs ih =>
      have hx : 0 ≤ x := h x (by simp)
      have : 0 ≤ isum xs := ih fun y hy => h y (by simp [hy])
      simp only [isum_cons]
      omega

end Redistrict
