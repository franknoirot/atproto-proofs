/**
 * Lexical screening of a prover payload.
 *
 * This is defence in depth and nothing more. The guarantees that actually hold
 * are structural: the checker writes the theorem's signature, so the prover
 * cannot choose what is proved; `Obligation.stmt` is imported, so it cannot be
 * shadowed; and `#assert_axioms` audits the finished proof against the kernel's
 * own record of what it depends on, so a hole cannot hide behind a successful
 * build.
 *
 * A denylist adds none of that. What it adds is a *clear* failure. Without it, a
 * payload containing `sorry` still fails — at the axiom audit, several seconds
 * of kernel time later, with a message about axioms rather than about `sorry`.
 * Rejecting it at the door produces a better verdict for the same outcome. It is
 * also cheap insurance against metaprogramming reaching past the splice point in
 * ways the structural defences were not designed for.
 *
 * Screening must never be the *only* thing standing between a payload and a
 * `verified` label. Anything that would be unsound if it slipped past this file
 * is a bug in the design, not in the pattern list.
 */

export type Screening = { ok: true } | { ok: false; reason: string; matched: string }

type Rule = { pattern: RegExp; why: string }

const RULES: Rule[] = [
  // Holes. Caught again by the axiom audit; caught here with a legible message.
  { pattern: /\bsorry\b/, why: 'the payload contains a hole' },
  { pattern: /\bsorryAx\b/, why: 'the payload references the hole axiom directly' },

  // New assumptions. A prover who can add an axiom can prove anything.
  { pattern: /\baxiom\b/, why: 'the payload declares an axiom' },

  // Native evaluation moves the compiler into the trusted base. It is not
  // unsound, but a regulator's verdict should not depend on it silently; a
  // checker configured to allow it would widen `allowedAxioms` instead.
  { pattern: /\bnative_decide\b/, why: 'the payload uses native evaluation' },
  { pattern: /\+native\b/, why: 'the payload uses native evaluation' },
  { pattern: /\bimplemented_by\b/, why: 'the payload replaces a definition with compiled code' },
  { pattern: /\bextern\b/, why: 'the payload calls foreign code' },
  { pattern: /\bunsafe\b/, why: 'the payload uses an unsafe declaration' },
  { pattern: /\bopaque\b/, why: 'the payload introduces an opaque constant' },

  // Escaping the splice point. The payload is spliced inside a namespace and
  // after a `:=`; these are the tokens that would let it out.
  { pattern: /\bnamespace\b/, why: 'the payload opens a namespace' },
  { pattern: /\bsection\b/, why: 'the payload opens a section' },
  { pattern: /\bend\b/, why: 'the payload closes a scope it did not open' },
  { pattern: /\bimport\b/, why: 'the payload imports a module' },

  // Metaprogramming and configuration. The checker sets the resource limits, and
  // a payload that could change the elaborator could change what its own
  // signature means.
  { pattern: /\bset_option\b/, why: 'the payload changes an elaborator option' },
  { pattern: /\bmacro\b/, why: 'the payload defines a macro' },
  { pattern: /\bmacro_rules\b/, why: 'the payload defines a macro' },
  { pattern: /\belab\b/, why: 'the payload defines an elaborator' },
  { pattern: /\belab_rules\b/, why: 'the payload defines an elaborator' },
  { pattern: /\bsyntax\b/, why: 'the payload declares syntax' },
  { pattern: /\bnotation\b/, why: 'the payload declares notation' },
  { pattern: /\battribute\b/, why: 'the payload sets an attribute' },
  { pattern: /@\[/, why: 'the payload sets an attribute' },
  { pattern: /\binitialize\b/, why: 'the payload runs code at import time' },
  { pattern: /\brun_cmd\b/, why: 'the payload runs a command' },

  // Effects. Checking a proof should not write files or open sockets.
  { pattern: /#eval\b/, why: 'the payload evaluates a term for effect' },
  { pattern: /\bunsafeIO\b/, why: 'the payload performs IO' },
  { pattern: /\bIO\./, why: 'the payload performs IO' },
]

/**
 * Strip comments before matching, so that prose does not trip a rule — a payload
 * whose comment reads "no `sorry` here" should not be rejected for saying so.
 *
 * Block comments nest in Lean and this does not handle nesting, which means a
 * deliberately nested comment can leave text visible that Lean would ignore.
 * That errs toward rejecting a valid payload rather than admitting an invalid
 * one, which is the direction a screening pass should fail in.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/-(?:[\s\S]*?)-\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
}

export function screen(payload: string): Screening {
  const src = stripComments(payload)
  for (const rule of RULES) {
    const m = rule.pattern.exec(src)
    if (m) return { ok: false, reason: rule.why, matched: m[0] }
  }
  return { ok: true }
}
