---
theme: none
title: Proof-carrying regulation on atproto
info: |
  A regulator publishes machine-checkable requirements. Regulated actors publish
  machine-checkable proofs. Anyone re-runs the check.
class: text-left intro
transition: none
mdc: false
# The design was sized against a ~1400px canvas. Slidev's 980px default renders
# everything about 1.4x too large and overflows the taller slides.
canvasWidth: 1400
aspectRatio: 16/9
colorSchema: dark
drawings:
  persist: false
---

<!--
================================================================================
EDITING THIS DECK

All the prose lives in this file. Slides are separated by `---` on its own line.

  <v-click>…</v-click>     reveal on the next press
  <v-clicks>…</v-clicks>   reveal a list one item at a time
  $clicks                  how many presses have happened on this slide
  clicks: 5                in a slide's frontmatter, to reserve extra presses

Presenter notes are the HTML comment at the very end of each slide. Press `p`
in the browser for presenter mode (notes, timer, next-slide preview).

`mdc: false` above is load-bearing: MDC's inline-attribute syntax renders through
a synchronous path that cannot await syntax highlighting, so turning it on breaks
the build on every slide with inline code. Use plain HTML attributes instead.

Figures are Vue components in `components/`. They read `data.json`, which
`pnpm present:data` writes from a real demo run — so the CIDs, verdicts, axiom
sets and swing curves on these slides are captured, never typed. `<Val …/>`
pulls a captured number into a sentence; prefer it over writing the figure out,
so editing prose cannot leave a stale number beside a live chart.

  pnpm present         dev server, hot-reloads as you edit
  pnpm present:data    re-capture from a fresh run
  pnpm present:build   static site into dist/
================================================================================
-->

<div class="kicker">a demo</div>

# Proof-carrying regulation<br>on atproto

<p class="lead">
A regulator publishes machine-checkable requirements. Regulated actors publish
machine-checkable proofs that their artifacts satisfy them. Anyone re-runs the
check.
</p>

<p class="muted">
Requirements in a Lean&nbsp;4 DSL · artifacts and proofs as atproto records ·
verdicts as labels
</p>

<div class="cid" style="margin-top:2rem">
every figure in this deck was captured from a real run · <Val toolchain /> ·
<Val count="repos" /> repositories · <Val count="labels" /> signed labels
</div>

<!--
The domain is redistricting, but the domain is not the point — it is a worked
example chosen because the rules are numeric, contested, and public. The last two
slides are about what it takes to move this to another domain.

**Everything here is real.** The CIDs, verdicts, axiom sets and generated Lean
were captured from an actual run by `pnpm present:data`. Nothing is illustrative.
-->

---
clicks: 3
---

<div class="kicker">the problem</div>

## Compliance is asserted. It is almost never demonstrated.

<div class="cols">
<div>
<v-click>
<div class="card tag warn">

### Today

A regulator publishes a rule in prose. A regulated actor files a report saying it
complies. Maybe an agency audits a sample.

Everything downstream is *trust in an institution*. A journalist who doubts the
finding has no way to check it — there is nothing to re-run.

</div>
</v-click>
</div>

<div>
<v-click>
<div class="card tag good">

### Here

The rule is a machine-checkable proposition. The filing is a proof. The finding is
*a computation over three content hashes*.

Anyone who doubts it fetches the same three hashes, runs the same checker, and gets
the same answer — or publishes a contradiction.

</div>
</v-click>
</div>
</div>

<v-click>

Formal verification alone does not need a protocol. A state could publish a Lean
file and an agency could run it. What the protocol adds is that the rule, the
artifact and the proof are all *content-addressed records with verifiable
authorship, held in repositories their authors control* — which is what turns a
verdict from an assertion into something reproducible.

</v-click>

<!--
Resist the urge to sell formal methods here. The interesting claim is not "proofs
are rigorous" — everyone knows that. It is that **content addressing changes what
a verdict is**. Without it you still have an agency saying "we checked"; with it
you have a computation anyone can repeat.

If someone asks "why not just an API?" — because an API's answer is still the
agency's word. The whole value is that the inputs are named by hash so a third
party can disagree *specifically*.
-->

---
clicks: 3
---

<div class="kicker">the actors</div>

## Six repositories. Nobody writes into anyone else's.

<Ownership />

<v-click>

There is no shared database. Every collection is written by exactly one
repository, and no actor can write into another's — the regulator cannot edit a
state's map, a state cannot edit the rule it is measured against, and a verdict
lives in the checker's own repository because it is *the checker's speech about
someone else's record*.

</v-click>

<v-click>

The regulator appears twice because it wears two hats: it writes the rules, and it
runs a checker. *The second hat is not exclusive to it.* The watchdog has no
standing and no permission, and publishes verdicts by exactly the same mechanism.

