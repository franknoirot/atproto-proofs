/**
 * Populate the network: the regulator's theory and requirements, two states'
 * maps, and the datasets they cite.
 *
 * Everything published here is published the way a real participant would
 * publish it — signed into its own author's repository, referenced across
 * repositories by CID. The regulator does not hold the states' maps and the
 * states do not hold the regulator's rules; the only thing joining them is a
 * hash, which is the property that makes any of this checkable by a third party.
 */

import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { Network, type Actor, type StrongRef } from '../atp/network.js'
import { CRACKLAND_V1, CRACKLAND_V2, FAIRFAX, type SeedPlan } from './geography.js'

/**
 * Fixed keys, so a demo run is reproducible.
 *
 * Every DID and every CID below is a deterministic function of this file. That
 * is what lets the README quote a CID, and what makes "run it yourself and
 * compare" checkable rather than rhetorical.
 */
const KEYS = {
  fedgov: '01'.repeat(32),
  census: '02'.repeat(32),
  elections: '03'.repeat(32),
  fairfax: '04'.repeat(32),
  crackland: '05'.repeat(32),
  watchdog: '06'.repeat(32),
}

/** Fixed timestamp, for the same reason. */
const T = (n: number) => new Date(Date.UTC(2026, 0, 5 + n, 12, 0, 0)).toISOString()

export type Seeded = {
  net: Network
  fedgov: Actor
  fairfax: Actor
  crackland: Actor
  watchdog: Actor
  theory: StrongRef
  section2: StrongRef
  section5: StrongRef
  plans: Record<'fairfax' | 'crackland1' | 'crackland2', StrongRef>
}

/**
 * Pack the theory's Lean sources into deterministic bytes.
 *
 * A gzipped JSON object keyed by relative path, with the keys sorted. Not a tar
 * — tar records timestamps and permissions, so two packs of identical sources
 * would differ, and a `sourceDigest` that changes when nothing changed is a
 * digest nobody can use.
 */
export function packTheory(leanDir: string): { bytes: Uint8Array; digest: string } {
  const files: Record<string, string> = {}
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry === '.lake' || entry === 'build') continue
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.lean') || entry.endsWith('.toml') || entry === 'lean-toolchain') {
        files[relative(leanDir, full)] = readFileSync(full, 'utf8')
      }
    }
  }
  walk(leanDir)
  const ordered = Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)))
  const bytes = gzipSync(Buffer.from(JSON.stringify(ordered), 'utf8'), { level: 9 })
  return { bytes, digest: createHash('sha256').update(bytes).digest('hex') }
}

function planRecord(
  plan: SeedPlan,
  censusSource: StrongRef,
  returnsSource: StrongRef,
  createdAt: string,
): Record<string, unknown> {
  return {
    $type: 'gov.redistrict.plan',
    name: plan.name,
    jurisdiction: plan.jurisdiction,
    districtCount: plan.districtCount,
    precincts: plan.precincts,
    adjacency: plan.adjacency,
    assignment: plan.assignment,
    censusSource,
    returnsSource,
    createdAt,
  }
}

