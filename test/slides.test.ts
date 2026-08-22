/**
 * Guards on the deck that a build will not catch.
 *
 * A slide whose `clicks:` frontmatter is lower than the number of reveals it
 * contains still builds, still renders, and still looks right — the reveals past
 * the cap simply never fire, and the deck advances to the next slide instead.
 * You find out while presenting.
 *
 * That is the failure this file exists for. It cost a live "why won't this
 * highlight" to find once.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SLIDES = resolve(import.meta.dirname, '../presentation/slides.md')

type Slide = { n: number; frontmatter: string; body: string; title: string }

/**
 * Split the deck the way Slidev does: on `---` lines outside fenced code, with
 * an optional frontmatter block between separators.
 */
function parseSlides(src: string): Slide[] {
  const chunks: string[] = []
  let cur: string[] = []
  let fenced = false
  for (const line of src.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced
    if (!fenced && line.trimEnd() === '---') {
      chunks.push(cur.join('\n'))
      cur = []
    } else {
      cur.push(line)
    }
  }
  chunks.push(cur.join('\n'))

  const isFrontmatter = (c: string) => {
    const lines = c
      .trim()
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
    return lines.length > 0 && lines.every((l) => /^[A-Za-z_][\w-]*:/.test(l) || l.startsWith('  '))
  }

  // chunks[0] is empty (the file opens with `---`); chunks[1] is the headmatter.
  const slides: Slide[] = []
  let i = 2
  if (isFrontmatter(chunks[1]!)) {
    slides.push(mk(slides.length + 1, chunks[1]!, chunks[2] ?? ''))
    i = 3
  }
  while (i < chunks.length) {
    if (isFrontmatter(chunks[i]!) && i + 1 < chunks.length) {
      slides.push(mk(slides.length + 1, chunks[i]!, chunks[i + 1]!))
      i += 2
    } else {
      slides.push(mk(slides.length + 1, '', chunks[i]!))
      i += 1
    }
  }
  return slides
}

function mk(n: number, frontmatter: string, body: string): Slide {
  const t = /^##?\s+(.+)$/m.exec(body)
  return { n, frontmatter, body, title: t ? t[1]!.trim() : '(no heading)' }
}

/** How many presses a slide's markup asks for. */
function revealsNeeded(body: string): number {
  const plain = body.match(/<v-click(?![a-z])/g)?.length ?? 0
  const absolute = [...body.matchAll(/<v-click[^>]*\bat="(\d+)"/g)].map((m) => Number(m[1]))
  // `<v-clicks>` reveals one child per press.
  const items = [...body.matchAll(/<v-clicks>([\s\S]*?)<\/v-clicks>/g)].reduce(
    (sum, m) => sum + (m[1]!.match(/^- /gm)?.length ?? 0),
    0,
  )
  return Math.max(plain + items, ...absolute, 0)
}

/** Drop HTML comments — the editing header and presenter notes live in them. */
const stripComments = (s: string) => s.replace(/<!--[\s\S]*?-->/g, '')

const declaredClicks = (frontmatter: string) => {
  const m = /^clicks:\s*(\d+)/m.exec(frontmatter)
  return m ? Number(m[1]) : null
}

const src = readFileSync(SLIDES, 'utf8')
const slides = parseSlides(src)

describe('the deck', () => {
  it('has no blank slides', () => {
    // An empty frontmatter block (`---` immediately followed by `---`) renders as
    // a blank slide the presenter walks into mid-talk.
    expect(slides.length).toBeGreaterThan(20)
    const blank = slides.filter((s) => s.body.trim().length === 0).map((s) => s.n)
    expect(blank).toEqual([])
  })

  it('never caps a slide below the reveals it contains', () => {
    // The bug this file exists for: a `clicks:` lower than the number of
    // <v-click>s strands the last ones, silently, until you are on stage.
    const stranded = slides
      .map((s) => ({ ...s, declared: declaredClicks(s.frontmatter), need: revealsNeeded(s.body) }))
      .filter((s) => s.declared !== null && s.need > s.declared)
      .map((s) => `slide ${s.n} "${s.title}": clicks: ${s.declared} but ${s.need} reveals`)

    expect(stranded).toEqual([])
  })

  it('declares a click budget on any slide that drives a component from $clicks', () => {
    // Auto-counting only sees <v-click>. A component bound to `$clicks` needs the
    // budget stated, or its build silently stops at the first frame.
    //
    // Comments are stripped first: the editing header and the presenter notes both
    // talk *about* `$clicks` without using it.
    const missing = slides
      .filter(
        (s) => stripComments(s.body).includes('$clicks') && declaredClicks(s.frontmatter) === null,
      )
      .map((s) => `slide ${s.n} "${s.title}"`)

    expect(missing).toEqual([])
  })

  it('gives the record graph enough presses to finish building', () => {
    // The graph reveals one edge group at a time; the last one is keyed to the
    // highest `at` in the component.
    const graph = slides.find((s) => s.body.includes('<RecordGraph'))
    expect(graph, 'the record-graph slide').toBeDefined()

    const component = readFileSync(
      resolve(import.meta.dirname, '../presentation/components/RecordGraph.vue'),
      'utf8',
    )
    const steps = [...component.matchAll(/\bat:\s*(\d+)/g)].map((m) => Number(m[1]))
    expect(steps.length).toBeGreaterThan(0)

    // The slide binds `:step="$clicks + 1"`, so the last step lands one press early.
    expect(declaredClicks(graph!.frontmatter)).toBeGreaterThanOrEqual(Math.max(...steps) - 1)
  })

  it('keeps every figure component referenced by the deck', () => {
    // A renamed or deleted component fails at runtime as a blank space rather
    // than as a build error, because Vue treats an unknown tag as a custom
    // element.
    const used = new Set(
      [...src.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)].map((m) => m[1]!),
    )
    const available = new Set(
      readdirSync(resolve(import.meta.dirname, '../presentation/components'))
        .filter((f) => f.endsWith('.vue'))
        .map((f) => f.replace(/\.vue$/, '')),
    )
    const unknown = [...used].filter((u) => !available.has(u))
    expect(unknown).toEqual([])
  })
})
