<!--
  One checker's verdict on one proof, exactly as captured.

  The clause list is the part worth watching. It reports `holds`, `refuted` or
  `undecided` and never guesses: a tier-1 clause is decidable so evaluation
  settles it either way, but a tier-2 clause quantifies over an unbounded range
  and evaluation can only ever refute it.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { check, pct, shortCid, spct } from '../demo'

const props = withDefaults(
  defineProps<{ id: string; clauses?: boolean; summary?: boolean; axioms?: boolean }>(),
  { clauses: true, summary: true, axioms: false },
)

const c = computed(() => check(props.id))

const OUTCOME = {
  verified: { cls: 'good', chip: 's-ok', glyph: '✓' },
  refuted: { cls: 'bad', chip: 's-no', glyph: '✗' },
  stale: { cls: 'warn', chip: 's-hold', glyph: '!' },
  malformed: { cls: 'warn', chip: 's-hold', glyph: '!' },
  timeout: { cls: 'warn', chip: 's-hold', glyph: '!' },
  unsupported: { cls: 'warn', chip: 's-hold', glyph: '!' },
} as const

const CLAUSE = {
  holds: { chip: 's-ok', glyph: '·' },
  refuted: { chip: 's-no', glyph: '✗' },
  undecided: { chip: 's-hold', glyph: '?' },
} as const

const look = computed(() => OUTCOME[c.value.outcome])
</script>

<template>
  <div class="card tag" :class="look.cls">
    <div class="head">
      <span>
        <span class="status" :class="look.chip"><span class="glyph">{{ look.glyph }}</span>{{ c.outcome }}</span>
        <span class="pill">{{ c.labelVal }}</span>
      </span>
      <span class="cid">{{ c.durationMs }} ms · proof {{ shortCid(c.proofRef.cid) }}</span>
    </div>

    <p class="detail">{{ c.detail }}</p>

    <table v-if="clauses">
      <tbody>
        <tr v-for="cl in c.clauses" :key="cl.clause">
          <td>
            <span class="status" :class="CLAUSE[cl.status].chip">
              <span class="glyph">{{ CLAUSE[cl.status].glyph }}</span>
            </span>
            <code>{{ cl.clause }}</code>
          </td>
          <td class="muted">{{ cl.status }}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="summary && c.summary" class="cid">
      seats A {{ c.summary.seatsA }}/{{ c.summary.districts }} ·
      vote share {{ pct(c.summary.voteShareABp!) }} ·
      efficiency gap {{ spct(c.summary.efficiencyGapBp!) }} ·
      pop deviation {{ pct(c.summary.popDevBp!) }}
    </div>

    <div v-if="axioms" class="cid axioms">axioms: {{ c.axioms.join(', ') || 'none' }}</div>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; flex-wrap: wrap; }
.head > span:first-child { display: inline-flex; align-items: center; gap: 0.5rem; }
.detail { margin: 0.5rem 0 0.55rem; font-size: 0.9rem; }
table { margin-bottom: 0.45rem; }
td:first-child { display: flex; align-items: center; gap: 0.4rem; }
.axioms { margin-top: 0.35rem; }
</style>