export async function seed(leanDir: string): Promise<Seeded> {
  const net = new Network()

  const fedgov = await net.createActor('fda.gov.example', KEYS.fedgov)
  const census = await net.createActor('census.gov.example', KEYS.census)
  const elections = await net.createActor('eac.gov.example', KEYS.elections)
  const fairfax = await net.createActor('fairfax.gov.example', KEYS.fairfax)
  const crackland = await net.createActor('crackland.gov.example', KEYS.crackland)
  const watchdog = await net.createActor('watchdog.example', KEYS.watchdog)

  /* ---- the datasets a map's numbers come from ---------------------------- */
  // Nothing in the proof pipeline verifies these. They exist so that the
  // assumption every proof rests on — that the populations and vote counts are
  // honest — is a visible, attributable edge in the record graph rather than an
  // unexamined gap. A formal proof about fabricated numbers is a valid proof
  // about fabricated numbers.
  const censusSource = await census.put('gov.redistrict.datasource', 'decennial-2025', {
    $type: 'gov.redistrict.datasource',
    kind: 'census',
    title: '2025 Decennial Census, precinct-level population',
    digest: 'sha256:' + createHash('sha256').update('demo-census-2025').digest('hex'),
    publishedAt: T(0),
  })
  const returnsSource = await elections.put('gov.redistrict.datasource', 'general-2024', {
    $type: 'gov.redistrict.datasource',
    kind: 'election-returns',
    title: '2024 General Election, certified precinct returns',
    digest: 'sha256:' + createHash('sha256').update('demo-returns-2024').digest('hex'),
    publishedAt: T(0),
  })

  /* ---- the regulator's theory -------------------------------------------- */
  const packed = packTheory(leanDir)
  const source = await net.putBlob(packed.bytes, 'application/gzip')

  const theory = await fedgov.put('dev.provable.theory', 'redistrict-v1', {
    $type: 'dev.provable.theory',
    name: 'Federal Districting Theory',
    version: '1.0.0',
    toolchain: 'leanprover/lean4:v4.33.1',
    rootModule: 'Redistrict',
    source,
    sourceDigest: packed.digest,
    artifactTypes: [
      {
        lexicon: 'gov.redistrict.plan',
        leanType: 'Redistrict.Plan',
        decoder: 'Redistrict.Codec.decodePlan',
      },
    ],
    vocabulary: [
      {
        phrase: 'every district is contiguous',
        leanName: 'Redistrict.Contiguous',
        doc: 'Each district is a single connected piece in the adjacency graph the plan supplies. The theory has no geometry: a plan that misstates which precincts touch can prove contiguity of a map that is not contiguous.',
      },
      {
        phrase: 'population deviation is at most',
        leanName: 'Redistrict.PopulationDeviationAtMost',
        doc: 'No district departs from the ideal population by more than the stated share. Compared by cross-multiplication, so no rounding enters a legal threshold.',
      },
      {
        phrase: 'the efficiency gap is at most',
        leanName: 'Redistrict.EfficiencyGapAtMost',
        doc: 'Wasted votes are those cast for a losing party plus a winner’s votes above half. The gap is the difference over total votes. Positive means party A wastes more, that is, party A is disadvantaged.',
      },
      {
        phrase: 'no county is split more than',
        leanName: 'Redistrict.CountySplitsAtMost',
        doc: 'A county wholly inside one district is split zero times.',
      },
      {
        phrase: 'the efficiency gap stays within … under every uniform swing of at most …',
        leanName: 'Redistrict.SwingRobust',
        doc: 'Quantifies over every uniform swing in the band, so it cannot be settled by evaluation. Between seat changes the gap moves at twice the swing, so this clause is satisfiable only by maps whose seats respond to opinion.',
      },
    ],
    createdAt: T(0),
  })

  /* ---- the requirements --------------------------------------------------- */
  const section2 = await fedgov.put('dev.provable.requirement', 'fda-section-2', {
    $type: 'dev.provable.requirement',
    title: 'Fair Districting Act § 2 — Districting Standards',
    citation: 'Fair Districting Act § 2',
    theory,
    artifactType: 'gov.redistrict.plan',
    statement: [
      'requirement section2 titled "Fair Districting Act § 2 — Districting Standards"',
      '    for plan P where',
      '  · the plan is well formed',
      '  · every district is contiguous',
      '  · population deviation is at most 0.50%',
      '  · the efficiency gap is at most 7.00%',
      '  · no county is split more than 1 time',
    ].join('\n'),
    leanProp: 'Redistrict.FairDistrictingAct.section2',
    clauses: [
      { name: 'wellFormed', description: 'The plan’s assignment, adjacency and tallies are structurally sound.' },
      { name: 'contiguity', description: 'Every district is a single connected piece.' },
      { name: 'populationDeviation', description: 'No district departs from the ideal population by more than 0.50%.' },
      { name: 'efficiencyGap', description: 'The efficiency gap of the reference election is within 7.00%.' },
      { name: 'countySplits', description: 'No county is divided among more than two districts.' },
    ],
    effectiveFrom: T(0),
    createdAt: T(0),
  })

  const section5 = await fedgov.put('dev.provable.requirement', 'fda-section-5', {
    $type: 'dev.provable.requirement',
    title: 'Fair Districting Act § 5 — Durability of Fairness',
    citation: 'Fair Districting Act § 5',
    theory,
    artifactType: 'gov.redistrict.plan',
    statement: [
      'requirement section5 titled "Fair Districting Act § 5 — Durability of Fairness"',
      '    for plan P where',
      '  · the plan is well formed',
      '  · the efficiency gap stays within 7.00% under every uniform swing of at most 5.00%',
    ].join('\n'),
    leanProp: 'Redistrict.FairDistrictingAct.section5',
    clauses: [
      { name: 'wellFormed', description: 'The plan’s assignment, adjacency and tallies are structurally sound.' },
      {
        name: 'swingRobustness',
        description:
          'For every uniform swing within five points, the efficiency gap stays within 7.00%. Quantifies over an unbounded range, so evaluation can refute it but only a proof can establish it.',
      },
    ],
    effectiveFrom: T(0),
    createdAt: T(0),
  })

  /* ---- the labeler's declaration ----------------------------------------- */
  // Label values are bare kebab-case tokens with no room for structure, which is
  // why each of these points at a `dev.provable.verdict` carrying the evidence.
  await fedgov.put('app.bsky.labeler.service', 'self', {
    $type: 'app.bsky.labeler.service',
    policies: {
      labelValues: [
        'proof-verified',
        'proof-refuted',
        'proof-malformed',
        'proof-stale',
        'proof-timeout',
        'districting-certified',
      ],
      labelValueDefinitions: [
        {
          identifier: 'proof-verified',
          severity: 'inform',
          blurs: 'none',
          defaultSetting: 'warn',
          locales: [
            {
              lang: 'en',
              name: 'Proof verified',
              description:
                'A checker re-derived this proof’s obligation from the cited requirement and artifact, elaborated the submitted proof, and confirmed it depends on no axioms beyond Lean’s three standard ones. See the linked verdict record for the evidence, and re-run it yourself if you would rather not take our word for it.',
            },
          ],
        },
        {
          identifier: 'proof-refuted',
          severity: 'alert',
          blurs: 'none',
          defaultSetting: 'warn',
          locales: [
            {
              lang: 'en',
              name: 'Proof refuted',
              description:
                'The obligation was well formed and the submitted proof did not establish it. The linked verdict names the clause that failed.',
            },
          ],
        },
        {
          identifier: 'proof-stale',
          severity: 'inform',
          blurs: 'none',
          defaultSetting: 'warn',
          locales: [
            {
              lang: 'en',
              name: 'Proof stale',
              description:
                'A record this proof cites has been rewritten since the proof was published, so the proof no longer establishes anything about what is published now. This is not a finding against the map.',
            },
          ],
        },
        {
          identifier: 'districting-certified',
          severity: 'inform',
          blurs: 'none',
          defaultSetting: 'warn',
          locales: [
            {
              lang: 'en',
              name: 'Districting certified',
              description:
                'Every requirement in force for this plan has a verified proof. Derived from the proof labels; the proofs are where the substance is.',
            },
          ],
        },
      ],
    },
    createdAt: T(0),
  })

  /* ---- the maps ----------------------------------------------------------- */
  const plans = {
    fairfax: await fairfax.put(
      'gov.redistrict.plan',
      FAIRFAX.rkey,
      planRecord(FAIRFAX, censusSource, returnsSource, T(1)),
    ),
    crackland1: await crackland.put(
      'gov.redistrict.plan',
      CRACKLAND_V1.rkey,
      planRecord(CRACKLAND_V1, censusSource, returnsSource, T(1)),
    ),
    crackland2: await crackland.put(
      'gov.redistrict.plan',
      CRACKLAND_V2.rkey,
      planRecord(CRACKLAND_V2, censusSource, returnsSource, T(3)),
    ),
  }

  return { net, fedgov, fairfax, crackland, watchdog, theory, section2, section5, plans }
}
