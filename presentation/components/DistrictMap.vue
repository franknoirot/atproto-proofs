<!--
  A districting plan.

  Fill carries party lean on the diverging scale; district identity is carried by
  boundary strokes rather than a tenth categorical hue — that is how districting
  maps are actually read, and ten distinct fills could not survive a
  color-vision check.

  Precincts inside one district are butted together with only a hairline between
  them, so a district reads as one shape. The usual 2px gap between fills is
  wrong here: it would fragment every district into six squares and drown the one
  boundary that carries meaning.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { plan, cellShareBp, leanFill, type Cell } from '../demo'

const props = withDefaults(defineProps<{ plan: string; cell?: number }>(), { cell: 34 })

const ROWS = 6
const COLS = 10

const model = computed(() => {
  const p = plan(props.plan)
  const cs = props.cell
  const at = (r: number, c: number) => p.cells.find((x) => x.r === r && x.c === c) as Cell
  const fills = p.cells.map((cell) => ({
    x: cell.c * cs,
    y: cell.r * cs,
    fill: leanFill(cellShareBp(cell)),
  }))
  const hair: { x1: number; y1: number; x2: number; y2: number }[] = []
  const seams: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = at(r, c)
      const x = c * cs
      const y = r * cs
      if (c + 1 < COLS) {
        const line = { x1: x + cs, y1: y, x2: x + cs, y2: y + cs }
        ;(at(r, c + 1).district === a.district ? hair : seams).push(line)
      }
      if (r + 1 < ROWS) {
        const line = { x1: x, y1: y + cs, x2: x + cs, y2: y + cs }
        ;(at(r + 1, c).district === a.district ? hair : seams).push(line)
      }
    }
  }
  return { cs, w: COLS * cs, h: ROWS * cs, fills, hair, seams }
})
</script>

<template>
  <svg
    :viewBox="`0 0 ${model.w + 4} ${model.h + 4}`"
    :width="model.w + 4"
    :height="model.h + 4"
    role="img"
    :aria-label="`Districting map: ${plan}`"
  >
    <g transform="translate(2,2)">
      <rect
        v-for="(f, i) in model.fills" :key="`f${i}`"
        :x="f.x" :y="f.y" :width="model.cs" :height="model.cs" :fill="f.fill"
      />
      <line
        v-for="(l, i) in model.hair" :key="`h${i}`"
        :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
        stroke="rgba(0,0,0,0.22)" stroke-width="1"
      />
      <line
        v-for="(l, i) in model.seams" :key="`s${i}`"
        :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
        stroke="var(--ink)" stroke-width="3"
      />
      <rect
        x="0" y="0" :width="model.w" :height="model.h"
        fill="none" stroke="var(--ink)" stroke-width="3"
      />
    </g>
  </svg>
</template>
