<!--
  Two checkers, one obligation.

  The digests are sha256 of the checker-generated statement module. Matching them
  is what makes "we both checked the same theorem" a claim with evidence behind it
  rather than a courtesy.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { DEMO } from '../demo'

const i = DEMO.independent
const same = computed(() => i.regulatorDigest === i.watchdogDigest)
</script>

<template>
  <table style="max-width: 860px">
    <tbody>
      <tr>
        <td>regulator's obligation digest</td>
        <td><code class="mono" :style="{ color: same ? 'var(--good)' : 'var(--critical)' }">{{ i.regulatorDigest }}</code></td>
      </tr>
      <tr>
        <td>{{ i.checker }}'s obligation digest</td>
        <td><code class="mono" :style="{ color: same ? 'var(--good)' : 'var(--critical)' }">{{ i.watchdogDigest }}</code></td>
      </tr>
      <tr>
        <td>outcome</td>
        <td>
          <span class="status" :class="i.outcome === 'verified' ? 's-ok' : 's-no'">
            <span class="glyph">{{ i.outcome === 'verified' ? '✓' : '✗' }}</span>{{ i.outcome }}
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
code { font-family: var(--mono); font-size: 0.76rem; word-break: break-all; }
</style>
