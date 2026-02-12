import { writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { NextJSAppRouterExtractor } from '@akg/extractor-nextjs';
import { serializeAKG } from '@akg/schema';
import type { ApplicationKnowledgeGraph } from '@akg/types';

export interface GenerateOptions {
  output?: string;
  framework?: string;
  verbose?: boolean;
}

export async function generate(path: string, options: GenerateOptions): Promise<void> {
  const projectRoot = resolve(path);

  console.log(`Analyzing ${projectRoot}...`);

  // For now, only Next.js App Router is supported
  const extractor = new NextJSAppRouterExtractor();
  const partial = await extractor.extractFromCode(projectRoot);

  const graph = partial as ApplicationKnowledgeGraph;

  const outputPath = options.output ?? `./${basename(projectRoot)}.akg.json`;
  const json = serializeAKG(graph);

  writeFileSync(resolve(outputPath), json);
  console.log(`AKG written to ${outputPath}`);
  console.log(`  Nodes:     ${graph.nodes.length}`);
  console.log(`  Edges:     ${graph.edges.length}`);
  console.log(`  Endpoints: ${graph.endpoints.length}`);
  console.log(`  Findings:  ${graph.findings.length}`);
}
