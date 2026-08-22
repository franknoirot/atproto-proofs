/* Presentation for atproto-proofs.
 *
 * Every number, CID, verdict and code excerpt on these slides comes from
 * `data.js`, which `pnpm present` writes from an actual demo run. Nothing here
 * is illustrative. A deck about "verdicts are computations, not assertions"
 * that quoted made-up hashes would be arguing against itself.
 */
'use strict'

const D = window.DEMO
if (!D) throw new Error('data.js missing — run `pnpm present`')

/* ------------------------------------------------------------------ helpers */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const cid = (c, n = 10) => (c ? c.slice(0, n) + '…' : '—')
const pct = (bp) => (bp < 0 ? '−' : '') + (Math.abs(bp) / 100).toFixed(2) + '%'
const spct = (bp) => (bp > 0 ? '+' : bp < 0 ? '−' : '') + (Math.abs(bp) / 100).toFixed(2) + '%'
const plan = (k) => D.plans.find((p) => p.key === k)
const check = (id) => D.checks.find((c) => c.id === id)
const req = (k) => D.requirements.find((r) => r.key === k)
const actor = (k) => D.actors.find((a) => a.key === k)

const PLAN_LABEL = { fairfax: 'Fairfax', crackland1: 'Crackland v1', crackland2: 'Crackland v2' }

/** Minimal highlighter — enough to keep Lean and JSON readable, not a parser. */
function code(src, lang) {
  let s = esc(src)
  if (lang === 'lean') {
    s = s.replace(/(--[^\n]*|\/-[\s\S]*?-\/)/g, '<span class="c">$1</span>')
    s = s.replace(/&quot;([^&]*?)&quot;/g, '<span class="s">&quot;$1&quot;</span>')
    s = s.replace(/\b(def|abbrev|theorem|import|namespace|end|open|set_option|by|decide|requirement|titled|for|plan|where|Prop|match|with)\b/g,
      '<span class="k">$1</span>')
  } else if (lang === 'json') {
    s = s.replace(/&quot;([^&]*?)&quot;(\s*:)/g, '<span class="k">&quot;$1&quot;</span>$2')
    s = s.replace(/:\s*&quot;([^&]*?)&quot;/g, ': <span class="s">&quot;$1&quot;</span>')
  }
  return s
}

const statusChip = (o) => {
  const m = { verified: ['s-ok', '✓'], refuted: ['s-no', '✗'], stale: ['s-hold', '!'], malformed: ['s-hold', '!'] }[o] || ['s-hold', '·']
  return `<span class="status ${m[0]}"><span class="glyph">${m[1]}</span>${o}</span>`
}

const clauseRows = (cs) =>
  cs.map((c) => {
    const m = { holds: ['s-ok', '·'], refuted: ['s-no', '✗'], undecided: ['s-hold', '?'] }[c.status]
    return `<tr><td><span class="status ${m[0]}"><span class="glyph">${m[1]}</span></span> <code>${esc(c.clause)}</code></td>
      <td style="color:var(--ink-muted)">${c.status}</td></tr>`
  }).join('')

/* -------------------------------------------------------------- svg: chrome */

const SVG = (w, h, body, extra = '') =>
  `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${extra} role="img">${body}</svg>`

/* --------------------------------------------------- svg: who owns what */

/**
 * Who publishes what.
 *
 * Grouped by the role a repository plays rather than wired up with arrows — the
 * citation structure is the *next* slide's job, and drawing both here made each
 * one harder to read. The regulator appears in two columns on purpose: it writes
 * the rules and it also runs a checker, and the second of those is not exclusive
 * to it.
 */
function svgOwnership() {
  const COLS = [
    { title: 'writes the rules', members: [{ key: 'fedgov', only: [0, 1, 3] }] },
    {
      title: 'must prove compliance',
      members: [{ key: 'fairfax' }, { key: 'crackland' }],
    },
    {
      title: 'publishes verdicts',
      members: [{ key: 'fedgov', only: [2], as: 'fda.gov.example', sub: 'the regulator’s own checker' },
        { key: 'watchdog', sub: 'no standing, no permission' }],
    },
  ]
  const BW = 262, GX = 38, PADX = 14
  const W = 3 * BW + 2 * GX
  const boxH = (n) => 46 + n * 15 + 12

  let body = '', maxY = 0
  COLS.forEach((col, ci) => {
    const x = ci * (BW + GX)
    body += `<text x="${x}" y="12" class="axlabel" fill="var(--ink-2)">${esc(col.title)}</text>`
    let y = 30
    for (const m of col.members) {
      const a = actor(m.key)
      const colls = m.only ? m.only.map((i) => a.collections[i]) : a.collections
      const h = boxH(colls.length)
      body += `<g>
        <rect x="${x}" y="${y}" width="${BW}" height="${h}" rx="9"
          fill="var(--surface)" stroke="var(--ink-muted)" stroke-width="1"/>
        <text x="${x + PADX}" y="${y + 24}" fill="var(--ink)" font-size="13.5" font-weight="650">${esc(m.as || a.handle)}</text>
        <text x="${x + PADX}" y="${y + 40}" class="tick" font-size="10.5">${esc(m.sub || a.role)}</text>
        ${colls.map((c, i) =>
          `<text x="${x + PADX}" y="${y + 60 + i * 15}" fill="var(--ink-2)" font-size="10.5"
            font-family="var(--mono)">${esc(c)}</text>`).join('')}
      </g>`
      y += h + 16
    }
    maxY = Math.max(maxY, y)
  })

  // The data authorities sit under everything: they are cited by the artifacts
  // above them and are the only reason those artifacts' numbers mean anything.
  const dy = maxY + 14
  body += `<text x="0" y="${dy + 12}" class="axlabel" fill="var(--ink-2)">publishes the underlying data</text>`
  ;['census', 'eac'].forEach((k, i) => {
    const a = actor(k)
    const x = i * (BW + GX)
    body += `<g><rect x="${x}" y="${dy + 22}" width="${BW}" height="52" rx="9"
      fill="var(--surface)" stroke="var(--axis)" stroke-width="1"/>
      <text x="${x + PADX}" y="${dy + 44}" fill="var(--ink-2)" font-size="12.5" font-weight="650">${esc(a.handle)}</text>
      <text x="${x + PADX}" y="${dy + 62}" fill="var(--ink-muted)" font-size="10.5"
        font-family="var(--mono)">${esc(a.collections[0])}</text></g>`
  })
  return SVG(W, dy + 82, body)
}

/* ------------------------------------------------- svg: the record graph */

function svgRecordGraph(step) {
  const N = [
    { id: 'theory', label: 'dev.provable.theory', who: 'regulator', col: 0, row: 0, s: 1 },
    { id: 'ds', label: 'gov.redistrict.datasource', who: 'data authority', col: 0, row: 2, s: 4 },
    { id: 'req', label: 'dev.provable.requirement', who: 'regulator', col: 1, row: 0, s: 2 },
    { id: 'plan', label: 'gov.redistrict.plan', who: 'regulated actor', col: 1, row: 2, s: 3 },
    { id: 'proof', label: 'dev.provable.proof', who: 'regulated actor', col: 2, row: 1, s: 5 },
    { id: 'verdict', label: 'dev.provable.verdict', who: 'checker', col: 3, row: 0.4, s: 6 },
    { id: 'label', label: 'label  (signed)', who: 'labeler', col: 3, row: 1.6, s: 6 },
  ]
  const E = [
    ['req', 'theory', 'theory', 2],
    ['plan', 'ds', 'censusSource', 4],
    ['proof', 'req', 'requirement', 5],
    ['proof', 'plan', 'artifact', 5],
    ['proof', 'theory', 'theory', 5],
    ['verdict', 'proof', 'proof', 6],
    ['label', 'proof', 'subject', 6],
  ]
  const BW = 216, BH = 50, GX = 92, GY = 34
  const W = 4 * BW + 3 * GX, H = 3 * (BH + GY)
  const pos = (n) => ({ x: n.col * (BW + GX), y: n.row * (BH + GY) + 14 })

  let body = `<defs><marker id="ar2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M0 0 L8 4 L0 8 z" fill="var(--lean-a)"/></marker></defs>`

  for (const [a, b, field, s] of E) {
    const na = N.find((n) => n.id === a), nb = N.find((n) => n.id === b)
    const pa = pos(na), pb = pos(nb)
    const x1 = pa.x, y1 = pa.y + BH / 2
    const x2 = pb.x + BW, y2 = pb.y + BH / 2
    const on = step >= s
    body += `<path d="M${x1} ${y1} C ${x1 - 36} ${y1}, ${x2 + 36} ${y2}, ${x2} ${y2}" fill="none"
      stroke="${on ? 'var(--lean-a)' : 'var(--axis)'}" stroke-width="1.5"
      marker-end="${on ? 'url(#ar2)' : ''}" opacity="${on ? 1 : 0.35}"/>
      <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 4}" text-anchor="middle" class="tick"
        opacity="${on ? 1 : 0.3}">${esc(field)}</text>`
  }
  for (const n of N) {
    const p = pos(n), on = step >= n.s
    body += `<g opacity="${on ? 1 : 0.25}">
      <rect x="${p.x}" y="${p.y}" width="${BW}" height="${BH}" rx="8"
        fill="var(--surface)" stroke="${on ? 'var(--ink-muted)' : 'var(--axis)'}"/>
      <text x="${p.x + 12}" y="${p.y + 21}" fill="var(--ink)" font-size="11.5"
        font-family="var(--mono)">${esc(n.label)}</text>
      <text x="${p.x + 12}" y="${p.y + 38}" class="tick" font-size="10">${esc(n.who)}</text>
    </g>`
  }
  return SVG(W, H, body)
}

