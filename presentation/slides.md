---
theme: none
title: Proofs are just records
info: |
  An atproto meetup talk. Publish a mathematical claim as a record, publish a
  proof of it as another record, and let anyone label the result.
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

Leave `clicks:` off unless a *component* is driven by `$clicks`. Slidev counts
<v-click> elements for you, and an explicit number is a cap rather than a
minimum — set it too low and the last reveals silently never fire.
`test/slides.test.ts` fails on that and a few neighbouring mistakes.

Presenter notes are the HTML comment at the very end of each slide. Press `p`
in the browser for presenter mode (notes, timer, next-slide preview).

Two headmatter settings are worth knowing about:

  mdc: false        Load-bearing. MDC's inline-attribute syntax renders through a
                    synchronous path that cannot await syntax highlighting, so
                    turning it on breaks the build on every slide with inline code.
  aspectRatio       16/9 suits a projector. A browser window is usually taller —
                    16/10 fills a MacBook screen exactly. Either way the margin
                    around the slide is painted the same color as the slide, so
                    a mismatch is invisible rather than a gray band.

Figures are Vue components in `components/`. They read `data.json`, which
`pnpm present:data` writes from a real demo run — so the CIDs, verdicts, axiom
sets and swing curves on these slides are captured, never typed. `<Val …/>`
pulls a captured number into a sentence; prefer it over writing the figure out,
so editing prose cannot leave a stale number beside a live chart.

  pnpm present         dev server, hot-reloads as you edit
  pnpm present:data    re-capture from a fresh run
  pnpm present:build   static site into dist/

ROUGH SHAPE, if you are cutting for time:
  1–5    atproto framing. Don't cut.
  6–11   the eDSL and the layers of auditability. The heart of the talk.
  12–21  the worked example. Slides 13 and 21 are the most skippable.
  22–28  the trust model. Slide 23 is the one people remember.
  29–32  generalization and close.
================================================================================
-->

<div class="kicker">an atproto meetup talk</div>

# Lean proofs on the atproto for regulation

<p class="lead">
Regulators publish runnable proofs in readable language that regulated actors must submit evidence for, and the public can check each party's work.
</p>

<p class="muted">
Everything on these slides came out of a real run · <Val toolchain /> ·
<Val count="repos" /> repos · <Val count="labels" /> signed labels
</p>

<!--
Open light. This room knows atproto far better than it knows theorem provers, so
the first five minutes are about a shape they already have opinions on. Lean does
not show up until slide 8.

Nothing here is illustrative. Every CID, verdict, axiom set and curve was captured
from an actual run by `pnpm present:data` — including the numbers on this slide.
-->

---

<div class="kicker">the shape you already know</div>

## Someone publishes. Someone else labels. You choose who to believe.

<div class="cols-3">
<v-click>
<div class="card">

### 1 · a record

Lands in the author's repo. Content-addressed, signed, and nobody else can touch
it.

</div>
</v-click>

<v-click>
<div class="card">

### 2 · a label

Someone *else* says something about that record, from their own repo, pinned to
the exact version they looked at.

</div>
</v-click>

<v-click>
<div class="card">

### 3 · your choice

You subscribe to the labelers you find credible. Two can disagree, and the
protocol has no opinion about which is right.

</div>
</v-click>
</div>

<v-click>

That is moderation. It is also, it turns out, a rather good shape for
**regulation**.

</v-click>

<v-click>

<p class="muted">
Swap the record for a claim about the world, make the label mean <em>we checked
the math</em>, and this same three-party structure gives you something that is
genuinely hard to build any other way.
</p>

</v-click>

<!--
If you have ever explained to someone why stackable moderation beats one company's
opinion, you have already given half of this talk. Say that out loud — it lands.

The move: keep the topology, change what is inside the record. Nothing about the
protocol needs to change to support this, which is the whole reason it is worth
doing here rather than as somebody's SaaS.
-->

---

<div class="kicker">the cast</div>

## Six repos. Nobody writes into anyone else's.

<Ownership />

<v-click>

The worked example is redistricting. A federal agency publishes what a districting
plan *is* and what it means for one not to be gerrymandered. States publish their
maps and proofs that the maps comply. Anyone re-runs the check.

</v-click>

<v-click>

The regulator appears twice on purpose: it writes the rules, and it runs a
checker. *Only the first of those is exclusive to it.* The watchdog has no
standing, no accreditation and no API key, and publishes verdicts by exactly the
same mechanism.

</v-click>

<!--
Point at the boxes. What people find surprising is that there is no shared
database and no privileged writer — which is only surprising if you have spent
time with compliance systems, where a central authority is the entire design.

The data authorities along the bottom get their own slide much later. For now just
note they exist and that the states *cite* them.
-->

---

<div class="kicker">why bother with a protocol</div>

## Four things you get for free that are otherwise expensive

<div class="cols">
<v-clicks>

