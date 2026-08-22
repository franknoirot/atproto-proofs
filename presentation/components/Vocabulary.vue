<!--
  The glossary the theory record publishes about itself.

  Straight out of `dev.provable.theory`'s `vocabulary` field — every phrase the
  requirement language accepts, and the Lean name it denotes. It is on the wire
  precisely so that auditing what a rule *means* does not require reading Lean:
  the mapping is a published record, not folklore in a repository somewhere.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { DEMO } from '../demo'

const props = withDefaults(defineProps<{ expand?: string }>(), { expand: '' })

const terms = computed(() => DEMO.theory.vocabulary)
const expanded = computed(() =>
  props.expand ? terms.value.find((t) => t.phrase.includes(props.expand)) : undefined,
)
</script>

<template>
  <div>
    <table>
      <thead>
        <tr><th>phrase in the requirement</th><th>what it denotes</th></tr>
      </thead>
      <tbody>
        <tr v-for="t in terms" :key="t.leanName">
          <td>{{ t.phrase }}</td>
          <td><code>{{ t.leanName }}</code></td>
        </tr>
      </tbody>
    </table>

    <div v-if="expanded" class="gloss">
      <div class="phrase">“{{ expanded.phrase }}”</div>
      <p class="small">{{ expanded.doc }}</p>
    </div>
  </div>
</template>

<style scoped>
td:first-child { color: var(--ink); }
code { font-family: var(--mono); font-size: 0.82rem; color: var(--ink-2); }
.gloss {
  margin-top: 0.9rem; padding: 0.8rem 1rem;
  background: var(--surface); border: 1px solid var(--hairline);
  border-left: 3px solid var(--lean-a); border-radius: 10px;
}
.phrase { font-size: 0.9rem; font-weight: 650; color: var(--ink); margin-bottom: 0.35rem; }
.gloss p { margin: 0; color: var(--ink-2); }
</style>