/* ---------------------------------------------------------- svg: the maps */

/** Diverging fill for party A's share, in basis points. Midpoint 50%. */
function leanFill(bp) {
  const d = bp - 5000
  if (d > 900) return 'var(--lean-a-strong)'
  if (d >= 150) return 'var(--lean-a)'
  if (d < -900) return 'var(--lean-b-strong)'
  if (d <= -150) return 'var(--lean-b)'
  return 'var(--even)'
}

/**
 * A districting plan.
 *
 * Fill is party lean on the diverging scale; district identity is carried by
 * boundary strokes, not by a tenth categorical hue. That is both how a
 * districting map is actually read and the only honest option — ten distinct
 * fills could not survive a colour-vision check.
 *
 * Precincts inside one district are butted together with only a hairline between
 * them, so a district reads as one shape. The usual 2px gap between fills is
 * wrong here: it would fragment every district into six squares and drown the
 * one boundary that carries meaning.
 */
function svgMap(key, opts = {}) {
  const p = plan(key)
  const CS = opts.cell || 34
  const cols = 10, rows = 6
  const W = cols * CS, H = rows * CS
  const at = (r, c) => p.cells.find((x) => x.r === r && x.c === c)
  const share = (cell) => Math.round((10000 * cell.votesA) / (cell.votesA + cell.votesB))

  let fills = '', hair = '', bounds = ''
  for (const cell of p.cells) {
    fills += `<rect x="${cell.c * CS}" y="${cell.r * CS}" width="${CS}" height="${CS}"
      fill="${leanFill(share(cell))}"/>`
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = at(r, c), x = c * CS, y = r * CS
      const right = c + 1 < cols ? at(r, c + 1) : null
      const down = r + 1 < rows ? at(r + 1, c) : null
      if (right) {
        const seam = right.district !== a.district
        ;(seam ? (bounds += `<line x1="${x + CS}" y1="${y}" x2="${x + CS}" y2="${y + CS}"
            stroke="var(--ink)" stroke-width="3"/>`)
          : (hair += `<line x1="${x + CS}" y1="${y}" x2="${x + CS}" y2="${y + CS}"
            stroke="rgba(0,0,0,0.22)" stroke-width="1"/>`))
      }
      if (down) {
        const seam = down.district !== a.district
        ;(seam ? (bounds += `<line x1="${x}" y1="${y + CS}" x2="${x + CS}" y2="${y + CS}"
            stroke="var(--ink)" stroke-width="3"/>`)
          : (hair += `<line x1="${x}" y1="${y + CS}" x2="${x + CS}" y2="${y + CS}"
            stroke="rgba(0,0,0,0.22)" stroke-width="1"/>`))
      }
    }
  }
  bounds += `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="var(--ink)" stroke-width="3"/>`
  return SVG(W + 4, H + 4, `<g transform="translate(2,2)">${fills}${hair}${bounds}</g>`)
}

/**
 * Each district's share of the vote, as a diverging bar from the 50% line, with
 * the ±5-point swing band marked.
 *
 * This is where safe seats become visible: a bar whose tip lands inside the band
 * is a district that changes hands somewhere in the range § 5 quantifies over.
 */
function svgShares(key, opts = {}) {
  const p = plan(key)
  const W = opts.w || 360, ROW = 15, GAP = 3
  const H = p.sharesBp.length * (ROW + GAP) - GAP + 26
  const lo = 2500, hi = 8000
  const X = (bp) => ((bp - lo) / (hi - lo)) * W
  const mid = X(5000)
  const bandL = X(4500), bandR = X(5500)

  let body = ''
  // The swing band, behind everything: districts crossing it flip within ±5 pts.
  body += `<rect x="${bandL}" y="0" width="${bandR - bandL}" height="${H - 26}"
    fill="var(--lean-a)" opacity="0.09"/>`
  body += `<line x1="${mid}" y1="0" x2="${mid}" y2="${H - 26}" stroke="var(--axis)" stroke-width="1"/>`

  p.sharesBp.forEach((bp, i) => {
    const y = i * (ROW + GAP)
    const x = X(bp)
    const x0 = Math.min(x, mid), w = Math.abs(x - mid)
    body += `<rect x="${x0}" y="${y}" width="${Math.max(w, 1.5)}" height="${ROW}" rx="3" fill="${leanFill(bp)}"/>`
    const inside = Math.abs(bp - 5000) <= 500
    if (inside) {
      body += `<text x="${x + (bp > 5000 ? 6 : -6)}" y="${y + ROW - 3}"
        text-anchor="${bp > 5000 ? 'start' : 'end'}" class="dlabel" fill="var(--ink)">${(bp / 100).toFixed(1)}%</text>`
    }
  })
  body += `<text x="${mid}" y="${H - 10}" text-anchor="middle" class="tick">50%</text>`
  body += `<text x="${bandL}" y="${H - 10}" text-anchor="middle" class="tick">45</text>`
  body += `<text x="${bandR}" y="${H - 10}" text-anchor="middle" class="tick">55</text>`
  return SVG(W + 60, H, `<g transform="translate(30,0)">${body}</g>`)
}

const mapLegend = `<div class="legend">
  <span class="item"><span class="swatch box" style="background:var(--lean-b-strong)"></span>B +10 or more</span>
  <span class="item"><span class="swatch box" style="background:var(--lean-b)"></span>B</span>
  <span class="item"><span class="swatch box" style="background:var(--even)"></span>within 1.5 pts</span>
  <span class="item"><span class="swatch box" style="background:var(--lean-a)"></span>A</span>
  <span class="item"><span class="swatch box" style="background:var(--lean-a-strong)"></span>A +10 or more</span>
  <span class="item" style="color:var(--ink-muted)">white rules = district boundaries</span>
</div>`

/* ------------------------------------------------ svg: efficiency gap chart */

const SWING_SERIES = [
  { key: 'fairfax', label: 'Fairfax', color: 'var(--plan-fairfax)' },
  { key: 'crackland2', label: 'Crackland v2', color: 'var(--plan-crackland)' },
]

