import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AKGGraph } from '@akg/core';
import { formatJSON } from '../output/json.js';
import { formatComplexity, formatFindings, formatGraphSummary } from '../output/summary.js';

export interface QueryOptions {
  security?: boolean;
  unreachable?: boolean;
  deadElements?: boolean;
  reachability?: string;
  traverse?: string[];
  complexity?: boolean;
  summary?: boolean;
}

export async function query(file: string, options: QueryOptions): Promise<void> {
  const json = JSON.parse(readFileSync(resolve(file), 'utf-8'));
  const graph = AKGGraph.fromJSON(json);

  if (options.summary) {
    console.log(formatGraphSummary(graph.toJSON()));
    return;
  }

  if (options.security) {
    const findings = graph.securityAudit();
    if (options.summary) {
      console.log(formatFindings(findings));
    } else {
      console.log(formatJSON(findings));
    }
    return;
  }

  if (options.unreachable) {
    const nodes = graph.unreachable();
    console.log(formatJSON({ unreachableNodes: nodes, count: nodes.length }));
    return;
  }

  if (options.deadElements) {
    const dead = graph.deadElements();
    console.log(formatJSON({ deadElements: dead, count: dead.length }));
    return;
  }

  if (options.reachability) {
    const reachable = graph.reachability(options.reachability);
    console.log(formatJSON({ from: options.reachability, reachable: [...reachable], count: reachable.size }));
    return;
  }

  if (options.traverse && options.traverse.length === 2) {
    const paths = graph.traverse(options.traverse[0], options.traverse[1]);
    console.log(formatJSON({ from: options.traverse[0], to: options.traverse[1], paths, count: paths.length }));
    return;
  }

  if (options.complexity) {
    const result = graph.complexity();
    console.log(formatComplexity(result));
    return;
  }

  // Default: print summary
  console.log(formatGraphSummary(graph.toJSON()));
}
