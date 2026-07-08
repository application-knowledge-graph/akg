import { describe, it, expect } from 'vitest';
import { validateAKG, parseAKG, serializeAKG } from '@akg/schema';
import type { ApplicationKnowledgeGraph } from '@akg/types';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function loadExample(): ApplicationKnowledgeGraph {
  const examplePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/output/basic-app.akg.json',
  );
  return JSON.parse(readFileSync(examplePath, 'utf-8')) as ApplicationKnowledgeGraph;
}

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
    const graph = parseAKG(loadExample());
    expect(graph.specVersion).toBe('0.1.0');
    expect(graph.nodes.length).toBeGreaterThan(0);
  });
});

describe('@akg/schema certificate & traversal fields', () => {
  it('accepts a node carrying a valid certificate (pass + one warn violation)', () => {
    const graph = loadExample();
    graph.nodes[0].certificate = {
      status: 'pass',
      violations: [
        { invariant: 'hit-target', target: 'btn-submit', detail: 'below 44px', severity: 'warn' },
      ],
      device: '390x844',
    };
    const result = validateAKG(graph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a node whose certificate status is not a valid literal', () => {
    const graph = loadExample();
    (graph.nodes[0] as { certificate?: unknown }).certificate = {
      status: 'bogus',
      violations: [],
    };
    const result = validateAKG(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('certificate'))).toBe(true);
  });

  it('accepts an edge carrying a valid traversal', () => {
    const graph = loadExample();
    graph.edges[0].traversal = { status: 'traversed', mutating: false };
    const result = validateAKG(graph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an edge whose traversal status is not a valid literal', () => {
    const graph = loadExample();
    (graph.edges[0] as { traversal?: unknown }).traversal = { status: 'nope', mutating: true };
    const result = validateAKG(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('traversal'))).toBe(true);
  });

  it('round-trips certificate and traversal through serialize -> parse unchanged', () => {
    const graph = loadExample();
    graph.nodes[0].certificate = {
      status: 'fail',
      violations: [{ invariant: 'tappable', detail: 'occluded', severity: 'error' }],
      device: '390x844',
    };
    graph.edges[0].traversal = { status: 'declared', mutating: true, reason: 'destructive' };

    const reparsed = parseAKG(JSON.parse(serializeAKG(graph)));
    expect(reparsed.nodes[0].certificate).toEqual(graph.nodes[0].certificate);
    expect(reparsed.edges[0].traversal).toEqual(graph.edges[0].traversal);
  });
});