</v-click>

<v-click>

The data authorities along the bottom are the least technical part of the diagram
and the most important. A proof certifies that *the published numbers* satisfy a
rule. It says nothing about whether those numbers are true — so where they came
from is an explicit, attributable citation rather than an assumption.

</v-click>

<!--
Point at the boxes as you go. The ownership story is the part people find
surprising: there is no shared database and no privileged writer.

**Watchdog** is the one to dwell on. It has no standing, no accreditation, no
permission. It publishes verdicts by the same mechanism the regulator does.
Whether anyone believes it is a social question, not a protocol question — and
that is the right place for that question to live.
-->

---
clicks: 6
---

<div class="kicker">the artifacts</div>

## Six record types, and every edge is a hash

<RecordGraph :step="$clicks + 1" />

References are `strongRef` — URI *and* CID — never a bare URI. That single choice
does most of the work: amend a requirement and every proof against the old one is
mechanically detectable as stale; edit a certified map and the certification stops
applying, without anyone having to notice the edit.

<v-click at="6">

<p class="muted">
Note what is <em>absent</em> from <code>dev.provable.proof</code>: there is no
field for the theorem statement. That omission is the load-bearing design
decision, and we will come back to why.
</p>

</v-click>

<!--
Build this up one edge at a time. The order matters: theory → requirement → plan →
datasource → proof → verdict/label.

The line to land: **versioning is not a feature bolted on, it is what content
addressing already gives you.** There is no "invalidate the proofs" job to run.
The hash moves and the references simply no longer resolve to what they pointed at.
-->

---
clicks: 1
---

<div class="kicker">the rules</div>

## The published text *is* the compiled source

<div class="cols">
<div>

### What the record carries

```lean
requirement section2 titled "Fair Districting Act § 2"
    for plan P where
  · the plan is well formed
  · every district is contiguous
  · population deviation is at most 0.50%
  · the efficiency gap is at most 7.00%
  · no county is split more than 1 time
```

<p class="small">
Field <code>statement</code> of <code>dev.provable.requirement/fda-section-2</code><br>
<Cid of="section2" :chars="24" />
</p>

</div>

<div>
<v-click>

### Why that matters

This is not a paraphrase of a formal rule sitting somewhere else. It is the same
text the theory package compiles — a Lean&nbsp;4 DSL whose surface syntax is the
legal text.

The usual failure mode of "formalise the regulation" projects is two artifacts
that drift: the words everyone argues about, and the formalisation nobody reads.
Here there is *no second artifact*. A reader who checks that the record's
`statement` matches the theory's source has checked everything.

Elaborating it also emits a per-clause evaluator, so a refutation can name *which
clause* failed. Same source, so the names in a verdict cannot fall out of step
with the rule.

</v-click>
</div>
</div>

<!--
Read the requirement out loud. It should sound like a rule, not like code — that
is the entire test of the DSL.

Two implementation details worth mentioning only if asked: every English word is a
*non-reserved* token, because a plain atom would make `plan` and `gap` unusable as
identifiers in every downstream file; and the `·` bullet is there because a syntax
category cannot begin with a non-reserved word. It also happens to look like legal
text.
-->

---
clicks: 4
---

<div class="kicker">the hard part nobody expects</div>

## A proof is about a Lean value. An artifact is bytes.

If those two can drift apart, a proof certifies nothing in particular. Something
has to fix the correspondence — and *who* fixes it decides whether two honest
checkers can disagree.

<div class="cols">
<div>
<v-click>
<div class="card tag bad">

### If the checker owns the decode

Two honest checkers reach opposite verdicts about the same CID and neither is
wrong, because nothing published says which reading is correct.

</div>
</v-click>
</div>

<div>
<v-click>
<div class="card tag good">

### So the theory owns it

```json
{ "lexicon":  "gov.redistrict.plan",
  "leanType": "Redistrict.Plan",
  "decoder":  "Redistrict.Codec.decodePlan" }
```

</div>
</v-click>
</div>
</div>

<v-click>

All three are needed. The lexicon alone does not fix a representation; the Lean
type alone does not fix which records are eligible. The checker's remaining share
is a *transliteration* — field for field, no reordering, no defaulting, no
decisions.

</v-click>

<v-click>

One consequence worth stating: the decoder is *total*. A record that does not
decode becomes a plan with no precincts, which fails the well-formedness clause
every requirement opens with. So a malformed artifact cannot be certified — not by
checker etiquette, but because *the obligation is false*. Submitting garbage means
having to prove something untrue.

</v-click>

<!--
This is the slide that separates a demo from a design. Most "put proofs on a
ledger" proposals never address it, and it is where they quietly fail.

