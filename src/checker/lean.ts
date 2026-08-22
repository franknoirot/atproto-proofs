/**
 * Running Lean on untrusted input.
 *
 * ## What isolation this actually provides
 *
 * Elaborating a Lean file runs arbitrary code: macros execute at compile time,
 * and `#eval` and `initialize` run whatever they are given. A checker that
 * accepts payloads from strangers and elaborates them is running their code.
 *
 * This runner enforces a wall-clock timeout and nothing else. It does not
 * sandbox the filesystem, does not block the network, and does not cap memory.
 * That is a real limitation and it is recorded honestly: every verdict carries a
 * `checker.sandbox` field, and this runner reports `host-process (timeout only)`
 * so that a reader can weigh the verdict accordingly. A production checker
 * belongs in a container with no network and a memory cap, and `DESIGN.md` says
 * so rather than leaving the reader to assume it.
 *
 * The lexical screen in `screen.ts` removes the obvious ways a payload would
 * reach for that capability, but a screen is not a sandbox and should not be
 * mistaken for one.
 */

import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)

export const SANDBOX_DESCRIPTION = 'host-process (timeout only)'

export type LeanRun = {
  ok: boolean
  stdout: string
  stderr: string
  /** True when the process was killed for exceeding its time budget. */
  timedOut: boolean
  durationMs: number
}

/** Where the theory package lives, and the module search path it implies. */
export type LeanEnv = { packageDir: string; leanPath: string; toolchain: string }

/**
 * Read the module search path and toolchain out of the theory's lake package.
 *
 * Done once and reused, because `lake env` is slow and because a checker that
 * re-derived the environment per proof could silently check two proofs against
 * two different environments.
 */
export async function leanEnv(packageDir: string): Promise<LeanEnv> {
  const [{ stdout: pathOut }, { stdout: verOut }] = await Promise.all([
    exec('lake', ['env', 'printenv', 'LEAN_PATH'], { cwd: packageDir }),
    exec('lean', ['--version'], { cwd: packageDir }),
  ])
  const version = /version (\d+\.\d+\.\d+[^,]*)/.exec(verOut)?.[1] ?? 'unknown'
  return {
    packageDir,
    leanPath: pathOut.trim(),
    toolchain: `leanprover/lean4:v${version}`,
  }
}

/** Write a module into a scratch package rooted at `workDir`. */
export async function writeModule(
  workDir: string,
  moduleName: string,
  source: string,
): Promise<string> {
  const file = join(workDir, moduleName.replace(/\./g, '/') + '.lean')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, source, 'utf8')
  return file
}

/**
 * Elaborate one module.
 *
 * `cwd` is the scratch directory rather than the theory package, because Lean
 * requires an input file to sit under its root and the generated modules
 * deliberately do not live inside the regulator's package — the theory is an
 * input to checking, not a place the prover's text gets written.
 */
export async function runLean(
  env: LeanEnv,
  workDir: string,
  moduleName: string,
  opts: { olean?: boolean; timeoutMs?: number } = {},
): Promise<LeanRun> {
  const rel = moduleName.replace(/\./g, '/') + '.lean'
  const args = [rel]
  if (opts.olean) args.push('-o', rel.replace(/\.lean$/, '.olean'))
  const started = Date.now()
  try {
    const { stdout, stderr } = await exec('lean', args, {
      cwd: workDir,
      env: { ...process.env, LEAN_PATH: `${workDir}:${env.leanPath}` },
      timeout: opts.timeoutMs ?? 300_000,
      maxBuffer: 32 * 1024 * 1024,
    })
    return { ok: true, stdout, stderr, timedOut: false, durationMs: Date.now() - started }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; killed?: boolean; signal?: string }
    return {
      ok: false,
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? String(e),
      timedOut: !!err.killed || err.signal === 'SIGTERM',
      durationMs: Date.now() - started,
    }
  }
}
