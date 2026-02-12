import { describe, it, expect } from 'vitest';
import { AKGGraph, screenId, edgeId, endpointId } from '@akg/core';
import type { ScreenNode, NavigationEdge, ApiEndpoint, AKGMetadata } from '@akg/types';

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

function makeScreen(route: string, opts?: Partial<ScreenNode>): ScreenNode {
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
    ...opts,
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

describe('AKGGraph', () => {
  it('should create an empty graph', () => {
    const graph = AKGGraph.empty(testMetadata, 'screen:/');
    expect(graph.getAllNodes()).toHaveLength(0);
    expect(graph.getAllEdges()).toHaveLength(0);
  });

  it('should add and retrieve nodes', () => {
    const graph = AKGGraph.empty(testMetadata, 'screen:/');
    const home = makeScreen('/');
    const about = makeScreen('/about');
    graph.addNode(home);
    graph.addNode(about);

    expect(graph.getNode('screen:/')).toEqual(home);
    expect(graph.getNodeByRoute('/')).toEqual(home);
    expect(graph.getAllNodes()).toHaveLength(2);
  });

  it('should add and retrieve edges', () => {
    const graph = AKGGraph.empty(testMetadata, 'screen:/');
    graph.addNode(makeScreen('/'));
    graph.addNode(makeScreen('/about'));
    const edge = makeEdge('/', '/about');
    graph.addEdge(edge);

    expect(graph.getOutgoingEdges('screen:/')).toHaveLength(1);
    expect(graph.getIncomingEdges('screen:/about')).toHaveLength(1);
  });

  it('should find paths via traverse', () => {
    const graph = AKGGraph.empty(testMetadata, 'screen:/');
    graph.addNode(makeScreen('/'));
    graph.addNode(makeScreen('/about'));
    graph.addNode(makeScreen('/contact'));
    graph.addEdge(makeEdge('/', '/about'));
    graph.addEdge(makeEdge('/about', '/contact'));

    const paths = graph.traverse('screen:/', 'screen:/contact');
    expect(paths).toHaveLength(1);
    expect(paths[0]).toHaveLength(2);
  });

  it('should compute reachability', () => {
    const graph = AKGGraph.empty(testMetadata, 'screen:/');
    graph.addNode(makeScreen('/'));
    graph.addNode(makeScreen('/about'));
    graph.addNode(makeScreen('/orphan'));
    graph.addEdge(makeEdge('/', '/about'));

    const reachable = graph.reachability('screen:/');
    expect(reachable.has('screen:/')).toBe(true);
    expect(reachable.has('screen:/about')).toBe(true);
    expect(reachable.has('screen:/orphan')).toBe(false);
  });

  it('should find unreachable nodes', () => {
    const graph = AKGGraph.empty(testMetadata, 'screen:/');
    graph.addNode(makeScreen('/'));
    graph.addNode(makeScreen('/about'));
    graph.addNode(makeScreen('/orphan'));
    graph.addEdge(makeEdge('/', '/about'));

    const unreachable = graph.unreachable();
    expect(unreachable).toContain('screen:/orphan');
    expect(unreachable).not.toContain('screen:/');
  });

  it('should find dead elements', () => {
    const graph = AKGGraph.empty(testMetadata, 'screen:/');
    graph.addNode(makeScreen('/', {
      elements: [
        {
          id: 'el:1', type: 'button', selector: 'button', label: 'Dead',
          state: 'enabled', isInteractive: true, isDead: true, aria: {},
        },
        {
          id: 'el:2', type: 'button', selector: 'button', label: 'Live',
          state: 'enabled', isInteractive: true, isDead: false, aria: {},
        },
      ],
    }));

    const dead = graph.deadElements();
    expect(dead).toHaveLength(1);
    expect(dead[0].elementId).toBe('el:1');
  });

  it('should compute complexity', () => {
    const graph = AKGGraph.empty(testMetadata, 'screen:/');
    graph.addNode(makeScreen('/'));
    graph.addNode(makeScreen('/about'));
    graph.addNode(makeScreen('/contact'));
    graph.addEdge(makeEdge('/', '/about'));
    graph.addEdge(makeEdge('/about', '/contact'));

    const result = graph.complexity();
    expect(result.totalNodes).toBe(3);
    expect(result.totalEdges).toBe(2);
    expect(result.maxDepth).toBe(2);
  });

  it('should compute coverage', () => {
    const graph = AKGGraph.empty(testMetadata, 'screen:/');
    graph.addNode(makeScreen('/'));
    graph.addNode(makeScreen('/about'));
    const edge = makeEdge('/', '/about');
    graph.addEdge(edge);

    const result = graph.coverage(
      new Set(['screen:/']),
      new Set([edge.id]),
    );
    expect(result.nodeCoverage).toBe(0.5);
    expect(result.edgeCoverage).toBe(1);
    expect(result.uncoveredNodes).toContain('screen:/about');
  });

  it('should diff two graphs', () => {
    const graph1 = AKGGraph.empty(testMetadata, 'screen:/');
    graph1.addNode(makeScreen('/'));
    graph1.addNode(makeScreen('/about'));

    const graph2 = AKGGraph.empty(testMetadata, 'screen:/');
    graph2.addNode(makeScreen('/'));
    graph2.addNode(makeScreen('/new-page'));

    const result = graph1.diff(graph2);
    expect(result.summary.nodesAdded).toBe(1);
    expect(result.summary.nodesRemoved).toBe(1);
  });

  it('should serialize and deserialize', () => {
    const graph = AKGGraph.empty(testMetadata, 'screen:/');
    graph.addNode(makeScreen('/'));
    graph.addEdge(makeEdge('/', '/'));

    const json = graph.toJSON();
    const restored = AKGGraph.fromJSON(json);
    expect(restored.getAllNodes()).toHaveLength(1);
    expect(restored.getAllEdges()).toHaveLength(1);
  });
});
