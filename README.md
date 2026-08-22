# atproto-proofs

A two-sided exchange of formal requirements and formal proofs on
[atproto](https://atproto.com/), with obligations stated in a
[Lean 4](https://lean-lang.org/) DSL.

A regulator publishes machine-checkable requirements. Regulated actors publish
machine-checkable proofs that their artifacts satisfy them. Anyone re-runs the
check and publishes their own verdict.

The demo domain is redistricting: a federal agency publishes what an election map
is and what it means for one not to be gerrymandered; states publish proofs about
their maps; verdicts and labels follow.

```
cd lean && lake build
pnpm install
pnpm demo
```

Runs offline. No server, no accounts — but real DRISL/DAG-CBOR, real CIDs, real
Merkle search trees, real secp256k1 signatures on commits and labels.

## What it looks like

```
2. Fairfax proves both requirements
   ✓ dev.provable.proof                 bafyreigmhcl…  fairfax-2026--fda-section-2
   ✓ verified    9064 ms
     the kernel accepted the proof, and it depends on no axioms beyond
     propext, Classical.choice, Quot.sound
       · wellFormed             holds
       · contiguity             holds
       · populationDeviation    holds
       · efficiencyGap          holds
       · countySplits           holds
       seats A 6/10   vote share 54.00%   efficiency gap -2.00%
   → label proof-verified · verdict bafyreidljnk…

3. Crackland submits a packed-and-cracked map
   ✗ refuted     5341 ms
     the plan violates the efficiencyGap clause; no proof of this requirement exists
     failing clause: efficiencyGap
       · wellFormed             holds
       · contiguity             holds
       · populationDeviation    holds
       ✗ efficiencyGap          refuted
       · countySplits           holds
       seats A 4/10   vote share 54.00%   efficiency gap 18.00%
```

## The requirements

Published as records, written in a Lean DSL. The `statement` field of the
published record is the *same source* the theory package compiles — there is no
informal restatement to drift out of step with the formal one.

```lean
requirement section2 titled "Fair Districting Act § 2 — Districting Standards"
    for plan P where
  · the plan is well formed
  · every district is contiguous
  · population deviation is at most 0.50%
  · the efficiency gap is at most 7.00%
  · no county is split more than 1 time

requirement section5 titled "Fair Districting Act § 5 — Durability of Fairness"
    for plan P where
  · the plan is well formed
  · the efficiency gap stays within 7.00% under every uniform swing of at most 5.00%
```

§ 2 is decidable, so a proof of it is a recomputation certificate. § 5 quantifies
over an unbounded range of swings, so no amount of `decide` closes it — and it
exists because § 2 is gameable. In the demo, two maps with **identical**
efficiency gaps of −2.00% are indistinguishable under § 2; one satisfies § 5 and
the other drifts to −12.00% on a five-point swing.

The theorem behind § 5 turns out to say something not obvious from the words:
because the gap moves at twice the swing between seat changes, durability is only
achievable when seats actually change hands. A durability rule is a
*responsiveness* rule, and the maps it rejects are those built of safe seats.

## The part that makes it not theatre

There is no field in `dev.provable.proof` for the theorem statement. A prover who
could write the statement would write `def NotGerrymandered _ := True` and prove
it in one line. The checker derives the obligation from the requirement CID and
the artifact CID, writes the signature itself, and admits the prover's text only
where it can be a justification.

`test/adversarial.test.ts` attacks each defence separately — statement
shadowing, artifact swapping, holes, native evaluation, injection via
`leanProp`, post-hoc mutation of a certified map, and a swing certificate that
does not span its band.

## The talk

```
pnpm present         # dev server, hot-reloads as you edit
pnpm present:data    # re-capture the figures from a fresh run
pnpm present:build   # static site into dist/
```

A [Slidev](https://sli.dev) deck — 25 slides that walk the demo, visualise who
owns what, and end on how to adapt the framework to another regulated domain.
Arrow keys or space to step; `p` for presenter mode (notes, timer, next-slide
preview); `o` for an overview; the `table` toggle on each chart for its
WCAG-clean twin.

**All the prose is in [`presentation/slides.md`](presentation/slides.md)** —
one markdown file, slides separated by `---`, `<v-click>` for reveals, and an
HTML comment at the end of each slide for the presenter notes. Editing it is the
whole workflow; `pnpm present` hot-reloads.

The figures are Vue components in `presentation/components/`. They read
`presentation/data.json`, which `pnpm present:data` writes from an actual run, so
every CID, verdict, axiom set and swing curve on the slides is captured rather
than typed — a deck arguing "verdicts are computations, not assertions" should
not quote invented hashes. The swing curves are computed by the Lean theory
itself. In prose, `<Val …/>` pulls a captured number into a sentence, so editing
copy cannot leave a stale figure beside a live chart.

## Layout

| | |
|---|---|
| `DESIGN.md` | architecture, trust boundaries, what a proof does *not* establish |
| `presentation/slides.md` | the deck's prose — edit this |
| `presentation/components/` | the figures; `data.json` is generated by `pnpm present:data` |
| `lexicons/` | `dev.provable.{theory,requirement,proof,verdict}`, `gov.redistrict.*` |
| `lean/Redistrict/` | the regulator's theory: model, metrics, DSL, swing theorem, codec |
| `lean/Provable/` | `#assert_axioms` — axiom auditing that fails the build |
| `src/checker/` | obligation generation, screening, the Lean runner, verdicts |
| `src/atp/` | offline atproto: repos, CIDs, signed commits and labels |
| `src/seed/` | two states, three maps |

Start with [`DESIGN.md`](DESIGN.md) — including §4 and §11, on what this
does not do.
