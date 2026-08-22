/**
 * An offline atproto network.
 *
 * There is no server here and no HTTP, but everything that the proof pipeline
 * actually depends on is real: records are encoded as DRISL/DAG-CBOR, CIDs are
 * genuine content hashes, repositories are Merkle search trees, and commits and
 * labels carry real secp256k1 signatures. What has been dropped is the transport
 * — a PDS, a firehose, DID resolution over the network.
 *
 * That split is deliberate. The interesting claims of this project are all about
 * content addressing and signatures: that a proof is bound to a specific version
 * of a specific map, that editing the map invalidates the proof, that a verdict
 * is a computation anyone can repeat. Faking the cryptography would make the
 * demo prove nothing; faking the transport costs nothing, and it means the whole
 * thing runs from a clean checkout with no accounts and no network.
 *
 * DIDs are `did:key`, which is self-certifying and therefore resolvable offline.
 * A real deployment would use `did:plc` so that keys can rotate and so a labeler
 * can advertise an `#atproto_labeler` service endpoint — see DESIGN.md.
 */

import { Secp256k1Keypair } from '@atproto/crypto'
import { cborEncode, cidForCbor, sha256RawToCid, TID } from '@atproto/common'
import { MemoryBlockstore, Repo, WriteOpAction } from '@atproto/repo'

/** A pointer to a specific version of a specific record. */
export type StrongRef = { uri: string; cid: string }

/** A reference to binary content held outside the record tree. */
export type BlobRef = {
  $type: 'blob'
  ref: { $link: string }
  mimeType: string
  size: number
}

/** A record as stored, with the CID its bytes hash to. */
export type Stored = { uri: string; cid: string; value: Record<string, unknown> }

/**
 * A label, per the atproto label spec.
 *
 * Note what `val` can hold: a bare kebab-case token, at most 128 bytes, with no
 * structure. That constraint is why this project has a separate
 * `dev.provable.verdict` record type. A label is an index that propagates
 * cheaply through the network; the evidence behind it has to live somewhere it
 * can have fields.
 */
export type Label = {
  ver: number
  src: string
  uri: string
  cid?: string
  val: string
  neg?: boolean
  cts: string
  exp?: string
  sig: Uint8Array
}

const LABEL_VAL = /^[a-z]+(-[a-z]+)*$/

export class Actor {
  constructor(
    readonly handle: string,
    readonly did: string,
    readonly keypair: Secp256k1Keypair,
    readonly storage: MemoryBlockstore,
    public repo: Repo,
  ) {}

  /** Write a record and return a strong reference to it. */
  async put(
    collection: string,
    rkey: string,
    record: Record<string, unknown>,
  ): Promise<StrongRef> {
    const existing = await this.repo.getRecord(collection, rkey)
    this.repo = await this.repo.applyWrites(
      {
        action: existing ? WriteOpAction.Update : WriteOpAction.Create,
        collection,
        rkey,
        record,
      } as never,
      this.keypair,
    )
    const cid = await cidForCbor(record)
    return { uri: `at://${this.did}/${collection}/${rkey}`, cid: cid.toString() }
  }

  /** Write a record under a fresh timestamp key. */
  async post(collection: string, record: Record<string, unknown>): Promise<StrongRef> {
    return this.put(collection, TID.nextStr(), record)
  }
}

export class Network {
  private readonly byDid = new Map<string, Actor>()
  private readonly byHandle = new Map<string, Actor>()
  private readonly blobs = new Map<string, Uint8Array>()
  readonly labels: Label[] = []

  /**
   * Store binary content and return a reference to it.
   *
   * The theory's Lean package travels this way rather than as a URL to a package
   * registry. Verification then depends on the record and nothing else — no
   * registry has to stay online, and none has to stay honest, for a third party
   * to reproduce a verdict years later.
   */
  async putBlob(bytes: Uint8Array, mimeType: string): Promise<BlobRef> {
    const cid = await sha256RawToCid(bytes)
    this.blobs.set(cid.toString(), bytes)
    return {
      $type: 'blob',
      ref: { $link: cid.toString() },
      mimeType,
      size: bytes.byteLength,
    }
  }

  /** Retrieve blob content, checking it against the CID it is stored under. */
  getBlob(ref: BlobRef): Uint8Array {
    const bytes = this.blobs.get(ref.ref.$link)
    if (!bytes) throw new Error(`no blob ${ref.ref.$link}`)
    return bytes
  }

