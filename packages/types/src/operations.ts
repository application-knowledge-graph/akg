import type { AKGNode } from './nodes.js';
import type { AKGEdge, EdgeType } from './edges.js';
import type { ApiEndpoint } from './api.js';
import type { AKGFinding } from './findings.js';
import type { ApplicationKnowledgeGraph } from './graph.js';

/** Result of diffing two AKG snapshots. */
export interface AKGDiff {
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

/** Coverage metrics from exercised nodes/edges against the full graph. */
export interface CoverageResult {
  nodeCoverage: number;
  edgeCoverage: number;
  uncoveredNodes: string[];
  uncoveredEdges: string[];
  reachableUntested: string[];
}

/** Structural complexity metrics for the graph. */
export interface ComplexityResult {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  avgBranchingFactor: number;
  cycleCount: number;
  cyclicNodes: string[];
  longestPath: string[];
  sccCount: number;
}

/** Options for reachability queries. */
export interface ReachabilityOptions {
  authenticated?: boolean;
  role?: string;
  edgeTypes?: EdgeType[];
  maxDepth?: number;
}

/** Interface for framework-specific extractor plugins. */
export interface AKGExtractorPlugin {
  name: string;
  framework: string;
  version: string;
  extractFromCode(
    projectRoot: string,
    options?: Record<string, unknown>,
  ): Promise<Partial<ApplicationKnowledgeGraph>>;
  customMerge?(
    codeLayer: AKGNode[],
    explorationLayer: AKGNode[],
  ): AKGNode[];
}