The total-decoder trick is worth pausing on. The naive move is for the checker to
reject undecodable records. That works until a checker forgets. Making the
obligation *false* instead means the property is enforced by the mathematics
rather than by everyone remembering to check.
-->

---
clicks: 2
---

<div class="kicker">the artifacts under test</div>

## Two states, three maps, identical geography

<MapLegend />

<div class="cols-3">
<div>

### Fairfax
<DistrictMap plan="fairfax" />
<div class="cid" style="margin-top:0.5rem">State of Fairfax</div>

</div>
<div>

### Crackland v1
<DistrictMap plan="crackland1" />
<div class="cid" style="margin-top:0.5rem">State of Crackland</div>

</div>
<div>

### Crackland v2
<DistrictMap plan="crackland2" />
<div class="cid" style="margin-top:0.5rem">State of Crackland</div>

</div>
</div>

<v-click>

Sixty precincts of a thousand voters each, ten districts of six. Population
equality and contiguity never distinguish these maps, and all three give party A
*<Val check="fairfax-s2" voteShare />* of the statewide vote. The districting is
the only variable — which is what a districting rule is supposed to be about.

</v-click>

<v-click>

<p class="muted">
The two Crackland maps share precinct data exactly — the fills are identical and
<em>only the white boundaries differ</em>. If the votes differed too, comparing
them would prove nothing about maps.
</p>

</v-click>

<!--
Let people look. The middle map is visibly different — four dark-blue blocks and
six orange ones, which is textbook packing and cracking.

The right-hand map is the one to flag as suspicious-looking-but-innocent: neat
columns, nothing obviously wrong. Hold that thought.
-->

---

<div class="kicker">the artifacts under test</div>

## The same three maps, as numbers

<SharesTable :plans="['fairfax', 'crackland1', 'crackland2']" />

<!--
The table-view twin, here as its own slide so you can jump to it when someone
asks. Diamonds mark the seats that change hands inside the ±5-point band —
Fairfax has two, Crackland v2 has none, and that single difference is the whole
back half of the talk.
-->

---
clicks: 2
---

<div class="kicker">step 1 — the regulator</div>

## The theory and the rules go on the wire

| record | rkey | cid |
| --- | --- | --- |
| `dev.provable.theory` | `redistrict-v1` | <Cid of="theory" :chars="22" /> |
| `dev.provable.requirement` | `fda-section-2` | <Cid of="section2" :chars="22" /> |
| `dev.provable.requirement` | `fda-section-5` | <Cid of="section5" :chars="22" /> |
| `gov.redistrict.plan` | `fairfax-2026` | <Cid of="fairfax" :chars="22" /> |
| `gov.redistrict.plan` | `crackland-2026` | <Cid of="crackland1" :chars="22" /> |
| `gov.redistrict.plan` | `crackland-2026-revised` | <Cid of="crackland2" :chars="22" /> |

<div class="cols" style="margin-top:1.2rem">
<div>
<v-click>
<div class="card">

### The theory travels in-band

<p class="small">
The Lean package is a blob on the theory record, with a digest. Verification
depends on the record and nothing else — no package registry has to stay online,
or stay honest, for someone to reproduce a verdict in ten years.
</p>

</div>
</v-click>
</div>

<div>
<v-click>
<div class="card">

### The toolchain is pinned

<p class="small">
A checker that cannot honour the pinned Lean release must decline rather than
substitute a nearby version. Reporting <em>verified</em> from a different prover
would be a claim about a proof nobody checked.
</p>

</div>
</v-click>
</div>
</div>

<!--
Skim the table — the point is just that these are real records with real hashes,
in six different repositories.

The in-band theory blob is a small decision with a long tail. Ten years is not
hypothetical for a districting map; they last a decade by construction.
-->

---
clicks: 2
---

<div class="kicker">step 2 — a state complies</div>

## § 2 is decidable, so the proof is one tactic

<div class="cols">
<div>

```lean
by decide
```

<Verdict id="fairfax-s2" axioms />

</div>

<div>
<v-click>

### Be honest about what this is

Every clause of § 2 is a computation, so the kernel is doing arithmetic, not
mathematics. A tier-1 proof is a *recomputation certificate*.

That is still worth having — it is exact, it is reproducible by anyone, and it
localises which criterion a map violates. But it does not need a proof assistant,
and pretending otherwise would be the wrong sales pitch.

<v-click>

The interesting requirement is the one that *cannot* be a computation. That is
§ 5, and it is next.

</v-click>
</v-click>
</div>
</div>

<!--
Don't oversell tier 1. If you claim a proof assistant is needed to check five
inequalities, the first competent person in the room stops believing you.