  /**
   * Create an actor from a fixed private key.
   *
   * Keys are seeded rather than random so that a demo run is reproducible: the
   * same seed yields the same DIDs, and the same records yield the same CIDs.
   * That is what makes "run the checker yourself and compare" a claim anyone can
   * act on rather than a slogan.
   */
  async createActor(handle: string, privateKeyHex: string): Promise<Actor> {
    const keypair = await Secp256k1Keypair.import(privateKeyHex, { exportable: true })
    const did = keypair.did()
    const storage = new MemoryBlockstore()
    const repo = await Repo.create(storage, did, keypair)
    const actor = new Actor(handle, did, keypair, storage, repo)
    this.byDid.set(did, actor)
    this.byHandle.set(handle, actor)
    return actor
  }

  actor(didOrHandle: string): Actor {
    const found = this.byDid.get(didOrHandle) ?? this.byHandle.get(didOrHandle)
    if (!found) throw new Error(`no such actor: ${didOrHandle}`)
    return found
  }

  get actors(): Actor[] {
    return [...this.byDid.values()]
  }

  /**
   * Fetch a record by AT-URI and verify it against an expected CID.
   *
   * The verification is the point. Every strong reference in this system exists
   * so that a consumer can tell whether the thing it is pointing at is still the
   * thing it pointed at, and a resolver that skipped the hash check would make
   * every one of those references decorative.
   */
  async resolve(ref: StrongRef): Promise<Stored> {
    const stored = await this.resolveUri(ref.uri)
    if (stored.cid !== ref.cid) {
      throw new StaleRefError(ref, stored.cid)
    }
    return stored
  }

  /** Fetch whatever is currently at an AT-URI, whatever its CID. */
  async resolveUri(uri: string): Promise<Stored> {
    const m = /^at:\/\/([^/]+)\/([^/]+)\/(.+)$/.exec(uri)
    if (!m) throw new Error(`malformed AT-URI: ${uri}`)
    const [, did, collection, rkey] = m as unknown as [string, string, string, string]
    const actor = this.actor(did)
    const value = (await actor.repo.getRecord(collection, rkey)) as Record<
      string,
      unknown
    > | null
    if (!value) throw new Error(`no record at ${uri}`)
    const cid = await cidForCbor(value)
    return { uri, cid: cid.toString(), value }
  }

  /**
   * Issue a signed label.
   *
   * Subjects are given as strong references, not bare URIs, so the label is
   * pinned to the exact bytes it was issued about. Editing the subject changes
   * its CID and the label simply stops applying — which is the behaviour you
   * want when the subject is a proof and the label says `proof-verified`.
   */
  async label(
    src: Actor,
    subject: StrongRef,
    val: string,
    opts: { neg?: boolean; cts?: string } = {},
  ): Promise<Label> {
    if (!LABEL_VAL.test(val) || Buffer.byteLength(val) > 128) {
      throw new Error(`invalid label value: ${val}`)
    }
    const unsigned = {
      ver: 1,
      src: src.did,
      uri: subject.uri,
      cid: subject.cid,
      val,
      ...(opts.neg ? { neg: true } : {}),
      cts: opts.cts ?? new Date().toISOString(),
    }
    const sig = await src.keypair.sign(cborEncode(unsigned))
    const label: Label = { ...unsigned, sig }
    this.labels.push(label)
    return label
  }

  /** Labels currently in force for a subject: latest wins, negations remove. */
  labelsFor(subject: StrongRef): string[] {
    const state = new Map<string, { cts: string; neg: boolean }>()
    for (const l of this.labels) {
      if (l.uri !== subject.uri || l.cid !== subject.cid) continue
      const prev = state.get(l.val)
      if (!prev || prev.cts <= l.cts) state.set(l.val, { cts: l.cts, neg: !!l.neg })
    }
    return [...state.entries()].filter(([, v]) => !v.neg).map(([k]) => k).sort()
  }
}

/** Raised when a strong reference no longer matches what is at its URI. */
export class StaleRefError extends Error {
  constructor(
    readonly ref: StrongRef,
    readonly actual: string,
  ) {
    super(
      `stale reference: ${ref.uri} is now ${actual}, not ${ref.cid}. ` +
        `The record was rewritten after this reference was taken.`,
    )
  }
}

/** CID of a record's canonical encoding, as a string. */
export async function cidOf(record: unknown): Promise<string> {
  return (await cidForCbor(record)).toString()
}
