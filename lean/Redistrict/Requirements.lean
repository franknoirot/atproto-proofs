import Redistrict.Dsl

/-!
# The Fair Districting Act

The regulator's published obligations. The text below is what appears verbatim in
the `statement` field of each `dev.provable.requirement` record, and it is also
the source this module compiles — there is no second version.

## The two sections do different work

**§ 2** is a snapshot rule: it constrains the map as drawn against the reference
election. Every clause is decidable, so a proof of § 2 is a recomputation
certificate. That is worth having — it is exact, reproducible, and localizes
which criterion a map violates — but it does not need a proof assistant.

**§ 5** is a durability rule, and it is not decidable by evaluation. It
quantifies over every uniform swing in a five-point band, which is an unbounded
range of integers, and it exists because § 2 alone is trivially gameable: a state
can tune a map to sit at 1% on the day it is drawn and drift past 11% on a
two-point shift in opinion.

§ 5 strictly implies § 2's efficiency-gap clause, since a zero swing is in the
band. The overlap is deliberate and is what statutes normally look like: § 2
remains the rule a map is measured against day to day, and § 5 is the additional
burden. It also means a map can satisfy § 2 and fail § 5, which is exactly the
case worth being able to detect.

## What § 5 turns out to require

Between seat changes the efficiency gap moves at twice the swing, so a plan whose
districts are all safe drifts by ten points across a five-point band and fails
§ 5 for any threshold under 10%. The only plans that hold are the ones where
seats actually change hands as opinion moves. So a durability requirement is a
responsiveness requirement, and the maps it rejects are those built out of safe
seats — which is not what one would guess from reading the words.
-/

namespace Redistrict
namespace FairDistrictingAct

-- Districting standards for congressional plans.
requirement section2 titled "Fair Districting Act § 2 — Districting Standards"
    for plan P where
  · the plan is well formed
  · every district is contiguous
  · population deviation is at most 0.50%
  · the efficiency gap is at most 7.00%
  · no county is split more than 1 time

-- Durability of partisan fairness under changes in opinion.
requirement section5 titled "Fair Districting Act § 5 — Durability of Fairness"
    for plan P where
  · the plan is well formed
  · the efficiency gap stays within 7.00% under every uniform swing of at most 5.00%

end FairDistrictingAct
end Redistrict
