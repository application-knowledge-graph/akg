import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SourceFile } from 'ts-morph';
import type { ScreenNode } from '@akg/types';
import { hasImportFrom } from './ast-utils.js';

/**
 * Detect authentication patterns and mark nodes as authRequired.
 * Scans:
 * - middleware.ts for route matchers
 * - Auth HOCs (withAuth, requireAuth)
 * - Session checks (useSession, getServerSession)
 */
export function detectAuth(
  projectRoot: string,
  nodes: ScreenNode[],
  sourceFiles: Map<string, SourceFile>,
): void {
  // 1. Parse middleware.ts for protected routes
  const protectedPatterns = parseMiddleware(projectRoot);

  // 2. Scan page files for auth HOCs and session checks
  for (const node of nodes) {
    const filePath = node.metadata.custom?.['filePath'] as string | undefined;
    if (!filePath) continue;

    const sourceFile = sourceFiles.get(filePath);

    // Check middleware patterns
    if (protectedPatterns.length > 0 && matchesProtectedRoute(node.route, protectedPatterns)) {
      node.metadata.authRequired = true;
    }

    // Check source file for auth patterns
    if (sourceFile) {
      if (hasAuthPatterns(sourceFile)) {
        node.metadata.authRequired = true;
      }

      const roles = detectRoles(sourceFile);
      if (roles.length > 0) {
        node.metadata.requiredRoles = roles;
        node.metadata.authRequired = true;
      }
    }
  }
}

function parseMiddleware(projectRoot: string): string[] {
  const patterns: string[] = [];
  const middlewarePaths = [
    join(projectRoot, 'middleware.ts'),
    join(projectRoot, 'middleware.js'),
    join(projectRoot, 'src', 'middleware.ts'),
    join(projectRoot, 'src', 'middleware.js'),
  ];

  for (const mwPath of middlewarePaths) {
    if (!existsSync(mwPath)) continue;

    try {
      const content = readFileSync(mwPath, 'utf-8');

      // Look for config.matcher array patterns
      const matcherArrayPattern = /matcher\s*:\s*\[([^\]]+)\]/;
      const match = content.match(matcherArrayPattern);
      if (match) {
        const matchers = match[1]
          .split(',')
          .map((s) => s.trim().replace(/['"]/g, ''))
          .filter(Boolean);
        patterns.push(...matchers);
      }

      // Look for single matcher string
      const singleMatcherPattern = /matcher\s*:\s*['"]([^'"]+)['"]/;
      const singleMatch = content.match(singleMatcherPattern);
      if (singleMatch) {
        patterns.push(singleMatch[1]);
      }
    } catch {
      // Ignore read errors
    }
  }

  return patterns;
}

function matchesProtectedRoute(route: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple pattern matching (supports :path* and (.*))
    const regexStr = pattern
      .replace(/:\w+\*/g, '.*')
      .replace(/\(\.?\*\)/g, '.*')
      .replace(/\//g, '\\/');

    try {
      if (new RegExp(`^${regexStr}`).test(route)) {
        return true;
      }
    } catch {
      // Invalid regex, skip
    }
  }
  return false;
}

function hasAuthPatterns(sourceFile: SourceFile): boolean {
  const authModules = [
    'next-auth',
    '@auth/nextjs',
    '@clerk/nextjs',
  ];

  for (const mod of authModules) {
    if (hasImportFrom(sourceFile, mod)) return true;
  }

  // Check for auth function calls in the file text
  const text = sourceFile.getFullText();
  const authCallNames = [
    'getServerSession',
    'useSession',
    'getSession',
    'withAuth',
    'requireAuth',
    'currentUser',
    'getUser',
  ];

  return authCallNames.some((name) => text.includes(`${name}(`));
}

function detectRoles(sourceFile: SourceFile): string[] {
  const roles: string[] = [];
  const text = sourceFile.getFullText();

  // Look for role checks like: role === 'admin'
  const roleEqualityPattern = /role\s*===?\s*['"](\w+)['"]/g;
  let match;
  while ((match = roleEqualityPattern.exec(text)) !== null) {
    if (match[1]) roles.push(match[1]);
  }

  // Look for: roles.includes('editor')
  const roleIncludesPattern = /roles?\.includes\(\s*['"](\w+)['"]\s*\)/g;
  while ((match = roleIncludesPattern.exec(text)) !== null) {
    if (match[1]) roles.push(match[1]);
  }

  return [...new Set(roles)];
}
