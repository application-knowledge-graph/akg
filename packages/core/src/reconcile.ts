import type {
  ApplicationKnowledgeGraph,
  AKGFinding,
  ScreenNode,
} from '@akg/types';
import type { AKGGraph } from './graph.js';
import { findingId } from './id.js';

/**
 * Apply reconciliation rules R1-R12 to a merged graph.
 * Compares code-layer and exploration-layer entities to detect discrepancies.
 */
export function reconcile(
  mergedGraph: AKGGraph,
  codeGraph: ApplicationKnowledgeGraph,
  explorationGraph: ApplicationKnowledgeGraph,
): AKGFinding[] {
  const findings: AKGFinding[] = [];
  const now = new Date().toISOString();

  const codeNodeIds = new Set(codeGraph.nodes.map((n) => n.id));
  const explorationNodeIds = new Set(explorationGraph.nodes.map((n) => n.id));
  const codeEndpointIds = new Set(codeGraph.endpoints.map((e) => e.id));
  const explorationEndpointIds = new Set(explorationGraph.endpoints.map((e) => e.id));
  const codeEdgeIds = new Set(codeGraph.edges.map((e) => e.id));
  const explorationEdgeIds = new Set(explorationGraph.edges.map((e) => e.id));

  // R1: Dead Route — route in code but not reachable during exploration
  for (const node of codeGraph.nodes) {
    if (node.type === 'screen' && !explorationNodeIds.has(node.id)) {
      findings.push({
        id: findingId('R1', node.id),
        ruleId: 'R1',
        severity: 'warning',
        title: `Dead Route: ${(node as ScreenNode).route}`,
        description: `Route ${(node as ScreenNode).route} is defined in code but was not reached during exploration.`,
        subjectType: 'node',
        subjectId: node.id,
        codeValue: { route: (node as ScreenNode).route, exists: true },
        explorationValue: { reached: false },
        detectedAt: now,
      });
    }
  }

  // R2: Dynamic/Untracked Screen — screen in exploration but not in code
  for (const node of explorationGraph.nodes) {
    if (node.type === 'screen' && !codeNodeIds.has(node.id)) {
      findings.push({
        id: findingId('R2', node.id),
        ruleId: 'R2',
        severity: 'info',
        title: `Dynamic Screen: ${node.name}`,
        description: `Screen "${node.name}" was found during exploration but has no corresponding route in code.`,
        subjectType: 'node',
        subjectId: node.id,
        codeValue: null,
        explorationValue: { observed: true },
        detectedAt: now,
      });
    }
  }

  // R3: Dead Endpoint — endpoint in code but never called during exploration
  for (const endpoint of codeGraph.endpoints) {
    if (!explorationEndpointIds.has(endpoint.id)) {
      findings.push({
        id: findingId('R3', endpoint.id),
        ruleId: 'R3',
        severity: 'info',
        title: `Dead Endpoint: ${endpoint.method} ${endpoint.path}`,
        description: `Endpoint ${endpoint.method} ${endpoint.path} is defined in code but was never called during exploration.`,
        subjectType: 'endpoint',
        subjectId: endpoint.id,
        codeValue: { defined: true },
        explorationValue: { called: false },
        detectedAt: now,
      });
    }
  }

  // R4: Undocumented Endpoint — endpoint called during exploration but not in code
  for (const endpoint of explorationGraph.endpoints) {
    if (!codeEndpointIds.has(endpoint.id)) {
      findings.push({
        id: findingId('R4', endpoint.id),
        ruleId: 'R4',
        severity: 'warning',
        title: `Undocumented Endpoint: ${endpoint.method} ${endpoint.path}`,
        description: `Endpoint ${endpoint.method} ${endpoint.path} was called during exploration but is not defined in code.`,
        subjectType: 'endpoint',
        subjectId: endpoint.id,
        codeValue: null,
        explorationValue: { called: true },
        detectedAt: now,
      });
    }
  }

  // R5: Dead Element — interactive element that produces no effect
  for (const node of mergedGraph.getAllNodes()) {
    for (const element of node.elements) {
      if (element.isInteractive && element.isDead) {
        findings.push({
          id: findingId('R5', element.id),
          ruleId: 'R5',
          severity: 'warning',
          title: `Dead Element: ${element.label}`,
          description: `Element "${element.label}" on "${node.name}" appears interactive but produces no observable effect when activated.`,
          subjectType: 'element',
          subjectId: element.id,
          codeValue: { isInteractive: true },
          explorationValue: { isDead: true },
          detectedAt: now,
        });
      }
    }
  }

  // R6: Auth Bypass — auth required in code but accessible without auth in exploration
  for (const codeNode of codeGraph.nodes) {
    if (codeNode.metadata.authRequired) {
      const explorationNode = explorationGraph.nodes.find((n) => n.id === codeNode.id);
      if (explorationNode && !explorationNode.metadata.authRequired) {
        findings.push({
          id: findingId('R6', codeNode.id),
          ruleId: 'R6',
          severity: 'critical',
          title: `Auth Bypass: ${codeNode.name}`,
          description: `"${codeNode.name}" requires authentication in code but was accessible without authentication during exploration.`,
          subjectType: 'node',
          subjectId: codeNode.id,
          codeValue: { authRequired: true },
          explorationValue: { authRequired: false },
          detectedAt: now,
        });
      }
    }
  }

  // R7: Authorization Gap
  for (const codeNode of codeGraph.nodes) {
    if (codeNode.metadata.requiredRoles.length > 0) {
      const explorationNode = explorationGraph.nodes.find((n) => n.id === codeNode.id);
      if (explorationNode) {
        const missingRoles = codeNode.metadata.requiredRoles.filter(
          (r) => !explorationNode.metadata.requiredRoles.includes(r),
        );
        if (missingRoles.length > 0 && explorationNode.metadata.requiredRoles.length === 0) {
          findings.push({
            id: findingId('R7', codeNode.id),
            ruleId: 'R7',
            severity: 'critical',
            title: `Authorization Gap: ${codeNode.name}`,
            description: `"${codeNode.name}" requires roles [${codeNode.metadata.requiredRoles.join(', ')}] in code but was accessible without these roles during exploration.`,
            subjectType: 'node',
            subjectId: codeNode.id,
            codeValue: { requiredRoles: codeNode.metadata.requiredRoles },
            explorationValue: { requiredRoles: explorationNode.metadata.requiredRoles },
            detectedAt: now,
          });
        }
      }
    }
  }

  // R10: Broken Navigation — edge in code but fails in exploration
  for (const codeEdge of codeGraph.edges) {
    if (codeEdge.type === 'navigation' && explorationEdgeIds.has(codeEdge.id)) {
      const explorationEdge = explorationGraph.edges.find((e) => e.id === codeEdge.id);
      if (explorationEdge && explorationEdge.to !== codeEdge.to) {
        findings.push({
          id: findingId('R10', codeEdge.id),
          ruleId: 'R10',
          severity: 'error',
          title: `Broken Navigation: ${codeEdge.from} → ${codeEdge.to}`,
          description: `Navigation from "${codeEdge.from}" to "${codeEdge.to}" was expected but exploration went to "${explorationEdge.to}" instead.`,
          subjectType: 'edge',
          subjectId: codeEdge.id,
          codeValue: { to: codeEdge.to },
          explorationValue: { to: explorationEdge.to },
          detectedAt: now,
        });
      }
    }
  }

  return findings;
}
