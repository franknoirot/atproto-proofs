<!--
  Efficiency gap against a uniform partisan swing.

  The curves come from `Plan.swingCurveJson` in the Lean theory, not from a
  reimplementation here: a chart that disagreed with the obligation would be
  worse than no chart.

  Press the toggle (or `t`) for the table view — a chart on a continuous scale
  needs a WCAG-clean twin, and a presenter fielding "what is it at +2%?" wants
  numbers rather than a hover.
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { plan, spct, SWING_SERIES } from '../demo'

const props = withDefaults(
  defineProps<{
    h?: number
    w?: number
    /** Ring the swings the certificate actually evaluates. */
    markers?: boolean
    breakpoints?: number[]
    /** Draw a rule where a seat changes hands, so the jumps are named. */
    jumps?: number[]
  }>(),
  { h: 380, w: 1040, markers: false, breakpoints: () => [], jumps: () => [] },
)

const M = { t: 16, r: 132, b: 46, l: 88 }
const XD = [-500, 500]
const YD = [-1350, 950]
/** The statutory bound both requirements use, in basis points. */
const LIMIT = 700

const showTable = ref(false)
const hover = ref<number | null>(null)

const geom = computed(() => {
  const pw = props.w - M.l - M.r
  const ph = props.h - M.t - M.b
  return {
    pw,
    ph,
    X: (v: number) => M.l + ((v - XD[0]!) / (XD[1]! - XD[0]!)) * pw,
    Y: (v: number) => M.t + (1 - (v - YD[0]!) / (YD[1]! - YD[0]!)) * ph,
  }
})

const series = computed(() =>
  SWING_SERIES.map((s) => {
    const pts = plan(s.key).swing
    const last = pts[pts.length - 1]!
    return {
      ...s,
      path: pts.map((d) => `${geom.value.X(d.s).toFixed(1)},${geom.value.Y(d.egBp).toFixed(1)}`).join(' '),
      last,
    }
  }),
)

/** Breakpoints snapped to the nearest sampled swing, for the certificate slide. */
const marks = computed(() => {
  if (!props.markers) return []
  const pts = plan('fairfax').swing
  return props.breakpoints.map((b) =>
    pts.reduce((a, x) => (Math.abs(x.s - b) < Math.abs(a.s - b) ? x : a)),
  )
})

const readout = computed(() => {
  if (hover.value === null) return null
  return SWING_SERIES.map((s) => {
    const pts = plan(s.key).swing
    const d = pts.reduce((a, x) => (Math.abs(x.s - hover.value!) < Math.abs(a.s - hover.value!) ? x : a))
    return { ...s, d }
  })
})

const rows = computed(() =>
  plan('fairfax').swing
    .filter((d) => d.s % 100 === 0)
    .map((d) => ({ s: d.s, f: d, c: plan('gerryland2').swing.find((x) => x.s === d.s)! })),
)

function track(ev: MouseEvent) {
  const svg = (ev.currentTarget as SVGRectElement).ownerSVGElement!
  const box = svg.getBoundingClientRect()
  const scale = svg.viewBox.baseVal.width / box.width
  const px = (ev.clientX - box.left) * scale - M.l
  if (px < 0 || px > geom.value.pw) return (hover.value = null)
  hover.value = XD[0]! + (px / geom.value.pw) * (XD[1]! - XD[0]!)
}

const over = (v: number) => Math.abs(v) > LIMIT
</script>

