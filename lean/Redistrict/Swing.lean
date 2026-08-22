import Redistrict.Metrics

/-!
# Durability under uniform swing

Tier 1 of this theory is decidable: contiguity, population equality, county
splits and the efficiency gap of the reference election are all computations, and
a "proof" of one is really a recomputation certificate. Useful, but it does not
need a proof assistant.

This file is the part that does. The obligation is

> for **every** uniform partisan swing `s` with `|s| ≤ S`, the efficiency gap
> stays within `bp` basis points

which quantifies over an unbounded `Int`. No amount of `decide` closes it.

## Why the obligation is the right one

The efficiency gap is notoriously sensitive to the election you measure it
against: a plan can sit at 1% on the day it is drawn and 11% after a two-point
shift in the electorate. A rule that only constrains the reference election
therefore constrains almost nothing, and a state that wants to gerrymander
durably can satisfy it exactly.

The result below makes precise *why* that happens, and it is not obvious in
advance which way it cuts. Between seat changes the efficiency gap moves at twice
the swing (`egNum_swing`), so a plan of safe seats — one where nothing changes
hands across the whole band — drifts by `2S` and fails for any `S` past
`bp / 2`. The only way to stay inside the band is for seats to actually change
hands as opinion moves, because each flip pushes the gap back the other way. So
the durability requirement turns out to be a *responsiveness* requirement, and
the maps it rejects are the ones built out of safe seats.

## How the ∀ becomes finite

Write `W(s)` for the turnout in districts party A wins under swing `s`. Then

  `egNum(s) = 40000·A + 4·s·T − 10000·T − 20000·W(s)`   (`egNum_swing`)
  `egDen(s) = 20000·T`                                   (`egDen_swing`, constant)

Everything is affine in `s` except `W`, which is a nondecreasing step function
with at most one jump per district (`wonT_mono`, resting on `winsA_swing_mono`).
So on any interval where `W` does not change, `egNum` is monotone increasing and
is therefore bounded by its two endpoints.

That gives the reduction. The prover supplies a list of breakpoints spanning
`[-S, S]` such that `W` agrees at each consecutive pair — a *certificate*. Both
conditions on it are decidable, so the checker verifies the certificate by
computation, and `eg_of_chain` converts the finitely many endpoint checks into
the statement about every `s` in the interval.

The certificate is what makes the obligation checkable at all. At `S = 500` a
brute-force sweep is 1001 full evaluations of the gap, which Lean's kernel will
not finish; the certificate for a ten-district plan has at most 22 entries. At
`S = 10^6` the sweep is hopeless and the certificate is still 22 entries. The
proof, not the computation, is what carries the quantifier.
-/

namespace Redistrict

/-! ## The affine decomposition -/

/-- One district's contribution to `egNum`, split into an affine part and a
flip indicator. This is the whole content of the decomposition; everything after
it is summation. -/
theorem delta_swing (s : Int) (dt : Tally) :
    Tally.delta (dt.swing s)
      = 40000 * dt.a + 4 * (s * dt.t) - 10000 * dt.t
        - 20000 * (if (dt.swing s).winsA then dt.t else 0) := by
  unfold Tally.delta
  split <;> simp only [Tally.swing_a, Tally.swing_t] <;> omega

/-- The efficiency gap numerator under swing `s`: affine in `s`, apart from the
step function `wonT` that counts turnout in A-won districts. -/
theorem egNum_swing (T : List Tally) (s : Int) :
    egNum (T.map (Tally.swing s))
      = 40000 * totalA T + 4 * (s * totalT T) - 10000 * totalT T - 20000 * wonT T s := by
  induction T with
  | nil => simp
  | cons dt rest ih =>
      simp only [List.map_cons, egNum_cons, totalA_cons, totalT_cons, wonT_cons]
      rw [delta_swing, ih]
      -- `omega` is linear, so the one genuinely bilinear step — distributing the
      -- swing across the district's turnout and everyone else's — is done by hand.
      have hdist : s * (dt.t + totalT rest) = s * dt.t + s * totalT rest := Int.mul_add _ _ _
      omega

/-- The denominator is unaffected by the swing beyond a uniform rescaling. Both
sides of every threshold scale together, which is why `swing 0` — a rescaling
rather than the identity — leaves the gap where it was. -/
theorem egDen_swing (T : List Tally) (s : Int) :
    egDen (T.map (Tally.swing s)) = 20000 * totalT T := by
  induction T with
  | nil => simp
  | cons dt rest ih =>
      simp only [List.map_cons, egDen_cons, totalT_cons, Tally.swing_t]
      rw [ih]
      omega

/-! ## The step function is monotone -/

/-- Turnout in A-won districts never decreases as the swing moves toward A.

