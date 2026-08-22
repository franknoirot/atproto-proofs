# Proof-carrying regulation on atproto

A regulator publishes machine-checkable requirements. Regulated actors publish
machine-checkable proofs that their artifacts satisfy them. Anyone re-runs the
check.

The demo domain is redistricting: a federal agency publishes what an election map
is and what it means for one not to be gerrymandered, and states publish proofs
about their maps.

---

## 1. What the protocol adds

Formal verification of a districting plan does not need atproto. A state could
publish a Lean file and an agency could run it.

What atproto adds is that the requirement, the artifact, and the proof are all
content-addressed records with verifiable authorship, held in repositories their
authors control. That changes what a verdict *is*. It stops being an agency's
assertion — "we ran something, trust us" — and becomes a computation with named
inputs: given these three CIDs, this checker produced this outcome. A journalist,
a rival party, or a university can fetch the same three CIDs, run the same
checker, get the same answer, and publish a contradicting verdict if they do not.
`scripts/demo.ts` step 5 does exactly that, with an unaffiliated watchdog.

Three consequences shape everything below.

**Content addressing is the versioning mechanism.** Every reference between
records is a `strongRef` — URI *and* CID. A regulator that amends a requirement
gets a new CID, and every proof against the old one is mechanically detectable as
stale rather than silently reinterpreted. A state that edits a published map
invalidates its own certification without anyone having to notice the edit.

**Nobody has to be the checker.** The regulator runs one and issues labels
because someone should, but the checker reads only published records and runs
only the published theory. Competing labelers are the normal case, not an edge
case.

**Labels cannot carry evidence.** The label spec constrains `val` to a bare
kebab-case token of at most 128 bytes. That is a real design constraint and it
forces the split described in §6.

---

## 2. The record graph

Six record types across three roles.

```
did:key:…fedgov            regulator, and one labeler among possible others
  dev.provable.theory      Lean package: ontology, DSL, semantics, decoder
  dev.provable.requirement an obligation, written in the theory's DSL
  dev.provable.verdict     what a check found — the evidence behind a label
  app.bsky.labeler.service declares the proof-* label values

did:key:…fairfax  /  …crackland          regulated actors
  gov.redistrict.plan      the artifact under test
  dev.provable.proof       a justification bound to (requirement CID, artifact CID)

did:key:…census  /  …eac                 data authorities
  gov.redistrict.datasource the numbers a plan claims to be built from

labels, signed
  subject = proof uri + cid  →  proof-verified | proof-refuted | proof-stale | …
  subject = plan  uri + cid  →  districting-certified   (derived)
```

Note what is absent from `dev.provable.proof`: **there is no field for the
theorem statement.** See §5.

---

## 3. The binding problem

A proof is about a Lean value. An artifact is a record — a tree of strings and
integers, addressed by CID. If those two can drift apart, a proof certifies
nothing in particular. Something has to fix the correspondence, and it matters
who.

If the *checker* owned the decode, two honest checkers could reach opposite
verdicts about the same CID and neither would be wrong, because nothing published
would say which reading was correct. So the decode lives in the regulator's
theory package, and the theory record names it:

```jsonc
"artifactTypes": [{
  "lexicon":  "gov.redistrict.plan",
  "leanType": "Redistrict.Plan",
  "decoder":  "Redistrict.Codec.decodePlan"
}]
```

All three are needed. The lexicon alone does not fix a representation; the Lean
type alone does not fix which records are eligible.

The checker's remaining share is a transliteration — `src/checker/emit.ts`,
field for field, string for string, with no reordering and no defaulting. Every
judgement (how precincts are numbered, how counties are indexed, what makes a
plan malformed) is in `lean/Redistrict/Codec.lean`, where it is kernel-checked as
part of the obligation.

Two details that carry weight:

- **The theory travels in-band.** The Lean package is a blob on the theory
  record, with a `sourceDigest`. Verification depends on the record and nothing
  else — no package registry has to stay online, or stay honest, for a third
  party to reproduce a verdict in ten years.

- **A malformed record cannot be certified, and not by checker etiquette.**
  `Codec.decodePlanD` is total: a record that does not decode becomes
  `Codec.rejected`, which has no precincts and therefore fails the
  well-formedness clause that opens every published requirement. The obligation
  is *false*, so a prover submitting garbage has to prove something untrue.

