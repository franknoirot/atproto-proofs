<!--
  A QR code, generated from whatever URL the slide passes in.

  Computed at render time rather than committed as an image, so changing the link
  in `slides.md` is the whole edit — there is no second artifact to regenerate and
  forget.

  Dark modules on a light card, not the other way round. An inverted QR is
  prettier on a dark deck and scans unreliably: plenty of readers refuse them, and
  a code that half the room cannot scan is worse than no code. The white plate
  also doubles as the quiet zone the spec requires.

  The URL is also printed underneath, from the same prop — so it is written once,
  a heading and a QR pointing at different places is not a possible bug, and
  anyone whose camera will not cooperate can still type it.
-->
<script setup lang="ts">
import { computed } from 'vue'
import qrcode from 'qrcode-generator'

const props = withDefaults(
  defineProps<{
    data: string
    /** Rendered edge length, in slide units. */
    size?: number
    /**
     * Error-correction level. `M` recovers ~15% and keeps the module count low,
     * which matters more than redundancy when people are scanning a projection
     * from the back of a room.
     */
    ecl?: 'L' | 'M' | 'Q' | 'H'
  }>(),
  { size: 280, ecl: 'M' },
)

/** Quiet zone, in modules. Four is the spec minimum. */
const QUIET = 4

const model = computed(() => {
  const qr = qrcode(0, props.ecl)
  qr.addData(props.data)
  qr.make()

  const count = qr.getModuleCount()
  const span = count + QUIET * 2

  // One path for every dark module rather than a rect each: a v4 code is ~1000
  // modules, and a thousand SVG nodes per slide is a real cost in a deck that
  // re-renders on every click.
  let d = ''
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) d += `M${col + QUIET} ${row + QUIET}h1v1h-1z`
    }
  }
  return { span, d }
})

/** The link as a reader would type it: no scheme, no trailing slash. */
const display = computed(() => props.data.replace(/^https?:\/\//, '').replace(/\/$/, ''))
</script>

<template>
  <div class="qr-block">
    <svg
      :viewBox="`0 0 ${model.span} ${model.span}`" :width="size" :height="size"
      role="img" :aria-label="`QR code for ${data}`" shape-rendering="crispEdges"
    >
      <rect
        :width="model.span" :height="model.span" rx="1.5"
        style="fill: #fcfcfb"
      />
      <path :d="model.d" style="fill: #0b0b0b" />
    </svg>
    <div class="qr-url">{{ display }}</div>
  </div>
</template>

<style scoped>
.qr-block { display: inline-flex; flex-direction: column; align-items: center; gap: 0.55rem; }
/* One line, even if that means running a little wider than the code above it —
   a URL broken mid-word is harder to read back than one that overhangs. */
.qr-url { font-family: var(--mono); font-size: 0.76rem; color: var(--ink-2); white-space: nowrap; }
</style>