- **One writer per collection.** The regulator cannot quietly edit a state's map.
  A state cannot edit the rule it is measured against. Not enforced by policy —
  there is simply nowhere to write.

- **`strongRef` pins the version.** Every citation is URI *and* CID. Edit a
  certified map and the certification stops applying. No revocation list, no
  invalidation job, no cron. The hash moved and the reference no longer resolves
  to what it named.

- **Labelers stack.** The regulator runs a checker because someone should. A
  newspaper can run one. You can run one. Readers pick, and the protocol stays
  out of it.

- **The firehose is the work queue.** A checker subscribes to
  `com.atproto.sync.subscribeRepos`, sees a `dev.provable.proof` commit go past,
  and checks it. No submission portal, no registration, no rate-limit form.

</v-clicks>
</div>

<v-click>

<p class="muted">
None of this needs new protocol machinery. It is repos, lexicons, strongRefs and
labels doing what they already do.
</p>

</v-click>

<!--
This is the "why not just build an API" slide, and it is worth being blunt: an
API's answer is still the agency's word. Content addressing is what turns a
finding into something a stranger can reproduce, or contradict *specifically*.

The firehose point usually gets a nod. Compliance systems normally have a
submission portal with a queue behind it. Here the queue is a public log anyone
can also read.
-->

---
# Explicit, and must stay: RecordGraph is driven by $clicks, so the build length
# is not derivable from the markup the way a run of <v-click> is.
clicks: 6
---

<div class="kicker">the lexicons</div>

## Five record types and a label

<RecordGraph :step="$clicks + 1" />

<div class="cols">
<div>

<p class="small">
Nothing exotic. <code>dev.provable.theory</code> carries the meaning of the rules,
<code>dev.provable.requirement</code> carries a rule,
<code>gov.redistrict.plan</code> is the thing being regulated,
<code>dev.provable.proof</code> is the filing, and
<code>dev.provable.verdict</code> is what a checker found.
</p>

</div>
<div>

<v-click at="6">

<p class="muted">
Note what is <em>absent</em> from <code>dev.provable.proof</code>: there is no
field for the theorem statement. That omission is doing more work than anything
else in the schema, and we come back to it.
</p>

</v-click>

</div>
</div>

<!--
Build it one edge at a time: theory → requirement → plan → datasource → proof →
verdict and label.

Every arrow is a strongRef. Say the versioning line here rather than earlier: this
is not a feature anyone designed, it is what content addressing already gives you.

Leave the missing-statement-field hook hanging. It pays off on slide 23.
-->

---
clicks: 4
---

<div class="kicker">the idea this talk is actually about</div>

## Three audiences. One stack. Stop wherever you like.

<AuditLayers :step="$clicks" />

<v-click at="4">

<p class="muted" style="margin-top:0.9rem">
You use Bluesky without ever verifying an MST inclusion proof. The proof is there,
it is checkable, and somebody does check it — but your experience does not depend
on you being that person. <em>That</em> is the property worth copying.
</p>

</v-click>

<!--
The center of the talk. If a listener remembers one slide, make it this one.

The failure mode of every "formal methods for public policy" pitch is demanding
that everybody become a logician. The alternative is not dumbing it down; it is
layering it, so each audience gets a real artifact rather than a summary of one.

The Bluesky analogy does a lot of work — use it. Nobody in this room verifies MSTs
by hand, and nobody thinks that makes the guarantee fake.
-->

---

<div class="kicker">the tooling half</div>

## What is an embedded DSL, and why would you want one

<div class="cols">
<div>

<v-click>

### A DSL is a small language for one job

<p class="small">
SQL for queries. Regex for patterns. CSS for layout. <strong>Lexicon</strong> for
record shapes — you already write DSLs, you just call them schemas.
</p>

</v-click>

<v-click>

### Embedded means it lives inside a host

<p class="small">
No separate parser, compiler, formatter, editor plugin or Stack Overflow tag. You
inherit the host language's tooling, and here the tooling worth inheriting is a
<em>proof checker</em>.
</p>

</v-click>

</div>
<div>

<v-click>

<div class="card tag warn">

### "We built a DSL" is normally a warning sign

<p class="small">
It usually means a new grammar, a new implementation and a new class of bug
nobody else will ever find. The redeeming feature of an <em>embedded</em> DSL is
that you did not write a compiler, so you cannot have got one subtly wrong.
</p>

<p class="small">
What you write is surface syntax that expands into the host's own terms. The thing
being checked is the host's, not yours.
</p>

</div>

</v-click>

</div>
</div>

<!--
Pitch this at someone who writes TypeScript and lexicons, not at someone who has
used Coq.

The lexicon comparison is the one to lean on: declarative, narrow, read by tooling
rather than executed. An eDSL is that, plus it expands into a real language
underneath.

