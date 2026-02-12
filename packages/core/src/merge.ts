import type {
  ApplicationKnowledgeGraph,
  AKGNode,
  AKGEdge,
  ApiEndpoint,
  AKGMetadata,
  ScreenNode,
} from '@akg/types';
import { AKGGraph } from './graph.js';
import { reconcile } from './reconcile.js';

/**
 * Merge two partial AKGs (code layer + exploration layer) into a single graph.
 * Matching is deterministic by ID. Unmatched entities retain their original source.
 * Matched entities get source: 'both' with merged attributes.
 */
export function mergeGraphs(
  codeGraph: ApplicationKnowledgeGraph,
  explorationGraph: ApplicationKnowledgeGraph,
  metadata?: Partial<AKGMetadata>,
): AKGGraph {
  const mergedMetadata: AKGMetadata = {
    specVersion: codeGraph.metadata.specVersion,
    appName: metadata?.appName ?? codeGraph.metadata.appName,
    appVersion: metadata?.appVersion ?? codeGraph.metadata.appVersion,
    generatedAt: new Date().toISOString(),
    generatedBy: metadata?.generatedBy ?? 'akg-merge',
    baseUrl: metadata?.baseUrl ?? codeGraph.metadata.baseUrl,
    platform: metadata?.platform ?? codeGraph.metadata.platform,
    tags: { ...codeGraph.metadata.tags, ...explorationGraph.metadata.tags },
  };

  const graph = AKGGraph.empty(mergedMetadata, codeGraph.entryNodeId || explorationGraph.entryNodeId);

  // Index exploration entities by ID
  const explorationNodes = new Map(explorationGraph.nodes.map((n) => [n.id, n]));
  const explorationEdges = new Map(explorationGraph.edges.map((e) => [e.id, e]));
  const explorationEndpoints = new Map(explorationGraph.endpoints.map((ep) => [ep.id, ep]));

  // Also index exploration screen nodes by route for fuzzy matching
  const explorationNodesByRoute = new Map<string, AKGNode>();
  for (const node of explorationGraph.nodes) {
    if (node.type === 'screen') {
      explorationNodesByRoute.set((node as ScreenNode).route, node);
    }
  }

  const matchedExplorationNodes = new Set<string>();
  const matchedExplorationEdges = new Set<string>();
  const matchedExplorationEndpoints = new Set<string>();

  // Merge nodes
  for (const codeNode of codeGraph.nodes) {
    let explorationNode = explorationNodes.get(codeNode.id);

    // Try route-based matching for screens
    if (!explorationNode && codeNode.type === 'screen') {
      explorationNode = explorationNodesByRoute.get((codeNode as ScreenNode).route) as AKGNode | undefined;
    }

    if (explorationNode) {
      matchedExplorationNodes.add(explorationNode.id);
      graph.addNode(mergeNodes(codeNode, explorationNode));
    } else {
      graph.addNode(codeNode);
    }
  }

  // Add exploration-only nodes
  for (const explorationNode of explorationGraph.nodes) {
    if (!matchedExplorationNodes.has(explorationNode.id)) {
      graph.addNode(explorationNode);
    }
  }

  // Merge edges
  for (const codeEdge of codeGraph.edges) {
    const explorationEdge = explorationEdges.get(codeEdge.id);
    if (explorationEdge) {
      matchedExplorationEdges.add(explorationEdge.id);
      graph.addEdge(mergeEdges(codeEdge, explorationEdge));
    } else {
      graph.addEdge(codeEdge);
    }
  }

  // Add exploration-only edges
  for (const explorationEdge of explorationGraph.edges) {
    if (!matchedExplorationEdges.has(explorationEdge.id)) {
      graph.addEdge(explorationEdge);
    }
  }

  // Merge endpoints
  for (const codeEndpoint of codeGraph.endpoints) {
    const explorationEndpoint = explorationEndpoints.get(codeEndpoint.id);
    if (explorationEndpoint) {
      matchedExplorationEndpoints.add(explorationEndpoint.id);
      graph.addEndpoint(mergeEndpoints(codeEndpoint, explorationEndpoint));
    } else {
      graph.addEndpoint(codeEndpoint);
    }
  }

  // Add exploration-only endpoints
  for (const explorationEndpoint of explorationGraph.endpoints) {
    if (!matchedExplorationEndpoints.has(explorationEndpoint.id)) {
      graph.addEndpoint(explorationEndpoint);
    }
  }

  // Run reconciliation to generate findings
  const findings = reconcile(graph, codeGraph, explorationGraph);
  for (const finding of findings) {
    graph.addFinding(finding);
  }

  return graph;
}

function mergeNodes(code: AKGNode, exploration: AKGNode): AKGNode {
  return {
    ...code,
    source: 'both',
    // Prefer exploration for runtime data
    elements: exploration.elements.length > 0 ? exploration.elements : code.elements,
    accessibility: exploration.accessibility.score !== null ? exploration.accessibility : code.accessibility,
    performance: exploration.performance.loadTimeMs !== null ? exploration.performance : code.performance,
    screenshot: exploration.screenshot ?? code.screenshot,
    domSnapshot: exploration.domSnapshot ?? code.domSnapshot,
    lastObserved: exploration.lastObserved ?? code.lastObserved,
    // Prefer code for structural data
    metadata: {
      ...code.metadata,
      title: exploration.metadata.title || code.metadata.title,
    },
    onLoadApiCalls: [
      ...code.onLoadApiCalls,
      ...exploration.onLoadApiCalls.filter(
        (ec) => !code.onLoadApiCalls.some((cc) => cc.endpointId === ec.endpointId),
      ),
    ],
  } as AKGNode;
}

function mergeEdges(code: AKGEdge, exploration: AKGEdge): AKGEdge {
  return {
    ...code,
    source: 'both',
    timingMs: exploration.timingMs ?? code.timingMs,
    apiCalls: [
      ...code.apiCalls,
      ...exploration.apiCalls.filter(
        (ec) => !code.apiCalls.some((cc) => cc.endpointId === ec.endpointId),
      ),
    ],
    stateChanges: [
      ...code.stateChanges,
      ...exploration.stateChanges.filter(
        (ec) => !code.stateChanges.some((cc) => cc.key === ec.key),
      ),
    ],
    metadata: { ...code.metadata, ...exploration.metadata },
  } as AKGEdge;
}

function mergeEndpoints(code: ApiEndpoint, exploration: ApiEndpoint): ApiEndpoint {
  return {
    ...code,
    source: 'both',
    responseTimesMs: exploration.responseTimesMs ?? code.responseTimesMs,
    observedStatusCodes: exploration.observedStatusCodes ?? code.observedStatusCodes,
    calledOnLoadBy: [...new Set([...code.calledOnLoadBy, ...exploration.calledOnLoadBy])],
    calledByEdges: [...new Set([...code.calledByEdges, ...exploration.calledByEdges])],
    requestShape: code.requestShape ?? exploration.requestShape,
    responseShape: code.responseShape ?? exploration.responseShape,
  };
}
