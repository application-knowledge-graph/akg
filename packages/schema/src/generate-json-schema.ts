import { zodToJsonSchema } from 'zod-to-json-schema';
import { ApplicationKnowledgeGraphSchema } from './validators.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const jsonSchema = zodToJsonSchema(ApplicationKnowledgeGraphSchema, {
  name: 'ApplicationKnowledgeGraph',
  $refStrategy: 'none',
});

const outPath = resolve(__dirname, '../json-schema/v0.1.0/schema.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2));

console.log(`JSON Schema written to ${outPath}`);
