---
scope: L0
summary: "Content model: MDX pages, relation graph, schema"
modified: 2026-03-15
reviewed: 2026-03-15
depends:
  - path: README
---

# Content System

All site content lives in `src/content/pages/` as `.mdx` files, loaded by Astro's content collections via a glob loader (`src/content.config.ts`).

## Page schema

Every MDX page has YAML frontmatter with required `title` and `created` fields, plus optional relation fields. The schema is defined with Zod in `src/content.config.ts` and uses `.passthrough()` to allow arbitrary extra fields.

## Relations

Pages link to each other through declared frontmatter relations and auto-extracted references. The build-time graph builder (`src/lib/relations.ts`) infers inverse relations automatically.

### Hierarchy and typing

Declared as `Record<string, string | null>` in frontmatter, where keys are target slugs and values are optional labels.

| Frontmatter key | Meaning | Inverse (inferred) |
| --------------- | ------- | ------------------- |
| `up` | "this page is contained in..." | `down` on target |
| `is` | "this page is a type/instance of..." | `has` on target |

Breadcrumbs walk up the `up` chain to build a containment path from root to current page.

### Sequential ordering

| Key | Meaning | Inverse (inferred) |
| --- | ------- | ------------------- |
| `next` | next page in sequence (string slug) | `prev` on target |
| `prev` | previous page in sequence (string slug) | `next` on target |

### Auto-extracted references

`relations.ts` parses each page's MDX body for internal markdown links and populates `ref` (references) and `refi` (referenced-by) arrays. External links, anchors, and mailto are excluded.

## Key files

- `src/content.config.ts` -- collection definition and Zod schema
- `src/content/pages/` -- all MDX content
- `src/lib/relations.ts` -- graph builder, breadcrumbs, link extraction
- `src/lib/graph-data.ts` -- D3 graph data preparation
