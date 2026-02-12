import type { ApplicationKnowledgeGraph, AKGDiff } from '@akg/types';

/**
 * Compute the structural difference between two AKG snapshots.
 */
export function computeDiff(
  oldGraph: ApplicationKnowledgeGraph,
  newGraph: ApplicationKnowledgeGraph,
): AKGDiff {
  const oldNodeMap = new Map(oldGraph.nodes.map((n) => [n.id, n]));
  const newNodeMap = new Map(newGraph.nodes.map((n) => [n.id, n]));

  const oldEdgeMap = new Map(oldGraph.edges.map((e) => [e.id, e]));
  const newEdgeMap = new Map(newGraph.edges.map((e) => [e.id, e]));

  const oldEndpointMap = new Map(oldGraph.endpoints.map((ep) => [ep.id, ep]));
  const newEndpointMap = new Map(newGraph.endpoints.map((ep) => [ep.id, ep]));

  const oldFindingIds = new Set(oldGraph.findings.map((f) => f.id));
  const newFindingIds = new Set(newGraph.findings.map((f) => f.id));

  // Nodes
  const addedNodes = newGraph.nodes.filter((n) => !oldNodeMap.has(n.id));
  const removedNodes = oldGraph.nodes.filter((n) => !newNodeMap.has(n.id));
  const modifiedNodes = findModified(oldNodeMap, newNodeMap);

  // Edges
  const addedEdges = newGraph.edges.filter((e) => !oldEdgeMap.has(e.id));
  const removedEdges = oldGraph.edges.filter((e) => !newEdgeMap.has(e.id));
  const modifiedEdges = findModified(oldEdgeMap, newEdgeMap);

  // Endpoints
  const addedEndpoints = newGraph.endpoints.filter((ep) => !oldEndpointMap.has(ep.id));
  const removedEndpoints = oldGraph.endpoints.filter((ep) => !newEndpointMap.has(ep.id));
  const modifiedEndpoints = findModified(oldEndpointMap, newEndpointMap);

  // Findings
  const newFindings = newGraph.findings.filter((f) => !oldFindingIds.has(f.id));
  const resolvedFindings = oldGraph.findings.filter((f) => !newFindingIds.has(f.id));

  return {
    nodes: { added: addedNodes, removed: removedNodes, modified: modifiedNodes },
    edges: { added: addedEdges, removed: removedEdges, modified: modifiedEdges },
    endpoints: { added: addedEndpoints, removed: removedEndpoints, modified: modifiedEndpoints },
    findings: { new: newFindings, resolved: resolvedFindings },
    summary: {
      nodesAdded: addedNodes.length,
      nodesRemoved: removedNodes.length,
      edgesAdded: addedEdges.length,
      edgesRemoved: removedEdges.length,
      newFindings: newFindings.length,
      resolvedFindings: resolvedFindings.length,
    },
  };
}

function findModified<T extends { id: string }>(
  oldMap: Map<string, T>,
  newMap: Map<string, T>,
): Array<{ id: string; changes: Record<string, { before: unknown; after: unknown }> }> {
  const modified: Array<{ id: string; changes: Record<string, { before: unknown; after: unknown }> }> = [];

  for (const [id, oldItem] of oldMap) {
    const newItem = newMap.get(id);
    if (!newItem) continue;

    const changes: Record<string, { before: unknown; after: unknown }> = {};
    const allKeys = new Set([...Object.keys(oldItem), ...Object.keys(newItem)]);

    for (const key of allKeys) {
      if (key === 'id') continue;
      const oldVal = (oldItem as any)[key];
      const newVal = (newItem as any)[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { before: oldVal, after: newVal };
      }
    }

    if (Object.keys(changes).length > 0) {
      modified.push({ id, changes });
    }
  }

  return modified;
}
