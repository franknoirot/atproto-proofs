<!--
  Who publishes what.

  Grouped by the role a repository plays rather than wired up with arrows — the
  citation structure is `RecordGraph`'s job, and drawing both here made each one
  harder to read. The regulator appears in two columns on purpose: it writes the
  rules and it also runs a checker, and the second of those is not exclusive
  to it.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { actor } from '../demo'

const BW = 262
const GX = 38
const PADX = 14

type Member = { key: string; only?: number[]; as?: string; sub?: string }

const COLUMNS: { title: string; members: Member[] }[] = [
  { title: 'writes the rules', members: [{ key: 'fedgov', only: [0, 1, 3] }] },
  { title: 'must prove compliance', members: [{ key: 'fairfax' }, { key: 'gerryland' }] },
  {
    title: 'publishes verdicts',
    members: [
      { key: 'fedgov', only: [2], sub: 'the regulator’s own checker' },
      { key: 'watchdog', sub: 'no standing, no permission' },
    ],
  },
]

const boxH = (n: number) => 46 + n * 15 + 12

const model = computed(() => {
  const cols = COLUMNS.map((col, ci) => {
    let y = 30
    const members = col.members.map((m) => {
      const a = actor(m.key)
      const collections = m.only ? m.only.map((i) => a.collections[i]!) : a.collections
      const box = { x: ci * (BW + GX), y, h: boxH(collections.length), handle: m.as ?? a.handle,
        sub: m.sub ?? a.role, collections }
      y += box.h + 16
      return box
    })
    return { title: col.title, x: ci * (BW + GX), members, bottom: y }
  })
  const dy = Math.max(...cols.map((c) => c.bottom)) + 14
  const data = ['census', 'eac'].map((k, i) => {
    const a = actor(k)
    return { x: i * (BW + GX), handle: a.handle, collection: a.collections[0]! }
  })
  // +2 so the right-hand column's 1px stroke is not half-clipped by the viewBox.
  return { cols, dy, data, w: 3 * BW + 2 * GX + 2, h: dy + 82 }
})
</script>

<template>
  <svg
    :viewBox="`0 0 ${model.w} ${model.h}`" :width="model.w" :height="model.h"
    role="img" aria-label="Repositories grouped by the role they play"
  >
    <g v-for="col in model.cols" :key="col.title">
      <text :x="col.x" y="12" class="axlabel" fill="var(--ink-2)">{{ col.title }}</text>
      <g v-for="m in col.members" :key="m.handle + m.sub">
        <rect :x="m.x" :y="m.y" :width="BW" :height="m.h" rx="9"
          fill="var(--surface)" stroke="var(--ink-muted)" stroke-width="1" />
        <text :x="m.x + PADX" :y="m.y + 24" fill="var(--ink)" class="svg-name">
          {{ m.handle }}
        </text>
        <text :x="m.x + PADX" :y="m.y + 40" class="tick svg-sub">{{ m.sub }}</text>
        <text
          v-for="(c, i) in m.collections" :key="c"
          :x="m.x + PADX" :y="m.y + 60 + i * 15" fill="var(--ink-2)" class="svg-coll"
        >{{ c }}</text>
      </g>
    </g>

    <!-- The data authorities sit under everything: they are cited by the
         artifacts above them and are the only reason those numbers mean
         anything. -->
    <text x="0" :y="model.dy + 12" class="axlabel" fill="var(--ink-2)">publishes the underlying data</text>
    <g v-for="d in model.data" :key="d.handle">
      <rect :x="d.x" :y="model.dy + 22" :width="BW" height="52" rx="9"
        fill="var(--surface)" stroke="var(--axis)" stroke-width="1" />
      <text :x="d.x + PADX" :y="model.dy + 44" fill="var(--ink-2)" class="svg-name-sm">
        {{ d.handle }}
      </text>
      <text :x="d.x + PADX" :y="model.dy + 62" fill="var(--ink-muted)" class="svg-coll">
        {{ d.collection }}
      </text>
    </g>
  </svg>
</template>
