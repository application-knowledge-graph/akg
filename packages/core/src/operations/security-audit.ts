import type { AKGFinding } from '@akg/types';
import type { AKGGraph } from '../graph.js';
import { findingId } from '../id.js';
import { reachability } from './reachability.js';

/**
 * Find security issues:
 * - R6: Nodes that require auth in code but are reachable without auth
 * - R7: Nodes that require specific roles but are accessible by other roles
 */
export function securityAudit(graph: AKGGraph): AKGFinding[] {
  const findings: AKGFinding[] = [];
  const now = new Date().toISOString();

  // Get nodes reachable without authentication
  const unauthReachable = reachability(graph, graph.entryNodeId, {
    authenticated: false,
  });

  for (const node of graph.getAllNodes()) {
    // R6: Auth bypass — node requires auth but is reachable without it
    if (node.metadata.authRequired && unauthReachable.has(node.id)) {
      findings.push({
        id: findingId('R6', node.id),
        ruleId: 'R6',
        severity: 'critical',
        title: `Auth Bypass: ${node.name}`,
        description: `Node "${node.name}" (${node.id}) requires authentication in code but is reachable from the entry point without authentication.`,
        subjectType: 'node',
        subjectId: node.id,
        codeValue: { authRequired: true },
        explorationValue: { reachableWithoutAuth: true },
        detectedAt: now,
      });
    }

    // R7: Authorization gap — node requires specific roles
    if (node.metadata.requiredRoles.length > 0) {
      // Check each edge leading to this node
      const incoming = graph.getIncomingEdges(node.id);
      for (const edge of incoming) {
        if (
          edge.source === 'exploration' ||
          edge.source === 'both'
        ) {
          // If the edge doesn't enforce the same roles, it's a gap
          if (
            edge.requiredRoles.length === 0 ||
            !node.metadata.requiredRoles.every((r) =>
              edge.requiredRoles.includes(r),
            )
          ) {
            findings.push({
              id: findingId('R7', `${edge.id}:${node.id}`),
              ruleId: 'R7',
              severity: 'critical',
              title: `Authorization Gap: ${node.name}`,
              description: `Node "${node.name}" requires roles [${node.metadata.requiredRoles.join(', ')}] but edge "${edge.id}" does not enforce these roles.`,
              subjectType: 'node',
              subjectId: node.id,
              codeValue: { requiredRoles: node.metadata.requiredRoles },
              explorationValue: { edgeRoles: edge.requiredRoles },
              detectedAt: now,
            });
          }
        }
      }
    }
  }

  // Check endpoints for auth issues
  for (const endpoint of graph.getAllEndpoints()) {
    if (endpoint.authRequired && endpoint.source === 'both') {
      // If endpoint is both code and exploration but auth wasn't enforced
      // This would be detected during merge — check observedStatusCodes for 200 without auth
    }
  }

  return findings;
}
