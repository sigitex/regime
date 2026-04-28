---
name: jerklint
description: Use when user asks for "jerklint", "jerk lint", or strict code-quality review. Reviews code against DRY, KISS, YAGNI, SOC, cohesion, coupling, dependency direction, Law of Demeter, immutability, declarative shape, implicit contracts, abstraction pressure, naming/API clarity, and locality.
---

# Jerklint

Jerklint = strict code-quality review. Be blunt, specific, fair. Findings must be actionable, not taste fights.

## Trigger

Use this skill when user asks for:
- `jerklint`
- `jerk lint`
- strict code-quality review
- review against DRY, KISS, YAGNI, SOC, cohesion, coupling, dependency direction, Law of Demeter, immutability, declarative programming, or maintainability principles

## Goal

Find code smells, design pressure, and maintainability risk. This is not normal bug review. Bugs matter only when they reveal deeper code-quality failure.

## Axes

- DRY: flag duplicated policy, copy-paste structure, repeated literals, or drift-prone validation. Do not centralize incidental similarity.
- KISS: flag needless indirection, clever control flow, over-generalization, and logic that is harder than its problem.
- YAGNI: flag speculative extension points, options, abstractions, or compatibility layers with no concrete need.
- SOC: flag mixed responsibilities, especially parsing + validation + IO + orchestration + policy in one unit.
- Cohesion: flag functions/types/modules that do not have one clear job or reason to change.
- Coupling: flag unnecessary knowledge between layers, callers, protocols, domains, or runtime details.
- Dependency Direction: flag lower-level code depending on higher-level policy, domain declarations depending on adapters, or circular conceptual flow.
- Law of Demeter: flag long object walks, dependency spelunking, and callers that know too much about nested internals.
- Immutability / State Discipline: prefer immutable boundaries and local mutation only. Flag shared mutable state, hidden mutation, aliasing risk, and mutation that creates temporal coupling.
- Declarative Shape: favor data/config descriptions for policy and protocol surfaces; keep execution/IO separate. Flag imperative branching where a small table/schema/declaration would clarify rules.
- Implicit Contracts / Temporal Coupling: flag hidden ordering requirements, call rituals, required prior validation, or invariants not encoded in type/name/API.
- Abstraction Pressure: flag both over-centralization and under-centralization. Centralize rules, not whole workflows.
- Naming/API Clarity: flag names that hide behavior, false promises, vague abstractions, boolean blindness, or weak error messages.
- Locality: flag code that requires excessive jumping across files/functions to understand one behavior.
- Testability: flag structure that forces brittle tests, excessive mocking, or untestable policy logic.
- File/API Shape: flag domain-specific function bags, filenames that do not match primary exports, and behavior that should live under a matching type namespace.
- Predicate Accuracy: flag boolean predicates/guards that check partial or wrong shape. Flag `in` checks without type narrowing, truthiness checks that miss falsy valid values, and type guards that accept broader input than their name promises. Prefer predicates that validate the full claimed shape.
- Construction Phase Separation: flag builder/factory functions that execute more than three distinct sequential phases in one function body without named phase boundaries. Flag protocol creation, config extraction, normalization, wiring, and return shaping collapsed into one function. Prefer named phase functions even when each is small.

## Project Style Conventions

Apply these conventions when reviewing module/API shape:
- File/Export Match: filenames should match the primary export exactly, including casing. Example: `Field.ts` exports `Field`.
- Type Namespace Cohesion: prefer a primary type plus matching namespace for behavior tied to that type. Example: `Field` + `namespace Field`.
- Domain Function Locality: functions that operate on a domain type should live in that type's namespace instead of as loose exports.
- Avoid Function Bags: avoid scattered single-name function exports for domain-specific behavior. Group them under the relevant domain type.
- Generic Helper Exception: truly generic helpers may remain standalone when they do not naturally belong to a domain type.

## Non-Goals

Do not focus on:
- formatting nits
- style preferences without maintenance impact
- security bugs unless structure caused them
- correctness bugs unless they reveal quality smell
- broad rewrites without concrete pressure
- purity dogma: mutation and imperative code are fine when local, clear, and bounded

## Method

1. Read target file first.
2. Read direct collaborators only when needed to validate design pressure.
3. Prefer evidence from code over principle recitation.
4. Rank findings by maintainability impact.
5. Cite file/line refs.
6. Suggest smallest useful direction, not full rewrites.
7. If no findings, say so and name strongest qualities.

## Output

Findings first. Keep summary secondary.

```markdown
**Jerklint Findings**
1. **High** `path:line`: Smell. Why it hurts. Better direction.

**Scorecard**
- DRY: pass/concern/fail - one phrase.
- KISS: pass/concern/fail - one phrase.
- YAGNI: pass/concern/fail - one phrase.
- SOC: pass/concern/fail - one phrase.
- Cohesion: pass/concern/fail - one phrase.
- Coupling: pass/concern/fail - one phrase.
- Dependency Direction: pass/concern/fail - one phrase.
- Law of Demeter: pass/concern/fail - one phrase.
- Immutability: pass/concern/fail - one phrase.
- Declarative Shape: pass/concern/fail - one phrase.
- Implicit Contracts: pass/concern/fail - one phrase.
- Abstraction Pressure: pass/concern/fail - one phrase.
- Naming/API Clarity: pass/concern/fail - one phrase.
- Locality: pass/concern/fail - one phrase.
- Predicate Accuracy: pass/concern/fail - one phrase.
- Construction Phase Separation: pass/concern/fail - one phrase.

**Verdict**
Keep / minor refactor / refactor soon / rethink.
```

## Severity

- High: smell creates likely drift, hard-to-change design, boundary violation, or hidden invariant across callers.
- Medium: smell adds avoidable complexity or makes future work risky but is local.
- Low: polish-level maintainability concern worth noting only if concrete.

## Calibration

- Do not chant DRY. Duplication can be clearer than wrong abstraction.
- Do not chant KISS. Simpler locally can be worse globally if it duplicates policy.
- Do not chant YAGNI. Keep extension points when existing architecture already requires them.
- Do not chant immutability. Local accumulators are fine when ownership is clear.
- Do not chant declarative programming. Imperative steps are fine when sequencing is core behavior.
- Prefer "centralize this rule" over "make a manager".
- Prefer "split parsing from execution" over "add layers".
- Do not limit DRY to textual duplication. Flag structural duplication: two functions that recursively traverse the same tree shape with different leaf transforms.
- Under Implicit Contracts, flag magic DI object shapes where binder and consumer agree on structure by convention without an exported type or binding token.
- Under Implicit Contracts, flag whitelist-vs-blocklist asymmetry where two code paths encoding the same conceptual boundary use different inclusion strategies.
