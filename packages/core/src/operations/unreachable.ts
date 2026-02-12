import type { AKGGraph } from '../graph.js';
import { reachability } from './reachability.js';

/**
 * Find nodes with no path from the entry point.
 * These are potentially dead screens.
 */
export function findUnreachable(graph: AKGGraph): string[] {
  const entryNodeId = graph.entryNodeId;
  if (!entryNodeId) return graph.getAllNodes().map((n) => n.id);

  const reachable = reachability(graph, entryNodeId);
  return graph
    .getAllNodes()
    .filter((n) => !reachable.has(n.id))
    .map((n) => n.id);
}
