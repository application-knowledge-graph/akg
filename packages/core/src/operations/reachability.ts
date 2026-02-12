import type { ReachabilityOptions } from '@akg/types';
import type { AKGGraph } from '../graph.js';

/**
 * Determine all nodes reachable from a given node via BFS.
 * Supports filtering by auth state, role, edge types, and max depth.
 */
export function reachability(
  graph: AKGGraph,
  nodeId: string,
  options?: ReachabilityOptions,
): Set<string> {
  const reachable = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
  const maxDepth = options?.maxDepth ?? Infinity;

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);

    if (depth >= maxDepth) continue;

    const outgoing = graph.getOutgoingEdges(id);
    for (const edge of outgoing) {
      if (reachable.has(edge.to)) continue;

      // Filter by edge type
      if (options?.edgeTypes && !options.edgeTypes.includes(edge.type as any)) {
        continue;
      }

      // Filter by auth
      if (options?.authenticated === false && edge.requiresAuth) {
        continue;
      }

      // Filter by role
      if (options?.role && edge.requiredRoles.length > 0 && !edge.requiredRoles.includes(options.role)) {
        continue;
      }

      queue.push({ id: edge.to, depth: depth + 1 });
    }
  }

  return reachable;
}