The axiom line matters: `propext` only. No `sorryAx`, no native evaluation. We
will see in a few slides why that line is checked by a build failure rather than
read by eye.
-->

---
clicks: 2
---

<div class="kicker">step 3 — a state does not comply</div>

## Refuted on exactly one named clause

<div class="cols">
<div>

<DistrictMap plan="crackland1" :cell="30" />
<div style="margin-top:0.7rem"><ShareStrip plan="crackland1" :w="300" /></div>

</div>
<div>

<Verdict id="crackland1-s2" />

<v-click>

The map clears *every* structural clause. It is contiguous, population-equal and
county-respecting. Four districts packed at 75% and six cracked below 50% put the
efficiency gap at *<Val check="crackland1-s2" gap />*.

</v-click>

<v-click>

Naming the clause is what makes this actionable. "The conjunction failed" tells a
state nothing; "your efficiency gap is 18%" tells it what to change — and tells
the public what the objection actually is.

</v-click>

</div>
</div>

<!--
The bar chart is the tell: four bars far right, six far left, nothing near the
middle. That is packing and cracking drawn as data.

The per-clause report comes from the same DSL source as the rule itself, so the
clause names in the verdict cannot drift from the clause names in the statute.
-->

---
clicks: 2
---

<div class="kicker">step 4 — the twist</div>

## The revised map passes § 2 — with Fairfax's exact efficiency gap

<div class="cols-3">
<div>

### Fairfax
<DistrictMap plan="fairfax" :cell="26" />
<div class="cid" style="margin-top:0.5rem">
gap <Val check="fairfax-s2" gap /> · <Val check="fairfax-s2" seats /> seats
</div>

</div>
<div>

### Crackland v2
<DistrictMap plan="crackland2" :cell="26" />
<div class="cid" style="margin-top:0.5rem">
gap <Val check="crackland2-s2" gap /> · <Val check="crackland2-s2" seats /> seats
</div>

</div>
<div>

<Verdict id="crackland2-s2" :summary="false" />

</div>
</div>

<v-click>

Same voters as before, redrawn. The gap is now
*<Val check="crackland2-s2" gap />* — identical to Fairfax's, to the basis point.
On the snapshot rule these two maps are *indistinguishable*.

</v-click>

<v-click>

A rule that stops here has been satisfied. Whether it has been *complied with* is
a different question.

</v-click>

<!--
This is the hinge of the whole demo. Slow down.

Two maps, same statewide vote, same seat count, same efficiency gap to the basis
point. Any metric-based rule that measures the reference election alone certifies
both. Ask the room what they would do next — the honest answer is "add more
metrics", and the next slide is why that is not enough.
-->

---
clicks: 1
---

<div class="kicker">step 5 — the difference</div>

## What happens when opinion moves

<SwingChart>
Efficiency gap against a uniform swing, computed by the Lean theory itself rather
than re-derived for this chart. Crackland v1 is off this scale at
<Val check="crackland1-s2" gap />.
</SwingChart>

<v-click>

Fairfax's gap sawtooths and stays inside the limit across the whole band.
Crackland v2's runs straight through it —
*<Val plan="crackland2" :at-swing="-500" />* at a five-point swing toward B,
*<Val plan="crackland2" :at-swing="500" />* toward A.

</v-click>

<!--
Let the picture do the work before you explain it. Hover along the lines to call
out values; the `table` toggle in the legend has the numbers.

The sawtooth is seats changing hands. Each near-vertical drop in the green line is
one district flipping, which pushes the gap back the other way. The purple line
has no drops at all, because nothing in that map ever changes hands inside the
band.

Both curves have the same slope everywhere: **the gap moves at exactly twice the
swing** between seat changes. That is a theorem, not an observation from the chart.
-->

---
clicks: 3
---

<div class="kicker">why</div>

## The difference is competitiveness, not fairness

<div class="cols">
<div>

### Fairfax — two seats in play
<ShareStrip plan="fairfax" />

</div>
<div>

### Crackland v2 — none
<ShareStrip plan="crackland2" />

</div>
</div>

<v-click>

The shaded strip is the ±5-point band § 5 quantifies over. A district whose bar tip
falls inside it changes hands somewhere in that range. Fairfax has two; Crackland
v2's closest seat is safe by eleven points.

</v-click>

<v-click>

So the theorem inverts the intuition. Between seat changes the gap drifts at twice
the swing, so a map of safe seats drifts ten points across a five-point band and
*cannot* satisfy any threshold under 10%. The only maps that hold are the ones
where seats actually change hands.

</v-click>

<v-click>

*A durability requirement turns out to be a responsiveness requirement* — and the
maps it rejects are the ones built out of safe seats. That is not what you would
guess from reading the words, and it is the kind of thing formalising a rule is
good for.