---

## 4. What a proof does not establish

A verified proof says: the numbers in this record satisfy this predicate.

It says nothing about whether those are the real numbers. Populations and vote
tallies could be fabricated and every proof about them would still be valid — and
worthless. Nor does the theory have any geometry: contiguity is defined against
the adjacency graph *the plan's own author supplies*, so a plan that misstates
which precincts touch can prove contiguity of a map that is not contiguous.

This is not a gap to be closed by better proving. It is where formal methods
stop, and the design makes it visible rather than leaving it to be assumed: the
plan lexicon carries `censusSource` and `returnsSource` strongRefs to records
published by separate authorities. The honest-input assumption becomes an
attributable edge in the record graph. Whether those authorities are credible is
a question for humans; the point is that the question is now askable, and
localised, instead of buried.

The same applies to adjacency. Requiring a `geometrySource` alongside the other
two would be the obvious next move.

---

## 5. Substituting the statement

This is the attack the whole design is arranged around. A prover free to write
the theorem statement writes

```lean
def NotGerrymandered (_ : Plan) : Prop := True
theorem mine : NotGerrymandered myPlan := trivial
```

and every label the system issues is worthless — not because the proof is wrong,
but because nobody checked what was proved.

So the prover supplies only a justification. The checker derives the statement
from the requirement CID and the artifact CID and writes the signature line
itself. Four defences, tested individually in `test/adversarial.test.ts`:

1. **The statement is in its own module,** compiled before any prover text is
   elaborated. `Obligation.Statement` contains the transliterated record, the
   decoded plan, and `abbrev stmt : Prop := <leanProp> plan`.

2. **The prover's module imports it,** so redefining `Obligation.stmt` is a
   duplicate-declaration error, and the checker-written signature still refers to
   the imported one. Both fire; either would do.

3. **`#assert_axioms` audits the finished proof.** `#print axioms` reports to
   stdout, and a checker built on scraping stdout fails open. The command in
   `lean/Provable/AssertAxioms.lean` runs the same query and turns a bad answer
   into a build error, so `lean` exits nonzero. It rejects `sorryAx`, rejects the
   per-computation axioms that `decide +native` and `@[implemented_by]`
   introduce, and rejects anything a prover declared with `axiom`.

4. **A lexical screen** (`src/checker/screen.ts`) rejects the obvious cases
   before elaboration. This is defence in depth and is explicitly *not* what
   keeps the system sound — anything that would be unsound if it slipped past the
   screen is a design bug. What it buys is a fast, legible failure instead of one
   phrased in terms of axioms several seconds later.

Two smaller surfaces worth naming. `requirement.leanProp` is spliced into
generated source, so it is validated as a plain dotted identifier — it is the one
published field that could otherwise inject Lean. And integers are rejected
unless they survive transliteration exactly, because DRISL/CBOR can carry values
JavaScript's number type cannot round-trip, and a silent precision loss would
mean the proof is about a map that does not exist.

### What is not defended

Elaborating a stranger's Lean is running their code. The checker in this
repository enforces a wall-clock timeout and nothing else — no filesystem
sandbox, no network isolation, no memory cap. That is recorded rather than
glossed: every verdict carries `checker.sandbox`, and this one reports
`host-process (timeout only)`. A production checker belongs in a container with
no network.

On the proof-checking ladder in Lean's own guidance, this project stops at rung
three of four: above `#print axioms` read by eye, at automated axiom auditing,
below `lean4checker --fresh` replaying the environment through a clean kernel,
and well below exporting proof terms for an independent kernel to check. Those
are the next rungs and they are deliberately out of scope here.

---

## 6. Labels index, verdicts carry evidence

A label value is a bare kebab-case token. It cannot say which clause failed, what
the efficiency gap was, which toolchain ran, or how long the kernel took.

So there are two records. `dev.provable.verdict` holds the evidence — outcome,
failing clause, axiom set, obligation digest, checker identity and sandbox,
duration, and the full build log as a blob. The label is a cheap index that
propagates to everyone subscribed to a labeler and points at the proof.

