import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { ScreenNode, ParamDefinition } from '@akg/types';
import { screenId } from '@akg/core';

export interface RouteInfo {
  route: string;
  filePath: string;
  hasLayout: boolean;
  hasLoading: boolean;
  hasError: boolean;
  hasNotFound: boolean;
  isParallel: boolean;
  isIntercepting: boolean;
  pathParams: ParamDefinition[];
}

/**
 * Parse the Next.js `app/` directory structure into route nodes.
 * Handles: static, dynamic [id], catch-all [...slug], optional catch-all [[...slug]],
 * route groups (marketing), parallel routes @modal, intercepting routes (.)
 */
export function extractRoutes(appDir: string): RouteInfo[] {
  const routes: RouteInfo[] = [];
  scanDirectory(appDir, appDir, '', routes);
  return routes;
}

function scanDirectory(
  baseDir: string,
  currentDir: string,
  currentRoute: string,
  routes: RouteInfo[],
): void {
  let entries: string[];
  try {
    entries = readdirSync(currentDir);
  } catch {
    return;
  }

  // Check for page.tsx/page.jsx/page.ts/page.js
  const pageFile = entries.find((e) =>
    /^page\.(tsx?|jsx?)$/.test(e),
  );

  if (pageFile) {
    const route = currentRoute || '/';
    const pathParams = extractPathParams(route);

    routes.push({
      route: normalizeRoute(route),
      filePath: join(currentDir, pageFile),
      hasLayout: entries.some((e) => /^layout\.(tsx?|jsx?)$/.test(e)),
      hasLoading: entries.some((e) => /^loading\.(tsx?|jsx?)$/.test(e)),
      hasError: entries.some((e) => /^error\.(tsx?|jsx?)$/.test(e)),
      hasNotFound: entries.some((e) => /^not-found\.(tsx?|jsx?)$/.test(e)),
      isParallel: false,
      isIntercepting: false,
      pathParams,
    });
  }

  // Recurse into subdirectories
  for (const entry of entries) {
    const fullPath = join(currentDir, entry);
    if (!statSync(fullPath).isDirectory()) continue;

    // Skip special directories
    if (entry.startsWith('_') || entry === 'node_modules' || entry === '.next') continue;

    // Route groups: (name) — stripped from URL
    if (entry.startsWith('(') && entry.endsWith(')')) {
      scanDirectory(baseDir, fullPath, currentRoute, routes);
      continue;
    }

    // Parallel routes: @name — flagged but not in URL
    if (entry.startsWith('@')) {
      // Scan but mark as parallel
      const parallelRoutes: RouteInfo[] = [];
      scanDirectory(baseDir, fullPath, currentRoute, parallelRoutes);
      for (const r of parallelRoutes) {
        r.isParallel = true;
        routes.push(r);
      }
      continue;
    }

    // Intercepting routes: (.), (..), (...) prefix
    if (entry.startsWith('(.)') || entry.startsWith('(..)') || entry.startsWith('(...)')) {
      const interceptRoutes: RouteInfo[] = [];
      const interceptPath = entry.replace(/^\([.]+\)/, '');
      scanDirectory(baseDir, fullPath, `${currentRoute}/${interceptPath}`, interceptRoutes);
      for (const r of interceptRoutes) {
        r.isIntercepting = true;
        routes.push(r);
      }
      continue;
    }

    // Dynamic segments
    let segment = entry;
    if (entry.startsWith('[') && entry.endsWith(']')) {
      // [id] → :id, [...slug] → *slug, [[...slug]] → *slug?
      const inner = entry.slice(1, -1);
      if (inner.startsWith('[') && inner.endsWith(']')) {
        // Optional catch-all: [[...slug]]
        const param = inner.slice(4);
        segment = `*${param}`;
      } else if (inner.startsWith('...')) {
        // Catch-all: [...slug]
        const param = inner.slice(3);
        segment = `*${param}`;
      } else {
        // Dynamic: [id]
        segment = `:${inner}`;
      }
    }

    scanDirectory(baseDir, fullPath, `${currentRoute}/${segment}`, routes);
  }
}

function normalizeRoute(route: string): string {
  if (!route || route === '') return '/';
  // Remove duplicate slashes
  return route.replace(/\/+/g, '/');
}

function extractPathParams(route: string): ParamDefinition[] {
  const params: ParamDefinition[] = [];
  const segments = route.split('/');

  for (const segment of segments) {
    if (segment.startsWith(':')) {
      params.push({
        name: segment.slice(1),
        type: 'string',
        required: true,
      });
    } else if (segment.startsWith('*')) {
      params.push({
        name: segment.slice(1),
        type: 'string',
        required: false,
        description: 'Catch-all parameter',
      });
    }
  }

  return params;
}

/** Convert extracted routes to AKG ScreenNodes. */
export function routesToScreenNodes(routes: RouteInfo[]): ScreenNode[] {
  return routes.map((r) => ({
    id: screenId(r.route),
    type: 'screen' as const,
    name: routeToName(r.route),
    route: r.route,
    source: 'code' as const,
    elements: [],
    onLoadApiCalls: [],
    accessibility: { score: null, violations: [] },
    performance: { loadTimeMs: null, lcpMs: null, cls: null, fidMs: null, tbtMs: null },
    metadata: {
      title: routeToName(r.route),
      authRequired: false,
      requiredRoles: [],
      custom: {
        filePath: r.filePath,
        hasLayout: r.hasLayout,
        hasLoading: r.hasLoading,
        hasError: r.hasError,
        hasNotFound: r.hasNotFound,
        isParallel: r.isParallel,
        isIntercepting: r.isIntercepting,
      },
    },
    pathParams: r.pathParams.length > 0 ? r.pathParams : undefined,
  }));
}

function routeToName(route: string): string {
  if (route === '/') return 'Home';
  return route
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      if (seg.startsWith(':') || seg.startsWith('*')) return seg;
      return seg.charAt(0).toUpperCase() + seg.slice(1);
    })
    .join(' / ');
}