If asked "why not JSON rules with an interpreter" — because then you have written
an interpreter, and the interesting question becomes who checks *it*.
-->

---

<div class="kicker">why this host language</div>

## Lean is two things at once

<div class="cols">
<div>

<v-click>

### A proof checker with a small kernel

<p class="small">
Give it a claim and an argument and it tells you whether the argument establishes
the claim. It cannot be talked into it, it does not get tired, and it does not
care who filed the proof.
</p>

<p class="small">
The part that has to be trusted is a few thousand lines, and it has been
reimplemented from scratch by people trying to catch it out.
</p>

</v-click>

<v-click>

### A macro system

<p class="small">
You can define what a claim <em>looks like</em>. Not a comment above the claim, not
a docstring beside it — the surface syntax of the claim itself.
</p>

</v-click>

</div>
<div>

<v-click>

<div class="card tag good">

### Put those together

<p class="small">
The rule reads like a rule <em>and</em> is the exact object the kernel checks.
</p>

<p class="small">
Most attempts to formalize a regulation produce two artifacts: the one everyone
argues about, and the formalization nobody reads. They drift, and the drift is
invisible until it matters.
</p>

<p class="small">
An embedded DSL gives you <strong>one artifact</strong>. There is no second
document to get out of step.
</p>

</div>

</v-click>

</div>
</div>

<!--
Do not oversell rigor — this room does not need convincing that math is rigorous.
Sell the *combination*. A theorem prover alone gives an unreadable artifact; nice
syntax alone gives a readable artifact nobody checks. The interesting claim is that
both objects can be the same object.

If someone asks why not Coq, Isabelle, Agda, F* — any of them could work. Lean's
macro system is unusually pleasant and the community is large. It is a taste call,
not a technical necessity, and say so.
-->

---

<div class="kicker">layer one · anyone</div>

## The rule, as published

<div class="cols">
<div>

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
The <code>statement</code> field of
<code>dev.provable.requirement/fda-section-2</code><br>
<Cid of="section2" :chars="30" />
</p>

</div>

<div>
<v-click>

<p>
Nobody has ever read a statute for pleasure. People do read a bulleted list.
</p>

<p>
And this is not a friendly paraphrase sitting next to the real thing. It is the
<em>same text</em> the theory package compiles. Check that the record's
<code>statement</code> matches the theory's source and you have checked everything
at this layer — there is no third artifact.
</p>

</v-click>

<v-click>

<p class="muted">
Elaborating it also emits a per-clause evaluator, so a refutation can name
<em>which clause</em> failed rather than reporting that a conjunction did. Same
source, so the names in a verdict cannot drift from the names in the rule.
</p>

</v-click>
</div>
</div>

<!--
Read it out loud. That is the whole acceptance test for the DSL: if it sounds like
code, it has failed.

Two implementation notes, only if asked. Every English word is a *non-reserved*
token, because a plain atom would make `plan` and `gap` unusable as identifiers in
every file downstream. And the `·` bullet is there because a syntax category
cannot begin with a non-reserved word — that it also looks like legal drafting was
luck.
-->

---

<div class="kicker">layer two · domain experts</div>

## What the words actually mean

<Vocabulary expand="efficiency gap is at most" />

<v-click>

That table is not documentation. It is the `vocabulary` field of the published
`dev.provable.theory` record — the theory ships its own glossary, on the wire,
pinned by CID.

</v-click>

<v-click>

<p class="muted">
So auditing what a rule <em>means</em> does not require reading Lean. An election
lawyer can check that "efficiency gap" points at the Stephanopoulos–McGhee
definition rather than something adjacent, and take the argument from there.
</p>

</v-click>

<!--
This is the layer nobody builds, and it is the one that decides whether a scheme
like this is legitimate or merely impressive.

The substantive point: the fight over a rule like this will be about definitions,
not about proofs. Publishing the definitions as a first-class record is how you
make that fight happen in public rather than in an appendix.
-->

---

<div class="kicker">layer three · the stubborn</div>

## What the kernel says

```
'Obligation.proof' depends on axioms: [propext, Classical.choice, Quot.sound]
```

<v-click>

Three axioms. Lean's standard three. **No `sorryAx`** — no holes — and nothing the
prover declared for themselves.

</v-click>

<v-click>

You do not have to read the proof. You have to believe the kernel accepted it, and
that the kernel is the kernel. Both are checkable by someone who is not you, which
is the entire point of having layers.

</v-click>

<v-click>

<div class="card tag warn">

<p class="small">
<code>#print axioms</code> reports to stdout, and a checker built on scraping
stdout <em>fails open</em>: change the message format and an unproved theorem
sails through. So this project turns the audit into a build failure —
<code>#assert_axioms</code> runs the same query and exits nonzero.
</p>

</div>

</v-click>

<!--
The axiom line is the most compressed piece of evidence in the system. It fits in
a tweet and it rules out the entire category of "the proof has a hole in it".

