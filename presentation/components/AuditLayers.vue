<!--
  Who can check what, and what they have to take on trust if they stop there.

  Stepped in from the right because the shape is the argument: each layer down is
  read by fewer people and settles more. Gently, though — a dramatic funnel
  squeezes the text into columns nobody can read from the back of a room.

  The point of the slide is that stopping early is fine. A reader who never opens
  the Lean still got a rule they can quote, and one who never reads the kernel
  still got a proof the kernel accepted.
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{ step?: number }>(), { step: 99 })

const LAYERS = [
  {
    at: 1,
    who: 'anyone',
    width: '100%',
    tone: 'a',
    reads: 'The requirement record',
    detail: 'Five bulleted clauses in something close to English. Quotable in a news story, arguable in a hearing.',
    trusts: 'that the words are backed by something',
  },
  {
    at: 2,
    who: 'domain experts',
    width: '90%',
    tone: 'b',
    reads: 'The theory record',
    detail: 'What each phrase denotes, and how a published record becomes a value the rule can talk about. The theory ships its own glossary.',
    trusts: 'that Lean means what Lean says',
  },
  {
    at: 3,
    who: 'the stubborn',
    width: '80%',
    tone: 'c',
    reads: 'The proof and its axioms',
    detail: 'Re-run the checker. Compare the obligation digest. Replay the whole environment through a clean kernel if you like.',
    trusts: 'a kernel small enough to have been reimplemented from scratch, more than once',
  },
]
</script>

<template>
  <div class="layers">
    <div
      v-for="l in LAYERS" :key="l.at"
      class="layer" :class="[`tone-${l.tone}`, { dim: props.step < l.at }]"
      :style="{ width: l.width }"
    >
      <div class="who">{{ l.who }}</div>
      <div class="body">
        <div class="reads">{{ l.reads }}</div>
        <div class="detail">{{ l.detail }}</div>
      </div>
      <div class="trusts"><span>takes on trust</span>{{ l.trusts }}</div>
    </div>
  </div>
</template>

<style scoped>
.layers { display: flex; flex-direction: column; gap: 0.6rem; align-items: flex-start; }

.layer {
  display: grid;
  /* Proportional, so the columns narrow together with the band instead of the
     middle one absorbing all of it. */
  grid-template-columns: 9rem minmax(0, 1fr) 30%;
  gap: 1.1rem;
  align-items: start;
  padding: 0.75rem 1.05rem;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-left: 3px solid var(--axis);
  transition: opacity 220ms ease;
}
.layer.dim { opacity: 0.18; }

.tone-a { border-left-color: var(--lean-a); }
.tone-b { border-left-color: var(--plan-fairfax); }
.tone-c { border-left-color: var(--plan-crackland); }

.who {
  font-size: 0.95rem; font-weight: 650; color: var(--ink);
  letter-spacing: -0.01em; padding-top: 0.05rem;
}
.reads { font-size: 0.92rem; font-weight: 650; color: var(--ink-2); margin-bottom: 0.15rem; }
.detail { font-size: 0.84rem; line-height: 1.45; color: var(--ink-muted); }
.trusts { font-size: 0.78rem; line-height: 1.4; color: var(--ink-muted); }
.trusts span {
  display: block; font-size: 0.64rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--axis); margin-bottom: 0.18rem;
}
</style>