The label's subject is the proof's URI **and** CID. Rewrite the proof and the
label stops applying rather than following the edit to text nobody checked.

Verdicts are published in the *checker's* repository, not the prover's. A verdict
is the checker's speech about someone else's record.

`obligationDigest` — the sha256 of the generated statement module — is what makes
independent verdicts comparable. Two checkers reporting the same digest
demonstrably checked the same theorem. Two reporting different digests have a bug
or a disagreement about decoding, and either is worth knowing about.

---

## 7. Two tiers, and why the second one exists

**§ 2** is a snapshot rule: well-formedness, contiguity, population deviation,
efficiency gap, county splits. Every clause is decidable, so a proof of § 2 is a
recomputation certificate. Worth having — exact, reproducible, and it localises
which criterion a map violates — but it does not need a proof assistant.

**§ 5** is a durability rule:

```
· the efficiency gap stays within 7.00% under every uniform swing of at most 5.00%
```

It quantifies over an unbounded range of integers. No amount of `decide` closes
it, and the checker's clause report says `undecided` rather than guessing — a
tier-2 clause can be *refuted* by evaluation, by exhibiting a swing that breaks
the bound, but never confirmed.

§ 5 exists because § 2 is gameable. A map can sit at −2% on the day it is drawn
and pass 8% on a five-point shift in opinion, and a rule that only constrains the
reference election does not see the difference. In the demo, Fairfax and
Crackland's revised map have *identical* efficiency gaps of −2.00%; § 2 cannot
tell them apart at all.

### What the theorem turns out to say

`lean/Redistrict/Swing.lean` proves that between seat changes the efficiency gap
moves at exactly twice the swing. So a map built of safe seats — one where
nothing changes hands across the band — drifts by ten points across a five-point
band and fails § 5 for any threshold under 10%. The only maps that hold are the
ones where seats actually change hands as opinion moves, because each seat
changing hands pushes the gap back the other way.

A durability requirement is therefore a *responsiveness* requirement, and the
maps it rejects are those built out of safe seats. That is not what one would
guess from reading the words, and it is the kind of thing formalising a rule is
good for.

### How the quantifier becomes finite

Writing `W(s)` for the turnout in districts party A wins under swing `s`:

```
egNum(s) = 40000·A + 4·s·T − 10000·T − 20000·W(s)
egDen(s) = 20000·T                                  (constant)
```

Everything is affine in `s` except `W`, a nondecreasing step function with at most
one jump per district. On any interval where `W` does not change, the gap is
monotone and is bounded by its endpoints.

So the prover supplies a **certificate**: a list of breakpoints spanning the band,
such that consecutive entries either agree on `W` or are adjacent integers.
Both conditions are decidable, so the checker verifies the certificate by
computation, and `swingRobust_of_chain` converts finitely many endpoint checks
into the statement about every swing in the band.

The adjacent-integer case is not a convenience: `W` jumps at a seat change, so a
constant-`W` step can never straddle one. Because swings are counted in whole
basis points, stepping over a jump one integer at a time is exact — a certificate
names the last swing before each seat changes and the first swing after, and
those two values have nothing between them.

Fairfax's certificate is six entries and stands in for 1001 evaluations. Widening
the band barely lengthens it — two entries per seat that changes hands, so at
most 22 on a ten-district map however wide the band gets — against a sweep that
grows without bound.

**The division of labour is the point.** `swingRobust_of_chain` is general
mathematics, written once, by the party that wrote the rule, and published in the
theory package. Each state contributes a breakpoint list and three `by decide`s
about its own map. That is plausibly how proof-carrying regulation would work at
any scale worth the name: regulators publish lemmas, regulated actors compose
them with cheap facts.

---

## 8. The requirement language

`lean/Redistrict/Dsl.lean` defines surface syntax so a requirement reads as a
rule:

```lean
requirement section2 titled "Fair Districting Act § 2 — Districting Standards"
    for plan P where
  · the plan is well formed
  · every district is contiguous
  · population deviation is at most 0.50%
  · the efficiency gap is at most 7.00%
  · no county is split more than 1 time
```

