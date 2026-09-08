# ADRs — Logging architecture decisions

This directory hosts the Architecture Decision Records (ADRs) for this project: the structural technical choices that were made, why, and what they imply.

## When to write an ADR

Write one as soon as a non-trivial technical choice is settled:

- adopting (or dropping) a structural dependency, framework, or service;
- an integration mechanism or protocol between components;
- a workaround for a bug whose impact is durable;
- a change to a naming, layout, or workflow convention.

Day-to-day implementation details do not need an ADR — only decisions a future contributor would otherwise have to reverse-engineer.

## Naming

One file per decision, numbered and incremental:

```text
ADRs/
├── README.md
├── 0001-short-kebab-title.md
├── 0002-another-decision.md
└── ...
```

`NNNN-short-kebab-title.md` — four digits, zero-padded, next free number.

## Format

Keep each ADR short:

```markdown
# ADR-NNNN — Title

## Status

Proposed | Accepted | Superseded by ADR-XXXX

## Context

What forces are at play, what problem this decision addresses.

## Decision

The choice that was made, stated plainly.

## Consequences

What becomes easier, what becomes harder, what follow-up this implies.
```

All inter-file links must be strictly relative, for portability across OSes and contributors.