<template>
  <figure>
    <div class="legend">
      <span v-for="s in SWING_SERIES" :key="s.key" class="item">
        <span class="swatch" :style="{ background: s.color }" />{{ s.label }}
      </span>
      <span class="item">
        <span class="swatch box" style="background: rgba(255,255,255,0.09)" />within the statutory limit
      </span>
      <span v-if="jumps.length" class="item">
        <span class="swatch rule" />a seat changes hands
      </span>
      <button class="chart-toggle" @click="showTable = !showTable">
        {{ showTable ? 'chart' : 'table' }}
      </button>
    </div>

    <table v-if="showTable">
      <thead>
        <tr><th>swing</th><th>Fairfax gap</th><th>seats A</th><th>Gerryland v2 gap</th><th>seats A</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.s">
          <td class="num">{{ spct(r.s) }}</td>
          <td class="num" :style="over(r.f.egBp) ? 'color:var(--critical)' : ''">{{ spct(r.f.egBp) }}</td>
          <td class="num">{{ r.f.seatsA }}</td>
          <td class="num" :style="over(r.c.egBp) ? 'color:var(--critical)' : ''">{{ spct(r.c.egBp) }}</td>
          <td class="num">{{ r.c.seatsA }}</td>
        </tr>
      </tbody>
    </table>

    <svg
      v-else :viewBox="`0 0 ${w} ${h}`" :width="w" :height="h"
      role="img" aria-label="Efficiency gap against uniform swing"
    >
      <!-- The legal band. Shaded region plus solid hairline edges, never dashed. -->
      <rect
        :x="M.l" :y="geom.Y(LIMIT)" :width="geom.pw"
        :height="geom.Y(-LIMIT) - geom.Y(LIMIT)" style="fill: var(--ink); opacity: 0.06"
      />
      <line
        v-for="e in [LIMIT, -LIMIT]" :key="e"
        :x1="M.l" :y1="geom.Y(e)" :x2="M.l + geom.pw" :y2="geom.Y(e)"
        stroke="var(--ink-muted)" stroke-width="1"
      />
      <text :x="M.l + 8" :y="geom.Y(LIMIT) + 15" class="tick" fill="var(--ink-2)">
        statutory limit ±{{ (LIMIT / 100).toFixed(2) }}%
      </text>

      <template v-for="t in [-1000, -500, 0, 500]" :key="`gy${t}`">
        <line :x1="M.l" :y1="geom.Y(t)" :x2="M.l + geom.pw" :y2="geom.Y(t)" stroke="var(--grid)" stroke-width="1" />
        <text :x="M.l - 10" :y="geom.Y(t) + 4" text-anchor="end" class="tick">{{ spct(t) }}</text>
      </template>
      <template v-for="t in [-500, -250, 0, 250, 500]" :key="`gx${t}`">
        <line :x1="geom.X(t)" :y1="M.t" :x2="geom.X(t)" :y2="M.t + geom.ph" stroke="var(--grid)" stroke-width="1" />
        <text :x="geom.X(t)" :y="M.t + geom.ph + 18" text-anchor="middle" class="tick">{{ spct(t) }}</text>
      </template>
      <line :x1="M.l" :y1="M.t + geom.ph" :x2="M.l + geom.pw" :y2="M.t + geom.ph" stroke="var(--axis)" stroke-width="1" />
      <text :x="M.l + geom.pw / 2" :y="h - 6" text-anchor="middle" class="axlabel">
        uniform swing toward party A
      </text>
      <text :transform="`translate(15,${M.t + geom.ph / 2}) rotate(-90)`" text-anchor="middle" class="axlabel">
        efficiency gap
      </text>

      <!-- Where a seat changes hands. Naming the jumps is what makes the
           straight stretches between them visible as stretches. -->
      <line
        v-for="j in jumps" :key="`j${j}`"
        :x1="geom.X(j)" :y1="M.t" :x2="geom.X(j)" :y2="M.t + geom.ph"
        style="stroke: var(--ink-muted); opacity: 0.5" stroke-width="1"
      />

      <template v-for="s in series" :key="s.key">
        <polyline :points="s.path" fill="none" :stroke="s.color" stroke-width="2"
          stroke-linejoin="round" stroke-linecap="round" />
        <!-- Clear of the endpoint ring when the certificate is being shown. -->
        <text
          :x="geom.X(s.last.s) + (markers ? 20 : 10)" :y="geom.Y(s.last.egBp) + 4"
          class="dlabel" :fill="s.color"
        >
          {{ s.label }}
        </text>
      </template>

      <circle
        v-for="(m, i) in marks" :key="`m${i}`"
        :cx="geom.X(m.s)" :cy="geom.Y(m.egBp)" r="5"
        fill="var(--surface)" stroke="var(--plan-fairfax)" stroke-width="2"
      />

      <!-- Hover layer. The hit area is the whole plot, far bigger than any mark;
           values are also direct-labeled at the line ends and in the table. -->
      <rect
        :x="M.l" :y="M.t" :width="geom.pw" :height="geom.ph" fill="transparent"
        @mousemove="track" @mouseleave="hover = null"
      />
      <template v-if="readout">
        <line
          :x1="geom.X(readout[0]!.d.s)" :y1="M.t" :x2="geom.X(readout[0]!.d.s)" :y2="M.t + geom.ph"
          stroke="var(--ink-muted)" stroke-width="1"
        />
        <circle
          v-for="r in readout" :key="r.key"
          :cx="geom.X(r.d.s)" :cy="geom.Y(r.d.egBp)" r="5"
          :fill="r.color" stroke="var(--surface)" stroke-width="2"
        />
        <g :transform="`translate(${geom.X(readout[0]!.d.s) + 12}, ${M.t + 14})`">
          <text class="tick" fill="var(--ink-2)">swing {{ spct(readout[0]!.d.s) }}</text>
          <text v-for="(r, i) in readout" :key="r.key" :y="(i + 1) * 15" class="tick" :fill="r.color">
            {{ r.label }} {{ spct(r.d.egBp) }} · {{ r.d.seatsA }} seats
          </text>
        </g>
      </template>
    </svg>

    <figcaption v-if="$slots.default"><slot /></figcaption>
  </figure>
</template>

<style scoped>
.chart-toggle {
  margin-left: auto; font-family: var(--mono); font-size: 0.7rem;
  color: var(--ink-muted); background: var(--surface);
  border: 1px solid var(--hairline); border-radius: 5px; padding: 0.1rem 0.5rem;
  cursor: pointer;
}
.chart-toggle:hover { color: var(--ink); border-color: var(--ink-muted); }
.legend .swatch.rule { width: 2px; height: 13px; border-radius: 1px; background: var(--ink-muted); }
</style>