Each district contributes either `0` or its turnout, and `winsA_swing_mono` says
a district that has already changed hands does not change back. -/
theorem wonT_mono {T : List Tally} (hpos : ∀ dt ∈ T, 0 ≤ dt.t) {s s' : Int} (h : s ≤ s') :
    wonT T s ≤ wonT T s' := by
  induction T with
  | nil => simp
  | cons dt rest ih =>
      have hdt : 0 ≤ dt.t := hpos dt (by simp)
      have hrest : wonT rest s ≤ wonT rest s' := ih fun x hx => hpos x (by simp [hx])
      rw [wonT_cons, wonT_cons]
      by_cases hs : (dt.swing s).winsA = true
      · -- Already won at `s`, so still won at `s'`: the term is unchanged.
        have hs' : (dt.swing s').winsA = true := Tally.winsA_swing_mono hdt h hs
        rw [if_pos hs, if_pos hs']
        omega
      · -- Not won at `s`: the term either stays `0` or rises to a nonnegative turnout.
        rw [if_neg hs]
        by_cases hs' : (dt.swing s').winsA = true
        · rw [if_pos hs']; omega
        · rw [if_neg hs']; omega

/-- If the same districts are won at both ends of an interval, the same districts
are won throughout it. A monotone function pinned at both ends is constant. -/
theorem wonT_const {T : List Tally} (hpos : ∀ dt ∈ T, 0 ≤ dt.t) {lo s hi : Int}
    (h1 : lo ≤ s) (h2 : s ≤ hi) (heq : wonT T lo = wonT T hi) :
    wonT T s = wonT T lo := by
  have a := wonT_mono hpos h1
  have b := wonT_mono hpos h2
  omega

/-! ## Endpoints bound the interior -/

/-- Turnout is nonnegative, so the affine part of `egNum` increases with the
swing. -/
theorem totalT_nonneg {T : List Tally} (hpos : ∀ dt ∈ T, 0 ≤ dt.t) : 0 ≤ totalT T := by
  refine isum_nonneg ?_
  intro x hx
  obtain ⟨dt, hdt, rfl⟩ := List.mem_map.mp hx
  exact hpos dt hdt

/-- The interval lemma. If the same seats are held at both ends and the gap is
within bounds at both ends, it is within bounds everywhere between.

This is where the quantifier collapses: `egNum` is affine and increasing in `s`
once `wonT` is fixed, so its extremes over the interval are its endpoints. -/
theorem eg_between {T : List Tally} (hpos : ∀ dt ∈ T, 0 ≤ dt.t) {bp lo s hi : Int}
    (h1 : lo ≤ s) (h2 : s ≤ hi) (hw : wonT T lo = wonT T hi)
    (hlo : EgAtMost (T.map (Tally.swing lo)) bp)
    (hhi : EgAtMost (T.map (Tally.swing hi)) bp) :
    EgAtMost (T.map (Tally.swing s)) bp := by
  have hT : 0 ≤ totalT T := totalT_nonneg hpos
  have hws : wonT T s = wonT T lo := wonT_const hpos h1 h2 hw
  -- The affine part is monotone in `s` because turnout is nonnegative.
  have m1 : lo * totalT T ≤ s * totalT T := Int.mul_le_mul_of_nonneg_right h1 hT
  have m2 : s * totalT T ≤ hi * totalT T := Int.mul_le_mul_of_nonneg_right h2 hT
  simp only [EgAtMost, egNum_swing, egDen_swing] at hlo hhi ⊢
  rw [hws]
  rw [← hw] at hhi
  -- With `wonT` pinned, the three numerators are ordered, so the outer two bound
  -- the middle one.
  exact iabs_le_of_between (by omega) (by omega) hlo hhi

/-! ## The certificate -/

/-- A breakpoint chain: `b` followed by `bs`.

`chainB T bp b bs` holds when the gap is within `bp` at every breakpoint, the
breakpoints are nondecreasing, and each consecutive pair is either

* **a flat step** — `wonT` agrees at both ends, so `eg_between` covers the
  interior; or
* **a unit step** — `b' = b + 1`, so there is no interior to cover.

The unit step is not a convenience. `wonT` jumps at a seat change, so a flat step
can never straddle one, and without unit steps a chain could not get past the
first district to change hands. Because swings are counted in whole basis points,
stepping over a jump one integer at a time is exact rather than an approximation:
a certificate names the last swing before each seat changes and the first swing
after, and those two values have nothing between them.

All three conditions are computations, so a checker verifies a certificate by
evaluating it. -/
def chainB (T : List Tally) (bp : Int) : Int → List Int → Bool
  | b, [] => decide (EgAtMost (T.map (Tally.swing b)) bp)
  | b, b' :: rest =>
      decide (EgAtMost (T.map (Tally.swing b)) bp)
        && decide (b ≤ b')
        && ((wonT T b == wonT T b') || decide (b' = b + 1))
        && chainB T bp b' rest

/-- Last breakpoint in the chain `b :: bs`. -/
def lastOf : Int → List Int → Int
  | b, [] => b
  | _, b' :: rest => lastOf b' rest

/-- A chain never runs backward, so its span is a genuine interval. -/
theorem head_le_lastOf {T : List Tally} {bp : Int} :
    ∀ (b : Int) (bs : List Int), chainB T bp b bs = true → b ≤ lastOf b bs := by
  intro b bs
  induction bs generalizing b with
  | nil => intro _; simp [lastOf]
  | cons b' rest ih =>
      intro hc
      simp only [chainB, Bool.and_eq_true, Bool.or_eq_true, decide_eq_true_eq,
        beq_iff_eq] at hc
      obtain ⟨⟨⟨_, hle⟩, _⟩, hrest⟩ := hc
      have := ih b' hrest
      simp only [lastOf]
      omega

/-- **Certificate soundness.** A verified chain bounds the efficiency gap across
the entire interval it spans, not merely at its breakpoints.

This is the theorem that does the work: it exchanges finitely many decidable
checks for a statement quantified over every integer swing in the range. -/
theorem eg_of_chain {T : List Tally} (hpos : ∀ dt ∈ T, 0 ≤ dt.t) {bp : Int} :
    ∀ (b : Int) (bs : List Int), chainB T bp b bs = true →
      ∀ s, b ≤ s → s ≤ lastOf b bs → EgAtMost (T.map (Tally.swing s)) bp := by
  intro b bs
  induction bs generalizing b with
  | nil =>
      intro hc s h1 h2
      simp only [lastOf] at h2
      have : s = b := by omega
      subst this
      simpa [chainB] using hc
  | cons b' rest ih =>
      intro hc s h1 h2
      simp only [chainB, Bool.and_eq_true, Bool.or_eq_true, decide_eq_true_eq,
        beq_iff_eq] at hc
      obtain ⟨⟨⟨hb, hle⟩, hstep⟩, hrest⟩ := hc
      -- The bound at `b'` comes from the tail of the chain, read at its own head.
      have hb' : EgAtMost (T.map (Tally.swing b')) bp :=
        ih b' hrest b' (Int.le_refl b') (head_le_lastOf b' rest hrest)
      by_cases hs : s ≤ b'
      · -- `s` lies in the first segment.
        rcases hstep with hwon | hunit
        · -- Flat step: `wonT` is pinned, so the endpoints bound the interior.
          exact eg_between hpos h1 hs hwon hb hb'
        · -- Unit step: there is no interior, so `s` is one of the two endpoints.
          rcases (by omega : s = b ∨ s = b') with rfl | rfl
          · exact hb
          · exact hb'
      · -- Otherwise `s` lies further along; recurse on the tail.
        exact ih b' hrest s (by omega) h2

/-! ## The obligation -/

/-- Every uniform swing of at most `S` basis points leaves the plan's efficiency
gap within `bp` basis points.

Unbounded quantification over `Int`. `S` is a bound on the swings considered, not
a finite domain to enumerate. -/
def SwingRobust (p : Plan) (S bp : Int) : Prop :=
  ∀ s : Int, -S ≤ s → s ≤ S → EgAtMost (p.tallies.map (Tally.swing s)) bp

/-- **Discharge rule.** A well-formed plan is swing-robust whenever some verified
breakpoint chain spans `[-S, S]`.

Both hypotheses on the chain are decidable, so a prover discharges this by
supplying a witness list and closing the rest with `decide`. The general lemma is
published by the regulator in the theory package; the state contributes only the
cheap computation about its own map. -/
theorem swingRobust_of_chain {p : Plan} {S bp : Int} (bs : List Int)
    (hwf : WellFormed p)
    (hchain : chainB p.tallies bp (-S) bs = true)
    (hlast : lastOf (-S) bs = S) :
    SwingRobust p S bp := by
  intro s h1 h2
  have hpos : ∀ dt ∈ p.tallies, 0 ≤ dt.t := fun dt h =>
    Int.le_of_lt (tallies_pos_of_wellFormed hwf dt h)
  refine eg_of_chain hpos (-S) bs hchain s h1 ?_
  rw [hlast]
  exact h2

instance (p : Plan) (S bp : Int) (bs : List Int) : Decidable (chainB p.tallies bp S bs = true) :=
  inferInstanceAs (Decidable (_ = true))

end Redistrict
