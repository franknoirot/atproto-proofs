import Redistrict.Util

/-!
# District tallies and the efficiency gap

The partisan-fairness half of the theory, kept deliberately independent of how a
districting plan is represented. Everything here is a statement about a list of
two-party vote tallies, which makes the swing theorem in `Redistrict.Swing`
provable without ever mentioning precincts, adjacency, or counties.

## Why integers all the way down

The efficiency gap is a ratio, and ratios invite floating point, which has no
place in a legal obligation: two implementations that round differently would
disagree about whether a state broke the law. So the ratio is never computed.
Every threshold is stated as a cross-multiplied integer inequality in basis
points, which is exact, decidable, and means the same thing to every reader.

## Wasted votes

Following Stephanopoulos and McGhee: a party wastes every vote it casts in a
district it loses, and every vote above the winning threshold in a district it
wins. The efficiency gap is the difference in wasted votes over total votes.

The usual definition puts the threshold at 50% + 1 vote. That `+ 1` is an
artifact of vote counts being whole numbers, and carrying it through the swing
analysis would litter every lemma with off-by-one cases for no gain in meaning.
This theory uses the continuous threshold of half the votes, and doubles
everything to stay in the integers. `delta` below is the *doubled* difference in
wasted votes for one district.
-/

namespace Redistrict

/-- Two-party result in one district: `a` votes for party A out of `t` cast.
Party B's votes are `t - a`. -/
structure Tally where
  a : Int
  t : Int
  deriving Repr, DecidableEq, Inhabited

namespace Tally

/-- A district is won by party A when it takes more than half the two-party vote. -/
def winsA (dt : Tally) : Bool := 2 * dt.a > dt.t

/-- Doubled difference in wasted votes, `2 * (wastedA - wastedB)`, for one district.

Derivation, with `b = t - a`:
* A wins: `wastedA = a - t/2`, `wastedB = b`, so `2 * (wastedA - wastedB) = 4a - 3t`.
* B wins: `wastedA = a`, `wastedB = b - t/2`, so `2 * (wastedA - wastedB) = 4a - t`.

Note the two branches differ by exactly `2t`: a seat changing hands moves this
quantity by twice the district's turnout, discontinuously. That discontinuity is
the entire difficulty of the swing theorem, and it is a real property of the
metric rather than an artifact of this encoding. -/
def delta (dt : Tally) : Int :=
  if dt.winsA then 4 * dt.a - 3 * dt.t else 4 * dt.a - dt.t

/-- Apply a uniform partisan swing of `s` basis points toward party A.

Shares are scaled by 10000 rather than divided, so the operation is exact: A's
share goes from `a/t` to `a/t + s/10000` with no rounding anywhere. As a
consequence `swing 0` is not the identity but a uniform rescaling, which leaves
the efficiency gap unchanged because numerator and denominator scale together. -/
def swing (s : Int) (dt : Tally) : Tally :=
  ⟨10000 * dt.a + s * dt.t, 10000 * dt.t⟩

/-- A tally is well-formed when the turnout is positive and A's votes lie within
it. Positive turnout matters: an empty district can never change hands, which
would make the flip analysis case on it forever. -/
def WF (dt : Tally) : Prop := 0 < dt.t ∧ 0 ≤ dt.a ∧ dt.a ≤ dt.t

theorem swing_t (s : Int) (dt : Tally) : (dt.swing s).t = 10000 * dt.t := rfl

theorem swing_a (s : Int) (dt : Tally) : (dt.swing s).a = 10000 * dt.a + s * dt.t := rfl

/-- Party A wins district `dt` under swing `s` exactly when `2 * (s * t)` clears
the district's margin. This is the linear form every later lemma reasons about.

