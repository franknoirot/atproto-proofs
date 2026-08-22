<!--
  The six record types and the strongRef edges between them.

  `step` is bound to the slide's click count so the graph builds up one edge at a
  time: theory, requirement, plan, datasource, proof, verdict/label.
-->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ step?: number }>(), { step: 99 })

const BW = 216
const BH = 50
const GX = 92
const GY = 34

type Node = { id: string; label: string; who: string; col: number; row: number; at: number }

const NODES: Node[] = [
  { id: 'theory', label: 'dev.provable.theory', who: 'regulator', col: 0, row: 0, at: 1 },
  { id: 'ds', label: 'gov.redistrict.datasource', who: 'data authority', col: 0, row: 2, at: 4 },
  { id: 'req', label: 'dev.provable.requirement', who: 'regulator', col: 1, row: 0, at: 2 },
  { id: 'plan', label: 'gov.redistrict.plan', who: 'regulated actor', col: 1, row: 2, at: 3 },
  { id: 'proof', label: 'dev.provable.proof', who: 'regulated actor', col: 2, row: 1, at: 5 },
  { id: 'verdict', label: 'dev.provable.verdict', who: 'checker', col: 3, row: 0.4, at: 6 },
  { id: 'label', label: 'label  (signed)', who: 'labeler', col: 3, row: 1.6, at: 6 },
]

const EDGES: [string, string, string, number][] = [
  ['req', 'theory', 'theory', 2],
  ['plan', 'ds', 'censusSource', 4],
  ['proof', 'req', 'requirement', 5],
  ['proof', 'plan', 'artifact', 5],
  ['proof', 'theory', 'theory', 5],
  ['verdict', 'proof', 'proof', 6],
  ['label', 'proof', 'subject', 6],
]

const pos = (n: Node) => ({ x: n.col * (BW + GX), y: n.row * (BH + GY) + 14 })
const node = (id: string) => NODES.find((n) => n.id === id)!

const edges = computed(() =>
  EDGES.map(([a, b, field, at]) => {
    const pa = pos(node(a))
    const pb = pos(node(b))
    const x1 = pa.x
    const y1 = pa.y + BH / 2
    const x2 = pb.x + BW
    const y2 = pb.y + BH / 2
    return {
      field,
      on: props.step >= at,
      d: `M${x1} ${y1} C ${x1 - 36} ${y1}, ${x2 + 36} ${y2}, ${x2} ${y2}`,
      lx: (x1 + x2) / 2,
      ly: (y1 + y2) / 2 - 4,
    }
  }),
)

const nodes = computed(() => NODES.map((n) => ({ ...n, ...pos(n), on: props.step >= n.at })))
const size = { w: 4 * BW + 3 * GX, h: 3 * (BH + GY) }
</script>

<template>
  <svg
    :viewBox="`0 0 ${size.w} ${size.h}`" :width="size.w" :height="size.h"
    role="img" aria-label="Record types and the strongRef edges between them"
  >
    <defs>
      <marker id="rg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L8 4 L0 8 z" fill="var(--lean-a)" />
      </marker>
    </defs>

    <g v-for="(e, i) in edges" :key="i">
      <path
        :d="e.d" fill="none" :stroke="e.on ? 'var(--lean-a)' : 'var(--axis)'" stroke-width="1.5"
        :marker-end="e.on ? 'url(#rg-arrow)' : undefined" :opacity="e.on ? 1 : 0.35"
      />
      <text :x="e.lx" :y="e.ly" text-anchor="middle" class="tick" :opacity="e.on ? 1 : 0.3">
        {{ e.field }}
      </text>
    </g>

    <g v-for="n in nodes" :key="n.id" :opacity="n.on ? 1 : 0.25">
      <rect :x="n.x" :y="n.y" :width="BW" :height="BH" rx="8"
        fill="var(--surface)" :stroke="n.on ? 'var(--ink-muted)' : 'var(--axis)'" />
      <text :x="n.x + 12" :y="n.y + 21" fill="var(--ink)" font-size="11.5" font-family="var(--mono)">
        {{ n.label }}
      </text>
      <text :x="n.x + 12" :y="n.y + 38" class="tick" font-size="10">{{ n.who }}</text>
    </g>
  </svg>
</template>
