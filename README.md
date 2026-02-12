# AKG — Application Knowledge Graph

**OpenAPI for Applications.** A typed attributed directed multigraph that represents the complete navigable structure of a web or mobile application.

```
akg generate ./my-nextjs-app -o my-app.akg.json
```

AKG captures screens, navigation flows, API endpoints, form interactions, auth boundaries, and accessibility data in a single machine-readable JSON document. Think of it as a complete X-ray of your application's architecture.

## Why AKG?

Existing standards describe parts of an app — OpenAPI describes APIs, Sitemaps describe URLs, Storybook documents components. **AKG describes the whole application as a graph**, connecting screens to navigation to APIs to auth to UI elements.

This enables:

- **AI-powered test generation** — traverse all paths, generate tests for every flow
- **Architecture auditing** — find dead routes, orphan screens, auth bypasses
- **Cross-version diffing** — know exactly what changed between deployments
- **Coverage analysis** — measure which flows are actually tested
- **LLM-readable app descriptions** — feed your app's structure to any AI agent

## Quick Start

```bash
# Install
npm install @akg/cli

# Generate an AKG from a Next.js project
akg generate ./my-nextjs-app -o my-app.akg.json

# Validate an AKG document
akg validate my-app.akg.json

# Query for security issues
akg query my-app.akg.json --security

# Get a human-readable summary
akg query my-app.akg.json --summary

# Diff two versions
akg diff v1.akg.json v2.akg.json --summary
```

## What's in an AKG?

An `.akg.json` file contains:

| Section | Description |
|---------|-------------|
| **nodes** | Screens, modals, drawers, toasts — every distinct UI surface |
| **edges** | Navigation links, form submissions, API calls, redirects, state changes |
| **endpoints** | API routes with methods, auth requirements, request/response shapes |
| **findings** | Issues found by reconciling code analysis with runtime exploration |
| **metadata** | App name, version, platform, generation timestamp |

Example node:
```json
{
  "id": "screen:/dashboard",
  "type": "screen",
  "name": "Dashboard",
  "route": "/dashboard",
  "source": "code",
  "elements": [...],
  "metadata": {
    "authRequired": true,
    "requiredRoles": ["admin"]
  }
}
```

Example edge:
```json
{
  "id": "edge:screen:/:screen:/about:click",
  "type": "navigation",
  "from": "screen:/",
  "to": "screen:/about",
  "trigger": "click",
  "navigationType": "spa"
}
```

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@akg/types`](./packages/types) | TypeScript interfaces from the AKG spec | v0.1.0 |
| [`@akg/schema`](./packages/schema) | Zod validators + JSON Schema + serialization | v0.1.0 |
| [`@akg/core`](./packages/core) | AKGGraph class, graph operations, merge, reconciliation | v0.1.0 |
| [`@akg/extractor-nextjs`](./packages/extractor-nextjs) | Next.js App Router static analyzer | v0.1.0 |
| [`@akg/cli`](./packages/cli) | CLI tool (`akg generate`, `akg query`, etc.) | v0.1.0 |

## Graph Operations

`@akg/core` provides these operations on an AKG graph:

| Operation | Description |
|-----------|-------------|
| `traverse(from, to)` | Find all paths between two nodes |
| `reachability(nodeId)` | All nodes reachable from a starting point |
| `unreachable()` | Orphan nodes not reachable from the entry point |
| `deadElements()` | Interactive elements with no effect |
| `securityAudit()` | Auth bypass and authorization gap detection |
| `diff(other)` | Structural diff between two AKG snapshots |
| `coverage(nodes, edges)` | Measure test coverage against the graph |
| `complexity()` | Node/edge counts, max depth, branching factor, SCC analysis |

## Multi-Source Construction

AKG supports merging data from multiple sources:

- **Code layer** (static analysis) — extract routes, navigation, API endpoints from source code
- **Exploration layer** (runtime) — discover actual behavior via browser automation
- **Documentation layer** — import from OpenAPI specs, Storybook, etc.

When sources disagree, the merge algorithm produces **findings** using 12 reconciliation rules (R1-R12), such as:

- **R1: Dead Route** — route exists in code but wasn't reachable at runtime
- **R6: Auth Bypass** — code marks a route as auth-required but runtime accessed it unauthenticated
- **R10: Undocumented Endpoint** — API called at runtime that doesn't exist in code

## Supported Frameworks

### v0.1.0

- **Next.js** (App Router) — full static analysis of routes, navigation, API endpoints, forms, auth, components

### Planned

- Next.js Pages Router
- React Router
- Vue / Nuxt
- Angular
- Svelte / SvelteKit
- React Native / Expo
- Flutter

Want to add a framework? See [CONTRIBUTING.md](./CONTRIBUTING.md).

## API Extraction Scope

v0.1.0 extracts REST-style API endpoints:

- Next.js `route.ts` handlers (GET, POST, PUT, DELETE, PATCH)
- Client-side `fetch()` calls to `/api/*` paths

Future versions will target additional API patterns:

- tRPC procedures
- GraphQL queries/mutations
- gRPC service definitions
- Supabase SDK calls (`.from()`, `.rpc()`, edge functions)
- Server Actions (Next.js `"use server"`)

## The Specification

The full AKG specification is at [`spec/AKG-SPEC.md`](./spec/AKG-SPEC.md). It defines:

- All node types (screen, modal, drawer, toast, bottomSheet, component)
- All edge types (navigation, formSubmit, apiCall, stateChange, redirect, modalTrigger, error)
- Element model (buttons, links, inputs, selects, etc.)
- API endpoint structure
- 12 reconciliation rules
- Deterministic ID generation
- JSON Schema for validation

## Development

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm lint
```

## License

Apache 2.0 — see [LICENSE](./LICENSE).