The fails-open point generalizes well past Lean, and people nod at it: any
verification step whose failure mode is silence is not a verification step.

There is one rung above this — replaying the whole environment through a clean
kernel with lean4checker — which this project does not do. Say so if asked;
DESIGN.md § 5 says so too.
-->

---

<div class="kicker">so let us actually try it</div>

## Two states, three maps, identical geography

<MapLegend />

<div class="cols-3">
<div>

### Fairfax
<DistrictMap plan="fairfax" />
<div class="cid" style="margin-top:0.5rem">State of Fairfax</div>

</div>
<div>

### Gerryland v1
<DistrictMap plan="gerryland1" />
<div class="cid" style="margin-top:0.5rem">State of Gerryland</div>

</div>
<div>

### Gerryland v2
<DistrictMap plan="gerryland2" />
<div class="cid" style="margin-top:0.5rem">State of Gerryland</div>

</div>
</div>

<v-click>

Sixty precincts of a thousand voters, ten districts of six. Population equality and
contiguity never separate these maps, and all three give party A
*<Val check="fairfax-s2" voteShare />* of the statewide vote. The districting is the
only variable, which is what a districting rule is supposed to be about.

</v-click>

<v-click>

<p class="muted">
The two Gerryland maps share precinct data exactly — the fills are identical and
<em>only the white boundaries differ</em>. Same voters, redrawn.
</p>

</v-click>

<!--
Redistricting is a good demo domain because the rules are numeric, the stakes are
real, and everybody already has an opinion. It is not the point of the project —
slide 29 is about moving this elsewhere.

Let them look. The middle map is four dark blocks and six orange ones, which is
packing and cracking drawn as data. The right-hand one looks tidy and innocent.
Hold that thought.
-->

---

<div class="kicker">the same three maps, as numbers</div>

## District by district

<SharesTable :plans="['fairfax', 'gerryland1', 'gerryland2']" />

<!--
The table-view twin, on its own slide so you can jump to it when somebody asks.

The diamonds mark seats that change hands inside the ±5-point band. Fairfax has
two, Gerryland v2 has none, and that single difference is the entire back half of
the example. Skippable if you are short of time.
-->

---

<div class="kicker">a state files</div>

## § 2 is decidable, so the whole proof is one tactic

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

Every clause of § 2 is a computation, so the kernel is doing arithmetic rather than
mathematics. A proof at this tier is a **recomputation certificate**.

That is worth having — exact, reproducible by anyone, and it localizes which
criterion a map broke. But it does not need a theorem prover, and claiming
otherwise is how you lose the first competent person in the room.

</v-click>

<v-click>

<p class="muted">
The requirement that <em>cannot</em> be a computation is § 5, and it is coming.
</p>

</v-click>
</div>
</div>

<!--
Do not oversell tier one. If you claim a proof assistant is needed to check five
inequalities, you have handed the skeptic their opening.

The axiom line is the thing to point at: propext only.
-->

---

<div class="kicker">a state files badly</div>

## Refuted on exactly one named clause

<div class="cols">
<div>

<DistrictMap plan="gerryland1" :cell="30" />
<div style="margin-top:0.7rem"><ShareStrip plan="gerryland1" :w="300" /></div>

</div>
<div>

<Verdict id="gerryland1-s2" />

<v-click>

The map clears *every* structural clause — contiguous, population-equal,
county-respecting. Four districts packed at 75% and six cracked below 50% put the
efficiency gap at *<Val check="gerryland1-s2" gap />*.

</v-click>

<v-click>

Naming the clause is what makes this actionable. "The conjunction failed" tells a
state nothing. "Your efficiency gap is 18%" tells it what to change, and tells the
public what the objection actually is.

</v-click>

</div>
</div>

<!--
The bar chart is the tell: four bars far right, six far left, nothing near the
middle.

The clause names come from the same DSL source as the rule, so a verdict cannot
name a clause the statute does not have.
-->

---

<div class="kicker">the twist</div>

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

### Gerryland v2
<DistrictMap plan="gerryland2" :cell="26" />
<div class="cid" style="margin-top:0.5rem">
gap <Val check="gerryland2-s2" gap /> · <Val check="gerryland2-s2" seats /> seats
</div>

</div>
<div>

<Verdict id="gerryland2-s2" :summary="false" />

</div>
</div>

<v-click>

Same voters, redrawn. The gap is now *<Val check="gerryland2-s2" gap />* —
identical to Fairfax's, to the basis point. On the snapshot rule these two maps
are *indistinguishable*.

</v-click>

<v-click>

A rule that stops here has been satisfied. Whether it has been *complied with* is a
different question.

</v-click>

<!--
This is the hinge. Slow down.

Same statewide vote, same seat count, same efficiency gap to the basis point. Any
rule that measures the reference election alone certifies both. Ask the room what
they would do next — the honest answer is "add more metrics", and the next slide
is why that is not enough.
-->

