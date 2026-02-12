import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ApiEndpoint, HttpMethod } from '@akg/types';
import { endpointId } from '@akg/core';
import { type Project, type SourceFile, Node } from 'ts-morph';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 * Extract API endpoints from route handler files and client-side fetch calls.
 */
export function extractApiEndpoints(
  project: Project,
  appDir: string,
  projectRoot: string,
): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  const seenIds = new Set<string>();

  // 1. Parse route handlers from app/api/**/route.ts
  const apiDir = join(appDir, 'api');
  const routeHandlers = findRouteHandlers(apiDir, appDir);

  for (const handler of routeHandlers) {
    for (const method of handler.methods) {
      const id = endpointId(method, handler.path);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      endpoints.push({
        id,
        method: method as HttpMethod,
        path: handler.path,
        source: 'code',
        contentType: 'application/json',
        authRequired: false,
        requiredRoles: [],
        calledOnLoadBy: [],
        calledByEdges: [],
      });
    }
  }

  // 2. Extract fetch() calls from source files
  for (const sourceFile of project.getSourceFiles()) {
    const fetchEndpoints = extractFetchCalls(sourceFile);
    for (const ep of fetchEndpoints) {
      if (seenIds.has(ep.id)) continue;
      seenIds.add(ep.id);
      endpoints.push(ep);
    }
  }

  return endpoints;
}

interface RouteHandler {
  path: string;
  methods: string[];
  filePath: string;
}

function findRouteHandlers(apiDir: string, appDir: string): RouteHandler[] {
  const handlers: RouteHandler[] = [];

  function scan(dir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    const routeFile = entries.find((e) => /^route\.(ts|tsx|js|jsx)$/.test(e));
    if (routeFile) {
      const filePath = join(dir, routeFile);
      const relPath = relative(appDir, dir);
      const apiPath = '/' + relPath.split(/[/\\]/).map((seg) => {
        if (seg.startsWith('[') && seg.endsWith(']')) {
          const inner = seg.slice(1, -1);
          if (inner.startsWith('...')) return `*${inner.slice(3)}`;
          return `:${inner}`;
        }
        return seg;
      }).join('/');

      const methods = detectHandlerMethods(filePath);
      handlers.push({ path: apiPath, methods, filePath });
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      try {
        if (statSync(fullPath).isDirectory()) {
          scan(fullPath);
        }
      } catch {
        // Skip inaccessible
      }
    }
  }

  scan(apiDir);
  return handlers;
}

function detectHandlerMethods(filePath: string): string[] {
  const methods: string[] = [];
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const method of HTTP_METHODS) {
      // Match: export async function GET, export function POST, export const GET
      const pattern = new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${method}\\b`);
      if (pattern.test(content)) {
        methods.push(method);
      }
    }
  } catch {
    // Fallback: assume GET
    methods.push('GET');
  }
  return methods.length > 0 ? methods : ['GET'];
}

function extractFetchCalls(sourceFile: SourceFile): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];

  sourceFile.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    const expr = node.getExpression().getText();
    if (expr !== 'fetch') return;

    const args = node.getArguments();
    if (args.length === 0) return;

    const urlArg = args[0];
    let url: string | undefined;

    if (Node.isStringLiteral(urlArg)) {
      url = urlArg.getLiteralValue();
    } else if (Node.isTemplateExpression(urlArg)) {
      // Extract the static part of template literals
      url = urlArg.getHead().getLiteralText();
    }

    if (!url || !url.startsWith('/api/')) return;

    // Detect method from options
    let method: HttpMethod = 'GET';
    if (args.length >= 2 && Node.isObjectLiteralExpression(args[1])) {
      const methodProp = args[1].getProperty('method');
      if (methodProp && Node.isPropertyAssignment(methodProp)) {
        const init = methodProp.getInitializer();
        if (init && Node.isStringLiteral(init)) {
          const val = init.getLiteralValue().toUpperCase();
          if (HTTP_METHODS.includes(val as HttpMethod)) {
            method = val as HttpMethod;
          }
        }
      }
    }

    const id = endpointId(method, url);
    endpoints.push({
      id,
      method,
      path: url,
      source: 'code',
      contentType: 'application/json',
      authRequired: false,
      requiredRoles: [],
      calledOnLoadBy: [],
      calledByEdges: [],
    });
  });

  return endpoints;
}
