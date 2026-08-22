<!--
  Pull a captured value into prose.

  Lets the markdown say `<Val check="crackland1-s2" gap />` instead of hard-coding
  "+18.00%", so editing a slide can never put a stale number next to a live chart.
  Add a case here rather than typing a figure into `slides.md`.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { check, DEMO, pct, plan, shortCid, spct } from '../demo'

const props = defineProps<{
  /** A check id, e.g. `crackland1-s2`. */
  check?: string
  /** A plan key, e.g. `fairfax`. */
  plan?: string
  /** Efficiency gap of the referenced check's artifact. */
  gap?: boolean
  /** Seats party A holds, over the district count. */
  seats?: boolean
  /** Party A's statewide vote share. */
  voteShare?: boolean
  /** Wall-clock time the check took. */
  ms?: boolean
  /** The clause a refutation named. */
  clause?: boolean
  /** Axioms the accepted proof depends on. */
  axioms?: boolean
  /** Efficiency gap of a plan at a given swing, in basis points. */
  atSwing?: number
  /** A short CID: the plan's, the check's proof, or a literal. */
  cid?: string
  /** Number of signed labels / repositories in the run. */
  count?: 'labels' | 'repos'
  /** The Lean release the theory pins and the checker honoured. */
  toolchain?: boolean
}>()

const text = computed(() => {
  if (props.toolchain) return DEMO.toolchain
  if (props.count) return String(DEMO.counts[props.count])
  if (props.cid) return shortCid(props.cid)
  if (props.plan && props.atSwing !== undefined) {
    const pt = plan(props.plan).swing.find((d) => d.s === props.atSwing)
    return pt ? spct(pt.egBp) : '—'
  }
  if (props.plan && props.cid === undefined && !props.check) return shortCid(plan(props.plan).ref.cid)
  if (!props.check) return '—'
  const c = check(props.check)
  const s = c.summary
  if (props.gap && s) return spct(s.efficiencyGapBp!)
  if (props.seats && s) return `${s.seatsA}/${s.districts}`
  if (props.voteShare && s) return pct(s.voteShareABp!)
  if (props.ms) return `${c.durationMs} ms`
  if (props.clause) return c.failedClause ?? '—'
  if (props.axioms) return c.axioms.join(', ') || 'none'
  return shortCid(c.proofRef.cid)
})
</script>

<template><span>{{ text }}</span></template>