</v-click>

<!--
This is the most interesting result in the project and it was not the plan. The
requirement was written as "the gap stays bounded under swing", which sounds like
a stability condition. Proving it showed that stability is only achievable through
responsiveness.

If someone objects that competitive districts are a policy choice rather than a
legal requirement — yes, exactly. The formalisation surfaced a policy consequence
the drafter did not write down. That is an argument *for* formalising, not against.
-->

---
clicks: 2
---

<div class="kicker">the certificate</div>

## Six evaluations standing in for a thousand

<SwingChart :h="290" markers :breakpoints="[-500, -150, -149, 350, 351, 500]">
Circles mark the six breakpoints of Fairfax's certificate. Two pairs are adjacent
integers and land on the same pixel — that is the point of them.
</SwingChart>

<div class="cols">
<div>
<v-click>

<p class="small">
The gap is affine in the swing except for a step function that counts turnout in
seats party A holds. On any stretch where no seat changes hands the gap is
monotone, so its extremes are its endpoints.
</p>

<p class="small">
So the prover supplies a <em>certificate</em>: breakpoints spanning the band, where
consecutive entries either agree on who holds what, or are adjacent integers. Both
conditions are decidable.
</p>

</v-click>
</div>

<div>
<v-click>

```lean
⟨by decide,
   Redistrict.swingRobust_of_chain
     [-150, -149, 350, 351, 500]
     (by decide) (by decide) (by decide)⟩
```

<p class="small">
<strong>The division of labour is the point.</strong>
<code>swingRobust_of_chain</code> is general mathematics, written once, by the
party that wrote the rule. The state contributes a list and three decidable facts
about its own map.
</p>

</v-click>
</div>
</div>

<!--
This is the answer to "couldn't you just check every swing?" At ±5 points you
could, if slowly. At ±50 you could not, and the certificate is the same length.

1001 whole-basis-point swings in the band; six breakpoints. Widening the band
barely lengthens the certificate — two entries per seat that changes hands, so at
most 22 on a ten-district map however wide it gets — against a sweep that grows
without bound.

The adjacent-integer case is not a convenience — the step function jumps at a seat
change, so a constant-holdings step can never straddle one. Because swings are
whole basis points, stepping over a jump one integer at a time is *exact*, not an
approximation.

If there is one slide to remember for adapting this to another domain, it is this
one: **regulators publish lemmas, regulated actors supply certificates.**
-->

---
clicks: 2
---

<div class="kicker">step 6 — the verdict § 2 could not reach</div>

## The same certificate, on the map that cannot support it

<div class="cols">
<div>

<Verdict id="crackland2-s5" />

</div>
<div>
<v-click>

### Three-way, on purpose

Note the clause status. A tier-1 clause is decidable, so evaluation settles it
either way. A tier-2 clause quantifies over an unbounded range: evaluation can
*refute* it by exhibiting a swing that breaks the bound, but it can never confirm
it.

So the checker reports `holds`, `refuted`, or `undecided` — never a guess.
Collapsing `undecided` into `refuted` would accuse every unproved map of a
violation; collapsing it into `holds` would certify them. Both are lies about what
was checked.

<v-click>

<p class="muted">
Fairfax's § 5 verdict is <em>verified</em> with its swing clause reported
<code>undecided</code> — evaluation could not settle it, and the proof did.
</p>

</v-click>
</v-click>
</div>
</div>

<!--
The three-way status is a small thing that people notice and like. Most compliance
tooling has two states and lies in one direction or the other.

Contrast the two § 5 verdicts explicitly: same clause, same evaluator, one
*refuted* by a counterexample and one *undecided* until a proof arrived.
-->

---
clicks: 3
---

<div class="kicker">the part that makes it not theatre</div>

## What stops a state from proving something easier?

```lean
-- If the prover supplied the statement:
def NotGerrymandered (_ : Plan) : Prop := True
theorem mine : NotGerrymandered myPlan := trivial   -- ✓ verified
```

<v-click>

Every label the system issues would be worthless — not because the proof is wrong,
but because *nobody checked what was proved*. Any design that accepts a statement
from the party being regulated has this hole, and it is not fixable downstream.

</v-click>

<v-click>

So the proof record has no statement field. The checker derives the obligation
from the requirement CID and the artifact CID and *writes the signature line
itself*:

</v-click>

<div class="cols">
<div>
<v-click>

### Statement module — no prover text

```lean
namespace Obligation

def raw : Redistrict.Codec.Raw :=
  { districtCount := 10
    precincts := [ … 60 precincts … ]
    adjacency := [ … 104 edges … ]
    assignment := [ … ] }

def plan : Redistrict.Plan :=
  Redistrict.Codec.decodePlanD raw

abbrev stmt : Prop :=
  Redistrict.FairDistrictingAct.section2 plan
```

