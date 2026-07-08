import { describe, it, expect } from 'vitest';
import { AKGGraph, screenId, edgeId } from '@akg/core';
import type { ScreenNode, NavigationEdge, AKGMetadata } from '@akg/types';

const testMetadata: AKGMetadata = {
  specVersion: '0.1.0',
  appName: 'test-app',
  appVersion: '1.0.0',
  generatedAt: '2026-01-01T00:00:00Z',
  generatedBy: 'test',
  baseUrl: 'http://localhost:3000',
  platform: 'web',
  tags: {},
};

function makeScreen(route: string): ScreenNode {
  return {
    id: screenId(route),
    type: 'screen',
    name: route,
    route,
    source: 'code',
    elements: [],
    onLoadApiCalls: [],
    accessibility: { score: null, violations: [] },
    performance: { loadTimeMs: null, lcpMs: null, cls: null, fidMs: null, tbtMs: null },
    metadata: { title: route, authRequired: false, requiredRoles: [], custom: {} },
  };
}

function makeEdge(from: string, to: string, trigger = 'click'): NavigationEdge {
  return {
    id: edgeId(screenId(from), screenId(to), trigger),
    type: 'navigation',
    from: screenId(from),
    to: screenId(to),
    source: 'code',
    trigger,
    elementId: null,
    requiresAuth: false,
    requiredRoles: [],
    apiCalls: [],
    stateChanges: [],
    timingMs: null,
    metadata: {},
    navigationType: 'spa',
  };
}

describe('traverse()', () => {
  it('returns node IDs, not edge IDs, for a linear path', () => {
    const graph = AKGGraph.empty(testMetadata, screenId('/a'));
    graph.addNode(makeScreen('/a'));
    graph.addNode(makeScreen('/b'));
    graph.addNode(makeScreen('/c'));
    graph.addEdge(makeEdge('/a', '/b'));
    graph.addEdge(makeEdge('/b', '/c'));

    const paths = graph.traverse(screenId('/a'), screenId('/c'));

    expect(paths).toHaveLength(1);
    expect(paths[0]).toEqual([screenId('/a'), screenId('/b'), screenId('/c')]);

    // Every ID in the path must resolve to a real node
    for (const nodeId of paths[0]!) {
      expect(graph.getNode(nodeId)).toBeDefined();
    }
  });

  it('returns multiple paths when they exist', () => {
    const graph = AKGGraph.empty(testMetadata, screenId('/start'));
    graph.addNode(makeScreen('/start'));
    graph.addNode(makeScreen('/mid1'));
    graph.addNode(makeScreen('/mid2'));
    graph.addNode(makeScreen('/end'));
    graph.addEdge(makeEdge('/start', '/mid1'));
    graph.addEdge(makeEdge('/start', '/mid2'));
    graph.addEdge(makeEdge('/mid1', '/end'));
    graph.addEdge(makeEdge('/mid2', '/end'));

    const paths = graph.traverse(screenId('/start'), screenId('/end'));

    expect(paths).toHaveLength(2);
    // Both paths start with /start and end with /end
    for (const path of paths) {
      expect(path[0]).toBe(screenId('/start'));
      expect(path[path.length - 1]).toBe(screenId('/end'));
      // Every node ID is resolvable
      for (const nodeId of path) {
        expect(graph.getNode(nodeId)).toBeDefined();
      }
    }
  });

  it('returns empty array when no path exists', () => {
    const graph = AKGGraph.empty(testMetadata, screenId('/a'));
    graph.addNode(makeScreen('/a'));
    graph.addNode(makeScreen('/b'));
    // No edge connecting them

    const paths = graph.traverse(screenId('/a'), screenId('/b'));
    expect(paths).toEqual([]);
  });

  it('does not include edge IDs in paths', () => {
    const graph = AKGGraph.empty(testMetadata, screenId('/a'));
    graph.addNode(makeScreen('/a'));
    graph.addNode(makeScreen('/b'));
    const edge = makeEdge('/a', '/b');
    graph.addEdge(edge);

    const paths = graph.traverse(screenId('/a'), screenId('/b'));

    expect(paths).toHaveLength(1);
    // The edge ID must NOT appear in the path
    for (const id of paths[0]!) {
      expect(id).not.toBe(edge.id);
    }
  });
});
