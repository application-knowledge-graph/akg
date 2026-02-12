import type {
  ApplicationKnowledgeGraph,
  AKGMetadata,
  AKGNode,
  AKGEdge,
  ApiEndpoint,
  AKGFinding,
  AKGDiff,
  CoverageResult,
  ComplexityResult,
  ReachabilityOptions,
} from '@akg/types';
import { parseAKG } from '@akg/schema';
import { traverse } from './operations/traverse.js';
import { reachability } from './operations/reachability.js';
import { findUnreachable } from './operations/unreachable.js';
import { findDeadElements } from './operations/dead-elements.js';
import { securityAudit } from './operations/security-audit.js';
import { computeDiff } from './operations/diff.js';
import { computeCoverage } from './operations/coverage.js';
import { computeComplexity } from './operations/complexity.js';

/**
 * The AKGGraph class — the heart of the AKG standard.
 * In-memory graph with O(1) lookups, graph operations, and serialization.
 */
export class AKGGraph {
  private _metadata: AKGMetadata;
  private _entryNodeId: string;
  private _nodes: Map<string, AKGNode> = new Map();
  private _edges: Map<string, AKGEdge> = new Map();
  private _endpoints: Map<string, ApiEndpoint> = new Map();
  private _findings: AKGFinding[] = [];

  // Indexes for O(1) lookups
  private _nodeByRoute: Map<string, string> = new Map();
  private _outgoingEdges: Map<string, Set<string>> = new Map();
  private _incomingEdges: Map<string, Set<string>> = new Map();

  private constructor(metadata: AKGMetadata, entryNodeId: string) {
    this._metadata = metadata;
    this._entryNodeId = entryNodeId;
  }

  // ─── Construction ───

  static fromJSON(json: unknown): AKGGraph {
    const parsed = parseAKG(json);
    const graph = new AKGGraph(parsed.metadata, parsed.entryNodeId);
    for (const node of parsed.nodes) graph.addNode(node);
    for (const edge of parsed.edges) graph.addEdge(edge);
    for (const ep of parsed.endpoints) graph.addEndpoint(ep);
    graph._findings = parsed.findings;
    return graph;
  }

  static empty(metadata: AKGMetadata, entryNodeId: string = ''): AKGGraph {
    return new AKGGraph(metadata, entryNodeId);
  }

  // ─── Mutation ───

  addNode(node: AKGNode): void {
    this._nodes.set(node.id, node);
    if (node.type === 'screen') {
      this._nodeByRoute.set((node as any).route, node.id);
    }
    if (!this._outgoingEdges.has(node.id)) {
      this._outgoingEdges.set(node.id, new Set());
    }
    if (!this._incomingEdges.has(node.id)) {
      this._incomingEdges.set(node.id, new Set());
    }
  }

  addEdge(edge: AKGEdge): void {
    this._edges.set(edge.id, edge);
    if (!this._outgoingEdges.has(edge.from)) {
      this._outgoingEdges.set(edge.from, new Set());
    }
    this._outgoingEdges.get(edge.from)!.add(edge.id);
    if (!this._incomingEdges.has(edge.to)) {
      this._incomingEdges.set(edge.to, new Set());
    }
    this._incomingEdges.get(edge.to)!.add(edge.id);
  }

  addEndpoint(endpoint: ApiEndpoint): void {
    this._endpoints.set(endpoint.id, endpoint);
  }

  addFinding(finding: AKGFinding): void {
    this._findings.push(finding);
  }

  updateNode(id: string, updates: Partial<AKGNode>): void {
    const existing = this._nodes.get(id);
    if (!existing) throw new Error(`Node not found: ${id}`);
    this._nodes.set(id, { ...existing, ...updates } as AKGNode);
  }

  set entryNodeId(id: string) {
    this._entryNodeId = id;
  }

  get entryNodeId(): string {
    return this._entryNodeId;
  }

  get metadata(): AKGMetadata {
    return this._metadata;
  }

  // ─── Lookups (O(1)) ───

  getNode(id: string): AKGNode | undefined {
    return this._nodes.get(id);
  }

  getEdge(id: string): AKGEdge | undefined {
    return this._edges.get(id);
  }

  getEndpoint(id: string): ApiEndpoint | undefined {
    return this._endpoints.get(id);
  }

  getNodeByRoute(route: string): AKGNode | undefined {
    const id = this._nodeByRoute.get(route);
    return id ? this._nodes.get(id) : undefined;
  }

  getOutgoingEdges(nodeId: string): AKGEdge[] {
    const edgeIds = this._outgoingEdges.get(nodeId);
    if (!edgeIds) return [];
    return [...edgeIds].map((id) => this._edges.get(id)!).filter(Boolean);
  }

  getIncomingEdges(nodeId: string): AKGEdge[] {
    const edgeIds = this._incomingEdges.get(nodeId);
    if (!edgeIds) return [];
    return [...edgeIds].map((id) => this._edges.get(id)!).filter(Boolean);
  }

  getAllNodes(): AKGNode[] {
    return [...this._nodes.values()];
  }

  getAllEdges(): AKGEdge[] {
    return [...this._edges.values()];
  }

  getAllEndpoints(): ApiEndpoint[] {
    return [...this._endpoints.values()];
  }

  getAllFindings(): AKGFinding[] {
    return [...this._findings];
  }

  // ─── Graph Operations ───

  traverse(from: string, to: string, maxDepth?: number): string[][] {
    return traverse(this, from, to, maxDepth);
  }

  reachability(nodeId: string, options?: ReachabilityOptions): Set<string> {
    return reachability(this, nodeId, options);
  }

  unreachable(): string[] {
    return findUnreachable(this);
  }

  deadElements(): Array<{ nodeId: string; elementId: string }> {
    return findDeadElements(this);
  }

  securityAudit(): AKGFinding[] {
    return securityAudit(this);
  }

  diff(other: AKGGraph): AKGDiff {
    return computeDiff(this.toJSON(), other.toJSON());
  }

  coverage(exercisedNodes: Set<string>, exercisedEdges: Set<string>): CoverageResult {
    return computeCoverage(this, exercisedNodes, exercisedEdges);
  }

  complexity(): ComplexityResult {
    return computeComplexity(this);
  }

  // ─── Serialization ───

  toJSON(): ApplicationKnowledgeGraph {
    return {
      specVersion: this._metadata.specVersion,
      metadata: this._metadata,
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
      endpoints: this.getAllEndpoints(),
      findings: this.getAllFindings(),
      apiReconciliation: {
        deadEndpoints: [],
        undocumentedEndpoints: [],
        authMismatches: [],
      },
      entryNodeId: this._entryNodeId,
    };
  }
}