</v-click>
</div>

<div>
<v-click>

### Proof module — payload spliced in one place

```lean
import Obligation.Statement

namespace Obligation.Prover
-- ↓↓↓ PROVER PAYLOAD: auxiliary lemmas ↓↓↓
-- (none supplied)
-- ↑↑↑ END PROVER PAYLOAD ↑↑↑
end Obligation.Prover

open Obligation.Prover in
theorem Obligation.proof : Obligation.stmt :=
-- ↓↓↓ PROVER PAYLOAD: proof term ↓↓↓
by decide
-- ↑↑↑ END PROVER PAYLOAD ↑↑↑

#assert_axioms Obligation.proof
```

</v-click>
</div>
</div>

<!--
Ask the room how they would attack the system before revealing this. Someone
usually gets it.

Show that the statement module is compiled to a `.olean` *before* the prover's
text is elaborated at all. The prover cannot redefine `Obligation.stmt` because it
is already declared in an imported module — that is a duplicate-declaration error
— and the signature the checker wrote still refers to the imported one. Both fire;
either would do.
-->

---
clicks: 3
---

<div class="kicker">and how we know</div>

## Four defences, tested one at a time

| defence | stops | tested by |
| --- | --- | --- |
| **Separate statement module**<br><span class="cid">compiled before any prover text</span> | choosing what to prove | `cannot redefine the obligation` |
| **Import, not inclusion**<br><span class="cid">redefinition is a duplicate declaration</span> | shadowing the statement | `cannot redefine the obligation` |
| **`#assert_axioms`**<br><span class="cid">audit turned into a build failure</span> | holes, native evaluation, new axioms | `fails the build when the proof is a hole` |
| **Lexical screen**<br><span class="cid">defence in depth only</span> | nothing on its own | `9 rejection cases` |

<div class="cols" style="margin-top:1.1rem">
<div>
<v-click>
<div class="card tag good">

### Why the audit is a build failure

<p class="small">
<code>#print axioms</code> reports to stdout, and a checker built on scraping
stdout <em>fails open</em>: change the format, drop the output, mis-parse a name,
and an unproved theorem sails through. <code>#assert_axioms</code> runs the same
query and exits nonzero.
</p>

</div>
</v-click>
</div>

<div>
<v-click>
<div class="card tag warn">

### The screen is not what keeps this sound

<p class="small">
Anything that would be unsound if it slipped past the denylist is a design bug. So
the axiom test deliberately <em>bypasses</em> the screen and drives Lean directly —
a suite that only tested the denylist would pass with the audit deleted.
</p>

</div>
</v-click>
</div>
</div>

<v-click>

<p class="muted">
Also covered: artifact swapping, injection through the requirement's
<code>leanProp</code> field, a toolchain the theory does not name, an artifact of
the wrong type, post-hoc mutation of a certified map, and a swing certificate that
does not span its band. 44 tests, all green.
</p>

</v-click>

<!--
The point of this slide is methodological, not technical: **each defence is tested
with the others routed around**. Layered defences rot silently when the cheapest
one always fires first.

If asked what is *not* defended: elaborating a stranger's Lean is running their
code. The checker enforces a timeout and nothing else. Every verdict says so in
its `checker.sandbox` field rather than letting a reader assume otherwise.
-->

---
clicks: 3
---

<div class="kicker">the output</div>

## A label cannot carry evidence, so two records

<div class="cols">
<div>
<v-click>
<div class="card">

### The label — an index

```json
{ "ver": 1,
  "src": "did:key:zQ3shgVXZLaMzm5S5x…",
  "uri": "at://…/dev.provable.proof/…",
  "cid": "bafyrei…",
  "val": "proof-refuted",
  "cts": "2026-01-07T12:00:00Z" }
```

<p class="small">
The spec constrains <code>val</code> to a bare kebab-case token of at most 128
bytes. No fields. No structure. It propagates cheaply to everyone subscribed to a
labeler — and that is all it can do.
</p>

</div>
</v-click>
</div>

<div>
<v-click>
<div class="card">

### The verdict — the receipt

| | |
| --- | --- |
| outcome | `refuted` |
| failing clause | <code><Val check="crackland1-s2" clause /></code> |
| obligation digest | <Cid of="crackland1-s2" /> |
| axioms | <code><Val check="fairfax-s5" axioms /></code> |
| sandbox | `host-process (timeout only)` |
| log | `blob + sha256` |

</div>
</v-click>
</div>
</div>

<v-click>

The label's subject is the proof's URI *and* CID, so rewriting the proof drops the
label rather than following the edit to text nobody checked. And the verdict lives
in the *checker's* repository, because a verdict is the checker's speech about
someone else's record.

