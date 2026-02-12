import type { AKGGraph } from '../graph.js';

/**
 * Find all interactive elements flagged as dead (isDead === true).
 * Only meaningful when exploration data is present.
 */
export function findDeadElements(
  graph: AKGGraph,
): Array<{ nodeId: string; elementId: string }> {
  const results: Array<{ nodeId: string; elementId: string }> = [];

  for (const node of graph.getAllNodes()) {
    for (const element of node.elements) {
      if (element.isInteractive && element.isDead) {
        results.push({ nodeId: node.id, elementId: element.id });
      }
    }
  }

  return results;
}
