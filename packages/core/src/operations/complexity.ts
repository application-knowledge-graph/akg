import type { ComplexityResult } from '@akg/types';
import type { AKGGraph } from '../graph.js';

/**
 * Compute structural complexity metrics for the graph:
 * - Total nodes/edges
 * - Max depth from entry
 * - Average branching factor
 * - Cycle detection (Tarjan's SCC algorithm)
 * - Longest path
 */
export function computeComplexity(graph: AKGGraph): ComplexityResult {
  const allNodes = graph.getAllNodes();
  const allEdges = graph.getAllEdges();
  const nodeIds = allNodes.map((n) => n.id);

  const totalNodes = allNodes.length;
  const totalEdges = allEdges.length;

  // Average branching factor
  let totalOutgoing = 0;
  for (const node of allNodes) {
    totalOutgoing += graph.getOutgoingEdges(node.id).length;
  }
  const avgBranchingFactor = totalNodes > 0 ? totalOutgoing / totalNodes : 0;

  // BFS for max depth and longest path from entry
  const { maxDepth, longestPath } = computeMaxDepthAndPath(graph);

  // Tarjan's SCC
  const { sccs, cyclicNodes } = tarjanSCC(graph, nodeIds);
  const sccCount = sccs.filter((scc) => scc.length > 1).length;
  const cycleCount = sccCount; // Each multi-node SCC contains at least one cycle

  return {
    totalNodes,
    totalEdges,
    maxDepth,
    avgBranchingFactor: Math.round(avgBranchingFactor * 100) / 100,
    cycleCount,
    cyclicNodes,
    longestPath,
    sccCount,
  };
}

function computeMaxDepthAndPath(graph: AKGGraph): {
  maxDepth: number;
  longestPath: string[];
} {
  const entryNodeId = graph.entryNodeId;
  if (!entryNodeId) return { maxDepth: 0, longestPath: [] };

  const distances = new Map<string, number>();
  const parents = new Map<string, string>();
  const queue: Array<{ id: string; depth: number }> = [
    { id: entryNodeId, depth: 0 },
  ];
  distances.set(entryNodeId, 0);

  let maxDepth = 0;
  let farthestNode = entryNodeId;

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    if (depth > maxDepth) {
      maxDepth = depth;
      farthestNode = id;
    }

    const outgoing = graph.getOutgoingEdges(id);
    for (const edge of outgoing) {
      if (!distances.has(edge.to)) {
        distances.set(edge.to, depth + 1);
        parents.set(edge.to, id);
        queue.push({ id: edge.to, depth: depth + 1 });
      }
    }
  }

  // Reconstruct longest path
  const longestPath: string[] = [];
  let current: string | undefined = farthestNode;
  while (current) {
    longestPath.unshift(current);
    current = parents.get(current);
  }

  return { maxDepth, longestPath };
}

function tarjanSCC(
  graph: AKGGraph,
  nodeIds: string[],
): { sccs: string[][]; cyclicNodes: string[] } {
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const sccs: string[][] = [];

  function strongConnect(v: string): void {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const outgoing = graph.getOutgoingEdges(v);
    for (const edge of outgoing) {
      const w = edge.to;
      if (!indices.has(w)) {
        strongConnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.has(w)) {
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const nodeId of nodeIds) {
    if (!indices.has(nodeId)) {
      strongConnect(nodeId);
    }
  }

  const cyclicNodes = sccs
    .filter((scc) => scc.length > 1)
    .flat();

  return { sccs, cyclicNodes };
}