---

<div class="kicker">what § 2 cannot see</div>

## What happens when opinion moves

<SwingChart>
Efficiency gap against a uniform swing, computed by the Lean theory itself rather
than re-derived for this chart. Gerryland v1 is off this scale at
<Val check="gerryland1-s2" gap />.
</SwingChart>

<v-click>

Fairfax sawtooths and stays inside the limit across the whole band. Gerryland v2
runs straight through it — *<Val plan="gerryland2" :at-swing="-500" />* at a
five-point swing toward B, *<Val plan="gerryland2" :at-swing="500" />* toward A.

</v-click>

<!--
Let the picture work before explaining it. Hover along the lines for values; the
`table` toggle in the legend has the numbers.

Each near-vertical drop in the green line is a seat changing hands, which pushes
the gap back the other way. The purple line has no drops at all, because nothing
in that map ever changes hands inside the band.

Both curves have the same slope everywhere: the gap moves at exactly twice the
swing between seat changes. That is a theorem, not an eyeball reading.
-->

---

<div class="kicker">why</div>

## The difference is competitiveness, not fairness

<div class="cols">
<div>

### Fairfax — two seats in play
<ShareStrip plan="fairfax" />

</div>
<div>

### Gerryland v2 — none
<ShareStrip plan="gerryland2" />

</div>
</div>

<v-click>

The shaded strip is the ±5-point band § 5 quantifies over. A district whose bar tip
falls inside it changes hands somewhere in that range. Fairfax has <Val
plan="fairfax" seats-in-play /> of them; Gerryland v2 has <Val plan="gerryland2"
seats-in-play /> — its most competitive seat would need an <Val plan="gerryland2"
closest-flip />-point swing to move.

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
guess from reading the words, and it is exactly the kind of thing formalizing a
rule is good for.

</v-click>

<!--
The most interesting result in the project, and it was not the plan. The
requirement was drafted as "the gap stays bounded under swing", which sounds like a
stability condition. Proving it showed stability is only reachable through
responsiveness.

If someone objects that competitive districts are a policy choice rather than a
legal requirement — yes, exactly. The formalization surfaced a policy consequence
the drafter did not write down. That is an argument *for* formalizing.

Expect "why v2 and not v1?" — it is the natural question, since v1 is the map that
already failed. Two answers. v1 was refuted on § 2 outright, so § 5 never gets
asked about it. And more interestingly, v1 has *four* seats inside the band: it is
the most competitive of the three maps and still the most unfair, which is a
useful reminder that responsiveness and fairness are different properties. § 5
requires the first; § 2 measures the second.
-->

---

<div class="kicker">the certificate</div>

## Six checks instead of a thousand

<SwingChart :h="272" markers :breakpoints="[-500, -150, -149, 350, 351, 500]"
  :jumps="[-149.5, 350.5]">
The rings are the only six swings Fairfax actually evaluates. Everything between
them is settled by an argument rather than by a measurement.
</SwingChart>

<div class="cols-3">
<v-click>
<div class="card">

### 1 · Between jumps it is a straight line

<p class="small">
As the swing moves, the gap climbs at a steady rate — twice the swing, always. No
map can make it climb faster or slower.
</p>

</div>
</v-click>

<v-click>
<div class="card">

### 2 · A jump is a seat changing hands

<p class="small">
That is the only thing that breaks the line. Fairfax has two inside the band, at
the vertical rules.
</p>

</div>
</v-click>

<v-click>
<div class="card">

### 3 · A steady climb is highest and lowest at its ends

<p class="small">
So if the gap is inside the limit at both ends of a stretch, it is inside the limit
<em>everywhere</em> in that stretch. Check the two ends; the middle comes free.
</p>

</div>
</v-click>
</div>

<v-click>

<p style="margin-top:1rem">
Six ends — the two edges of the band, and the swing either side of each jump —
settle all 1001 swings in it.
</p>

</v-click>

<!--
This is the answer to "couldn't you just check every swing?" At ±5 points you
could, slowly. At ±50 you could not, and the certificate is the same length.

Walk the three cards and point at the chart for each. The green line is the
argument drawn out.

Say out loud that this is not sampling. The middle of a stretch is not
spot-checked, it is *proved* — the theorem is what licenses skipping it.
-->

---

<div class="kicker">who does what</div>

## Regulators publish lemmas. Regulated actors supply certificates.

<div class="cols">
<div>

```lean
⟨by decide,
   Redistrict.swingRobust_of_chain
     [-150, -149, 350, 351, 500]
     (by decide) (by decide) (by decide)⟩
```

<p class="small">That is Fairfax's entire proof of § 5. Three pieces:</p>

<ul>
<li><code>swingRobust_of_chain</code> is <strong>the regulator's theorem</strong> —
  the argument from the last slide, written once and shipped in the theory package.</li>
