---
alwaysApply: true
---

# Quality Guardrails

Use these while building. Do not turn every task into a full review; apply as lightweight pressure before adding or changing structure.

## Module Shape

- Filenames should match the primary export exactly, including casing.
- Exports and higher level functions should appear before private functions in a file.
- Prefer a primary type plus matching namespace for behavior tied to that type.
- Functions that operate on a domain type should live in that type's namespace.
- Avoid scattered single-name function exports for domain-specific behavior.
- Truly generic helpers may stay standalone when they do not naturally belong to a domain type.

## Design Pressure

- DRY: centralize rules and policy, not incidental similarity.
- KISS: prefer the smallest clear structure that solves the actual problem.
- YAGNI: do not add speculative extension points, options, compatibility layers, or abstractions.
- SOC: keep parsing, validation, IO, orchestration, and policy separate when mixing them creates change pressure.
- Cohesion: each module/type/function should have one clear job and one clear reason to change.
- Coupling: avoid making callers know protocol internals, nested implementation details, or unrelated runtime policy.
- Locality: one behavior should not require excessive jumping across unrelated files or helpers.
- Naming/API Clarity: names should expose behavior and domain meaning; avoid vague wrappers, false promises, and boolean-blind APIs.

## Refactor Bias

- Prefer moving behavior to the domain owner over creating utility bags.
- Prefer local private helpers over exported helpers until another real caller exists.
- Prefer deleting compatibility code when there are no shipped consumers, persisted data, or explicit requirements.
- Prefer small reshapes that preserve behavior over broad rewrites.
