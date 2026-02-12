import type { ApplicationKnowledgeGraph } from '@akg/types';

/** Pretty-print an AKG graph to JSON with 2-space indentation. */
export function serializeAKG(graph: ApplicationKnowledgeGraph): string {
  return JSON.stringify(graph, null, 2);
}
