import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateAKG } from '@akg/schema';

export async function validate(file: string): Promise<void> {
  const filePath = resolve(file);
  console.log(`Validating ${filePath}...`);

  const content = readFileSync(filePath, 'utf-8');
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    console.error('Error: Invalid JSON');
    process.exit(1);
  }

  const result = validateAKG(json);

  if (result.valid) {
    console.log('Valid AKG document.');
  } else {
    console.error(`Invalid AKG document (${result.errors.length} errors):`);
    for (const err of result.errors.slice(0, 20)) {
      console.error(`  - ${err}`);
    }
    if (result.errors.length > 20) {
      console.error(`  ... and ${result.errors.length - 20} more`);
    }
    process.exit(1);
  }
}
