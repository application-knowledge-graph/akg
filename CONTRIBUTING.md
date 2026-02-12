# Contributing to AKG

AKG is an open standard for representing application architecture as a typed attributed graph. Contributions are welcome — especially new framework extractors.

## Adding a Framework Extractor

The primary way to extend AKG is by writing a new extractor that implements `AKGExtractorPlugin`:

```typescript
import type { AKGExtractorPlugin, ApplicationKnowledgeGraph } from '@akg/types';

export class MyFrameworkExtractor implements AKGExtractorPlugin {
  name = 'my-framework';
  framework = 'my-framework';
  version = '0.1.0';

  async extractFromCode(
    projectRoot: string,
    options?: Record<string, unknown>,
  ): Promise<Partial<ApplicationKnowledgeGraph>> {
    // 1. Detect framework and configuration
    // 2. Extract routes → ScreenNode[]
    // 3. Extract API endpoints → ApiEndpoint[]
    // 4. Extract navigation → NavigationEdge[]
    // 5. Extract forms → InputElement[] + FormSubmitEdge[]
    // 6. Detect auth patterns → set authRequired on nodes
    // 7. Return partial AKG

    return {
      specVersion: '0.1.0',
      metadata: { /* ... */ },
      nodes: [],
      edges: [],
      endpoints: [],
      findings: [],
      apiReconciliation: { deadEndpoints: [], undocumentedEndpoints: [], authMismatches: [] },
      entryNodeId: '',
    };
  }
}
```

Create your extractor as a separate package (e.g., `@akg/extractor-vue`) following the same structure as `@akg/extractor-nextjs`.

### What to Extract

At minimum, an extractor should produce:

| Output | Required | Description |
|--------|----------|-------------|
| Screen nodes | Yes | One per distinct route/page |
| Navigation edges | Yes | Links, programmatic navigation, redirects |
| API endpoints | Recommended | REST handlers + client-side API calls |
| Form elements | Recommended | Input fields, form submissions |
| Auth metadata | Recommended | Which routes require authentication |
| Component nodes | Optional | Component dependency tree |

### Deterministic IDs

Use the ID generators from `@akg/core`:

```typescript
import { screenId, endpointId, edgeId, elementId } from '@akg/core';

screenId('/dashboard');          // → "screen:/dashboard"
endpointId('GET', '/api/users'); // → "api:GET:/api/users"
edgeId('screen:/', 'screen:/about', 'click');  // → "edge:screen:/:screen:/about:click"
```

### Test Fixtures

Create a minimal but realistic test app in `test/fixtures/` that exercises the framework's features:

- Multiple routes (static, dynamic, nested)
- At least one API endpoint
- Navigation between pages
- A form with inputs
- An auth-protected route

Run the extractor against the fixture and assert the output contains expected nodes, edges, and endpoints.

## Development Setup

```bash
git clone https://github.com/application-knowledge-graph/akg.git
cd akg
pnpm install
pnpm build
pnpm test
```

## Code Style

- TypeScript strict mode
- ESM only (`"type": "module"`)
- No default exports (named exports only)
- Tests with Vitest
- Build with tsup

## Pull Request Guidelines

1. One feature or fix per PR
2. Include tests for new functionality
3. Run `pnpm test` and `pnpm lint` before submitting
4. Update the spec if adding new node/edge/element types
5. Keep backward compatibility — existing `.akg.json` files should remain valid

## License

By contributing, you agree that your contributions will be licensed under Apache 2.0.
