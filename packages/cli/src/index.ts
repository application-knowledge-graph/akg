import { Command } from 'commander';
import { generate } from './commands/generate.js';
import { validate } from './commands/validate.js';
import { merge } from './commands/merge.js';
import { diff } from './commands/diff.js';
import { query } from './commands/query.js';

const program = new Command();

program
  .name('akg')
  .description('Application Knowledge Graph — OpenAPI for Applications')
  .version('0.1.0');

program
  .command('generate')
  .description('Run static analysis on a project, output .akg.json')
  .argument('<path>', 'Path to the project root')
  .option('-o, --output <path>', 'Output file path')
  .option('--framework <name>', 'Override framework auto-detection')
  .option('--verbose', 'Show detailed extraction progress')
  .action(async (path, options) => {
    try {
      await generate(path, options);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate an .akg.json file against the spec')
  .argument('<file>', 'Path to the .akg.json file')
  .action(async (file) => {
    try {
      await validate(file);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('merge')
  .description('Merge two partial AKGs (code + exploration)')
  .argument('<code>', 'Path to the code-layer .akg.json')
  .argument('<explore>', 'Path to the exploration-layer .akg.json')
  .option('-o, --output <path>', 'Output file path (default: ./merged.akg.json)')
  .action(async (code, explore, options) => {
    try {
      await merge(code, explore, options);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('diff')
  .description('Structural diff between two AKG snapshots')
  .argument('<old>', 'Path to the old .akg.json')
  .argument('<new>', 'Path to the new .akg.json')
  .option('--summary', 'Human-readable summary instead of JSON')
  .action(async (oldFile, newFile, options) => {
    try {
      await diff(oldFile, newFile, options);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('query')
  .description('Query an AKG for findings, reachability, and more')
  .argument('<file>', 'Path to the .akg.json file')
  .option('--security', 'Run security audit')
  .option('--unreachable', 'Find orphan nodes')
  .option('--dead-elements', 'Find elements with no effect')
  .option('--reachability <nodeId>', 'Show all nodes reachable from a node')
  .option('--traverse <from> <to>', 'Find all paths between two nodes')
  .option('--complexity', 'Compute structural complexity metrics')
  .option('--summary', 'Human-readable summary')
  .action(async (file, options) => {
    try {
      await query(file, options);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
