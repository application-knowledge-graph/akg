import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAKG } from '@akg/schema';
import { AKGGraph } from '@akg/core';
import { formatJSON } from '../output/json.js';
import { formatDiffSummary } from '../output/summary.js';

export interface DiffOptions {
  summary?: boolean;
}

export async function diff(oldFile: string, newFile: string, options: DiffOptions): Promise<void> {
  const oldJson = JSON.parse(readFileSync(resolve(oldFile), 'utf-8'));
  const newJson = JSON.parse(readFileSync(resolve(newFile), 'utf-8'));

  const oldGraph = AKGGraph.fromJSON(oldJson);
  const newGraph = AKGGraph.fromJSON(newJson);

  const result = oldGraph.diff(newGraph);

  if (options.summary) {
    console.log(formatDiffSummary(result));
  } else {
    console.log(formatJSON(result));
  }
}