function svgSwing(opts = {}) {
  const W = opts.w || 860, H = opts.h || 380
  const M = { t: 16, r: 132, b: 46, l: 88 }
  const pw = W - M.l - M.r, ph = H - M.t - M.b
  const xd = [-500, 500], yd = [-1350, 950]
  const X = (v) => M.l + ((v - xd[0]) / (xd[1] - xd[0])) * pw
  const Y = (v) => M.t + (1 - (v - yd[0]) / (yd[1] - yd[0])) * ph

  let body = ''
  // Legal band. A shaded region plus solid hairline edges — never dashed.
  body += `<rect x="${M.l}" y="${Y(700)}" width="${pw}" height="${Y(-700) - Y(700)}"
    fill="var(--ink)" opacity="0.06"/>`
  for (const e of [700, -700]) {
    body += `<line x1="${M.l}" y1="${Y(e)}" x2="${M.l + pw}" y2="${Y(e)}"
      stroke="var(--ink-muted)" stroke-width="1"/>`
  }
  body += `<text x="${M.l + 8}" y="${Y(700) + 15}" class="tick"
    fill="var(--ink-2)">statutory limit ±7.00%</text>`

  // Grid + axes, solid hairlines one shade off the surface.
  for (const t of [-1000, -500, 0, 500]) {
    body += `<line x1="${M.l}" y1="${Y(t)}" x2="${M.l + pw}" y2="${Y(t)}" stroke="var(--grid)" stroke-width="1"/>
      <text x="${M.l - 10}" y="${Y(t) + 4}" text-anchor="end" class="tick">${spct(t)}</text>`
  }
  for (const t of [-500, -250, 0, 250, 500]) {
    body += `<line x1="${X(t)}" y1="${M.t}" x2="${X(t)}" y2="${M.t + ph}" stroke="var(--grid)" stroke-width="1"/>
      <text x="${X(t)}" y="${M.t + ph + 18}" text-anchor="middle" class="tick">${spct(t)}</text>`
  }
  body += `<line x1="${M.l}" y1="${M.t + ph}" x2="${M.l + pw}" y2="${M.t + ph}" stroke="var(--axis)" stroke-width="1"/>`
  body += `<text x="${M.l + pw / 2}" y="${H - 6}" text-anchor="middle" class="axlabel">uniform swing toward party A</text>`
  body += `<text transform="translate(15,${M.t + ph / 2}) rotate(-90)" text-anchor="middle" class="axlabel">efficiency gap</text>`

  for (const s of SWING_SERIES) {
    const pts = plan(s.key).swing.map((d) => `${X(d.s).toFixed(1)},${Y(d.egBp).toFixed(1)}`).join(' ')
    body += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2"
      stroke-linejoin="round" stroke-linecap="round"/>`
    const last = plan(s.key).swing[plan(s.key).swing.length - 1]
    body += `<text x="${X(last.s) + 10}" y="${Y(last.egBp) + 4}" class="dlabel" fill="${s.color}">${s.label}</text>`
  }

  if (opts.markers) {
    // The six breakpoints of Fairfax's certificate. Two pairs are adjacent
    // integers and land on the same pixel, which is the point of them.
    const f = plan('fairfax').swing
    const nearest = (s) => f.reduce((a, b) => (Math.abs(b.s - s) < Math.abs(a.s - s) ? b : a))
    for (const b of D.breakpoints) {
      const d = nearest(b)
      body += `<circle cx="${X(d.s)}" cy="${Y(d.egBp)}" r="5" fill="var(--surface)"
        stroke="var(--plan-fairfax)" stroke-width="2"/>`
    }
  }

  // Hover layer: a wide transparent band per sample column, so the hit target is
  // far bigger than the mark. Values are also on the axis and in the table view.
  body += `<rect id="swing-hit" x="${M.l}" y="${M.t}" width="${pw}" height="${ph}" fill="transparent"
    data-l="${M.l}" data-t="${M.t}" data-w="${pw}" data-h="${ph}"/>`
  body += `<line id="swing-cross" x1="0" y1="${M.t}" x2="0" y2="${M.t + ph}" stroke="var(--ink-muted)"
    stroke-width="1" opacity="0"/>`
  for (const s of SWING_SERIES) {
    body += `<circle class="swing-dot" data-k="${s.key}" r="5" fill="${s.color}"
      stroke="var(--surface)" stroke-width="2" opacity="0"/>`
  }
  return SVG(W, H, body, 'id="swing-svg"')
}

const swingLegend = `<div class="legend">
  ${SWING_SERIES.map((s) => `<span class="item"><span class="swatch" style="background:${s.color}"></span>${s.label}</span>`).join('')}
  <span class="item"><span class="swatch box" style="background:rgba(255,255,255,0.09)"></span>within the statutory limit</span>
</div>`

function swingTable() {
  const f = plan('fairfax').swing, c = plan('crackland2').swing
  const rows = f.filter((d) => d.s % 100 === 0).map((d) => {
    const cc = c.find((x) => x.s === d.s)
    const ok = (v) => (Math.abs(v) <= 700 ? '' : ' style="color:var(--critical)"')
    return `<tr><td class="num">${spct(d.s)}</td>
      <td class="num"${ok(d.egBp)}>${spct(d.egBp)}</td><td class="num">${d.seatsA}</td>
      <td class="num"${ok(cc.egBp)}>${spct(cc.egBp)}</td><td class="num">${cc.seatsA}</td></tr>`
  }).join('')
  return `<table><thead><tr><th>swing</th><th>Fairfax gap</th><th>seats A</th>
    <th>Crackland v2 gap</th><th>seats A</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="font-size:0.8rem;margin-top:0.6rem">Values outside ±7.00% in red. Computed by the Lean theory, sampled every 100 bp.</p>`
}

function sharesTable(keys) {
  const head = keys.map((k) => `<th>${PLAN_LABEL[k]}</th>`).join('')
  const rows = Array.from({ length: 10 }, (_, i) =>
    `<tr><td class="num">${i}</td>${keys.map((k) => {
      const bp = plan(k).sharesBp[i]
      const safe = Math.abs(bp - 5000) > 500
      return `<td class="num">${(bp / 100).toFixed(2)}%${safe ? '' : ' <span style="color:var(--warning)">◆</span>'}</td>`
    }).join('')}</tr>`).join('')
  return `<table><thead><tr><th>district</th>${head}</tr></thead><tbody>${rows}</tbody></table>
    <p style="font-size:0.8rem;margin-top:0.6rem">Party A's share of the two-party vote.
    <span style="color:var(--warning)">◆</span> marks a seat that changes hands somewhere inside the ±5-point band.</p>`
}

/* -------------------------------------------------------------- verdict card */

function verdictCard(id, opts = {}) {
  const c = check(id)
  const s = c.summary || {}
  return `<div class="card tag ${c.outcome === 'verified' ? 'good' : c.outcome === 'refuted' ? 'bad' : 'warn'}">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:1rem;flex-wrap:wrap">
      <div>${statusChip(c.outcome)} <span class="pill">${esc(c.labelVal)}</span></div>
      <span class="cid">${c.durationMs} ms · proof ${cid(c.proofRef.cid)}</span>
    </div>
    <p style="margin:0.55rem 0 0.6rem;font-size:0.92rem">${esc(c.detail)}</p>
    ${opts.clauses === false ? '' : `<table style="margin-bottom:0.5rem">${clauseRows(c.clauses)}</table>`}
    ${opts.summary === false ? '' : `<div class="cid">seats A ${s.seatsA}/${s.districts} ·
      vote share ${pct(s.voteShareABp)} · efficiency gap ${spct(s.efficiencyGapBp)} ·
      pop deviation ${pct(s.popDevBp)}</div>`}
    ${opts.axioms ? `<div class="cid" style="margin-top:0.4rem">axioms: ${c.axioms.join(', ') || 'none'}</div>` : ''}
  </div>`
}

/* --------------------------------------------------------------- the slides */

const S = []
const add = (s) => S.push(s)

add({
  title: 'Title',
  html: () => `
    <div class="kicker">a demo</div>
    <h1>Proof-carrying regulation<br>on atproto</h1>
    <p class="lead" style="max-width:60ch">A regulator publishes machine-checkable requirements.
      Regulated actors publish machine-checkable proofs that their artifacts satisfy them.
      Anyone re-runs the check.</p>
    <p style="color:var(--ink-muted);font-size:0.95rem">Requirements in a Lean&nbsp;4 DSL ·
      artifacts and proofs as atproto records · verdicts as labels</p>
    <div style="margin-top:2rem" class="cid">
      every figure in this deck was captured from a real run · ${esc(D.toolchain)} ·
      ${D.counts.repos} repositories · ${D.counts.labels} signed labels
    </div>`,
  notes: `<p>The domain is redistricting, but the domain is not the point — it is a worked example
    chosen because the rules are numeric, contested, and public. The last two slides are about
    what it takes to move this to another domain.</p>
  <p><strong>Everything here is real.</strong> The CIDs, verdicts, axiom sets and generated Lean
    were captured from an actual run by <code>pnpm present</code>. Nothing is illustrative.</p>`,
})

add({
  title: 'The gap this closes',
  html: () => `
    <div class="kicker">the problem</div>
    <h2>Compliance is asserted. It is almost never demonstrated.</h2>
    <div class="cols">
      <div data-frag class="tight">
        <div class="card tag warn">
          <h3>Today</h3>
          <p>A regulator publishes a rule in prose. A regulated actor files a report saying it
            complies. Maybe an agency audits a sample.</p>
          <p>Everything downstream is <em>trust in an institution</em>. A journalist who doubts the
            finding has no way to check it — there is nothing to re-run.</p>
        </div>
      </div>
      <div data-frag class="tight">
        <div class="card tag good">
          <h3>Here</h3>
          <p>The rule is a machine-checkable proposition. The filing is a proof. The finding is
            <em>a computation over three content hashes</em>.</p>
          <p>Anyone who doubts it fetches the same three hashes, runs the same checker, and gets
            the same answer — or publishes a contradiction.</p>
        </div>
      </div>
    </div>
    <p data-frag style="margin-top:1.2rem">Formal verification alone does not need a protocol.
      A state could publish a Lean file and an agency could run it. What the protocol adds is that
      the rule, the artifact and the proof are all <em>content-addressed records with verifiable
      authorship, held in repositories their authors control</em> — which is what turns a verdict
      from an assertion into something reproducible.</p>`,
  frags: 3,
  notes: `<p>Resist the urge to sell formal methods here. The interesting claim is not "proofs are
    rigorous" — everyone knows that. It is that <strong>content addressing changes what a verdict
    is</strong>. Without it you still have an agency saying "we checked"; with it you have a
    computation anyone can repeat.</p>
  <p>If someone asks "why not just an API?" — because an API's answer is still the agency's word.
    The whole value is that the inputs are named by hash so a third party can disagree
    <em>specifically</em>.</p>`,
})

add({
  title: 'Who owns what',
  html: () => `
    <div class="kicker">the actors</div>
    <h2>Six repositories. Nobody writes into anyone else's.</h2>
    <figure>${svgOwnership()}</figure>
    <p data-frag>There is no shared database. Every collection is written by exactly one repository,
      and no actor can write into another's — the regulator cannot edit a state's map, a state
      cannot edit the rule it is measured against, and a verdict lives in the checker's own
      repository because it is <em>the checker's speech about someone else's record</em>.</p>
    <p data-frag>The regulator appears twice because it wears two hats: it writes the rules, and it
      runs a checker. <em>The second hat is not exclusive to it.</em> The watchdog has no standing
      and no permission, and publishes verdicts by exactly the same mechanism.</p>
    <p data-frag>The data authorities along the bottom are the least technical part of the diagram
      and the most important. A proof certifies that <em>the published numbers</em> satisfy a rule.
      It says nothing about whether those numbers are true — so where they came from is an explicit,
      attributable citation rather than an assumption. We come back to this.</p>`,
  frags: 3,
  notes: `<p>Point at the boxes as you go. The ownership story is the part people find surprising:
    there is no shared database and no privileged writer.</p>
  <p><strong>Watchdog</strong> is the one to dwell on. It has no standing, no accreditation, no
    permission. It publishes verdicts by the same mechanism the regulator does. Whether anyone
    believes it is a social question, not a protocol question — and that is the right place for
    that question to live.</p>`,
})

add({
  title: 'The record graph',
  html: (i) => `
    <div class="kicker">the artifacts</div>
    <h2>Six record types, and every edge is a hash</h2>
    <figure>${svgRecordGraph(i + 1)}</figure>
    <p>References are <code>strongRef</code> — URI <em>and</em> CID — never a bare URI.
      That single choice does most of the work: amend a requirement and every proof against the old
      one is mechanically detectable as stale; edit a certified map and the certification stops
      applying, without anyone having to notice the edit.</p>
    <p data-frag style="color:var(--ink-muted)">Note what is <em>absent</em> from
      <code>dev.provable.proof</code>: there is no field for the theorem statement. That omission is
      the load-bearing design decision, and we will come back to why.</p>`,
  frags: 6,
  notes: `<p>Build this up one edge at a time. The order matters: theory → requirement → plan →
    datasource → proof → verdict/label.</p>
  <p>The line to land: <strong>versioning is not a feature bolted on, it is what content addressing
    already gives you.</strong> There is no "invalidate the proofs" job to run. The hash moves and
    the references simply no longer resolve to what they pointed at.</p>`,
})

add({
  title: 'A requirement, as published',
  html: () => {
    const r = req('section2')
    return `
    <div class="kicker">the rules</div>
    <h2>The published text <em>is</em> the compiled source</h2>
    <div class="cols">
      <div>
        <h3>What the record carries</h3>
        <pre>${code(r.statement, 'lean')}</pre>
        <p style="font-size:0.88rem">Field <code>statement</code> of
          <code>${esc(r.ref.uri.split('/').slice(-2).join('/'))}</code><br>
          <span class="cid">${esc(r.ref.cid)}</span></p>
      </div>
      <div data-frag>
        <h3>Why that matters</h3>
        <p>This is not a paraphrase of a formal rule sitting somewhere else. It is the same text the
          theory package compiles — a Lean&nbsp;4 DSL whose surface syntax is the legal text.</p>
        <p>The usual failure mode of "formalise the regulation" projects is two artifacts that drift:
          the words everyone argues about and the formalisation nobody reads. Here there is
          <em>no second artifact</em>. A reader who checks that the record's <code>statement</code>
          matches the theory's source has checked everything.</p>
        <p>Elaborating it also emits a per-clause evaluator, so a refutation can name
          <em>which clause</em> failed. Same source, so the names in a verdict cannot fall out of
          step with the rule.</p>
      </div>
    </div>`
  },
  frags: 1,
  notes: `<p>Read the requirement out loud. It should sound like a rule, not like code — that is the
    entire test of the DSL.</p>
  <p>Two implementation details worth mentioning only if asked: every English word is a
    <em>non-reserved</em> token, because a plain atom would make <code>plan</code> and
    <code>gap</code> unusable as identifiers in every downstream file; and the <code>·</code> bullet
    is there because a syntax category cannot begin with a non-reserved word. It also happens to
    look like legal text.</p>`,
})

add({
  title: 'The binding problem',
  html: () => `
    <div class="kicker">the hard part nobody expects</div>
    <h2>A proof is about a Lean value. An artifact is bytes.</h2>
    <p>If those two can drift apart, a proof certifies nothing in particular. Something has to fix
      the correspondence — and <em>who</em> fixes it decides whether two honest checkers can
      disagree.</p>
    <div class="cols">
      <div data-frag>
        <div class="card tag bad">
          <h3>If the checker owns the decode</h3>
          <p>Two honest checkers reach opposite verdicts about the same CID and neither is wrong,
            because nothing published says which reading is correct.</p>
        </div>
      </div>
      <div data-frag>
        <div class="card tag good">
          <h3>So the theory owns it</h3>
          <pre style="margin:0.5rem 0 0">${code(JSON.stringify(D.theory.artifactTypes[0], null, 1), 'json')}</pre>
        </div>
      </div>
    </div>
    <p data-frag>All three are needed. The lexicon alone does not fix a representation; the Lean type
      alone does not fix which records are eligible. The checker's remaining share is a
      <em>transliteration</em> — field for field, no reordering, no defaulting, no decisions.</p>
    <p data-frag>One consequence worth stating: the decoder is <em>total</em>. A record that does not
      decode becomes a plan with no precincts, which fails the well-formedness clause every
      requirement opens with. So a malformed artifact cannot be certified — not by checker
      etiquette, but because <em>the obligation is false</em>. Submitting garbage means having to
      prove something untrue.</p>`,
  frags: 4,
  notes: `<p>This is the slide that separates a demo from a design. Most "put proofs on a ledger"
    proposals never address it, and it is where they quietly fail.</p>
  <p>The total-decoder trick is worth pausing on. The naive move is for the checker to reject
    undecodable records. That works until a checker forgets. Making the obligation <em>false</em>
    instead means the property is enforced by the mathematics rather than by everyone remembering
    to check.</p>`,
})

add({
  title: 'The maps',
  html: () => `
    <div class="kicker">the artifacts under test</div>
    <h2>Two states, three maps, identical geography</h2>
    ${mapLegend}
    <div class="cols-3" style="margin-top:0.4rem">
      ${['fairfax', 'crackland1', 'crackland2'].map((k) => `
        <div><h3>${PLAN_LABEL[k]}</h3>${svgMap(k)}
        <div class="cid" style="margin-top:0.5rem">${esc(plan(k).jurisdiction)}</div></div>`).join('')}
    </div>
    <p data-frag style="margin-top:1rem">Sixty precincts of a thousand voters each, ten districts of
      six. Population equality and contiguity never distinguish these maps, and all three give party
      A <em>54% of the statewide vote</em>. The districting is the only variable — which is what a
      districting rule is supposed to be about.</p>
    <p data-frag style="color:var(--ink-muted)">The two Crackland maps share precinct data exactly —
      the fills are identical and <em>only the white boundaries differ</em>. If the votes differed
      too, comparing them would prove nothing about maps.</p>`,
  frags: 2,
  table: () => sharesTable(['fairfax', 'crackland1', 'crackland2']),
  notes: `<p>Let people look. The middle map is visibly different — four dark-blue blocks and six
    orange ones, which is textbook packing and cracking.</p>
  <p>The right-hand map is the one to flag as suspicious-looking-but-innocent: neat columns, nothing
    obviously wrong. Hold that thought.</p>
  <p>Press <strong>t</strong> for the per-district numbers if someone asks.</p>`,
})

add({
  title: 'Publishing',
  html: () => `
    <div class="kicker">step 1 — the regulator</div>
    <h2>The theory and the rules go on the wire</h2>
    <table>
      <thead><tr><th>record</th><th>rkey</th><th>cid</th></tr></thead>
      <tbody>
        <tr><td><code>dev.provable.theory</code></td><td class="mono">redistrict-v1</td>
          <td class="cid">${esc(D.theory.ref.cid)}</td></tr>
        ${D.requirements.map((r) => `<tr><td><code>dev.provable.requirement</code></td>
          <td class="mono">${esc(r.ref.uri.split('/').pop())}</td>
          <td class="cid">${esc(r.ref.cid)}</td></tr>`).join('')}
        ${D.plans.map((p) => `<tr><td><code>gov.redistrict.plan</code></td>
          <td class="mono">${esc(p.ref.uri.split('/').pop())}</td>
          <td class="cid">${esc(p.ref.cid)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="cols" style="margin-top:1.2rem">
      <div data-frag><div class="card">
        <h3>The theory travels in-band</h3>
        <p style="font-size:0.9rem">The Lean package is a blob on the theory record, with a digest.
          Verification depends on the record and nothing else — no package registry has to stay
          online, or stay honest, for someone to reproduce a verdict in ten years.</p>
        <div class="cid">sha256 ${esc(D.theory.sourceDigest.slice(0, 32))}…</div>
      </div></div>
      <div data-frag><div class="card">
        <h3>The toolchain is pinned</h3>
        <p style="font-size:0.9rem">A checker that cannot honour <code>${esc(D.theory.toolchain)}</code>
          must decline rather than substitute a nearby version. Reporting <em>verified</em> from a
          different prover would be a claim about a proof nobody checked.</p>
      </div></div>
    </div>`,
  frags: 2,
  notes: `<p>Skim the table — the point is just that these are real records with real hashes, in six
    different repositories.</p>
  <p>The in-band theory blob is a small decision with a long tail. Ten years is not hypothetical for
    a districting map; they last a decade by construction.</p>`,
})

add({
  title: 'Fairfax proves § 2',
  html: () => `
    <div class="kicker">step 2 — a state complies</div>
    <h2>§ 2 is decidable, so the proof is one tactic</h2>
    <div class="cols">
      <div>
        <pre>${code('by decide', 'lean')}</pre>
        ${verdictCard('fairfax-s2', { axioms: true })}
      </div>
      <div data-frag>
        <h3>Be honest about what this is</h3>
        <p>Every clause of § 2 is a computation, so the kernel is doing arithmetic, not mathematics.
          A tier-1 proof is a <em>recomputation certificate</em>.</p>
        <p>That is still worth having — it is exact, it is reproducible by anyone, and it localises
          which criterion a map violates. But it does not need a proof assistant, and pretending
          otherwise would be the wrong sales pitch.</p>
        <p data-frag>The interesting requirement is the one that <em>cannot</em> be a computation.
          That is § 5, and it is next.</p>
      </div>
    </div>`,
  frags: 2,
  notes: `<p>Don't oversell tier 1. If you claim a proof assistant is needed to check five
    inequalities, the first competent person in the room stops believing you.</p>
  <p>The axiom line matters: <code>propext</code> only. No <code>sorryAx</code>, no native
    evaluation. We will see in a few slides why that line is checked by a build failure rather than
    read by eye.</p>`,
})

add({
  title: 'Crackland is refuted',
  html: () => `
    <div class="kicker">step 3 — a state does not comply</div>
    <h2>Refuted on exactly one named clause</h2>
    <div class="cols">
      <div>${svgMap('crackland1', { cell: 34 })}
        <div style="margin-top:0.8rem">${svgShares('crackland1', { w: 300 })}</div>
      </div>
      <div>${verdictCard('crackland1-s2')}
        <p data-frag style="margin-top:0.9rem">The map clears <em>every</em> structural clause. It is
          contiguous, population-equal and county-respecting. Four districts packed at 75% and six
          cracked below 50% put the efficiency gap at
          <em>${spct(check('crackland1-s2').summary.efficiencyGapBp)}</em>.</p>
        <p data-frag>Naming the clause is what makes this actionable. "The conjunction failed" tells
          a state nothing; "your efficiency gap is 18%" tells it what to change — and tells the
          public what the objection actually is.</p>
      </div>
    </div>`,
  frags: 2,
  table: () => sharesTable(['crackland1']),
  notes: `<p>The bar chart is the tell: four bars far right, six far left, nothing near the middle.
    That is packing and cracking drawn as data.</p>
  <p>The per-clause report comes from the same DSL source as the rule itself, so the clause names in
    the verdict cannot drift from the clause names in the statute.</p>`,
})

add({
  title: 'Crackland redraws',
  html: () => `
    <div class="kicker">step 4 — the twist</div>
    <h2>The revised map passes § 2 — with Fairfax's exact efficiency gap</h2>
    <div class="cols-3">
      <div><h3>Fairfax</h3>${svgMap('fairfax', { cell: 26 })}
        <div class="cid" style="margin-top:0.5rem">gap ${spct(check('fairfax-s2').summary.efficiencyGapBp)}
          · ${check('fairfax-s2').summary.seatsA}/10 seats</div></div>
      <div><h3>Crackland v2</h3>${svgMap('crackland2', { cell: 26 })}
        <div class="cid" style="margin-top:0.5rem">gap ${spct(check('crackland2-s2').summary.efficiencyGapBp)}
          · ${check('crackland2-s2').summary.seatsA}/10 seats</div></div>
      <div>${verdictCard('crackland2-s2', { summary: false })}</div>
    </div>
    <p data-frag style="margin-top:1rem">Same voters as before, redrawn. The gap is now
      <em>${spct(check('crackland2-s2').summary.efficiencyGapBp)}</em> — identical to Fairfax's, to
      the basis point. On the snapshot rule these two maps are
      <em>indistinguishable</em>.</p>
    <p data-frag>A rule that stops here has been satisfied. Whether it has been
      <em>complied with</em> is a different question.</p>`,
  frags: 2,
  table: () => sharesTable(['fairfax', 'crackland2']),
  notes: `<p>This is the hinge of the whole demo. Slow down.</p>
  <p>Two maps, same statewide vote, same seat count, same efficiency gap to the basis point. Any
    metric-based rule that measures the reference election alone certifies both. Ask the room what
    they would do next — the honest answer is "add more metrics", and the next slide is why that is
    not enough.</p>`,
})

add({
  title: 'The chart',
  html: () => `
    <div class="kicker">step 5 — the difference</div>
    <h2>What happens when opinion moves</h2>
    ${swingLegend}
    <figure>${svgSwing()}
      <figcaption>Efficiency gap against a uniform swing, computed by the Lean theory itself rather
        than re-derived for this chart. Crackland v1 is off this scale at +18.00%.</figcaption>
    </figure>
    <p data-frag>Fairfax's gap sawtooths and stays inside the limit across the whole band. Crackland
      v2's runs straight through it — <em>${spct(-1200)}</em> at a five-point swing toward B,
      <em>${spct(800)}</em> toward A.</p>`,
  frags: 1,
  table: swingTable,
  hover: true,
  notes: `<p>Let the picture do the work before you explain it. Hover along the lines if you want to
    call out values; press <strong>t</strong> for the table.</p>
  <p>The sawtooth is seats changing hands. Each near-vertical drop in the green line is one district
    flipping, which pushes the gap back the other way. The purple line has no drops at all, because
    nothing in that map ever changes hands inside the band.</p>
  <p>Both curves have the same slope everywhere: <strong>the gap moves at exactly twice the
    swing</strong> between seat changes. That is a theorem, not an observation from the chart.</p>`,
})

add({
  title: 'Safe seats',
  html: () => `
    <div class="kicker">why</div>
    <h2>The difference is competitiveness, not fairness</h2>
    <div class="cols">
      <div><h3>Fairfax — two seats in play</h3>${svgShares('fairfax')}</div>
      <div><h3>Crackland v2 — none</h3>${svgShares('crackland2')}</div>
    </div>
    <p data-frag>The shaded strip is the ±5-point band § 5 quantifies over. A district whose bar tip
      falls inside it changes hands somewhere in that range. Fairfax has two; Crackland v2's closest
      seat is safe by eleven points.</p>
    <p data-frag>So the theorem inverts the intuition. Between seat changes the gap drifts at twice
      the swing, so a map of safe seats drifts ten points across a five-point band and
      <em>cannot</em> satisfy any threshold under 10%. The only maps that hold are the ones where
      seats actually change hands.</p>
    <p data-frag><em>A durability requirement turns out to be a responsiveness requirement</em> — and
      the maps it rejects are the ones built out of safe seats. That is not what you would guess from
      reading the words, and it is the kind of thing formalising a rule is good for.</p>`,
  frags: 3,
  table: () => sharesTable(['fairfax', 'crackland2']),
  notes: `<p>This is the most interesting result in the project and it was not the plan. The
    requirement was written as "the gap stays bounded under swing", which sounds like a stability
    condition. Proving it showed that stability is only achievable through responsiveness.</p>
  <p>If someone objects that competitive districts are a policy choice rather than a legal
    requirement — yes, exactly. The formalisation surfaced a policy consequence the drafter did not
    write down. That is an argument <em>for</em> formalising, not against.</p>`,
})

add({
  title: 'Why a proof',
  html: () => `
    <div class="kicker">the certificate</div>
    <h2>Six evaluations standing in for a thousand</h2>
    ${swingLegend}
    <figure>${svgSwing({ h: 300, markers: true })}
      <figcaption>Circles mark the six breakpoints of Fairfax's certificate. Two pairs are adjacent
        integers and land on the same pixel — that is the point of them.</figcaption></figure>
    <div class="cols" data-frag>
      <div>
        <p style="font-size:0.92rem">The gap is affine in the swing except for a step function that
          counts turnout in seats party A holds. On any stretch where no seat changes hands the gap
          is monotone, so its extremes are its endpoints.</p>
        <p style="font-size:0.92rem">So the prover supplies a <em>certificate</em>: breakpoints
          spanning the band, where consecutive entries either agree on who holds what, or are
          adjacent integers. Both conditions are decidable.</p>
      </div>
      <div>
        <pre>${code(`⟨by decide,
   Redistrict.swingRobust_of_chain
     [${D.breakpoints.slice(1).join(', ')}]
     (by decide) (by decide) (by decide)⟩`, 'lean')}</pre>
        <p style="font-size:0.88rem"><strong>The division of labour is the point.</strong>
          <code>swingRobust_of_chain</code> is general mathematics, written once, by the party that
          wrote the rule. The state contributes a list and three decidable facts about its own map.</p>
      </div>
    </div>
    <p data-frag style="color:var(--ink-muted)">1001 whole-basis-point swings in the band; six
      breakpoints. Widening the band barely lengthens the certificate — two entries per seat that
      changes hands, so at most 22 on a ten-district map however wide it gets — against a sweep that
      grows without bound.</p>`,
  frags: 2,
  notes: `<p>This is the answer to "couldn't you just check every swing?" At ±5 points you could, if
    slowly. At ±50 you could not, and the certificate is the same length.</p>
  <p>The adjacent-integer case is not a convenience — the step function jumps at a seat change, so a
    constant-holdings step can never straddle one. Because swings are whole basis points, stepping
    over a jump one integer at a time is <em>exact</em>, not an approximation.</p>
  <p>If there is one slide to remember for adapting this to another domain, it is this one:
    <strong>regulators publish lemmas, regulated actors supply certificates.</strong></p>`,
})

add({
  title: 'Crackland fails § 5',
  html: () => `
    <div class="kicker">step 6 — the verdict § 2 could not reach</div>
    <h2>The same certificate, on the map that cannot support it</h2>
    <div class="cols">
      <div>${verdictCard('crackland2-s5')}</div>
      <div data-frag>
        <h3>Three-way, on purpose</h3>
        <p>Note the clause status. A tier-1 clause is decidable, so evaluation settles it either way.
          A tier-2 clause quantifies over an unbounded range: evaluation can <em>refute</em> it by
          exhibiting a swing that breaks the bound, but it can never confirm it.</p>
        <p>So the checker reports <code>holds</code>, <code>refuted</code>, or
          <code>undecided</code> — never a guess. Collapsing <code>undecided</code> into
          <code>refuted</code> would accuse every unproved map of a violation; collapsing it into
          <code>holds</code> would certify them. Both are lies about what was checked.</p>
        <p data-frag style="color:var(--ink-muted)">Fairfax's § 5 verdict is <em>verified</em> with
          its swing clause reported <code>undecided</code> — evaluation could not settle it, and the
          proof did.</p>
      </div>
    </div>`,
  frags: 2,
  notes: `<p>The three-way status is a small thing that people notice and like. Most compliance
    tooling has two states and lies in one direction or the other.</p>
  <p>Contrast the two § 5 verdicts explicitly: same clause, same evaluator, one <em>refuted</em> by a
    counterexample and one <em>undecided</em> until a proof arrived.</p>`,
})

add({
  title: 'The attack',
  html: () => `
    <div class="kicker">the part that makes it not theatre</div>
    <h2>What stops a state from proving something easier?</h2>
    <pre>${code(`-- If the prover supplied the statement:
def NotGerrymandered (_ : Plan) : Prop := True
theorem mine : NotGerrymandered myPlan := trivial   -- ✓ verified`, 'lean')}</pre>
    <p data-frag>Every label the system issues would be worthless — not because the proof is wrong,
      but because <em>nobody checked what was proved</em>. Any design that accepts a statement from
      the party being regulated has this hole, and it is not fixable downstream.</p>
    <p data-frag>So the proof record has no statement field. The checker derives the obligation from
      the requirement CID and the artifact CID and <em>writes the signature line itself</em>:</p>
    <div class="cols" data-frag>
      <div>
        <h3>Statement module — no prover text</h3>
        <pre>${code(`namespace Obligation

def raw : Redistrict.Codec.Raw :=
  { districtCount := 10
    precincts := [ … 60 precincts … ]
    adjacency := [ … 104 edges … ]
    assignment := [ … ] }

def plan : Redistrict.Plan :=
  Redistrict.Codec.decodePlanD raw

abbrev stmt : Prop :=
  Redistrict.FairDistrictingAct.section2 plan`, 'lean')}</pre>
      </div>
      <div>
        <h3>Proof module — payload spliced in one place</h3>
        <pre>${code(`import Obligation.Statement

namespace Obligation.Prover
-- ↓↓↓ PROVER PAYLOAD: auxiliary lemmas ↓↓↓
-- (none supplied)
-- ↑↑↑ END PROVER PAYLOAD ↑↑↑
end Obligation.Prover

open Obligation.Prover in
theorem Obligation.proof : Obligation.stmt :=
-- ↓↓↓ PROVER PAYLOAD: proof term ↓↓↓
by decide
-- ↑↑↑ END PROVER PAYLOAD ↑↑↑

#assert_axioms Obligation.proof`, 'lean')}</pre>
      </div>
    </div>`,
  frags: 3,
  notes: `<p>Ask the room how they would attack the system before revealing this. Someone usually
    gets it.</p>
  <p>Show that the statement module is compiled to a <code>.olean</code> <em>before</em> the prover's
    text is elaborated at all. The prover cannot redefine <code>Obligation.stmt</code> because it is
    already declared in an imported module — that is a duplicate-declaration error — and the
    signature the checker wrote still refers to the imported one. Both fire; either would do.</p>`,
})

add({
  title: 'Four defences',
  html: () => `
    <div class="kicker">and how we know</div>
    <h2>Four defences, tested one at a time</h2>
    <table>
      <thead><tr><th>defence</th><th>stops</th><th>tested by</th></tr></thead>
      <tbody>
        <tr><td><strong>Separate statement module</strong><br>
          <span class="cid">compiled before any prover text</span></td>
          <td>choosing what to prove</td><td class="mono">cannot redefine the obligation</td></tr>
        <tr><td><strong>Import, not inclusion</strong><br>
          <span class="cid">redefinition is a duplicate declaration</span></td>
          <td>shadowing the statement</td><td class="mono">cannot redefine the obligation</td></tr>
        <tr><td><strong><code>#assert_axioms</code></strong><br>
          <span class="cid">audit turned into a build failure</span></td>
          <td>holes, native evaluation, new axioms</td>
          <td class="mono">fails the build when the proof is a hole</td></tr>
        <tr><td><strong>Lexical screen</strong><br>
          <span class="cid">defence in depth only</span></td>
          <td>nothing on its own</td><td class="mono">9 rejection cases</td></tr>
      </tbody>
    </table>
    <div class="cols" style="margin-top:1.2rem">
      <div data-frag><div class="card tag good">
        <h3>Why the audit is a build failure</h3>
        <p style="font-size:0.9rem"><code>#print axioms</code> reports to stdout, and a checker built
          on scraping stdout <em>fails open</em>: change the format, drop the output, mis-parse a
          name, and an unproved theorem sails through. <code>#assert_axioms</code> runs the same
          query and exits nonzero.</p>
      </div></div>
      <div data-frag><div class="card tag warn">
        <h3>The screen is not what keeps this sound</h3>
        <p style="font-size:0.9rem">Anything that would be unsound if it slipped past the denylist is
          a design bug. So the axiom test deliberately <em>bypasses</em> the screen and drives Lean
          directly — a suite that only tested the denylist would pass with the audit deleted.</p>
      </div></div>
    </div>
    <p data-frag style="color:var(--ink-muted)">Also covered: artifact swapping, injection through
      the requirement's <code>leanProp</code> field, a toolchain the theory does not name, an
      artifact of the wrong type, post-hoc mutation of a certified map, and a swing certificate that
      does not span its band. 44 tests, all green.</p>`,
  frags: 3,
  notes: `<p>The point of this slide is methodological, not technical: <strong>each defence is tested
    with the others routed around</strong>. Layered defences rot silently when the cheapest one
    always fires first.</p>
  <p>If asked what is <em>not</em> defended: elaborating a stranger's Lean is running their code. The
    checker enforces a timeout and nothing else. Every verdict says so in its
    <code>checker.sandbox</code> field rather than letting a reader assume otherwise.</p>`,
})

add({
  title: 'Labels and verdicts',
  html: () => `
    <div class="kicker">the output</div>
    <h2>A label cannot carry evidence, so two records</h2>
    <div class="cols">
      <div data-frag><div class="card">
        <h3>The label — an index</h3>
        <pre style="margin:0.4rem 0 0.6rem">${code(JSON.stringify({
          ver: 1, src: actor('fedgov').did.slice(0, 24) + '…',
          uri: 'at://…/dev.provable.proof/…', cid: check('crackland1-s2').proofRef.cid.slice(0, 20) + '…',
          val: 'proof-refuted', cts: '2026-01-07T12:00:00Z',
        }, null, 1), 'json')}</pre>
        <p style="font-size:0.88rem">The spec constrains <code>val</code> to a bare kebab-case token
          of at most 128 bytes. No fields. No structure. It propagates cheaply to everyone
          subscribed to a labeler — and that is all it can do.</p>
      </div></div>
      <div data-frag><div class="card">
        <h3>The verdict — the receipt</h3>
        <table style="margin-top:0.4rem">
          <tr><td>outcome</td><td class="mono">${esc(check('crackland1-s2').outcome)}</td></tr>
          <tr><td>failing clause</td><td class="mono">${esc(check('crackland1-s2').failedClause)}</td></tr>
          <tr><td>obligation digest</td><td class="cid">${cid(check('crackland1-s2').obligationDigest, 16)}</td></tr>
          <tr><td>axioms</td><td class="mono">${esc(check('fairfax-s5').axioms.join(', '))}</td></tr>
          <tr><td>sandbox</td><td class="mono">host-process (timeout only)</td></tr>
          <tr><td>log</td><td class="mono">blob + sha256</td></tr>
        </table>
      </div></div>
    </div>
    <p data-frag>The label's subject is the proof's URI <em>and</em> CID, so rewriting the proof drops
      the label rather than following the edit to text nobody checked. And the verdict lives in the
      <em>checker's</em> repository, because a verdict is the checker's speech about someone else's
      record.</p>`,
  frags: 3,
  notes: `<p>The 128-byte constraint is a genuine protocol limit, and working with it rather than
    around it produced a better design: a cheap index that propagates plus a rich receipt that
    doesn't.</p>
  <p><code>obligationDigest</code> is the field to point at — it is what makes two independent
    verdicts comparable, and it sets up the next slide.</p>`,
})

add({
  title: 'Anyone can check',
  html: () => `
    <div class="kicker">step 7 — the payoff</div>
    <h2>An unaffiliated party re-checks and agrees</h2>
    <table style="max-width:820px">
      <tr><td>regulator's obligation digest</td>
        <td class="mono" style="color:var(--good)">${esc(D.independent.regulatorDigest)}</td></tr>
      <tr><td>${esc(D.independent.checker)}'s obligation digest</td>
        <td class="mono" style="color:var(--good)">${esc(D.independent.watchdogDigest)}</td></tr>
      <tr><td>outcome</td><td>${statusChip(D.independent.outcome)}</td></tr>
    </table>
    <p data-frag style="margin-top:1.1rem">Identical, byte for byte. Two parties with nothing in
      common demonstrably checked <em>the same theorem</em> and reached the same conclusion.</p>
    <p data-frag>The watchdog has no standing, no accreditation and no permission. It read three CIDs
      and published its own verdict into its own repository. A reader compares sources rather than
      trusting one — and if the two digests had <em>differed</em>, that would itself be the finding:
      a bug, or a disagreement about decoding, and either is worth knowing about.</p>
    <p data-frag style="color:var(--ink-muted)">This is the slide that justifies the protocol. Every
      other property — the DSL, the theorem, the axiom audit — could live inside one agency's
      pipeline. This one cannot.</p>`,
  frags: 3,
  notes: `<p>Land this hard. It is the answer to "why not just build this as an internal tool".</p>
  <p>The failure case is as interesting as the success case: differing digests would mean the two
    checkers disagree about what the record <em>means</em>, and the design makes that disagreement
    visible and specific instead of leaving two conflicting verdicts with no way to tell why.</p>`,
})

add({
  title: 'Staleness',
  html: () => `
    <div class="kicker">step 8 — versioning for free</div>
    <h2>One number changes. The certification stops applying.</h2>
    <p>One precinct's population edited from 1000 to 1001, long after the map was certified.</p>
    <table style="max-width:900px">
      <tr><td>before</td><td class="cid">${esc(D.staleness.before)}</td></tr>
      <tr><td>after</td><td class="cid">${esc(D.staleness.after)}</td></tr>
      <tr><td>re-check</td><td>${statusChip(D.staleness.outcome)}</td></tr>
    </table>
    <p data-frag style="margin-top:1.1rem">The proof still elaborates. It is simply no longer about
      anything that is published. Nobody had to notice the edit, and no invalidation job had to
      run — the reference was a hash, and the hash moved.</p>
    <p data-frag>The same mechanism handles the regulator's side. Amend a requirement and every proof
      against the old CID becomes detectably stale rather than silently reinterpreted as a proof of
      the new rule. <code>proof-stale</code> is a distinct label from <code>proof-refuted</code>,
      because "this is out of date" and "this is a violation" are different accusations.</p>`,
  frags: 2,
  notes: `<p>Emphasise that <em>nothing was invalidated</em>. There is no revocation list and no
    background job. This falls out of using strongRefs everywhere, which cost nothing.</p>
  <p>The stale/refuted distinction is a small fairness point that matters in a regulatory setting:
    a state whose map is out of date has not been accused of gerrymandering.</p>`,
})

add({
  title: 'What it does not establish',
  html: () => `
    <div class="kicker">the boundary</div>
    <h2>A proof says the <em>published numbers</em> satisfy the rule</h2>
    <p>It says nothing about whether those are the real numbers. Populations and vote tallies could
      be fabricated and every proof about them would still be valid — and worthless.</p>
    <p data-frag>Nor does the theory have any geometry. Contiguity is defined against the adjacency
      graph <em>the plan's own author supplies</em>, so a plan that misstates which precincts touch
      can prove contiguity of a map that is not contiguous.</p>
    <div class="cols" data-frag style="margin-top:1rem">
      <div><div class="card tag warn">
        <h3>This is not a gap to close by better proving</h3>
        <p style="font-size:0.9rem">It is where formal methods stop. Every system of this kind has
          this boundary; most leave it implicit, which is how a reader ends up believing a proof
          covers more than it does.</p>
      </div></div>
      <div><div class="card tag good">
        <h3>So make it a visible edge</h3>
        <p style="font-size:0.9rem">The plan lexicon requires <code>censusSource</code> and
          <code>returnsSource</code> strongRefs to records from <em>separate authorities</em>. The
          honest-input assumption becomes attributable and localised instead of buried.</p>
      </div></div>
    </div>
    <p data-frag style="margin-top:1rem;color:var(--ink-muted)">Whether those authorities are
      credible is a question for humans. The point is that the question is now askable, and points
      somewhere specific. Adjacency should get the same treatment — a <code>geometrySource</code>
      is the obvious next field.</p>`,
  frags: 3,
  notes: `<p>Do not skip this slide, and do not rush it. In a room of skeptics it buys more
    credibility than any of the technical slides.</p>
  <p>The framing to use: the system does not eliminate trust, it <em>relocates</em> it — from "trust
    that the agency checked" to "trust that the census is honest". The second is a much smaller,
    much more scrutinised surface, and it is now named in the record.</p>`,
})

add({
  title: 'Adapting this',
  html: () => `
    <div class="kicker">other domains</div>
    <h2>Five slots. Swap the fillers.</h2>
    <table style="font-size:0.8rem">
      <thead><tr><th style="width:15%">slot</th><th>redistricting</th><th>emissions permits</th>
        <th>bank capital</th><th>clinical trials</th></tr></thead>
      <tbody>
        <tr><td><strong>artifact</strong><br><span class="cid">lexicon + Lean type + decoder</span></td>
          <td>districting plan</td><td>facility &amp; process inventory</td>
          <td>position-level balance sheet</td><td>protocol + analysis plan</td></tr>
        <tr><td><strong>tier-1 clauses</strong><br><span class="cid">decidable; recomputation</span></td>
          <td>contiguity, population equality, county splits, efficiency gap</td>
          <td>mass balance closes, every source reported, totals under cap</td>
          <td>capital ratios, concentration and leverage limits</td>
          <td>registered endpoints match analysed ones, no post-hoc outcomes</td></tr>
        <tr><td><strong>tier-2 obligation</strong><br><span class="cid">quantifies over the unenumerable</span></td>
          <td>gap stays bounded under <em>every</em> swing in a band</td>
          <td>emissions stay under cap across <em>every</em> operating profile in the permitted envelope</td>
          <td>solvency holds under <em>every</em> scenario in a stress family</td>
          <td>type-I error stays under α across <em>every</em> stopping rule the trial could have used</td></tr>
        <tr><td><strong>regulator's lemma</strong><br><span class="cid">published once, in the theory</span></td>
          <td>gap is affine between seat changes</td>
          <td>emissions monotone in load within the envelope</td>
          <td>stressed loss is subadditive across the family</td>
          <td>sequential-testing bound</td></tr>
        <tr><td><strong>actor's certificate</strong><br><span class="cid">cheap, decidable, per-artifact</span></td>
          <td>the swings where a seat changes hands</td>
          <td>the vertices of the operating envelope</td>
          <td>the binding scenario per exposure class</td>
          <td>the realised interim analyses</td></tr>
      </tbody>
    </table>
    <p data-frag style="margin-top:1rem">The shape recurs because the underlying problem does: a
      snapshot rule is gameable, the honest rule quantifies over a space too large to enumerate, and
      the regulator is the only party with both the expertise and the standing to carry the general
      argument.</p>`,
  frags: 1,
  notes: `<p>Pick whichever column the room cares about and walk it top to bottom. The redistricting
    column is there as the worked example, not the destination.</p>
  <p>The row to dwell on is the last two. <strong>Regulators publish lemmas; regulated actors supply
    certificates.</strong> That division is what makes this scale — the hard mathematics is done
    once, by the party writing the rule, and each filer contributes something cheap and specific to
    their own situation.</p>
  <p>The emissions column is the most immediately plausible: envelope-based permits already work this
    way informally, with the "proof" being a spreadsheet nobody re-runs.</p>`,
})

add({
  title: 'Does your domain fit',
  html: () => `
    <div class="kicker">before you try it</div>
    <h2>What has to be true — and when this is the wrong tool</h2>
    <div class="cols">
      <div data-frag>
        <div class="card tag good">
          <h3>Fits</h3>
          <ul style="margin-bottom:0">
            <li>The artifact can be <em>published as data</em>, not as a PDF.</li>
            <li>There is a numeric core people already argue about.</li>
            <li>At least one obligation quantifies over something you cannot enumerate — otherwise a
              dashboard is cheaper and just as good.</li>
            <li>The regulator can carry the general lemma.</li>
            <li>Someone other than the regulator has a motive to re-check. Without that, the
              protocol is doing no work.</li>
          </ul>
        </div>
      </div>
      <div data-frag>
        <div class="card tag bad">
          <h3>Doesn't</h3>
          <ul style="margin-bottom:0">
            <li>The hard part is whether the <em>inputs</em> are honest. Proof does not help; audit
              does.</li>
            <li>The rule turns on a judgement call — "reasonable", "material", "in good faith".
              Formalising these does not make them precise, it just moves the argument to whoever
              wrote the formalisation.</li>
            <li>The artifact is a narrative.</li>
            <li>Nobody can be compelled to publish. A voluntary scheme selects for the compliant.</li>
          </ul>
        </div>
      </div>
    </div>
    <p data-frag style="margin-top:1rem">The temptation is to formalise the whole statute. Resist it.
      The value is concentrated in the few clauses that are <em>numeric, contested, and currently
      unverifiable</em> — and a system that covers those honestly is worth more than one that claims
      to cover everything.</p>`,
  frags: 3,
  notes: `<p>The "doesn't fit" column is the one that earns trust. Anyone who has watched a
    formal-methods pitch has seen someone claim a technique generalises to everything.</p>
  <p>The judgement-call point is the deepest objection and worth conceding fully: formalising
    "reasonable" does not make it precise, it relocates the discretion to whoever chose the
    formalisation — and hides it, which is worse than leaving it in the open.</p>`,
})

add({
  title: 'Close',
  html: () => `
    <div class="kicker">summary</div>
    <h2>What to take away</h2>
    <ul style="max-width:74ch">
      <li><strong>Content addressing changes what a verdict is.</strong> Three CIDs and a checker
        anyone can run turns "the agency says so" into a computation you can repeat or contradict.</li>
      <li><strong>The prover must never supply the statement.</strong> Every other defence is
        secondary; a system without this one is producing labels, not findings.</li>
      <li><strong>Publish the decoder with the rule.</strong> Otherwise two honest checkers can
        disagree about what a record means and neither is wrong.</li>
      <li><strong>Regulators publish lemmas; regulated actors supply certificates.</strong> That
        division is what makes the unenumerable obligations tractable at scale.</li>
      <li><strong>Say what the proof does not cover.</strong> The trust boundary belongs in the
        record graph, not in a footnote.</li>
    </ul>
    <div class="cols" style="margin-top:1.6rem">
      <div><div class="card">
        <h3>Run it</h3>
        <pre style="margin:0.4rem 0 0">cd lean &amp;&amp; lake build
pnpm install
pnpm demo     <span class="c"># the full story, ~60s</span>
pnpm test     <span class="c"># 44 tests, incl. adversarial</span>
pnpm present  <span class="c"># regenerate this deck's data</span></pre>
      </div></div>
      <div><div class="card">
        <h3>Read it</h3>
        <p style="font-size:0.9rem"><code>DESIGN.md</code> — architecture, the binding problem, the
          four defences, and §§ 4 and 11 on what this does not do and where it is incomplete.</p>
        <p style="font-size:0.9rem"><code>lean/Redistrict/Swing.lean</code> — the durability theorem
          and the certificate.</p>
      </div></div>
    </div>`,
  notes: `<p>If you only keep one line: <strong>a verdict here is not an authority's assertion, it is
    a computation with named inputs.</strong> Everything else is in service of making that true.</p>
  <p>Offer the adversarial test file to anyone who wants to poke at the trust model — it is the most
    convincing artifact in the repository.</p>`,
})

/* ------------------------------------------------------------------ engine */

const stage = document.getElementById('slide')
const notesEl = document.getElementById('notes')
const notesBody = document.getElementById('notes-body')
const counter = document.getElementById('counter')
const prog = document.querySelector('#progress > i')
const overview = document.getElementById('overview')
const help = document.getElementById('help')
const tip = document.getElementById('tip')

let si = 0
let fi = 0
let tableOn = false

function render() {
  const s = S[si]
  stage.innerHTML = tableOn && s.table
    ? `<div class="kicker">table view</div><h2>${esc(s.title)}</h2>${s.table()}`
    : s.html(fi)
  stage.scrollTop = 0
  const frags = [...stage.querySelectorAll('[data-frag]')]
  frags.forEach((el, i) => el.classList.toggle('on', i < fi))
  notesBody.innerHTML = s.notes || '<p style="color:var(--ink-muted)">—</p>'
  counter.textContent = `${si + 1} / ${S.length}`
  prog.style.width = `${((si + 1) / S.length) * 100}%`
  ;[...overview.children].forEach((b, i) => b.classList.toggle('cur', i === si))
  if (s.hover && !tableOn) wireSwingHover()
  writeHash()
}

function next() {
  const s = S[si]
  if (!tableOn && fi < (s.frags || 0)) { fi++; render(); return }
  if (si < S.length - 1) { si++; fi = 0; tableOn = false; render() }
}
function prev() {
  if (!tableOn && fi > 0) { fi--; render(); return }
  if (si > 0) { si--; fi = S[si].frags || 0; tableOn = false; render() }
}
function go(i) { si = Math.max(0, Math.min(S.length - 1, i)); fi = 0; tableOn = false; render() }

/* Deep links: `#7` is slide 7, `#7.2` is slide 7 with two fragments revealed.
   Useful for jumping mid-talk, and it is how the deck gets screenshotted. */
function readHash() {
  const m = /^#(\d+)(?:\.(\d+))?$/.exec(location.hash)
  if (!m) return false
  si = Math.max(0, Math.min(S.length - 1, +m[1] - 1))
  fi = Math.min(S[si].frags || 0, m[2] ? +m[2] : 0)
  tableOn = false
  return true
}
function writeHash() {
  const h = fi ? `#${si + 1}.${fi}` : `#${si + 1}`
  if (location.hash !== h) history.replaceState(null, '', h)
}
window.addEventListener('hashchange', () => { if (readHash()) render() })

document.addEventListener('keydown', (e) => {
  if (help.classList.contains('on') && e.key !== '?') { help.classList.remove('on'); return }
  switch (e.key) {
    case 'ArrowRight': case ' ': case 'PageDown': case 'ArrowDown': e.preventDefault(); next(); break
    case 'ArrowLeft': case 'PageUp': case 'ArrowUp': e.preventDefault(); prev(); break
    case 'Home': go(0); break
    case 'End': go(S.length - 1); break
    case 'n': case 'N': notesEl.classList.toggle('on'); break
    case 't': case 'T': if (S[si].table) { tableOn = !tableOn; render() } break
    case 'o': case 'O': overview.classList.toggle('on'); break
    case 'f': case 'F':
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen()
      break
    case '?': help.classList.toggle('on'); break
    case 'Escape': overview.classList.remove('on'); help.classList.remove('on'); break
    default:
      if (/^[0-9]$/.test(e.key)) { /* reserved */ }
  }
})

// Click the right two-thirds to advance, the left third to go back.
document.getElementById('stage').addEventListener('click', (e) => {
  if (e.target.closest('a, pre, table')) return
  const x = e.clientX / window.innerWidth
  x < 0.33 ? prev() : next()
})

/* Crosshair + tooltip for the swing chart. Values are also direct-labelled at
   the line ends and available in the table view, so this enhances rather than
   gates. */
function wireSwingHover() {
  const svg = document.getElementById('swing-svg')
  if (!svg) return
  const hit = svg.querySelector('#swing-hit')
  const cross = svg.querySelector('#swing-cross')
  const dots = [...svg.querySelectorAll('.swing-dot')]
  const L = +hit.dataset.l, T = +hit.dataset.t, Wp = +hit.dataset.w, Hp = +hit.dataset.h
  const xd = [-500, 500], yd = [-1350, 950]
  const inv = (px) => xd[0] + (px / Wp) * (xd[1] - xd[0])
  const Y = (v) => T + (1 - (v - yd[0]) / (yd[1] - yd[0])) * Hp
  const X = (v) => L + ((v - xd[0]) / (xd[1] - xd[0])) * Wp

  const move = (ev) => {
    const box = svg.getBoundingClientRect()
    const scale = svg.viewBox.baseVal.width / box.width
    const sx = (ev.clientX - box.left) * scale - L
    if (sx < 0 || sx > Wp) return hide()
    const target = inv(sx)
    const rows = SWING_SERIES.map((s) => {
      const series = plan(s.key).swing
      const d = series.reduce((a, b) => (Math.abs(b.s - target) < Math.abs(a.s - target) ? b : a))
      return { s, d }
    })
    const sv = rows[0].d.s
    cross.setAttribute('x1', X(sv)); cross.setAttribute('x2', X(sv))
    cross.setAttribute('opacity', '1')
    dots.forEach((dot, i) => {
      dot.setAttribute('cx', X(rows[i].d.s)); dot.setAttribute('cy', Y(rows[i].d.egBp))
      dot.setAttribute('opacity', '1')
    })
    tip.style.display = 'block'
    tip.style.left = Math.min(ev.clientX + 14, window.innerWidth - 210) + 'px'
    tip.style.top = ev.clientY - 10 + 'px'
    tip.innerHTML = `<div class="row" style="margin-bottom:0.3rem;color:var(--ink-muted)">swing <b>${spct(sv)}</b></div>` +
      rows.map((r) => `<div class="row"><span class="sw" style="background:${r.s.color}"></span>
        ${r.s.label} <b>${spct(r.d.egBp)}</b>
        <span style="color:var(--ink-muted)">· ${r.d.seatsA} seats</span></div>`).join('')
  }
  const hide = () => {
    tip.style.display = 'none'
    cross.setAttribute('opacity', '0')
    dots.forEach((d) => d.setAttribute('opacity', '0'))
  }
  hit.addEventListener('mousemove', move)
  hit.addEventListener('mouseleave', hide)
}

// Overview
overview.innerHTML = S.map((s, i) =>
  `<button data-i="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span>${esc(s.title)}</button>`).join('')
overview.addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (b) { overview.classList.remove('on'); go(+b.dataset.i) }
})

// `?notes` opens the presenter notes on load — handy on a second screen, and how
// the deck gets screenshotted with them visible.
if (new URLSearchParams(location.search).has('notes')) notesEl.classList.add('on')

readHash()
render()
