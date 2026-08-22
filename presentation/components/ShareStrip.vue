<!--
  Each district's share of the vote, as a diverging bar from the 50% line, with
  the ±5-point swing band marked.

  This is where safe seats become visible: a bar whose tip falls inside the band
  is a district that changes hands somewhere in the range § 5 quantifies over.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { plan, leanFill } from '../demo'

const props = withDefaults(defineProps<{ plan: string; w?: number }>(), { w: 360 })

const LO = 2500
const HI = 8000
const ROW = 15
const GAP = 3
/** Half-width of the swing band, in basis points. */
const BAND = 500

const model = computed(() => {
  const shares = plan(props.plan).sharesBp
  const X = (bp: number) => ((bp - LO) / (HI - LO)) * props.w
  const h = shares.length * (ROW + GAP) - GAP
  return {
    h,
    total: h + 26,
    mid: X(5000),
    bandL: X(5000 - BAND),
    bandR: X(5000 + BAND),
    bars: shares.map((bp, i) => {
      const x = X(bp)
      return {
        bp,
        y: i * (ROW + GAP),
        x: Math.min(x, X(5000)),
        w: Math.max(Math.abs(x - X(5000)), 1.5),
        fill: leanFill(bp),
        /** Districts inside the band change hands within the range § 5 covers. */
        inPlay: Math.abs(bp - 5000) <= BAND,
        labelX: x + (bp > 5000 ? 6 : -6),
        anchor: bp > 5000 ? 'start' : 'end',
        label: (bp / 100).toFixed(1) + '%',
      }
    }),
  }
})
</script>

<template>
  <svg
    :viewBox="`0 0 ${w + 60} ${model.total}`" :width="w + 60" :height="model.total"
    role="img" :aria-label="`District vote shares: ${plan}`"
  >
    <g transform="translate(30,0)">
      <rect
        :x="model.bandL" y="0" :width="model.bandR - model.bandL" :height="model.h"
        fill="var(--lean-a)" opacity="0.09"
      />
      <line :x1="model.mid" y1="0" :x2="model.mid" :y2="model.h" stroke="var(--axis)" stroke-width="1" />
      <template v-for="(b, i) in model.bars" :key="i">
        <rect :x="b.x" :y="b.y" :width="b.w" :height="ROW" rx="3" :fill="b.fill" />
        <text
          v-if="b.inPlay" :x="b.labelX" :y="b.y + ROW - 3"
          :text-anchor="b.anchor" class="dlabel" fill="var(--ink)"
        >{{ b.label }}</text>
      </template>
      <text :x="model.mid" :y="model.total - 10" text-anchor="middle" class="tick">50%</text>
      <text :x="model.bandL" :y="model.total - 10" text-anchor="middle" class="tick">45</text>
      <text :x="model.bandR" :y="model.total - 10" text-anchor="middle" class="tick">55</text>
    </g>
  </svg>
</template>
