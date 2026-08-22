<!--
  What happens when a certified artifact is edited.

  The CIDs are the before and after of one precinct's population changing by one.
  Nothing was revoked; the reference simply stopped resolving to what it named.
-->
<script setup lang="ts">
import { DEMO } from '../demo'

const s = DEMO.staleness
</script>

<template>
  <table style="max-width: 940px">
    <tbody>
      <tr><td style="width: 6rem">before</td><td><code>{{ s.before }}</code></td></tr>
      <tr><td>after</td><td><code>{{ s.after }}</code></td></tr>
      <tr>
        <td>re-check</td>
        <td>
          <span class="status s-hold"><span class="glyph">!</span>{{ s.outcome }}</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
code { font-family: var(--mono); font-size: 0.74rem; color: var(--ink-muted); word-break: break-all; }
</style>
