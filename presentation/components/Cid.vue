<!-- An abbreviated content hash. Hover for the full value. -->
<script setup lang="ts">
import { computed } from 'vue'
import { check, DEMO, plan, requirement, shortCid } from '../demo'

const props = defineProps<{
  /** A plan key, a check id, a requirement key, or `theory`. */
  of: string
  /** For a check: show the verdict's CID instead of the proof's. */
  verdict?: boolean
  chars?: number
}>()

const full = computed(() => {
  if (props.of === 'theory') return DEMO.theory.ref.cid
  const p = DEMO.plans.find((x) => x.key === props.of)
  if (p) return p.ref.cid
  const r = DEMO.requirements.find((x) => x.key === props.of)
  if (r) return requirement(props.of).ref.cid
  const c = DEMO.checks.find((x) => x.id === props.of)
  if (c) return props.verdict ? check(props.of).verdictRef.cid : check(props.of).proofRef.cid
  return props.of
})
</script>

<template><code class="cid" :title="full">{{ shortCid(full, chars ?? 10) }}</code></template>
