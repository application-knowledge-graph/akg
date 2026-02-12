# Application Knowledge Graph (AKG) Specification

**Version:** 0.1.0  
**Status:** Draft  
**Authors:** Pratik Bodkhe  
**License:** Apache 2.0  
**Last Updated:** 2026-02-11  
**Website:** [shiprite.dev](https://shiprite.dev)

---

## Table of Contents

1. [Introduction & Motivation](#1-introduction--motivation)
2. [Core Concepts](#2-core-concepts)
3. [Node Types](#3-node-types)
4. [Edge Types](#4-edge-types)
5. [Element Types](#5-element-types)
6. [API Layer](#6-api-layer)
7. [Source Reconciliation Rules](#7-source-reconciliation-rules)
8. [Graph Operations](#8-graph-operations)
9. [Serialization Format](#9-serialization-format)
10. [AKG Construction Pipeline](#10-akg-construction-pipeline)
11. [Platform Support](#11-platform-support)
12. [Extension Points](#12-extension-points)
13. [Comparison with Existing Standards](#13-comparison-with-existing-standards)
14. [Future Vision](#14-future-vision)

---

## 1. Introduction & Motivation

### The Problem

Modern web and mobile applications are complex directed graphs of screens, transitions, API calls, and state mutations. Yet there is no standard format for describing this structure. Teams rely on scattered artifacts — route files, Figma mockups, Swagger docs, test scripts — none of which capture the **full, interconnected picture** of how an application actually behaves.

This gap has real consequences:

- **Test generation** requires manually mapping user flows.
- **Onboarding** new engineers means weeks of "click around and figure it out."
- **Security audits** miss authorization gaps because nobody has a complete map of what's reachable.
- **Change impact analysis** is guesswork — "what breaks if I change this endpoint?"

### The Solution

The **Application Knowledge Graph (AKG)** is a typed, attributed graph that represents the complete navigable structure of a web or mobile application. It captures screens, transitions, interactive elements, API calls, authentication requirements, and performance characteristics in a single, machine-readable format.

**OpenAPI is for APIs. AKG is for applications.**

### Key Innovation: Multi-Source Construction

An AKG is not authored by hand. It is **constructed** by merging three independent sources:

| Layer | Source | Method |
|-------|--------|--------|
| **Code** | Static analysis of source code | AST parsing, route extraction, component analysis |
| **Exploration** | Runtime observation of the running app | AI-driven browser/mobile agent navigation |
| **Documentation** | PRDs, specs, design docs | NLP extraction (optional) |

Every node and edge carries a `source` field indicating where it was discovered. **Discrepancies between sources are findings** — a route defined in code but unreachable in exploration is a dead route; a screen accessible without auth that code marks as protected is a security bug.

### Use Cases

| Use Case | How AKG Helps |
|----------|---------------|
| **Test Generation** | Traverse the graph to produce exhaustive user flow tests automatically |
| **Documentation** | Generate always-accurate app maps from the living application |
| **Onboarding** | New engineers explore an interactive graph instead of reading stale wikis |
| **Security Audit** | Query for auth-protected nodes reachable without authentication |
| **Change Impact Analysis** | Diff two AKG versions to see exactly what changed |
| **Benchmarking** | Compare structural complexity across applications or releases |
| **Regression Detection** | Detect when a deploy removes screens, breaks links, or degrades performance |

---

## 2. Core Concepts

### 2.1 Graph Structure

An AKG is a **directed multigraph** where:

- **Nodes** represent visual states: screens, modals, drawers, toasts, bottom sheets, and components.
- **Edges** represent transitions between states: navigation, form submissions, API calls, state changes, redirects, modal triggers, and error paths.
- **Elements** are interactive or visible items within a node: buttons, links, inputs, text.

Multiple edges may connect the same pair of nodes (e.g., a navigation edge and an API call edge triggered by the same action).

### 2.2 Source Layers

```
┌─────────────────────────────────────────┐
│           Merged AKG (source: 'both')   │
├─────────────────────────────────────────┤
│  Pass 0: Code Layer                     │  ← Static analysis
│  Pass 1: Exploration Layer              │  ← Runtime agent
│  Pass 2: Documentation Layer (optional) │  ← PRD/docs parsing
└─────────────────────────────────────────┘
```

Every node and edge in the graph has a `source` field:

```typescript
type AKGSource = 'code' | 'exploration' | 'both' | 'documentation';
```

- `'code'` — Found only via static analysis. Not observed at runtime.
- `'exploration'` — Found only via runtime navigation. Not present in code (or not detected).
- `'both'` — Found in code AND confirmed at runtime. High confidence.
- `'documentation'` — Described in PRD/docs but not yet verified in code or exploration.

### 2.3 Source Reconciliation

The power of multi-source construction is that **disagreements between sources are semantically meaningful**. Section 7 defines formal reconciliation rules, but the core principle is:

> **Code describes intent. Exploration describes reality. When they disagree, you've found something worth investigating.**

### 2.4 Temporal Versioning

An AKG is a **snapshot** of an application at a point in time. AKGs are versioned and diffable:

```typescript
interface AKGMetadata {
  specVersion: string;        // Semver of this AKG spec (e.g., "0.1.0")
  appName: string;
  appVersion: string;         // App version or git SHA
  generatedAt: string;        // ISO 8601 timestamp
  generatedBy: string;        // Tool/agent that produced this AKG
  baseUrl: string;            // Root URL of the application
  platform: AKGPlatform;
  tags: Record<string, string>;
}

type AKGPlatform = 'web' | 'ios' | 'android' | 'hybrid';
```

Comparing two AKGs (e.g., before and after a deploy) produces a **structural diff** that shows added, removed, and modified nodes and edges.

---

## 3. Node Types

### 3.1 Base Node Interface

All nodes share a common base:

```typescript
interface AKGNodeBase {
  /** Unique identifier. Deterministic where possible (e.g., derived from route). */
  id: string;

  /** Discriminant for node type. */
  type: NodeType;

  /** Human-readable name. */
  name: string;

  /** How this node was discovered. */
  source: AKGSource;

  /** Interactive and visible elements on this node. */
  elements: AKGElement[];

  /** API calls triggered when this node loads/mounts. */
  onLoadApiCalls: ApiCallReference[];

  /** Screenshot hash or path captured during exploration. */
  screenshot?: string;

  /** Serialized DOM or component tree snapshot. */
  domSnapshot?: string;

  /** Accessibility audit results. */
  accessibility: AccessibilityInfo;

  /** Performance metrics captured during exploration. */
  performance: PerformanceMetrics;

  /** Arbitrary metadata. */
  metadata: NodeMetadata;

  /** ISO 8601 timestamp of when this node was last observed. */
  lastObserved?: string;
}

type NodeType =
  | 'screen'
  | 'modal'
  | 'drawer'
  | 'toast'
  | 'bottomSheet'
  | 'component';

interface AccessibilityInfo {
  /** Overall score (0-100). Null if not audited. */
  score: number | null;
  /** List of accessibility violations. */
  violations: AccessibilityViolation[];
}

interface AccessibilityViolation {
  rule: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  element: string;
  description: string;
}

interface PerformanceMetrics {
  /** Time to interactive in milliseconds. */
  loadTimeMs: number | null;
  /** Largest Contentful Paint in milliseconds. */
  lcpMs: number | null;
  /** Cumulative Layout Shift score. */
  cls: number | null;
  /** First Input Delay in milliseconds. */
  fidMs: number | null;
  /** Total Blocking Time in milliseconds. */
  tbtMs: number | null;
}

interface NodeMetadata {
  /** Page/screen title (document.title or equivalent). */
  title: string;
  /** Description from meta tags, PRD, or code comments. */
  description?: string;
  /** Whether authentication is required to access this node. */
  authRequired: boolean;
  /** Roles that may access this node. Empty array = any authenticated user. */
  requiredRoles: string[];
  /** Arbitrary key-value pairs for extensions. */
  custom: Record<string, unknown>;
}
```

### 3.2 Concrete Node Types

```typescript
interface ScreenNode extends AKGNodeBase {
  type: 'screen';
  /** Route path (e.g., "/dashboard", "/users/:id"). */
  route: string;
  /** HTTP method if relevant (typically GET). */
  method?: string;
  /** Query parameters observed or defined. */
  queryParams?: ParamDefinition[];
  /** Path parameters defined in the route. */
  pathParams?: ParamDefinition[];
}

interface ModalNode extends AKGNodeBase {
  type: 'modal';
  /** ID of the parent node this modal appears over. */
  parentNodeId: string;
  /** How the modal is dismissed (close button, backdrop click, escape key). */
  dismissMethods: DismissMethod[];
}

interface DrawerNode extends AKGNodeBase {
  type: 'drawer';
  /** ID of the parent node this drawer appears over. */
  parentNodeId: string;
  /** Position of the drawer. */
  position: 'left' | 'right' | 'top' | 'bottom';
  dismissMethods: DismissMethod[];
}

interface ToastNode extends AKGNodeBase {
  type: 'toast';
  /** Duration in milliseconds before auto-dismiss. Null if persistent. */
  durationMs: number | null;
  /** Severity/variant of the toast. */
  variant: 'info' | 'success' | 'warning' | 'error' | string;
  /** ID of the node where this toast was observed. */
  contextNodeId: string;
}

interface BottomSheetNode extends AKGNodeBase {
  type: 'bottomSheet';
  parentNodeId: string;
  /** Snap points as percentages of screen height. */
  snapPoints?: number[];
  dismissMethods: DismissMethod[];
}

interface ComponentNode extends AKGNodeBase {
  type: 'component';
  /** Component name from source code. */
  componentName: string;
  /** File path in source code. */
  filePath?: string;
  /** IDs of nodes where this component appears. */
  usedInNodes: string[];
}

// Supporting types

interface ParamDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required: boolean;
  enumValues?: string[];
  description?: string;
}

type DismissMethod = 'closeButton' | 'backdropClick' | 'escapeKey' | 'swipeDown' | 'programmatic';
```

### 3.3 Union Type

```typescript
type AKGNode =
  | ScreenNode
  | ModalNode
  | DrawerNode
  | ToastNode
  | BottomSheetNode
  | ComponentNode;
```

---

## 4. Edge Types

### 4.1 Base Edge Interface

```typescript
interface AKGEdgeBase {
  /** Unique identifier. */
  id: string;

  /** Discriminant for edge type. */
  type: EdgeType;

  /** Source node ID. */
  from: string;

  /** Target node ID. */
  to: string;

  /** How this edge was discovered. */
  source: AKGSource;

  /** What user action triggers this transition. */
  trigger: EdgeTrigger;

  /** The element acted upon to trigger this edge. Null for programmatic transitions. */
  elementId: string | null;

  /** Whether this transition requires authentication. */
  requiresAuth: boolean;

  /** Roles required for this transition. */
  requiredRoles: string[];

  /** API calls made during this transition. */
  apiCalls: ApiCallReference[];

  /** Client-side state changes during this transition. */
  stateChanges: StateChange[];

  /** Time taken for the transition in milliseconds. */
  timingMs: number | null;

  /** Arbitrary metadata. */
  metadata: Record<string, unknown>;
}

type EdgeType =
  | 'navigation'
  | 'formSubmit'
  | 'apiCall'
  | 'stateChange'
  | 'redirect'
  | 'modalTrigger'
  | 'error';

type EdgeTrigger =
  | 'click'
  | 'type'
  | 'submit'
  | 'hover'
  | 'swipe'
  | 'longPress'
  | 'keyPress'
  | 'scroll'
  | 'programmatic'
  | 'timer'
  | 'pageLoad'
  | string;   // Extensible

interface ApiCallReference {
  /** Reference to an ApiEndpoint.id in the API layer. */
  endpointId: string;
  /** HTTP method. */
  method: string;
  /** Request path (resolved). */
  path: string;
  /** HTTP status code observed. */
  statusCode?: number;
  /** Response time in milliseconds. */
  responseTimeMs?: number;
}

interface StateChange {
  /** State key or path (e.g., "auth.user", "cart.items"). */
  key: string;
  /** Type of mutation. */
  operation: 'set' | 'update' | 'delete' | 'push' | 'pop';
  /** Human-readable description. */
  description?: string;
}
```

### 4.2 Concrete Edge Types

```typescript
interface NavigationEdge extends AKGEdgeBase {
  type: 'navigation';
  /** Whether this is a client-side (SPA) or full page navigation. */
  navigationType: 'spa' | 'fullPage' | 'backButton' | 'deepLink';
  /** Resolved URL after navigation. */
  resolvedUrl?: string;
}

interface FormSubmitEdge extends AKGEdgeBase {
  type: 'formSubmit';
  /** Form fields submitted. */
  formFields: FormFieldInfo[];
  /** HTTP method of the form submission. */
  formMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Whether the form uses multipart encoding. */
  isMultipart: boolean;
  /** Validation errors observed. */
  validationErrors?: string[];
}

interface ApiCallEdge extends AKGEdgeBase {
  type: 'apiCall';
  /** The primary API endpoint triggered. */
  endpoint: ApiCallReference;
  /** Whether this is a background/async call. */
  isAsync: boolean;
}

interface StateChangeEdge extends AKGEdgeBase {
  type: 'stateChange';
  /** State management system (redux, zustand, context, etc.). */
  stateSystem?: string;
}

interface RedirectEdge extends AKGEdgeBase {
  type: 'redirect';
  /** HTTP status code for server redirects. */
  httpStatus?: 301 | 302 | 303 | 307 | 308;
  /** Whether this is a server-side or client-side redirect. */
  redirectType: 'server' | 'client';
}

interface ModalTriggerEdge extends AKGEdgeBase {
  type: 'modalTrigger';
  /** What kind of overlay is opened. */
  targetNodeType: 'modal' | 'drawer' | 'bottomSheet' | 'toast';
}

interface ErrorEdge extends AKGEdgeBase {
  type: 'error';
  /** Error type classification. */
  errorType: 'network' | 'validation' | 'auth' | 'server' | 'client' | 'unknown';
  /** HTTP status code if applicable. */
  httpStatus?: number;
  /** Error message observed. */
  errorMessage?: string;
}

interface FormFieldInfo {
  name: string;
  inputType: string;
  required: boolean;
  label?: string;
  validation?: string;
}
```

### 4.3 Union Type

```typescript
type AKGEdge =
  | NavigationEdge
  | FormSubmitEdge
  | ApiCallEdge
  | StateChangeEdge
  | RedirectEdge
  | ModalTriggerEdge
  | ErrorEdge;
```

---

## 5. Element Types

Elements represent interactive and visible items within a node.

### 5.1 Base Element Interface

```typescript
interface AKGElementBase {
  /** Unique identifier within the parent node. */
  id: string;

  /** Discriminant for element type. */
  type: ElementType;

  /** CSS selector or platform-specific locator. */
  selector: string;

  /** Human-readable label (text content, aria-label, or placeholder). */
  label: string;

  /** Current visibility/interaction state. */
  state: ElementState;

  /** Whether this element can be interacted with (clicked, typed into, etc.). */
  isInteractive: boolean;

  /**
   * Whether this element appears interactive but produces no observable effect
   * when activated. Detected during exploration only.
   */
  isDead: boolean;

  /** ARIA attributes for accessibility. */
  aria: AriaAttributes;

  /** Bounding box coordinates from exploration. */
  boundingBox?: BoundingBox;
}

type ElementType =
  | 'button'
  | 'link'
  | 'input'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'text'
  | 'image'
  | 'icon'
  | 'toggle'
  | string;   // Extensible

type ElementState = 'enabled' | 'disabled' | 'hidden' | 'loading' | 'readonly';

interface AriaAttributes {
  role?: string;
  label?: string;
  describedBy?: string;
  expanded?: boolean;
  checked?: boolean;
  selected?: boolean;
  required?: boolean;
  invalid?: boolean;
  live?: 'polite' | 'assertive' | 'off';
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### 5.2 Concrete Element Types

```typescript
interface ButtonElement extends AKGElementBase {
  type: 'button';
  buttonType: 'submit' | 'reset' | 'button';
  /** Edge IDs triggered by clicking this button. */
  triggersEdges: string[];
}

interface LinkElement extends AKGElementBase {
  type: 'link';
  href: string;
  /** Whether this link navigates to an external domain. */
  isExternal: boolean;
  /** Edge ID triggered by clicking this link. */
  triggersEdge?: string;
}

interface InputElement extends AKGElementBase {
  type: 'input';
  inputType: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'file' | string;
  placeholder?: string;
  /** Validation pattern or rules. */
  validation?: string;
  /** Maximum length. */
  maxLength?: number;
  /** Whether autocomplete is enabled. */
  autocomplete?: string;
}

interface SelectElement extends AKGElementBase {
  type: 'select';
  options: { value: string; label: string }[];
  isMultiple: boolean;
}

interface CheckboxElement extends AKGElementBase {
  type: 'checkbox';
  checked: boolean;
  /** Group name if part of a group. */
  groupName?: string;
}

interface TextElement extends AKGElementBase {
  type: 'text';
  /** Text content (truncated for large blocks). */
  textContent: string;
  /** Semantic tag (h1, h2, p, span, etc.). */
  semanticTag: string;
}

interface ImageElement extends AKGElementBase {
  type: 'image';
  src: string;
  alt: string;
  /** Whether the image loaded successfully during exploration. */
  loaded: boolean;
}

interface IconElement extends AKGElementBase {
  type: 'icon';
  /** Icon library and name if detectable (e.g., "lucide:search"). */
  iconName?: string;
}
```

### 5.3 Union Type

```typescript
type AKGElement =
  | ButtonElement
  | LinkElement
  | InputElement
  | SelectElement
  | CheckboxElement
  | TextElement
  | ImageElement
  | IconElement
  | AKGElementBase;  // Catch-all for custom/unknown elements
```

---

## 6. API Layer

The API layer captures all HTTP endpoints the application interacts with.

### 6.1 API Endpoint

```typescript
interface ApiEndpoint {
  /** Unique identifier (deterministic from method + path). */
  id: string;

  /** HTTP method. */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

  /** Path pattern (e.g., "/api/users/:id"). */
  path: string;

  /** Base URL if different from app's baseUrl. */
  baseUrl?: string;

  /** How this endpoint was discovered. */
  source: AKGSource;

  /** Request shape (JSON Schema or simplified). */
  requestShape?: SchemaDefinition;

  /** Response shape (JSON Schema or simplified). */
  responseShape?: SchemaDefinition;

  /** Content type. */
  contentType: string;

  /** Whether authentication is required. */
  authRequired: boolean;

  /** Required roles. */
  requiredRoles: string[];

  /** Node IDs that call this endpoint on load. */
  calledOnLoadBy: string[];

  /** Edge IDs that trigger this endpoint. */
  calledByEdges: string[];

  /** Observed response times in milliseconds [min, median, max]. */
  responseTimesMs?: [number, number, number];

  /** Observed status codes and their counts. */
  observedStatusCodes?: Record<number, number>;
}

interface SchemaDefinition {
  /** JSON Schema or a simplified type description. */
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, SchemaDefinition>;
  items?: SchemaDefinition;
  required?: string[];
  description?: string;
}
```

### 6.2 API Reconciliation Flags

```typescript
interface ApiReconciliation {
  /** Endpoints defined in code but never observed at runtime. */
  deadEndpoints: string[];

  /** Endpoints observed at runtime but not found in code. */
  undocumentedEndpoints: string[];

  /** Endpoints where code says auth required but exploration accessed without auth. */
  authMismatches: Array<{
    endpointId: string;
    codeRequiresAuth: boolean;
    explorationRequiredAuth: boolean;
  }>;
}
```

---

## 7. Source Reconciliation Rules

Source reconciliation is the heart of AKG's value. When code and exploration disagree, the discrepancy itself is a **finding**.

### 7.1 Formal Rules

| # | Code Says | Exploration Says | Finding | Severity |
|---|-----------|-----------------|---------|----------|
| R1 | Route exists | Route not reachable | **Dead Route** — unreachable screen | `warning` |
| R2 | No route | Screen exists | **Dynamic/Untracked Screen** — investigate | `info` |
| R3 | Endpoint defined | Endpoint never called | **Dead Endpoint** — unused API | `info` |
| R4 | No endpoint | Endpoint called | **Undocumented Endpoint** — shadow API | `warning` |
| R5 | Element is interactive | Element produces no effect | **Dead Element** — broken handler | `warning` |
| R6 | Auth required | Accessible without auth | **Auth Bypass** | `critical` |
| R7 | Role X required | Accessible by role Y | **Authorization Gap** | `critical` |
| R8 | Element exists | Element not found in DOM | **Missing Element** | `warning` |
| R9 | No element | Element present at runtime | **Dynamic Element** — not in static analysis | `info` |
| R10 | Navigation A→B | Navigation A→B fails or goes to C | **Broken Navigation** | `error` |
| R11 | Form has validation | Validation not enforced at runtime | **Validation Gap** | `warning` |
| R12 | Documented in PRD | Not in code or exploration | **Unimplemented Feature** | `info` |

### 7.2 Finding Interface

```typescript
interface AKGFinding {
  id: string;
  ruleId: string;                // e.g., "R6"
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  /** The node, edge, element, or endpoint this finding relates to. */
  subjectType: 'node' | 'edge' | 'element' | 'endpoint';
  subjectId: string;
  /** What the code layer says. */
  codeValue?: unknown;
  /** What the exploration layer says. */
  explorationValue?: unknown;
  /** What documentation says. */
  documentationValue?: unknown;
  /** ISO 8601 timestamp. */
  detectedAt: string;
}
```

---

## 8. Graph Operations

Implementations of AKG SHOULD support the following standard operations.

### 8.1 Traversal

```typescript
/**
 * Find all paths between two nodes.
 * @param from - Source node ID
 * @param to - Target node ID
 * @param maxDepth - Maximum path length (default: 10)
 * @returns Array of paths, each path being an ordered array of edge IDs
 */
function traverse(from: string, to: string, maxDepth?: number): string[][];
```

### 8.2 Reachability

```typescript
/**
 * Determine all nodes reachable from a given node.
 * @param nodeId - Starting node ID
 * @param options - Filter by auth state, role, edge type, etc.
 * @returns Set of reachable node IDs
 */
function reachability(nodeId: string, options?: {
  authenticated?: boolean;
  role?: string;
  edgeTypes?: EdgeType[];
  maxDepth?: number;
}): Set<string>;
```

### 8.3 Unreachable Nodes

```typescript
/**
 * Find nodes with no incoming edges (except the designated entry point).
 * These are potentially dead screens.
 * @param entryNodeId - The application's entry point node ID
 * @returns Array of unreachable node IDs
 */
function unreachable(entryNodeId: string): string[];
```

### 8.4 Dead Elements

```typescript
/**
 * Find all interactive elements that produce no observable effect.
 * Only meaningful when exploration data is present.
 * @returns Array of {nodeId, elementId} pairs
 */
function deadElements(): Array<{ nodeId: string; elementId: string }>;
```

### 8.5 Security Audit

```typescript
/**
 * Find nodes that require authentication in code but are reachable
 * without authentication in the exploration layer.
 * @returns Array of findings with severity 'critical'
 */
function securityAudit(): AKGFinding[];
```

### 8.6 Diff

```typescript
/**
 * Compute the structural and behavioral difference between two AKG snapshots.
 * @returns A diff object describing added, removed, and modified entities
 */
function diff(akg1: ApplicationKnowledgeGraph, akg2: ApplicationKnowledgeGraph): AKGDiff;

interface AKGDiff {
  nodes: {
    added: AKGNode[];
    removed: AKGNode[];
    modified: Array<{ id: string; changes: Record<string, { before: unknown; after: unknown }> }>;
  };
  edges: {
    added: AKGEdge[];
    removed: AKGEdge[];
    modified: Array<{ id: string; changes: Record<string, { before: unknown; after: unknown }> }>;
  };
  endpoints: {
    added: ApiEndpoint[];
    removed: ApiEndpoint[];
    modified: Array<{ id: string; changes: Record<string, { before: unknown; after: unknown }> }>;
  };
  findings: {
    new: AKGFinding[];
    resolved: AKGFinding[];
  };
  summary: {
    nodesAdded: number;
    nodesRemoved: number;
    edgesAdded: number;
    edgesRemoved: number;
    newFindings: number;
    resolvedFindings: number;
  };
}
```

### 8.7 Coverage

```typescript
/**
 * Given a test suite (as a set of node/edge IDs exercised), compute coverage.
 * @returns Coverage metrics
 */
function coverage(exercisedNodeIds: Set<string>, exercisedEdgeIds: Set<string>): {
  nodeCoverage: number;       // 0.0 - 1.0
  edgeCoverage: number;       // 0.0 - 1.0
  uncoveredNodes: string[];
  uncoveredEdges: string[];
  /** Nodes reachable from entry but never tested. */
  reachableUntested: string[];
};
```

### 8.8 Complexity

```typescript
/**
 * Compute structural complexity metrics for the graph.
 */
function complexity(): {
  totalNodes: number;
  totalEdges: number;
  /** Maximum depth from entry point. */
  maxDepth: number;
  /** Average outgoing edges per node. */
  avgBranchingFactor: number;
  /** Number of cycles in the graph. */
  cycleCount: number;
  /** Nodes involved in cycles. */
  cyclicNodes: string[];
  /** Longest path from entry to any leaf. */
  longestPath: string[];
  /** Number of strongly connected components. */
  sccCount: number;
};
```

---

## 9. Serialization Format

### 9.1 Top-Level Schema

The primary serialization format is JSON.

```typescript
interface ApplicationKnowledgeGraph {
  /** AKG specification version. */
  specVersion: string;

  /** Metadata about the application and this snapshot. */
  metadata: AKGMetadata;

  /** All nodes in the graph. */
  nodes: AKGNode[];

  /** All edges in the graph. */
  edges: AKGEdge[];

  /** All API endpoints. */
  endpoints: ApiEndpoint[];

  /** Findings from source reconciliation. */
  findings: AKGFinding[];

  /** API reconciliation summary. */
  apiReconciliation: ApiReconciliation;

  /** The designated entry point node ID. */
  entryNodeId: string;
}
```

### 9.2 Versioning

The specification itself uses [Semantic Versioning](https://semver.org/):

- **MAJOR** — Breaking changes to the schema
- **MINOR** — New node/edge/element types, new fields (backward compatible)
- **PATCH** — Clarifications, typo fixes, non-structural changes

Current version: **0.1.0**

### 9.3 Realistic Example

The following is a condensed but realistic AKG for a simple e-commerce application with 6 screens and 10 edges.

```json
{
  "specVersion": "0.1.0",
  "metadata": {
    "specVersion": "0.1.0",
    "appName": "ShopDemo",
    "appVersion": "a1b2c3d",
    "generatedAt": "2026-02-11T13:00:00Z",
    "generatedBy": "shiprite-agent/0.1.0",
    "baseUrl": "https://shop-demo.example.com",
    "platform": "web",
    "tags": { "framework": "next.js", "env": "staging" }
  },
  "entryNodeId": "screen:home",
  "nodes": [
    {
      "id": "screen:home",
      "type": "screen",
      "name": "Home Page",
      "route": "/",
      "source": "both",
      "elements": [
        {
          "id": "el:home:search",
          "type": "input",
          "selector": "input[name='search']",
          "label": "Search products",
          "state": "enabled",
          "isInteractive": true,
          "isDead": false,
          "inputType": "search",
          "placeholder": "Search products...",
          "aria": { "role": "searchbox", "label": "Search products" }
        },
        {
          "id": "el:home:nav-login",
          "type": "link",
          "selector": "a[href='/login']",
          "label": "Log In",
          "state": "enabled",
          "isInteractive": true,
          "isDead": false,
          "href": "/login",
          "isExternal": false,
          "triggersEdge": "edge:home-to-login",
          "aria": { "role": "link" }
        },
        {
          "id": "el:home:nav-products",
          "type": "link",
          "selector": "a[href='/products']",
          "label": "Browse Products",
          "state": "enabled",
          "isInteractive": true,
          "isDead": false,
          "href": "/products",
          "isExternal": false,
          "triggersEdge": "edge:home-to-products",
          "aria": { "role": "link" }
        }
      ],
      "onLoadApiCalls": [
        { "endpointId": "api:get-featured", "method": "GET", "path": "/api/products/featured", "statusCode": 200, "responseTimeMs": 120 }
      ],
      "screenshot": "screenshots/home.png",
      "accessibility": { "score": 92, "violations": [] },
      "performance": { "loadTimeMs": 1200, "lcpMs": 800, "cls": 0.02, "fidMs": null, "tbtMs": 150 },
      "metadata": { "title": "ShopDemo - Home", "authRequired": false, "requiredRoles": [], "custom": {} }
    },
    {
      "id": "screen:login",
      "type": "screen",
      "name": "Login Page",
      "route": "/login",
      "source": "both",
      "elements": [
        {
          "id": "el:login:email",
          "type": "input",
          "selector": "input[name='email']",
          "label": "Email",
          "state": "enabled",
          "isInteractive": true,
          "isDead": false,
          "inputType": "email",
          "placeholder": "you@example.com",
          "validation": "required,email",
          "aria": { "role": "textbox", "label": "Email", "required": true }
        },
        {
          "id": "el:login:password",
          "type": "input",
          "selector": "input[name='password']",
          "label": "Password",
          "state": "enabled",
          "isInteractive": true,
          "isDead": false,
          "inputType": "password",
          "aria": { "role": "textbox", "label": "Password", "required": true }
        },
        {
          "id": "el:login:submit",
          "type": "button",
          "selector": "button[type='submit']",
          "label": "Sign In",
          "state": "enabled",
          "isInteractive": true,
          "isDead": false,
          "buttonType": "submit",
          "triggersEdges": ["edge:login-submit"],
          "aria": { "role": "button" }
        }
      ],
      "onLoadApiCalls": [],
      "accessibility": { "score": 88, "violations": [{ "rule": "color-contrast", "impact": "moderate", "element": "a.forgot-password", "description": "Text contrast ratio 3.8:1 is below 4.5:1 minimum" }] },
      "performance": { "loadTimeMs": 600, "lcpMs": 400, "cls": 0.0, "fidMs": null, "tbtMs": 50 },
      "metadata": { "title": "Sign In - ShopDemo", "authRequired": false, "requiredRoles": [], "custom": {} }
    },
    {
      "id": "screen:products",
      "type": "screen",
      "name": "Product Listing",
      "route": "/products",
      "source": "both",
      "elements": [
        {
          "id": "el:products:filter-btn",
          "type": "button",
          "selector": "button.filter-toggle",
          "label": "Filters",
          "state": "enabled",
          "isInteractive": true,
          "isDead": false,
          "buttonType": "button",
          "triggersEdges": ["edge:open-filters"],
          "aria": { "role": "button", "expanded": false }
        }
      ],
      "onLoadApiCalls": [
        { "endpointId": "api:list-products", "method": "GET", "path": "/api/products", "statusCode": 200, "responseTimeMs": 250 }
      ],
      "accessibility": { "score": 95, "violations": [] },
      "performance": { "loadTimeMs": 1800, "lcpMs": 1500, "cls": 0.05, "fidMs": null, "tbtMs": 200 },
      "metadata": { "title": "Products - ShopDemo", "authRequired": false, "requiredRoles": [], "custom": {} }
    },
    {
      "id": "screen:product-detail",
      "type": "screen",
      "name": "Product Detail",
      "route": "/products/:id",
      "source": "both",
      "pathParams": [{ "name": "id", "type": "string", "required": true }],
      "elements": [
        {
          "id": "el:pd:add-to-cart",
          "type": "button",
          "selector": "button.add-to-cart",
          "label": "Add to Cart",
          "state": "enabled",
          "isInteractive": true,
          "isDead": false,
          "buttonType": "button",
          "triggersEdges": ["edge:add-to-cart"],
          "aria": { "role": "button" }
        }
      ],
      "onLoadApiCalls": [
        { "endpointId": "api:get-product", "method": "GET", "path": "/api/products/42", "statusCode": 200, "responseTimeMs": 95 }
      ],
      "accessibility": { "score": 90, "violations": [] },
      "performance": { "loadTimeMs": 900, "lcpMs": 700, "cls": 0.01, "fidMs": null, "tbtMs": 80 },
      "metadata": { "title": "Widget Pro - ShopDemo", "authRequired": false, "requiredRoles": [], "custom": {} }
    },
    {
      "id": "screen:cart",
      "type": "screen",
      "name": "Shopping Cart",
      "route": "/cart",
      "source": "both",
      "elements": [
        {
          "id": "el:cart:checkout-btn",
          "type": "button",
          "selector": "button.checkout",
          "label": "Proceed to Checkout",
          "state": "enabled",
          "isInteractive": true,
          "isDead": false,
          "buttonType": "button",
          "triggersEdges": ["edge:cart-to-checkout"],
          "aria": { "role": "button" }
        }
      ],
      "onLoadApiCalls": [
        { "endpointId": "api:get-cart", "method": "GET", "path": "/api/cart", "statusCode": 200, "responseTimeMs": 110 }
      ],
      "accessibility": { "score": 91, "violations": [] },
      "performance": { "loadTimeMs": 700, "lcpMs": 500, "cls": 0.0, "fidMs": null, "tbtMs": 60 },
      "metadata": { "title": "Cart - ShopDemo", "authRequired": true, "requiredRoles": [], "custom": {} }
    },
    {
      "id": "screen:checkout",
      "type": "screen",
      "name": "Checkout",
      "route": "/checkout",
      "source": "code",
      "elements": [],
      "onLoadApiCalls": [],
      "accessibility": { "score": null, "violations": [] },
      "performance": { "loadTimeMs": null, "lcpMs": null, "cls": null, "fidMs": null, "tbtMs": null },
      "metadata": { "title": "Checkout - ShopDemo", "authRequired": true, "requiredRoles": [], "custom": {} }
    },
    {
      "id": "drawer:filters",
      "type": "drawer",
      "name": "Product Filters",
      "parentNodeId": "screen:products",
      "position": "left",
      "dismissMethods": ["closeButton", "backdropClick", "escapeKey"],
      "source": "exploration",
      "elements": [
        {
          "id": "el:filters:price-range",
          "type": "input",
          "selector": "input[name='priceMax']",
          "label": "Max Price",
          "state": "enabled",
          "isInteractive": true,
          "isDead": false,
          "inputType": "number",
          "aria": { "role": "spinbutton", "label": "Maximum price" }
        }
      ],
      "onLoadApiCalls": [],
      "accessibility": { "score": 85, "violations": [] },
      "performance": { "loadTimeMs": null, "lcpMs": null, "cls": null, "fidMs": null, "tbtMs": null },
      "metadata": { "title": "Filters", "authRequired": false, "requiredRoles": [], "custom": {} }
    }
  ],
  "edges": [
    {
      "id": "edge:home-to-login",
      "type": "navigation",
      "from": "screen:home",
      "to": "screen:login",
      "source": "both",
      "trigger": "click",
      "elementId": "el:home:nav-login",
      "requiresAuth": false,
      "requiredRoles": [],
      "apiCalls": [],
      "stateChanges": [],
      "timingMs": 350,
      "navigationType": "spa",
      "metadata": {}
    },
    {
      "id": "edge:home-to-products",
      "type": "navigation",
      "from": "screen:home",
      "to": "screen:products",
      "source": "both",
      "trigger": "click",
      "elementId": "el:home:nav-products",
      "requiresAuth": false,
      "requiredRoles": [],
      "apiCalls": [],
      "stateChanges": [],
      "timingMs": 420,
      "navigationType": "spa",
      "metadata": {}
    },
    {
      "id": "edge:login-submit",
      "type": "formSubmit",
      "from": "screen:login",
      "to": "screen:home",
      "source": "both",
      "trigger": "submit",
      "elementId": "el:login:submit",
      "requiresAuth": false,
      "requiredRoles": [],
      "apiCalls": [
        { "endpointId": "api:login", "method": "POST", "path": "/api/auth/login", "statusCode": 200, "responseTimeMs": 380 }
      ],
      "stateChanges": [
        { "key": "auth.user", "operation": "set", "description": "Set authenticated user" },
        { "key": "auth.token", "operation": "set", "description": "Store JWT token" }
      ],
      "timingMs": 900,
      "formMethod": "POST",
      "formFields": [
        { "name": "email", "inputType": "email", "required": true, "label": "Email" },
        { "name": "password", "inputType": "password", "required": true, "label": "Password" }
      ],
      "isMultipart": false,
      "metadata": {}
    },
    {
      "id": "edge:login-error",
      "type": "error",
      "from": "screen:login",
      "to": "screen:login",
      "source": "exploration",
      "trigger": "submit",
      "elementId": "el:login:submit",
      "requiresAuth": false,
      "requiredRoles": [],
      "apiCalls": [
        { "endpointId": "api:login", "method": "POST", "path": "/api/auth/login", "statusCode": 401 }
      ],
      "stateChanges": [],
      "timingMs": 200,
      "errorType": "auth",
      "httpStatus": 401,
      "errorMessage": "Invalid email or password",
      "metadata": {}
    },
    {
      "id": "edge:products-to-detail",
      "type": "navigation",
      "from": "screen:products",
      "to": "screen:product-detail",
      "source": "both",
      "trigger": "click",
      "elementId": null,
      "requiresAuth": false,
      "requiredRoles": [],
      "apiCalls": [],
      "stateChanges": [],
      "timingMs": 300,
      "navigationType": "spa",
      "metadata": { "note": "Click on any product card" }
    },
    {
      "id": "edge:open-filters",
      "type": "modalTrigger",
      "from": "screen:products",
      "to": "drawer:filters",
      "source": "exploration",
      "trigger": "click",
      "elementId": "el:products:filter-btn",
      "requiresAuth": false,
      "requiredRoles": [],
      "apiCalls": [],
      "stateChanges": [
        { "key": "ui.filtersOpen", "operation": "set", "description": "Toggle filter drawer" }
      ],
      "timingMs": 150,
      "targetNodeType": "drawer",
      "metadata": {}
    },
    {
      "id": "edge:add-to-cart",
      "type": "apiCall",
      "from": "screen:product-detail",
      "to": "screen:product-detail",
      "source": "both",
      "trigger": "click",
      "elementId": "el:pd:add-to-cart",
      "requiresAuth": true,
      "requiredRoles": [],
      "apiCalls": [
        { "endpointId": "api:add-to-cart", "method": "POST", "path": "/api/cart/items", "statusCode": 201, "responseTimeMs": 200 }
      ],
      "stateChanges": [
        { "key": "cart.items", "operation": "push", "description": "Add product to cart" },
        { "key": "cart.count", "operation": "update", "description": "Increment cart count" }
      ],
      "timingMs": 250,
      "endpoint": { "endpointId": "api:add-to-cart", "method": "POST", "path": "/api/cart/items", "statusCode": 201 },
      "isAsync": false,
      "metadata": {}
    },
    {
      "id": "edge:pd-to-cart",
      "type": "navigation",
      "from": "screen:product-detail",
      "to": "screen:cart",
      "source": "both",
      "trigger": "click",
      "elementId": null,
      "requiresAuth": true,
      "requiredRoles": [],
      "apiCalls": [],
      "stateChanges": [],
      "timingMs": 380,
      "navigationType": "spa",
      "metadata": { "note": "Via cart icon in header" }
    },
    {
      "id": "edge:cart-to-checkout",
      "type": "navigation",
      "from": "screen:cart",
      "to": "screen:checkout",
      "source": "code",
      "trigger": "click",
      "elementId": "el:cart:checkout-btn",
      "requiresAuth": true,
      "requiredRoles": [],
      "apiCalls": [],
      "stateChanges": [],
      "timingMs": null,
      "navigationType": "spa",
      "metadata": {}
    },
    {
      "id": "edge:unauth-redirect",
      "type": "redirect",
      "from": "screen:cart",
      "to": "screen:login",
      "source": "exploration",
      "trigger": "pageLoad",
      "elementId": null,
      "requiresAuth": false,
      "requiredRoles": [],
      "apiCalls": [],
      "stateChanges": [],
      "timingMs": 100,
      "redirectType": "client",
      "metadata": { "note": "Redirect when accessing cart without auth" }
    }
  ],
  "endpoints": [
    {
      "id": "api:get-featured",
      "method": "GET",
      "path": "/api/products/featured",
      "source": "both",
      "contentType": "application/json",
      "authRequired": false,
      "requiredRoles": [],
      "calledOnLoadBy": ["screen:home"],
      "calledByEdges": [],
      "responseTimesMs": [95, 120, 180]
    },
    {
      "id": "api:login",
      "method": "POST",
      "path": "/api/auth/login",
      "source": "both",
      "contentType": "application/json",
      "authRequired": false,
      "requiredRoles": [],
      "calledOnLoadBy": [],
      "calledByEdges": ["edge:login-submit", "edge:login-error"],
      "requestShape": {
        "type": "object",
        "properties": {
          "email": { "type": "string" },
          "password": { "type": "string" }
        },
        "required": ["email", "password"]
      }
    },
    {
      "id": "api:list-products",
      "method": "GET",
      "path": "/api/products",
      "source": "both",
      "contentType": "application/json",
      "authRequired": false,
      "requiredRoles": [],
      "calledOnLoadBy": ["screen:products"],
      "calledByEdges": [],
      "responseTimesMs": [180, 250, 400]
    },
    {
      "id": "api:get-product",
      "method": "GET",
      "path": "/api/products/:id",
      "source": "both",
      "contentType": "application/json",
      "authRequired": false,
      "requiredRoles": [],
      "calledOnLoadBy": ["screen:product-detail"],
      "calledByEdges": []
    },
    {
      "id": "api:add-to-cart",
      "method": "POST",
      "path": "/api/cart/items",
      "source": "both",
      "contentType": "application/json",
      "authRequired": true,
      "requiredRoles": [],
      "calledOnLoadBy": [],
      "calledByEdges": ["edge:add-to-cart"]
    },
    {
      "id": "api:get-cart",
      "method": "GET",
      "path": "/api/cart",
      "source": "both",
      "contentType": "application/json",
      "authRequired": true,
      "requiredRoles": [],
      "calledOnLoadBy": ["screen:cart"],
      "calledByEdges": []
    },
    {
      "id": "api:delete-user",
      "method": "DELETE",
      "path": "/api/admin/users/:id",
      "source": "code",
      "contentType": "application/json",
      "authRequired": true,
      "requiredRoles": ["admin"],
      "calledOnLoadBy": [],
      "calledByEdges": []
    }
  ],
  "findings": [
    {
      "id": "finding:001",
      "ruleId": "R1",
      "severity": "warning",
      "title": "Dead Route: /checkout",
      "description": "Route /checkout is defined in code but was never reached during exploration. The checkout button exists on the cart page but navigation was not completed — possible broken flow or requires specific cart state.",
      "subjectType": "node",
      "subjectId": "screen:checkout",
      "codeValue": { "route": "/checkout", "exists": true },
      "explorationValue": { "reached": false },
      "detectedAt": "2026-02-11T13:00:00Z"
    },
    {
      "id": "finding:002",
      "ruleId": "R3",
      "severity": "info",
      "title": "Dead Endpoint: DELETE /api/admin/users/:id",
      "description": "Endpoint defined in code but never called during exploration. May be an admin-only feature not covered by the exploration agent's role.",
      "subjectType": "endpoint",
      "subjectId": "api:delete-user",
      "codeValue": { "defined": true },
      "explorationValue": { "called": false },
      "detectedAt": "2026-02-11T13:00:00Z"
    },
    {
      "id": "finding:003",
      "ruleId": "R9",
      "severity": "info",
      "title": "Dynamic Node: Product Filters Drawer",
      "description": "Filter drawer was discovered during exploration but was not detected in static code analysis. Likely rendered dynamically or via a UI library.",
      "subjectType": "node",
      "subjectId": "drawer:filters",
      "codeValue": null,
      "explorationValue": { "observed": true },
      "detectedAt": "2026-02-11T13:00:00Z"
    }
  ],
  "apiReconciliation": {
    "deadEndpoints": ["api:delete-user"],
    "undocumentedEndpoints": [],
    "authMismatches": []
  }
}
```

---

## 10. AKG Construction Pipeline

Building an AKG is a multi-pass process. Each pass contributes a source layer that is then merged into the final graph.

### 10.1 Pass 0: Static Code Analysis (Code Layer)

**Input:** Application source code  
**Output:** Partial AKG with `source: 'code'`

**Techniques:**

| What to Extract | How |
|----------------|-----|
| Routes / pages | Parse router config (Next.js `app/` dir, React Router, Vue Router, Angular routes) |
| API endpoints | Parse Express/Fastify/NestJS route handlers, or OpenAPI specs |
| Components | AST traversal with ts-morph, Babel, or SWC |
| Auth guards | Detect middleware, HOCs, or decorators that enforce authentication |
| Form definitions | Parse form schemas (Zod, Yup, Formik, react-hook-form) |
| State management | Detect Redux slices, Zustand stores, Context providers |
| Navigation calls | Find `router.push()`, `Link` components, `navigate()` calls |

**Tooling:** [ts-morph](https://ts-morph.com/), Babel AST, tree-sitter, custom framework extractors.

### 10.2 Pass 1: Runtime Exploration (Exploration Layer)

**Input:** Running application URL (or mobile app binary)  
**Output:** Partial AKG with `source: 'exploration'`

**Process:**

1. **Launch** the application in a controlled environment.
2. **Navigate** systematically using an AI agent (LLM-driven) that:
   - Visits every discoverable link and route.
   - Fills and submits forms with generated test data.
   - Clicks all interactive elements and observes results.
   - Captures screenshots, DOM snapshots, and network traffic.
   - Records performance metrics (LCP, CLS, TBT).
   - Runs accessibility audits (axe-core) per screen.
3. **Record** every observed screen, transition, API call, and element.
4. **Detect dead elements** — elements that appear interactive but produce no observable state change, navigation, or network request when activated.

**Tooling:** [Playwright](https://playwright.dev/) (web), [Maestro](https://maestro.mobile.dev/) (mobile), custom AI exploration agent.

### 10.3 Pass 2: Merge & Reconciliation

**Input:** Code-layer AKG + Exploration-layer AKG  
**Output:** Merged AKG with reconciliation findings

**Merge algorithm:**

1. **Match nodes** by route/path (screens) or by identifier heuristics (modals, drawers).
2. **Match edges** by (from, to, trigger, elementId) tuple.
3. **Match endpoints** by (method, path) pair.
4. For matched entities, set `source: 'both'` and merge attributes (prefer exploration for runtime data, prefer code for structural data).
5. For unmatched entities, retain with original source and generate findings per reconciliation rules (Section 7).
6. **Match elements** within matched nodes by selector or label similarity.

### 10.4 Optional: Documentation Layer

**Input:** PRD documents, Figma exports, wiki pages  
**Output:** Entities with `source: 'documentation'`

NLP or LLM-based extraction of:
- Expected screens and user flows
- Business rules and validation requirements
- Role-based access expectations

Documentation-only entities that appear in neither code nor exploration surface as **"Unimplemented Feature"** findings (Rule R12).

---

## 11. Platform Support

### 11.1 Web Applications

| Framework | Route Extraction | Component Analysis | Notes |
|-----------|-----------------|-------------------|-------|
| **Next.js (App Router)** | `app/` directory structure | React component tree | Server components, layouts, parallel routes |
| **Next.js (Pages Router)** | `pages/` directory structure | React component tree | `getServerSideProps`, `getStaticProps` |
| **React + React Router** | `createBrowserRouter` / `<Route>` config | React component tree | Lazy routes, nested routes |
| **Vue + Vue Router** | Router config file | Vue SFC tree | `<router-link>`, navigation guards |
| **Angular** | `RouterModule.forRoot()` / standalone routes | Module/component tree | Guards, resolvers, lazy modules |
| **SvelteKit** | `routes/` directory structure | Svelte component tree | `+page.svelte`, `+layout.svelte` |

**Exploration:** Playwright for all web frameworks.

### 11.2 Mobile Applications

| Platform | Static Analysis | Runtime Exploration |
|----------|----------------|-------------------|
| **React Native / Expo** | React Navigation config, component tree | Maestro (preferred) or Appium |
| **iOS Native (Swift/SwiftUI)** | Storyboard/XIB parsing, SwiftUI view hierarchy | XCUITest + custom agent, or Appium |
| **Android Native (Kotlin/Compose)** | Navigation graph XML, Compose navigation | Maestro or Appium |
| **Flutter** | Router config (go_router, auto_route) | Flutter integration test driver, Appium |

### 11.3 Hybrid Considerations

- **WebViews** within native apps should be explored as nested web contexts.
- **Deep links** should be tested as entry points (not just in-app navigation).
- **Push notification flows** should be modeled as edges from an external trigger node.

---

## 12. Extension Points

The AKG specification is designed to be extended without modifying the core schema.

### 12.1 Custom Node Types

Register custom node types by using the `string` extension on `NodeType`:

```typescript
// Core types are fixed; custom types use string prefix convention
interface CustomNode extends AKGNodeBase {
  type: 'x-wizard-step';  // 'x-' prefix for custom types
  stepIndex: number;
  totalSteps: number;
}
```

**Convention:** Custom types MUST use the `x-` prefix.

### 12.2 Custom Edge Types

```typescript
interface CustomEdge extends AKGEdgeBase {
  type: 'x-websocket-message';
  messageType: string;
  payload: unknown;
}
```

### 12.3 Plugin System for Framework-Specific Extractors

```typescript
interface AKGExtractorPlugin {
  /** Unique plugin identifier. */
  name: string;

  /** Framework this plugin handles. */
  framework: string;

  /** Semantic version of the plugin. */
  version: string;

  /**
   * Given a project root, extract the code-layer partial AKG.
   */
  extractFromCode(projectRoot: string, options?: Record<string, unknown>): Promise<Partial<ApplicationKnowledgeGraph>>;

  /**
   * Optional: custom merge logic for this framework's idioms.
   */
  customMerge?(codeLayer: AKGNode[], explorationLayer: AKGNode[]): AKGNode[];
}
```

### 12.4 Metadata Extensions

All nodes, edges, and elements include a `metadata` or `custom` field (`Record<string, unknown>`) for arbitrary extension data. Consumers MUST ignore unrecognized keys rather than erroring.

---

## 13. Comparison with Existing Standards

| Standard | What It Describes | Limitations vs AKG |
|----------|------------------|--------------------|
| **OpenAPI / Swagger** | HTTP API endpoints, request/response shapes | APIs only. No screens, no transitions, no client-side behavior. |
| **XML Sitemaps** | Flat list of URLs with priority/frequency hints | No interactivity, no relationships, no elements, no auth. |
| **Storybook** | Component catalog with isolated examples | Components in isolation, not the application graph. No transitions. |
| **Playwright Trace** | Recording of a single test execution | A recording, not a structured model. Single path, not full graph. |
| **Source Maps** | Mapping between compiled and source code | Code-level mapping. No user experience, no runtime behavior. |
| **HAR (HTTP Archive)** | Network request/response log | Network only. No UI, no state, no graph structure. |
| **WCAG / axe-core** | Accessibility audit results | Accessibility only. Per-page, not cross-page. |
| **AKG** | **Full application structure as a typed graph** | **Screens + transitions + elements + APIs + auth + a11y + perf + source reconciliation** |

The key distinction: existing standards each capture one slice. AKG captures the **interconnected whole** and, critically, compares **intent (code) against reality (exploration)**.

---

## 14. Future Vision

### 14.1 Cross-Application Benchmarking

Compare AKG complexity metrics across applications:

- "Your checkout flow has 12 steps; industry median is 4."
- "Your app has 23% dead elements; similar apps average 8%."

### 14.2 AKG Marketplace

Share anonymized application archetypes:

- "E-commerce app template" → expected screens, flows, API patterns
- Use as baselines for test generation or architecture reviews

### 14.3 IDE Integration

Visualize the AKG while coding:

- Click a route in your editor → see it in the graph
- Change a component → see which screens and flows are affected
- Real-time dead code / dead route detection

### 14.4 CI/CD Integration

Generate an AKG on every build and diff against the previous version:

```yaml
# Example GitHub Actions step
- name: Generate AKG
  run: shiprite akg generate --base-url $PREVIEW_URL --code-root ./src
- name: Diff AKG
  run: shiprite akg diff --previous .akg/previous.json --current .akg/current.json
- name: Fail on critical findings
  run: shiprite akg check --severity critical --fail-on-findings
```

### 14.5 AI-Native Test Generation

With a complete AKG, an AI agent can:

- Generate exhaustive test suites by traversing all paths
- Prioritize tests by edge criticality (auth boundaries, payment flows)
- Automatically re-generate tests when the AKG changes
- Use source reconciliation findings as test targets ("test that /checkout is actually reachable")

### 14.6 Broader API Extraction

v0.1.0 extractors target REST-style HTTP endpoints (Next.js `route.ts` handlers, client-side `fetch()` calls). Future versions will expand API extraction to cover:

- **tRPC** — procedure discovery from router definitions and client calls
- **GraphQL** — query/mutation extraction from schema and client operations
- **gRPC** — service/method extraction from `.proto` definitions
- **Supabase SDK** — `.from()` table queries, `.rpc()` function calls, edge functions
- **Server Actions** — Next.js `"use server"` functions used as form actions or called directly

The `ApiEndpoint` type is already flexible enough to represent these (via the `method`, `path`, and `contentType` fields), so expanding extraction scope requires only new parser implementations, not schema changes.

### 14.7 Living Documentation

Auto-generate and keep in sync:

- Application architecture diagrams
- User flow documentation
- API dependency maps
- Onboarding guides for new engineers

---

## Appendix A: JSON Schema Reference

The canonical JSON Schema for AKG v0.1.0 will be published at:

```
https://shiprite.dev/schemas/akg/v0.1.0/schema.json
```

Implementations SHOULD validate AKG documents against this schema.

## Appendix B: MIME Type

The recommended MIME type for AKG documents is:

```
application/vnd.shiprite.akg+json
```

File extension: `.akg.json`

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **AKG** | Application Knowledge Graph — the typed graph representing an application's structure |
| **Node** | A visual state in the application (screen, modal, drawer, etc.) |
| **Edge** | A transition between nodes (navigation, form submit, API call, etc.) |
| **Element** | An interactive or visible item within a node (button, input, link, etc.) |
| **Source** | The layer that discovered an entity: code, exploration, both, or documentation |
| **Finding** | A discrepancy detected during source reconciliation |
| **Dead element** | An interactive element that produces no observable effect when activated |
| **Dead route** | A route defined in code but not reachable during exploration |
| **Pass** | A phase of AKG construction (Pass 0 = code, Pass 1 = exploration, Pass 2 = merge) |

---

*AKG Specification v0.1.0 — Copyright © 2026 ShipRite. Licensed under Apache 2.0.*
