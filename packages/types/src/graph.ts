import type { AKGNode, AKGPlatform } from './nodes.js';
import type { AKGEdge } from './edges.js';
import type { ApiEndpoint, ApiReconciliation } from './api.js';
import type { AKGFinding } from './findings.js';

/** Metadata about the application and this AKG snapshot. */
export interface AKGMetadata {
  specVersion: string;
  appName: string;
  appVersion: string;
  generatedAt: string;
  generatedBy: string;
  baseUrl: string;
  platform: AKGPlatform;
  tags: Record<string, string>;
}

/** The top-level AKG document: a complete snapshot of an application's structure. */
export interface ApplicationKnowledgeGraph {
  specVersion: string;
  metadata: AKGMetadata;
  nodes: AKGNode[];
  edges: AKGEdge[];
  endpoints: ApiEndpoint[];
  findings: AKGFinding[];
  apiReconciliation: ApiReconciliation;
  entryNodeId: string;
}
