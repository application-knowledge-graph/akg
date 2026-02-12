import type {
  ApplicationKnowledgeGraph,
  AKGNode,
  AKGEdge,
  ScreenNode,
  ApiEndpoint,
  AKGFinding,
} from '@akg/types';

/**
 * Produce an LLM-optimized markdown representation of an AKG.
 * Designed so an LLM can answer "what does this app do?" from the markdown alone.
 */
export function toMarkdown(graph: ApplicationKnowledgeGraph): string {
  const lines: string[] = [];

  // App summary
  const m = graph.metadata;
  lines.push(`# AKG: ${m.appName}`);
  lines.push('');
  lines.push(`- **Version:** ${m.appVersion}`);
  lines.push(`- **Platform:** ${m.platform}`);
  lines.push(`- **Base URL:** ${m.baseUrl}`);
  lines.push(`- **Generated:** ${m.generatedAt} by ${m.generatedBy}`);
  lines.push(`- **Spec Version:** ${m.specVersion}`);
  if (Object.keys(m.tags).length > 0) {
    lines.push(`- **Tags:** ${Object.entries(m.tags).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
  lines.push('');

  // Screen inventory
  const screens = graph.nodes.filter((n): n is ScreenNode => n.type === 'screen');
  const overlays = graph.nodes.filter((n) => n.type !== 'screen' && n.type !== 'component');
  const components = graph.nodes.filter((n) => n.type === 'component');

  lines.push(`## Screens (${screens.length})`);
  lines.push('');
  lines.push('| Route | Name | Auth | Elements | A11y Score | Source |');
  lines.push('|-------|------|------|----------|------------|--------|');
  for (const s of screens) {
    const a11y = s.accessibility.score !== null ? `${s.accessibility.score}` : 'N/A';
    lines.push(
      `| \`${s.route}\` | ${s.name} | ${s.metadata.authRequired ? 'Yes' : 'No'} | ${s.elements.length} | ${a11y} | ${s.source} |`,
    );
  }
  lines.push('');

  if (overlays.length > 0) {
    lines.push(`## Overlays (${overlays.length})`);
    lines.push('');
    for (const o of overlays) {
      lines.push(`- **${o.name}** (${o.type}) — source: ${o.source}, elements: ${o.elements.length}`);
    }
    lines.push('');
  }

  // Flow descriptions
  lines.push(`## Flows (${graph.edges.length} edges)`);
  lines.push('');
  for (const edge of graph.edges) {
    lines.push(`- ${describeEdge(edge, graph)}`);
  }
  lines.push('');

  // API endpoint catalog
  lines.push(`## API Endpoints (${graph.endpoints.length})`);
  lines.push('');
  lines.push('| Method | Path | Auth | Called By |');
  lines.push('|--------|------|------|----------|');
  for (const ep of graph.endpoints) {
    const callers = [
      ...ep.calledOnLoadBy.map((id) => `on-load:${id}`),
      ...ep.calledByEdges,
    ];
    lines.push(
      `| ${ep.method} | \`${ep.path}\` | ${ep.authRequired ? 'Yes' : 'No'} | ${callers.join(', ') || 'none'} |`,
    );
  }
  lines.push('');

  // Findings
  if (graph.findings.length > 0) {
    lines.push(`## Findings (${graph.findings.length})`);
    lines.push('');
    const grouped = groupBy(graph.findings, (f) => f.severity);
    for (const severity of ['critical', 'error', 'warning', 'info'] as const) {
      const items = grouped[severity];
      if (!items || items.length === 0) continue;
      lines.push(`### ${severity.toUpperCase()} (${items.length})`);
      lines.push('');
      for (const f of items) {
        lines.push(`- **[${f.ruleId}] ${f.title}** — ${f.description}`);
      }
      lines.push('');
    }
  }

  // Complexity summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Nodes:** ${graph.nodes.length} (${screens.length} screens, ${overlays.length} overlays, ${components.length} components)`);
  lines.push(`- **Edges:** ${graph.edges.length}`);
  lines.push(`- **API Endpoints:** ${graph.endpoints.length}`);
  lines.push(`- **Findings:** ${graph.findings.length}`);
  lines.push(`- **Entry Point:** ${graph.entryNodeId}`);
  lines.push('');

  return lines.join('\n');
}

function describeEdge(edge: AKGEdge, graph: ApplicationKnowledgeGraph): string {
  const fromNode = graph.nodes.find((n) => n.id === edge.from);
  const toNode = graph.nodes.find((n) => n.id === edge.to);
  const from = fromNode ? fromNode.name : edge.from;
  const to = toNode ? toNode.name : edge.to;

  const element = edge.elementId
    ? graph.nodes
        .flatMap((n) => n.elements)
        .find((e) => e.id === edge.elementId)
    : null;

  const trigger = element
    ? `${edge.trigger} '${element.label}'`
    : edge.trigger;

  let desc = `From **${from}**, ${trigger} → **${to}** (${edge.type})`;

  if (edge.apiCalls.length > 0) {
    const calls = edge.apiCalls.map((c) => `${c.method} ${c.path}`).join(', ');
    desc += ` via ${calls}`;
  }

  if (edge.requiresAuth) {
    desc += ' [auth required]';
  }

  return desc;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    (result[key] ??= []).push(item);
  }
  return result;
}
