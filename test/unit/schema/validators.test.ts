import { describe, it, expect } from 'vitest';
import { validateAKG, parseAKG } from '@akg/schema';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('@akg/schema validators', () => {
  it('should validate a correct AKG document', () => {
    // Read the generated example output
    const examplePath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../examples/output/basic-app.akg.json',
    );
    const json = JSON.parse(readFileSync(examplePath, 'utf-8'));
    const result = validateAKG(json);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject an empty object', () => {
    const result = validateAKG({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject missing required fields', () => {
    const result = validateAKG({
      specVersion: '0.1.0',
      // missing metadata, nodes, edges, etc.
    });
    expect(result.valid).toBe(false);
  });

  it('should parse valid AKG and return typed object', () => {
    const examplePath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../examples/output/basic-app.akg.json',
    );
    const json = JSON.parse(readFileSync(examplePath, 'utf-8'));
    const graph = parseAKG(json);
    expect(graph.specVersion).toBe('0.1.0');
    expect(graph.nodes.length).toBeGreaterThan(0);
  });
});