<li>The list is <strong>Fairfax's certificate</strong>: the swings either side of
  each seat change, bracketed by the edges of the band.</li>
<li>The three <code>by decide</code>s are <strong>arithmetic</strong>: the map is
  well formed, the list really does span the band, and no seat change is hiding
  inside a stretch.</li>
</ul>

</div>

<div>
<v-click>
<div class="card">

### Why the list has pairs

<p class="small">
−150 and −149 look redundant. They are not. A stretch has to have no jump inside
it, so the list stops just before each seat change and restarts just after. Swings
are counted in whole hundredths of a point, so "just before" and "just after" are
exact values, not an approximation.
</p>

</div>
</v-click>

<v-click>
<div class="card">

### Why this scales

<p class="small">
Widening the band multiplies the swings to check without bound, but adds only two
entries to the certificate per seat that can change hands — at most 22 on a
ten-district map, however wide the band.
</p>

</div>
</v-click>

<v-click>

<p class="small muted">
And the expensive half is done once. The regulator proves the general argument;
each state contributes a short list and some arithmetic about its own map. That
division is what makes this shape work outside a demo.
</p>

</v-click>
</div>
</div>

<!--
If there is one slide to remember for adapting this elsewhere, it is this one:
**regulators publish lemmas, regulated actors supply certificates.**

A scheme that asked every regulated actor to produce original mathematics would
never get off the ground. This one asks them for a list.
-->

---

<div class="kicker">the verdict § 2 could not reach</div>

## The same certificate, on the map that cannot support it

<div class="cols">
<div>

<Verdict id="gerryland2-s5" />

</div>
<div>
<v-click>

### Three-way, on purpose

A tier-1 clause is decidable, so evaluation settles it either way. A tier-2 clause
covers an unbounded range: evaluation can *refute* it by exhibiting a swing that
breaks the bound, but it can never confirm it.

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
Most compliance tooling has two states and lies in one direction or the other. The
three-way status is a small thing people notice and like.

Contrast the two § 5 verdicts explicitly: same clause, same evaluator, one refuted
by a counterexample and one undecided until a proof arrived.
-->

---

<div class="kicker">the hard part nobody expects</div>

## A proof is about a Lean value. A record is bytes.

If those two can drift apart, a proof certifies nothing in particular. Something has
to fix the correspondence — and *who* fixes it decides whether two honest checkers
can disagree.

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
checker etiquette, but because *the obligation is false*.

</v-click>

<!--
This is the slide that separates a demo from a design. Most "put proofs on a
ledger" proposals never address it, and it is where they quietly fail.

The total-decoder trick is worth pausing on. The naive move is to have the checker
reject undecodable records, which works until a checker forgets. Making the
obligation *false* instead enforces the property with mathematics rather than with
everybody remembering.
-->

---

<div class="kicker">the part that makes it not theater</div>

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

So the proof record has no statement field. The checker derives the obligation from
the requirement CID and the artifact CID and *writes the signature line itself*:

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
Ask the room how they would attack this before revealing it. Someone usually gets
there.

The statement module is compiled to a `.olean` *before* the prover's text is
elaborated at all. The prover cannot redefine `Obligation.stmt`, because it is
already declared in an imported module — that is a duplicate-declaration error —
and the signature the checker wrote still refers to the imported one. Both fire;
either would do.
-->

---

<div class="kicker">and how we know</div>

## Four defenses, tested one at a time

| defense | stops | tested by |
| --- | --- | --- |
| **Separate statement module**<br><span class="cid">compiled before any prover text</span> | choosing what to prove | `cannot redefine the obligation` |
| **Import, not inclusion**<br><span class="cid">redefinition is a duplicate declaration</span> | shadowing the statement | `cannot redefine the obligation` |
| **`#assert_axioms`**<br><span class="cid">audit turned into a build failure</span> | holes, native evaluation, new axioms | `fails the build when the proof is a hole` |
| **Lexical screen**<br><span class="cid">defense in depth only</span> | nothing on its own | `9 rejection cases` |

<div class="cols" style="margin-top:1.1rem">
<div>
<v-click>
<div class="card tag good">

### Each is tested with the others routed around

<p class="small">
The axiom test deliberately <em>bypasses</em> the screen and drives Lean directly.
A suite that only ever exercised the cheapest defense would keep passing after the
expensive one was deleted.
</p>

</div>
</v-click>
</div>

<div>
<v-click>
<div class="card tag warn">

### What is not defended

<p class="small">
Elaborating a stranger's Lean is running their code. This checker enforces a
timeout and nothing else — no filesystem sandbox, no network isolation. Every
verdict says so in its <code>checker.sandbox</code> field rather than letting a
reader assume otherwise.
</p>

</div>
</v-click>
</div>
</div>

<v-click>

