<!--
  The table-view twin for the district maps and share strips.

  Every chart on a continuous or colour-coded scale needs a WCAG-clean
  equivalent, and this doubles as the answer to "what is district 7 actually at?"
-->
<script setup lang="ts">
import { plan, PLAN_LABEL } from '../demo'

const props = defineProps<{ plans: string[] }>()

const rows = Array.from({ length: 10 }, (_, i) => i)
/** A district within 5 points of even changes hands inside the § 5 band. */
const inPlay = (bp: number) => Math.abs(bp - 5000) <= 500
</script>

<template>
  <div>
    <table>
      <thead>
        <tr>
          <th>district</th>
          <th v-for="k in props.plans" :key="k">{{ PLAN_LABEL[k] ?? k }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in rows" :key="i">
          <td class="num">{{ i }}</td>
          <td v-for="k in props.plans" :key="k" class="num">
            {{ (plan(k).sharesBp[i]! / 100).toFixed(2) }}%
            <span v-if="inPlay(plan(k).sharesBp[i]!)" style="color: var(--warning)">◆</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="small muted" style="margin-top: 0.5rem">
      Party A's share of the two-party vote.
      <span style="color: var(--warning)">◆</span> marks a seat that changes hands somewhere
      inside the ±5-point band.
    </p>
  </div>
</template>
