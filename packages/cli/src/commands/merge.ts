import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAKG, serializeAKG } from '@akg/schema';
import { mergeGraphs } from '@akg/core';

export interface MergeOptions {
  output?: string;
}

export async function merge(codeFile: string, exploreFile: string, options: MergeOptions): Promise<void> {
  console.log(`Merging ${codeFile} + ${exploreFile}...`);

  const codeJson = JSON.parse(readFileSync(resolve(codeFile), 'utf-8'));
  const exploreJson = JSON.parse(readFileSync(resolve(exploreFile), 'utf-8'));

  const codeGraph = parseAKG(codeJson);
  const exploreGraph = parseAKG(exploreJson);

  const merged = mergeGraphs(codeGraph, exploreGraph);
  const output = merged.toJSON();

  const outputPath = options.output ?? './merged.akg.json';
  writeFileSync(resolve(outputPath), serializeAKG(output));

  console.log(`Merged AKG written to ${outputPath}`);
  console.log(`  Nodes:    ${output.nodes.length}`);
  console.log(`  Edges:    ${output.edges.length}`);
  console.log(`  Findings: ${output.findings.length}`);
}