<p class="muted">
Also covered: artifact swapping, injection through the requirement's
<code>leanProp</code> field, an unrecognized toolchain, a wrong-typed artifact,
post-hoc mutation of a certified map, and a swing certificate that does not span
its band. 49 tests, all green.
</p>

</v-click>

<!--
The methodological point matters more than any individual defense: layered defenses
rot silently when the cheapest one always fires first.

If you want to hand someone a single file that argues this project is serious, hand
them test/adversarial.test.ts.
-->

---

<div class="kicker">back to labels</div>

## A label cannot carry evidence, so: two records

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
bytes. No fields, no structure. It propagates cheaply to everyone subscribed to a
labeler, and that is all it can do.
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
| failing clause | `<Val check="gerryland1-s2" clause />` |
| obligation digest | <Cid of="gerryland1-s2" /> |
| axioms | `<Val check="fairfax-s5" axioms />` |
| sandbox | `host-process (timeout only)` |
| log | `blob + sha256` |

</div>
</v-click>
</div>
</div>

<v-click>

The label's subject is the proof's URI *and* CID, so rewriting the proof drops the
label rather than following the edit to text nobody checked. And the verdict lives
in the *checker's* repo, because a verdict is the checker's speech about someone
else's record.

</v-click>

<!--
Working with the 128-byte constraint rather than around it produced a better
design: a cheap index that propagates, plus a rich receipt that does not.

`obligationDigest` is the field to point at — it sets up the next slide.
-->

---

<div class="kicker">the payoff</div>

## An unaffiliated party re-checks and agrees

<Independent />

<v-click>

Identical, byte for byte. Two parties with nothing in common demonstrably checked
*the same theorem* and reached the same conclusion.

</v-click>

<v-click>

The watchdog has no standing, no accreditation and no permission. It read three
CIDs and published its own verdict into its own repo. A reader compares sources
rather than trusting one — and if the digests had *differed*, that would itself be
the finding: a bug, or a disagreement about decoding, and either is worth knowing
about.

</v-click>

<v-click>

<p class="muted">
This is the slide that justifies the protocol. The DSL, the theorem, the axiom
audit — all of those could live inside one agency's pipeline. This one cannot.
</p>

</v-click>

<!--
Land it. This is the answer to "why not build it as an internal tool".

The failure case is as interesting as the success: differing digests mean the two
checkers disagree about what the record *means*, and the design makes that
disagreement specific rather than leaving two conflicting verdicts with no way to
tell why.
-->

---

<div class="kicker">versioning, for free</div>

## One number changes. The certification stops applying.

One precinct's population edited from 1000 to 1001, long after the map was
certified.

<Staleness />

<v-click>

The proof still elaborates. It is simply no longer about anything that is
published. Nobody had to notice the edit and no invalidation job had to run — the
reference was a hash, and the hash moved.

</v-click>

<v-click>

Same mechanism on the regulator's side. Amend a requirement and every proof against
the old CID becomes detectably stale rather than silently reinterpreted as a proof
of the new rule. `proof-stale` is a distinct label from `proof-refuted`, because
"this is out of date" and "this is a violation" are different accusations.

</v-click>

<!--
Emphasize that *nothing was invalidated*. There is no revocation list and no
background job. This falls out of using strongRefs everywhere, which cost nothing.

The stale/refuted distinction is a small fairness point that matters in a
regulatory setting: a state whose map is out of date has not been accused of
gerrymandering.
-->

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

### Not a gap to close by better proving

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
assumption becomes attributable and localized instead of buried.
</p>

</div>
</v-click>
</div>
</div>

<!--
Do not skip this and do not rush it. In a room of skeptics it buys more credibility
than any of the technical slides.

The framing: the system does not eliminate trust, it *relocates* it — from "trust
that the agency checked" to "trust that the census is honest". The second is a much
smaller, much more scrutinised surface, and it is now named in the record.

Adjacency should get the same treatment. A `geometrySource` is the obvious next
field and it does not exist yet.
-->

---
layout: default
---

<div class="kicker">other domains</div>

## Five slots. Swap the fillers.

<div class="domains">

| slot | redistricting | emissions permits | bank capital | clinical trials |
| --- | --- | --- | --- | --- |
| **artifact**<br><span class="cid">lexicon + Lean type + decoder</span> | districting plan | facility & process inventory | position-level balance sheet | protocol + analysis plan |
| **tier-1 clauses**<br><span class="cid">settled by arithmetic</span> | contiguity, population equality, county splits, efficiency gap | mass balance closes, every source reported, totals under cap | capital ratios, concentration and leverage limits | registered endpoints match analyzed ones, no post-hoc outcomes |
| **tier-2 obligation**<br><span class="cid">covers more cases than you can check</span> | gap stays bounded under **every** swing in a band | emissions stay under cap across **every** operating profile in the permitted envelope | solvency holds under **every** scenario in a stress family | type-I error stays under α across **every** stopping rule the trial could have used |
| **regulator's lemma**<br><span class="cid">published once, in the theory</span> | the gap climbs at a steady rate between seat changes | emissions only rise with load, within the envelope | a combined stress is no worse than its parts added up | sequential-testing bound |
| **actor's certificate**<br><span class="cid">cheap, per-artifact</span> | the swings where a seat changes hands | the vertices of the operating envelope | the binding scenario per exposure class | the realized interim analyses |

