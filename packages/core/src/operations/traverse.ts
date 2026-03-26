import type { AKGGraph } from '../graph.js';

/**
 * Find all paths between two nodes using DFS with cycle detection.
 * Returns arrays of node IDs for each path found (including start and end nodes).
 */
export function traverse(
  graph: AKGGraph,
  from: string,
  to: string,
  maxDepth: number = 10,
): string[][] {
  const paths: string[][] = [];
  const visited = new Set<string>();

  function dfs(current: string, path: string[], depth: number): void {
    if (depth > maxDepth) return;
    if (current === to && path.length > 1) {
      paths.push([...path]);
      return;
    }

    visited.add(current);
    const outgoing = graph.getOutgoingEdges(current);

    for (const edge of outgoing) {
      if (visited.has(edge.to) && edge.to !== to) continue;
      path.push(edge.to);
      dfs(edge.to, path, depth + 1);
      path.pop();
    }

    visited.delete(current);
  }

  dfs(from, [from], 0);
  return paths;
}