The `statement` field of the published requirement record carries this text, and
it is the *same source* the theory package compiles. There is no informal
restatement sitting alongside a formal one, so there is no gap for the two to
drift apart in. A reader who checks that the record's `statement` matches the
theory's source has checked everything.

Two implementation notes that turned out to matter:

- Every English word is a *non-reserved* atom (`&"word"`). Lean's token table is
  global, so plain atoms would make `plan`, `gap`, `time` and `bp` unusable as
  identifiers in every file downstream. A DSL that makes the host language worse
  to write is not worth the readability. A category cannot *begin* with a
  non-reserved word, hence the `·` bullet — already a Lean token, costs nothing,
  and a bulleted list is what legal text looks like anyway.

- The command emits three declarations: the obligation, its title, and
  `.clauses`, which evaluates each conjunct separately. That companion is what
  lets a refutation name the failing clause instead of reporting that a
  conjunction failed, which is no use to the state that has to fix the map.
  Because both come from one source, the names in a verdict cannot fall out of
  step with the rule.

Thresholds are in basis points throughout and every comparison is
cross-multiplied. Nothing in the theory divides. A percentage written to more
than two decimals is a parse error rather than a silent rounding, because a legal
limit two implementations could disagree about is not a limit.

---

## 9. The demo

Two states on identical 6×10 grids, 60 precincts of 1000 voters, ten districts of
six. Population equality and contiguity never distinguish the maps; all three
have a 54% statewide vote share. Only the districting differs.

| map | § 2 | § 5 |
|---|---|---|
| **Fairfax** | passes, gap −2.00% | passes |
| **Crackland v1** | **refuted** on `efficiencyGap`, gap +18.00% | — |
| **Crackland v2** | passes, gap −2.00% | **refuted** on `swingRobustness` |

Crackland v1 clears every structural clause and is refuted on exactly one named
clause — which is what a state needs in order to know what to change.

Crackland v2 is the case the demo exists for. Same voters as v1, redrawn: the gap
is now identical to Fairfax's, so § 2 sees two indistinguishable maps. But every
seat is safe by eleven points, so nothing changes hands inside the band and the
gap drifts to −12.00% at a five-point swing toward B and +8.00% toward A.

The two Crackland maps share precinct data exactly; only the assignment differs.
If the votes differed too, the comparison would prove nothing about maps.

---

## 10. Running it

```
cd lean && lake build     # the regulator's theory
pnpm install
pnpm demo                 # the full story, ~60s
pnpm test                 # metrics + adversarial suite
```

`pnpm demo` runs offline. There is no server and no HTTP, but records are
DRISL/DAG-CBOR, CIDs are genuine content hashes, repositories are Merkle search
trees, and commits and labels carry real secp256k1 signatures. What is missing is
the transport — a PDS, a firehose, DID resolution over the network. Faking the
cryptography would make the demo prove nothing; faking the transport costs
nothing and means it runs from a clean checkout with no accounts.

Keys are seeded, so DIDs and CIDs are reproducible across runs. That is what
makes "run it yourself and compare" checkable rather than rhetorical.

---

## 11. Known gaps

- **DIDs are `did:key`** — self-certifying and resolvable offline, but they
  cannot rotate keys and cannot advertise an `#atproto_labeler` service endpoint.
  A real deployment needs `did:plc`.

- **NSIDs are not DNS-backed.** `dev.provable.*` and `gov.redistrict.*` imply
  control of `provable.dev` and `redistrict.gov`. Real publication needs
  `_lexicon` TXT records pointing at the authority's DID.

- **No sandbox.** See §5.

- **No kernel replay.** `lean4checker --fresh` and export-based external checking
  are the next rungs.

- **Certificates are hand-written.** The breakpoint lists in `src/seed/` were
  derived by hand. A real prover would compute them, which is easy — they are the
  swings at which each district's share crosses half — but nothing here does it.

- **One artifact type.** The theory binds a single lexicon. Nothing in the record
  shapes assumes that, but nothing exercises the plural case either.

- **The efficiency gap is a poor statistic on small maps.** With ten districts a
  single seat changing hands moves it ten points. That is a fact about the metric
  rather than about this encoding, and it is why § 5 has to reason about seat
  changes rather than pretend the gap is continuous. A serious version of this
  theory would carry several metrics and require them jointly.