</div>

<v-click>

The shape recurs because the underlying problem does: a snapshot rule is gameable,
the honest rule covers more cases than anyone can enumerate, and the regulator is
the only party with both the expertise and the standing to carry the general
argument.

</v-click>

<!--
Pick whichever column the room cares about and walk it top to bottom. The
redistricting column is the worked example, not the destination.

The last two rows are the ones to dwell on. Regulators publish lemmas; regulated
actors supply certificates.

Emissions is the most immediately plausible: envelope-based permits already work
this way informally, with the "proof" being a spreadsheet nobody re-runs.
-->

---

<div class="kicker">before you try it at home</div>

## What has to be true — and when this is the wrong tool

<div class="cols">
<div>
<v-click>
<div class="card tag good">

### Fits

- The artifact can be *published as data*, not as a PDF.
- There is a numeric core people already argue about.
- At least one obligation covers more cases than you can enumerate — otherwise a
  dashboard is cheaper and just as good.
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
- The rule turns on a judgment call — "reasonable", "material", "in good faith".
  Formalizing these does not make them precise, it moves the argument to whoever
  wrote the formalization, and hides it there.
- The artifact is a narrative.
- Nobody can be compelled to publish. A voluntary scheme selects for the
  compliant.

</div>
</v-click>
</div>
</div>

<v-click>

The temptation is to formalize the whole statute. Resist it. The value is
concentrated in the few clauses that are *numeric, contested, and currently
unverifiable*, and a system that covers those honestly is worth more than one that
claims to cover everything.

</v-click>

<!--
The "doesn't fit" column is the one that earns trust. Anyone who has sat through a
formal-methods pitch has heard someone claim the technique generalizes to
everything.

The judgment-call point is the deepest objection and worth conceding fully.
-->

---

<div class="kicker">summary</div>

## What to take away

<v-clicks>

- **The moderation shape generalizes.** Record, label, subscriber choice — it works
  just as well when the record is a claim and the label means "we checked".
- **Layer the auditability.** The public reads a rule, experts audit what the words
  mean, the stubborn check the axioms. Nobody has to understand all of it.
- **An embedded DSL means one artifact.** The text everyone argues about and the
  thing the kernel checks are the same object, so they cannot drift.
- **The prover must never supply the statement.** Every other defense is secondary;
  without this one you are producing labels, not findings.
- **Say what the proof does not cover.** The trust boundary belongs in the record
  graph, not in a footnote.

</v-clicks>

<!--
If you only keep one line: a verdict here is not an authority's assertion, it is a
computation with named inputs. Everything else serves making that true.
-->

---
layout: default
---

<div class="kicker">take it with you</div>

## All of it is on GitHub

<div class="repo-slide">
<div class="qr">

<QrCode data="https://github.com/franknoirot/atproto-proofs" :size="290" />

</div>

<div>

<div class="card">

### Run it

```bash
cd lean && lake build     # the regulator's theory
pnpm install
pnpm demo                 # the full story, ~60s
pnpm test                 # 49 tests, incl. the adversarial suite
pnpm present              # this deck
```

</div>

<div class="cols" style="margin-top:0.9rem">
<div>

### Start here

<ul>
<li><code>DESIGN.md</code> — the architecture, the binding problem, the four
  defenses, and §§ 4 and 11 on what this does <em>not</em> do.</li>
<li><code>test/adversarial.test.ts</code> — the trust model, attacked. The most
  convincing file in the repository.</li>
</ul>

</div>
<div>

### The interesting bits

<ul>
<li><code>lean/Redistrict/Dsl.lean</code> — the requirement language.</li>
<li><code>lean/Redistrict/Swing.lean</code> — the durability theorem.</li>
<li><code>presentation/slides.md</code> — this talk.</li>
</ul>

</div>
</div>

</div>
</div>

<v-click>

<p class="muted" style="margin-top:0.6rem">
Everything you have just seen was produced by that code —
<Val count="repos" /> repos, <Val count="labels" /> signed labels,
<Val toolchain />. Clone it and the CIDs come out the same.
</p>

</v-click>

<!--
The last thing on screen should be the thing you want someone to act on, so this
slide is the link and nothing else.

If asked what to read first: DESIGN.md for the argument, the adversarial tests for
whether to believe it.

The reproducibility line is worth saying out loud. Keys and timestamps are seeded,
so a clone regenerates the same DIDs and the same content hashes. The CIDs on these
slides are checkable, not decoration.
-->
