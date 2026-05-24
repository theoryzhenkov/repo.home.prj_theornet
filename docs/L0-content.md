---
scope: L0
summary: "Content model: MDX pages, relation graph, schema"
modified: 2026-05-24
reviewed: 2026-05-24
depends:
  - path: README
dependents:
  - path: docs/L1-relations
  - path: docs/L1-routing
---

# Content System

All site content lives in `src/content/pages/` as `.mdx` files, loaded by Astro's content collections via a glob loader (`src/content.config.ts`). A project-native content CLI creates, lists, edits, archives, and deletes these files while preserving Git/Jujutsu as the history layer. File paths are storage locations only; page topology comes from metadata relations such as `is` and `part_of`.

## Page schema

Every MDX page has YAML frontmatter with required `title` and `created` fields, plus optional relation fields. The schema is defined with Zod in `src/content.config.ts` and uses `.passthrough()` to allow arbitrary extra fields.

The website relation model is a practical subset of the Obsidian PKM ontology: routes and folders are browsing affordances, while frontmatter relations carry semantic structure. New content should prefer `part_of` / `has_part` for composition over legacy `up` / `down` hierarchy fields. Collection pages should query semantic metadata (for example, `is: classes/project`) instead of deriving membership from directories.

## Relations

Pages link to each other through declared frontmatter relations and auto-extracted references. The build-time graph builder (`src/lib/relations.ts`) infers inverse relations automatically.

### Hierarchy and typing

Declared as arrays of `{ page, label? }` objects in frontmatter.

| Frontmatter key | Meaning | Inverse (inferred) |
| --------------- | ------- | ------------------- |
| `is` | "this page is an instance of..." | `has` on target |
| `subclass_of` | class taxonomy / subsumption | `superclass_of` on target |
| `part_of` | mereology / composition | `has_part` on target |
| `subject` | aboutness | `subject_of` on target |
| `creator` | authorship / creation | `creator_of` on target |
| `related` | weak symmetric association | `related` on target |
| `up` | legacy route hierarchy | `down` on target |

Breadcrumbs walk the `part_of` chain first and fall back to legacy `up` when `part_of` is absent.

### Sequential ordering

| Key | Meaning | Inverse (inferred) |
| --- | ------- | ------------------- |
| `next` | next page in sequence (string slug) | `prev` on target |
| `prev` | previous page in sequence (string slug) | `next` on target |

### Auto-extracted references

`relations.ts` parses each page's MDX body for internal markdown links and populates `ref` (references) and `refi` (referenced-by) arrays. External links, anchors, and mailto are excluded.

## Authoring commands

The `content` just module wraps `scripts/content.ts`:

```sh
just content new              # prompt for path and name, then create blank relation metadata
just content list             # list content page slugs and titles
just content edit SLUG
just content archive SLUG
just content delete SLUG
```

`new` asks for a path relative to `src/content/pages/` and a display name, then writes a blank frontmatter block with empty `part_of`, `is`, and `subject` lists for manual classification. `archive` is the preferred removal path; it moves pages under `archive/deleted-pages-YYYY-MM-DD/`. Hard deletion requires `--force`.

## Key files

- `src/content.config.ts` -- collection definition and Zod schema
- `src/lib/content-admin.ts` -- content authoring operations and page templates
- `scripts/content.ts` -- CLI wrapper for content operations
- `content.just` -- `just content ...` module
- `src/content/pages/` -- all MDX content
- `src/lib/relations.ts` -- relation types, link extraction, `buildGraphFromPages()`, breadcrumbs
- `src/lib/relations-graph.ts` -- Astro-dependent `buildRelationsGraph()` wrapper (memoized)
- `src/lib/slugs.ts` -- shared slug/URL utilities
- `src/lib/graph-data.ts` -- D3 graph data preparation
