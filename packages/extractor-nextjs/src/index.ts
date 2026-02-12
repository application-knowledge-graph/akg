import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ApplicationKnowledgeGraph,
  AKGExtractorPlugin,
  AKGNode,
  AKGEdge,
  ScreenNode,
} from '@akg/types';
import { AKGGraph, screenId } from '@akg/core';
import { detectNextJS } from './detect.js';
import { extractRoutes, routesToScreenNodes } from './routes.js';
import { extractApiEndpoints } from './api-endpoints.js';
import { extractNavigation } from './navigation.js';
import { detectAuth } from './auth.js';
import { extractForms } from './forms.js';
import { extractComponents } from './components.js';
import { createProject } from './ast-utils.js';
import fg from 'fast-glob';

export { detectNextJS } from './detect.js';
export { extractRoutes, routesToScreenNodes } from './routes.js';
export { extractApiEndpoints } from './api-endpoints.js';
export { extractNavigation } from './navigation.js';
export { detectAuth } from './auth.js';
export { extractForms } from './forms.js';
export { extractComponents } from './components.js';

/**
 * Next.js App Router extractor — implements AKGExtractorPlugin.
 * Pure static analysis, no running app needed (Pass 0).
 */
export class NextJSAppRouterExtractor implements AKGExtractorPlugin {
  name = 'nextjs-app-router';
  framework = 'nextjs';
  version = '0.1.0';

  async extractFromCode(
    projectRoot: string,
    options?: Record<string, unknown>,
  ): Promise<Partial<ApplicationKnowledgeGraph>> {
    const detection = detectNextJS(projectRoot);

    if (!detection.isNextJS) {
      throw new Error(`Not a Next.js project: ${projectRoot}`);
    }

    if (!detection.appDir) {
      throw new Error(`No app/ directory found. Only App Router is supported in v0.1.0.`);
    }

    const appDir = detection.appDir;

    // 1. Create ts-morph project and add source files
    const tsMorphProject = createProject(projectRoot);
    const sourceGlobs = [
      `${appDir}/**/*.{ts,tsx,js,jsx}`,
      `${projectRoot}/src/**/*.{ts,tsx,js,jsx}`,
      `${projectRoot}/components/**/*.{ts,tsx,js,jsx}`,
      `${projectRoot}/lib/**/*.{ts,tsx,js,jsx}`,
    ];
    const sourceFilePaths = await fg(sourceGlobs, {
      ignore: ['**/node_modules/**', '**/.next/**'],
      absolute: true,
    });
    for (const fp of sourceFilePaths) {
      tsMorphProject.addSourceFileAtPath(fp);
    }

    // 2. Extract routes from filesystem
    const routeInfos = extractRoutes(appDir);
    const screenNodes = routesToScreenNodes(routeInfos);

    // 3. Build source file map (filePath -> SourceFile)
    const sourceFileMap = new Map<string, ReturnType<typeof tsMorphProject.getSourceFile>>();
    for (const sf of tsMorphProject.getSourceFiles()) {
      const mapped = sourceFileMap.set(sf.getFilePath(), sf);
    }

    // 4. Extract API endpoints
    const apiEndpoints = extractApiEndpoints(tsMorphProject, appDir, projectRoot);

    // 5. Extract navigation edges from all page files
    const allEdges: AKGEdge[] = [];
    for (const routeInfo of routeInfos) {
      const sf = sourceFileMap.get(routeInfo.filePath);
      if (!sf) continue;
      const navEdges = extractNavigation(sf, routeInfo.route);
      allEdges.push(...navEdges);
    }

    // 6. Extract form elements and edges
    for (const routeInfo of routeInfos) {
      const sf = sourceFileMap.get(routeInfo.filePath);
      if (!sf) continue;
      const nodeId = screenId(routeInfo.route);
      const { elements, edges } = extractForms(sf, routeInfo.route, nodeId);

      // Add elements to the corresponding screen node
      const node = screenNodes.find((n) => n.id === nodeId);
      if (node) {
        node.elements.push(...elements);
      }
      allEdges.push(...edges);
    }

    // 7. Detect auth patterns
    detectAuth(projectRoot, screenNodes, sourceFileMap as Map<string, any>);

    // 8. Extract component tree
    const routeFileMap = new Map<string, string>();
    for (const ri of routeInfos) {
      routeFileMap.set(ri.route, ri.filePath);
    }
    const componentNodes = extractComponents(tsMorphProject, routeFileMap);

    // 9. Assemble partial AKG
    const entryNodeId = screenNodes.find((n) => n.route === '/')?.id ?? screenNodes[0]?.id ?? '';

    return {
      specVersion: '0.1.0',
      metadata: {
        specVersion: '0.1.0',
        appName: options?.['appName'] as string ?? detectAppName(projectRoot),
        appVersion: options?.['appVersion'] as string ?? 'unknown',
        generatedAt: new Date().toISOString(),
        generatedBy: `@akg/extractor-nextjs@${this.version}`,
        baseUrl: options?.['baseUrl'] as string ?? 'http://localhost:3000',
        platform: 'web',
        tags: {
          framework: 'next.js',
          routerType: detection.routerType,
          ...(detection.version ? { nextVersion: detection.version } : {}),
        },
      },
      nodes: [...screenNodes, ...componentNodes],
      edges: allEdges,
      endpoints: apiEndpoints,
      findings: [],
      apiReconciliation: {
        deadEndpoints: [],
        undocumentedEndpoints: [],
        authMismatches: [],
      },
      entryNodeId,
    };
  }
}

function detectAppName(projectRoot: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    return pkg.name ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