</v-click>

<!--
The 128-byte constraint is a genuine protocol limit, and working with it rather
than around it produced a better design: a cheap index that propagates plus a rich
receipt that doesn't.

`obligationDigest` is the field to point at — it is what makes two independent
verdicts comparable, and it sets up the next slide.
-->

---
clicks: 3
---

<div class="kicker">step 7 — the payoff</div>

## An unaffiliated party re-checks and agrees

<Independent />

<v-click>

Identical, byte for byte. Two parties with nothing in common demonstrably checked
*the same theorem* and reached the same conclusion.

</v-click>

<v-click>

The watchdog has no standing, no accreditation and no permission. It read three
CIDs and published its own verdict into its own repository. A reader compares
sources rather than trusting one — and if the two digests had *differed*, that
would itself be the finding: a bug, or a disagreement about decoding, and either
is worth knowing about.

</v-click>

<v-click>

<p class="muted">
This is the slide that justifies the protocol. Every other property — the DSL, the
theorem, the axiom audit — could live inside one agency's pipeline. This one
cannot.
</p>

</v-click>

<!--
Land this hard. It is the answer to "why not just build this as an internal tool".

The failure case is as interesting as the success case: differing digests would
mean the two checkers disagree about what the record *means*, and the design makes
that disagreement visible and specific instead of leaving two conflicting verdicts
with no way to tell why.
-->

---
clicks: 2
---

<div class="kicker">step 8 — versioning for free</div>

## One number changes. The certification stops applying.

One precinct's population edited from 1000 to 1001, long after the map was
certified.

<Staleness />

<v-click>

The proof still elaborates. It is simply no longer about anything that is
published. Nobody had to notice the edit, and no invalidation job had to run — the
reference was a hash, and the hash moved.

</v-click>

<v-click>

The same mechanism handles the regulator's side. Amend a requirement and every
proof against the old CID becomes detectably stale rather than silently
reinterpreted as a proof of the new rule. `proof-stale` is a distinct label from
`proof-refuted`, because "this is out of date" and "this is a violation" are
different accusations.

</v-click>

<!--
Emphasise that *nothing was invalidated*. There is no revocation list and no
background job. This falls out of using strongRefs everywhere, which cost nothing.

The stale/refuted distinction is a small fairness point that matters in a
regulatory setting: a state whose map is out of date has not been accused of
gerrymandering.
-->

---
clicks: 3
---

<div class="kicker">the boundary</div>

## A proof says the *published numbers* satisfy the rule

It says nothing about whether those are the real numbers. Populations and vote
tallies could be fabricated and every proof about them would still be valid — and
worthless.

<v-click>

Nor does the theory have any geometry. Contiguity is defined against the adjacency
graph *the plan's own author supplies*, so a plan that misstates which precincts
touch can prove contiguity of a map that is not contiguous.

</v-click>

<div class="cols" style="margin-top:0.9rem">
<div>
<v-click>
<div class="card tag warn">

### This is not a gap to close by better proving

<p class="small">
It is where formal methods stop. Every system of this kind has this boundary; most
leave it implicit, which is how a reader ends up believing a proof covers more than
it does.
</p>

</div>
</v-click>
</div>

<div>
<v-click>
<div class="card tag good">

### So make it a visible edge

<p class="small">
The plan lexicon requires <code>censusSource</code> and <code>returnsSource</code>
strongRefs to records from <em>separate authorities</em>. The honest-input
assumption becomes attributable and localised instead of buried.
</p>

</div>
</v-click>
</div>
</div>

<!--
Do not skip this slide, and do not rush it. In a room of skeptics it buys more
credibility than any of the technical slides.

The framing to use: the system does not eliminate trust, it *relocates* it — from
"trust that the agency checked" to "trust that the census is honest". The second is
a much smaller, much more scrutinised surface, and it is now named in the record.

Whether those authorities are credible is a question for humans. The point is that
the question is now askable, and points somewhere specific. Adjacency should get
the same treatment — a `geometrySource` is the obvious next field.
-->

---
clicks: 1
layout: default
---

<div class="kicker">other domains</div>

## Five slots. Swap the fillers.

<div class="domains">

