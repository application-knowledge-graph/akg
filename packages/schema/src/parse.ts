import type { ApplicationKnowledgeGraph } from '@akg/types';
import { ApplicationKnowledgeGraphSchema } from './validators.js';

/**
 * Parse and validate raw JSON into a typed ApplicationKnowledgeGraph.
 * Throws a ZodError if validation fails.
 */
export function parseAKG(json: unknown): ApplicationKnowledgeGraph {
  return ApplicationKnowledgeGraphSchema.parse(json) as ApplicationKnowledgeGraph;
}

/**
 * Validate raw JSON against the AKG schema without throwing.
 * Returns `{ valid: true }` or `{ valid: false, errors: [...] }`.
 */
export function validateAKG(json: unknown): { valid: boolean; errors: string[] } {
  const result = ApplicationKnowledgeGraphSchema.safeParse(json);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    ),
  };
}
