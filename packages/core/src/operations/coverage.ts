import type { CoverageResult } from '@akg/types';
import type { AKGGraph } from '../graph.js';
import { reachability } from './reachability.js';

/**
 * Given a set of exercised node/edge IDs (e.g. from a test suite),
 * compute coverage against the full graph.
 */
export function computeCoverage(
  graph: AKGGraph,
  exercisedNodes: Set<string>,
  exercisedEdges: Set<string>,
): CoverageResult {
  const allNodes = graph.getAllNodes();
  const allEdges = graph.getAllEdges();

  const totalNodes = allNodes.length;
  const totalEdges = allEdges.length;

  const uncoveredNodes = allNodes.filter((n) => !exercisedNodes.has(n.id)).map((n) => n.id);
  const uncoveredEdges = allEdges.filter((e) => !exercisedEdges.has(e.id)).map((e) => e.id);

  const nodeCoverage = totalNodes > 0 ? (totalNodes - uncoveredNodes.length) / totalNodes : 1;
  const edgeCoverage = totalEdges > 0 ? (totalEdges - uncoveredEdges.length) / totalEdges : 1;

  // Find reachable but untested nodes
  const reachable = graph.entryNodeId
    ? reachability(graph, graph.entryNodeId)
    : new Set<string>();
  const reachableUntested = [...reachable].filter(
    (id) => !exercisedNodes.has(id),
  );

  return {
    nodeCoverage,
    edgeCoverage,
    uncoveredNodes,
    uncoveredEdges,
    reachableUntested,
  };
}