| slot | redistricting | emissions permits | bank capital | clinical trials |
| --- | --- | --- | --- | --- |
| **artifact**<br><span class="cid">lexicon + Lean type + decoder</span> | districting plan | facility & process inventory | position-level balance sheet | protocol + analysis plan |
| **tier-1 clauses**<br><span class="cid">decidable; recomputation</span> | contiguity, population equality, county splits, efficiency gap | mass balance closes, every source reported, totals under cap | capital ratios, concentration and leverage limits | registered endpoints match analysed ones, no post-hoc outcomes |
| **tier-2 obligation**<br><span class="cid">quantifies over the unenumerable</span> | gap stays bounded under **every** swing in a band | emissions stay under cap across **every** operating profile in the permitted envelope | solvency holds under **every** scenario in a stress family | type-I error stays under α across **every** stopping rule the trial could have used |
| **regulator's lemma**<br><span class="cid">published once, in the theory</span> | gap is affine between seat changes | emissions monotone in load within the envelope | stressed loss is subadditive across the family | sequential-testing bound |
| **actor's certificate**<br><span class="cid">cheap, decidable, per-artifact</span> | the swings where a seat changes hands | the vertices of the operating envelope | the binding scenario per exposure class | the realised interim analyses |

</div>

<v-click>

The shape recurs because the underlying problem does: a snapshot rule is gameable,
the honest rule quantifies over a space too large to enumerate, and the regulator
is the only party with both the expertise and the standing to carry the general
argument.

</v-click>

<!--
Pick whichever column the room cares about and walk it top to bottom. The
redistricting column is there as the worked example, not the destination.

The row to dwell on is the last two. **Regulators publish lemmas; regulated actors
supply certificates.** That division is what makes this scale — the hard
mathematics is done once, by the party writing the rule, and each filer contributes
something cheap and specific to their own situation.

The emissions column is the most immediately plausible: envelope-based permits
already work this way informally, with the "proof" being a spreadsheet nobody
re-runs.
-->

---
clicks: 3
---

<div class="kicker">before you try it</div>

## What has to be true — and when this is the wrong tool

<div class="cols">
<div>
<v-click>
<div class="card tag good">

### Fits

- The artifact can be *published as data*, not as a PDF.
- There is a numeric core people already argue about.
- At least one obligation quantifies over something you cannot enumerate —
  otherwise a dashboard is cheaper and just as good.
- The regulator can carry the general lemma.
- Someone other than the regulator has a motive to re-check. Without that, the
  protocol is doing no work.

</div>
</v-click>
</div>

<div>
<v-click>
<div class="card tag bad">

### Doesn't

- The hard part is whether the *inputs* are honest. Proof does not help; audit
  does.
- The rule turns on a judgement call — "reasonable", "material", "in good faith".
  Formalising these does not make them precise, it just moves the argument to
  whoever wrote the formalisation.
- The artifact is a narrative.
- Nobody can be compelled to publish. A voluntary scheme selects for the
  compliant.

</div>
</v-click>
</div>
</div>

<v-click>

The temptation is to formalise the whole statute. Resist it. The value is
concentrated in the few clauses that are *numeric, contested, and currently
unverifiable* — and a system that covers those honestly is worth more than one that
claims to cover everything.

</v-click>

<!--
The "doesn't fit" column is the one that earns trust. Anyone who has watched a
formal-methods pitch has seen someone claim a technique generalises to everything.

The judgement-call point is the deepest objection and worth conceding fully:
formalising "reasonable" does not make it precise, it relocates the discretion to
whoever chose the formalisation — and hides it, which is worse than leaving it in
the open.
-->

---

<div class="kicker">summary</div>

## What to take away

<v-clicks>

- **Content addressing changes what a verdict is.** Three CIDs and a checker
  anyone can run turns "the agency says so" into a computation you can repeat or
  contradict.
- **The prover must never supply the statement.** Every other defence is
  secondary; a system without this one is producing labels, not findings.
- **Publish the decoder with the rule.** Otherwise two honest checkers can
  disagree about what a record means and neither is wrong.
- **Regulators publish lemmas; regulated actors supply certificates.** That
  division is what makes the unenumerable obligations tractable at scale.
- **Say what the proof does not cover.** The trust boundary belongs in the record
  graph, not in a footnote.

</v-clicks>

<div class="cols" style="margin-top:1.4rem">
<div>
<div class="card">

### Run it

```bash
cd lean && lake build
pnpm install
pnpm demo      # the full story, ~60s
pnpm test      # 44 tests, incl. adversarial
pnpm present   # this deck
```

</div>
</div>
<div>
<div class="card">

### Read it

<p class="small">
<code>DESIGN.md</code> — architecture, the binding problem, the four defences, and
§§ 4 and 11 on what this does not do and where it is incomplete.
</p>
<p class="small">
<code>lean/Redistrict/Swing.lean</code> — the durability theorem and the
certificate.
</p>

</div>
</div>
</div>

<!--
If you only keep one line: **a verdict here is not an authority's assertion, it is
a computation with named inputs.** Everything else is in service of making that
true.

Offer the adversarial test file to anyone who wants to poke at the trust model —
it is the most convincing artifact in the repository.
-->
