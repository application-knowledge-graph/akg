import type { Project, SourceFile } from 'ts-morph';
import type { ComponentNode } from '@akg/types';
import { componentId } from '@akg/core';

/**
 * Extract component dependency tree.
 * Tracks which components are used in which pages/screens.
 */
export function extractComponents(
  project: Project,
  routeFileMap: Map<string, string>, // route -> filePath
): ComponentNode[] {
  const componentMap = new Map<string, { filePath: string; usedInRoutes: Set<string> }>();

  for (const [route, filePath] of routeFileMap) {
    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) continue;

    const imports = sourceFile.getImportDeclarations();
    for (const imp of imports) {
      const moduleSpec = imp.getModuleSpecifierValue();
      // Skip node_modules/external imports
      if (!moduleSpec.startsWith('.') && !moduleSpec.startsWith('@/') && !moduleSpec.startsWith('~/')) {
        continue;
      }

      // Named imports
      const namedImports = imp.getNamedImports();
      for (const named of namedImports) {
        const name = named.getName();
        // Likely a component if PascalCase
        if (/^[A-Z]/.test(name)) {
          if (!componentMap.has(name)) {
            const resolvedFile = resolveImportPath(sourceFile, moduleSpec);
            componentMap.set(name, {
              filePath: resolvedFile ?? moduleSpec,
              usedInRoutes: new Set(),
            });
          }
          componentMap.get(name)!.usedInRoutes.add(`screen:${route}`);
        }
      }

      // Default imports
      const defaultImport = imp.getDefaultImport();
      if (defaultImport) {
        const name = defaultImport.getText();
        if (/^[A-Z]/.test(name)) {
          if (!componentMap.has(name)) {
            const resolvedFile = resolveImportPath(sourceFile, moduleSpec);
            componentMap.set(name, {
              filePath: resolvedFile ?? moduleSpec,
              usedInRoutes: new Set(),
            });
          }
          componentMap.get(name)!.usedInRoutes.add(`screen:${route}`);
        }
      }
    }
  }

  return [...componentMap.entries()].map(([name, info]) => ({
    id: componentId(name),
    type: 'component' as const,
    name,
    componentName: name,
    filePath: info.filePath,
    usedInNodes: [...info.usedInRoutes],
    source: 'code' as const,
    elements: [],
    onLoadApiCalls: [],
    accessibility: { score: null, violations: [] },
    performance: { loadTimeMs: null, lcpMs: null, cls: null, fidMs: null, tbtMs: null },
    metadata: {
      title: name,
      authRequired: false,
      requiredRoles: [],
      custom: {},
    },
  }));
}

function resolveImportPath(sourceFile: SourceFile, moduleSpec: string): string | undefined {
  try {
    const resolvedModule = sourceFile.getImportDeclarations()
      .find((imp) => imp.getModuleSpecifierValue() === moduleSpec);
    if (resolvedModule) {
      const resolvedSource = resolvedModule.getModuleSpecifierSourceFile();
      if (resolvedSource) {
        return resolvedSource.getFilePath();
      }
    }
  } catch {
    // ts-morph resolution can fail for path aliases
  }
  return undefined;
}