The product is written `s * t` rather than `t * s` throughout: `omega` is a
decision procedure for *linear* integer arithmetic, so it treats a product of two
variables as an opaque atom and cannot see that the two orderings agree. Keeping
one orientation everywhere is what lets the rest of this file be one-liners. -/
theorem winsA_swing (s : Int) (dt : Tally) :
    (dt.swing s).winsA = true ↔ 10000 * dt.t - 20000 * dt.a < 2 * (s * dt.t) := by
  simp only [winsA, swing, decide_eq_true_eq, gt_iff_lt]
  omega

/-- Districts only ever move toward A as the swing moves toward A. The proof is
just that turnout is nonnegative, but this monotonicity is what lets a finite
list of breakpoints stand in for a continuum of swings. -/
theorem winsA_swing_mono {dt : Tally} (ht : 0 ≤ dt.t) {s s' : Int} (hs : s ≤ s')
    (h : (dt.swing s).winsA = true) : (dt.swing s').winsA = true := by
  rw [winsA_swing] at h ⊢
  have : s * dt.t ≤ s' * dt.t := Int.mul_le_mul_of_nonneg_right hs ht
  omega

end Tally

/-- Doubled wasted-vote difference summed over every district. The efficiency gap
is `10000 * egNum / egDen` in basis points, but that division is never taken. -/
def egNum (T : List Tally) : Int := isum (T.map Tally.delta)

/-- Twice the total two-party vote. -/
def egDen (T : List Tally) : Int := 2 * isum (T.map Tally.t)

/-- The efficiency gap is within `bp` basis points of zero.

Stated as a cross-multiplied inequality so that it is exact and decidable. With
`egDen > 0` this says precisely `|10000 * egNum / egDen| ≤ bp`. -/
def EgAtMost (T : List Tally) (bp : Int) : Prop :=
  10000 * iabs (egNum T) ≤ bp * egDen T

instance (T : List Tally) (bp : Int) : Decidable (EgAtMost T bp) :=
  inferInstanceAs (Decidable (_ ≤ _))

/-- Total two-party turnout across all districts. -/
def totalT (T : List Tally) : Int := isum (T.map Tally.t)

/-- Total votes for party A across all districts. -/
def totalA (T : List Tally) : Int := isum (T.map Tally.a)

/-- Turnout in the districts party A wins under swing `s`.

This is the only part of the efficiency gap that is not affine in `s`. It is a
nondecreasing step function with at most one jump per district, and isolating it
here is what reduces the swing theorem to bookkeeping about those jumps. -/
def wonT (T : List Tally) (s : Int) : Int :=
  isum (T.map fun dt => if (dt.swing s).winsA then dt.t else 0)

/-! ### Cons lemmas

Every aggregate above is a fold over a map, and unfolding both at a use site
leaves `omega` staring at two different spellings of the same quantity. Peeling
one district at a time instead keeps the induction hypothesis and the goal in the
same shape. -/

@[simp] theorem egNum_cons (dt : Tally) (T : List Tally) :
    egNum (dt :: T) = dt.delta + egNum T := rfl

@[simp] theorem totalT_cons (dt : Tally) (T : List Tally) :
    totalT (dt :: T) = dt.t + totalT T := rfl

@[simp] theorem totalA_cons (dt : Tally) (T : List Tally) :
    totalA (dt :: T) = dt.a + totalA T := rfl

@[simp] theorem wonT_cons (dt : Tally) (T : List Tally) (s : Int) :
    wonT (dt :: T) s = (if (dt.swing s).winsA then dt.t else 0) + wonT T s := rfl

@[simp] theorem egDen_cons (dt : Tally) (T : List Tally) :
    egDen (dt :: T) = 2 * dt.t + egDen T := by
  simp only [egDen, List.map_cons, isum_cons]
  omega

@[simp] theorem egNum_nil : egNum [] = 0 := rfl
@[simp] theorem egDen_nil : egDen [] = 0 := rfl
@[simp] theorem totalT_nil : totalT [] = 0 := rfl
@[simp] theorem totalA_nil : totalA [] = 0 := rfl
@[simp] theorem wonT_nil (s : Int) : wonT [] s = 0 := rfl

end Redistrict
