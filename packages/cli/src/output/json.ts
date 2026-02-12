import type { ApplicationKnowledgeGraph, AKGDiff, ComplexityResult, CoverageResult, AKGFinding } from '@akg/types';

/** Format any result as pretty-printed JSON. */
export function formatJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
