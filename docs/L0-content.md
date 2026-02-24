---
scope: L0
summary: "Content model: MDX pages, RCC-8 topological relations, schema"
modified: 2026-03-14
reviewed: 2026-03-14
depends:
  - path: README
---

# Content System

All site content lives in `src/content/pages/` as `.mdx` files, loaded by Astro's content collections via a glob loader (`src/content.config.ts`).

## Page schema

Every MDX page has YAML frontmatter with required `title` and `created` fields, plus optional relation fields. The schema is defined with Zod in `src/content.config.ts` and uses `.passthrough()` to allow arbitrary extra fields.

## Relations

Pages link to each other through two orthogonal layers, both declared in frontmatter.

### Topological (RCC-8)

Based on Region Connection Calculus. Each relation is a frontmatter array of slugs. The build-time graph inference (`src/lib/relations.ts`) adds inverse relations automatically.

| Frontmatter key | Meaning | Inverse (inferred) |
| --------------- | ------- | ------------------- |
| `ntpp` | "this page is deeply contained in..." | `nttppi` on target |
| `tpp` | "this page is tangentially part of..." | `tppi` on target |
| `po` | partially overlaps with | symmetric |
| `ec` | externally connected to | symmetric |
| `eq` | equivalent to | symmetric |
| `dc` | disconnected from (metadata-only) | symmetric |

Breadcrumbs walk up the `ntpp`/`tpp` chain to build a containment path from root to current page.

### Semantic

| Key | Meaning | Inverse (inferred) |
| --- | ------- | ------------------- |
| `next` | next page in sequence | `prev` on target |
| `prev` | previous page in sequence | `next` on target |

### Auto-extracted references

`relations.ts` parses each page's MDX body for internal markdown links and populates `r` (references) and `ri` (referenced-by) arrays. External links, anchors, and mailto are excluded.

## Key files

- `src/content.config.ts` -- collection definition and Zod schema
- `src/content/pages/` -- all MDX content
- `src/lib/relations.ts` -- graph builder, breadcrumbs, link extraction
- `src/lib/graph-data.ts` -- D3 graph data preparation
