import type {
  ApplicationKnowledgeGraph,
  AKGDiff,
  ComplexityResult,
  AKGFinding,
  ScreenNode,
} from '@akg/types';

/** Human-readable summary of an AKG graph. */
export function formatGraphSummary(graph: ApplicationKnowledgeGraph): string {
  const lines: string[] = [];
  const screens = graph.nodes.filter((n) => n.type === 'screen') as ScreenNode[];
  const overlays = graph.nodes.filter((n) => n.type !== 'screen' && n.type !== 'component');

  lines.push(`Application: ${graph.metadata.appName} (${graph.metadata.platform})`);
  lines.push(`Base URL:    ${graph.metadata.baseUrl}`);
  lines.push(`Generated:   ${graph.metadata.generatedAt}`);
  lines.push(`Spec:        ${graph.specVersion}`);
  lines.push('');
  lines.push(`Screens:     ${screens.length}`);
  lines.push(`Overlays:    ${overlays.length}`);
  lines.push(`Edges:       ${graph.edges.length}`);
  lines.push(`Endpoints:   ${graph.endpoints.length}`);
  lines.push(`Findings:    ${graph.findings.length}`);
  lines.push('');

  if (screens.length > 0) {
    lines.push('Routes:');
    for (const s of screens) {
      const auth = s.metadata.authRequired ? ' [auth]' : '';
      lines.push(`  ${s.route}${auth} — ${s.elements.length} elements`);
    }
    lines.push('');
  }

  if (graph.endpoints.length > 0) {
    lines.push('API Endpoints:');
    for (const ep of graph.endpoints) {
      const auth = ep.authRequired ? ' [auth]' : '';
      lines.push(`  ${ep.method} ${ep.path}${auth}`);
    }
    lines.push('');
  }

  if (graph.findings.length > 0) {
    lines.push('Findings:');
    for (const f of graph.findings) {
      lines.push(`  [${f.severity.toUpperCase()}] ${f.ruleId}: ${f.title}`);
    }
  }

  return lines.join('\n');
}

/** Human-readable summary of a diff. */
export function formatDiffSummary(diff: AKGDiff): string {
  const lines: string[] = [];
  lines.push('AKG Diff Summary');
  lines.push('================');
  lines.push(`Nodes:    +${diff.summary.nodesAdded} / -${diff.summary.nodesRemoved}`);
  lines.push(`Edges:    +${diff.summary.edgesAdded} / -${diff.summary.edgesRemoved}`);
  lines.push(`Findings: +${diff.summary.newFindings} new / -${diff.summary.resolvedFindings} resolved`);

  if (diff.nodes.added.length > 0) {
    lines.push('');
    lines.push('Added Nodes:');
    for (const n of diff.nodes.added) {
      lines.push(`  + ${n.id} (${n.name})`);
    }
  }

  if (diff.nodes.removed.length > 0) {
    lines.push('');
    lines.push('Removed Nodes:');
    for (const n of diff.nodes.removed) {
      lines.push(`  - ${n.id} (${n.name})`);
    }
  }

  if (diff.findings.new.length > 0) {
    lines.push('');
    lines.push('New Findings:');
    for (const f of diff.findings.new) {
      lines.push(`  [${f.severity.toUpperCase()}] ${f.title}`);
    }
  }

  return lines.join('\n');
}

/** Human-readable complexity metrics. */
export function formatComplexity(result: ComplexityResult): string {
  const lines: string[] = [];
  lines.push('Complexity Metrics');
  lines.push('==================');
  lines.push(`Total Nodes:          ${result.totalNodes}`);
  lines.push(`Total Edges:          ${result.totalEdges}`);
  lines.push(`Max Depth:            ${result.maxDepth}`);
  lines.push(`Avg Branching Factor: ${result.avgBranchingFactor}`);
  lines.push(`Cycles:               ${result.cycleCount}`);
  lines.push(`SCCs:                 ${result.sccCount}`);
  if (result.cyclicNodes.length > 0) {
    lines.push(`Cyclic Nodes:         ${result.cyclicNodes.join(', ')}`);
  }
  lines.push(`Longest Path:         ${result.longestPath.join(' -> ')}`);
  return lines.join('\n');
}

/** Human-readable findings list. */
export function formatFindings(findings: AKGFinding[]): string {
  if (findings.length === 0) return 'No findings.';

  const lines: string[] = [];
  lines.push(`${findings.length} finding(s):`);
  lines.push('');

  for (const f of findings) {
    lines.push(`[${f.severity.toUpperCase()}] ${f.ruleId}: ${f.title}`);
    lines.push(`  ${f.description}`);
    lines.push(`  Subject: ${f.subjectType} ${f.subjectId}`);
    lines.push('');
  }

  return lines.join('\n');
}
