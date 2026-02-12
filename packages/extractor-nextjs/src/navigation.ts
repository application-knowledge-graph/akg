import type { NavigationEdge, AKGEdge } from '@akg/types';
import type { SourceFile } from 'ts-morph';
import { Node } from 'ts-morph';
import { edgeId, screenId } from '@akg/core';
import {
  findJsxElements,
  getJsxStringAttribute,
  findCallExpressions,
  getCallStringArg,
} from './ast-utils.js';

/**
 * Extract navigation edges from:
 * - <Link href="..."> components (next/link)
 * - router.push("...") calls
 * - redirect("...") calls from next/navigation
 */
export function extractNavigation(
  sourceFile: SourceFile,
  currentRoute: string,
): AKGEdge[] {
  const edges: AKGEdge[] = [];
  const seen = new Set<string>();

  // 1. <Link href="..."> from next/link
  const linkElements = findJsxElements(sourceFile, 'Link');
  for (const link of linkElements) {
    const href = getJsxStringAttribute(link, 'href');
    if (!href || href.startsWith('http') || href.startsWith('#')) continue;

    const targetRoute = normalizeHref(href);
    const id = edgeId(screenId(currentRoute), screenId(targetRoute), 'click');
    if (seen.has(id)) continue;
    seen.add(id);

    edges.push({
      id,
      type: 'navigation',
      from: screenId(currentRoute),
      to: screenId(targetRoute),
      source: 'code',
      trigger: 'click',
      elementId: null,
      requiresAuth: false,
      requiredRoles: [],
      apiCalls: [],
      stateChanges: [],
      timingMs: null,
      metadata: { detectedIn: sourceFile.getFilePath() },
      navigationType: 'spa',
    } satisfies NavigationEdge);
  }

  // 2. router.push("..."), router.replace("...")
  for (const methodName of ['push', 'replace']) {
    const calls = findCallExpressions(sourceFile, methodName);
    for (const call of calls) {
      // Verify it's likely from useRouter
      const exprText = call.getExpression().getText();
      if (!exprText.includes('router') && !exprText.includes('Router')) continue;

      const href = getCallStringArg(call, 0);
      if (!href || href.startsWith('http')) continue;

      const targetRoute = normalizeHref(href);
      const id = edgeId(screenId(currentRoute), screenId(targetRoute), 'programmatic');
      if (seen.has(id)) continue;
      seen.add(id);

      edges.push({
        id,
        type: 'navigation',
        from: screenId(currentRoute),
        to: screenId(targetRoute),
        source: 'code',
        trigger: 'programmatic',
        elementId: null,
        requiresAuth: false,
        requiredRoles: [],
        apiCalls: [],
        stateChanges: [],
        timingMs: null,
        metadata: { detectedIn: sourceFile.getFilePath(), method: methodName },
        navigationType: 'spa',
      } satisfies NavigationEdge);
    }
  }

  // 3. redirect("...") from next/navigation
  const redirectCalls = findCallExpressions(sourceFile, 'redirect');
  for (const call of redirectCalls) {
    const href = getCallStringArg(call, 0);
    if (!href || href.startsWith('http')) continue;

    const targetRoute = normalizeHref(href);
    const id = edgeId(screenId(currentRoute), screenId(targetRoute), 'programmatic');
    if (seen.has(id)) continue;
    seen.add(id);

    edges.push({
      id,
      type: 'redirect',
      from: screenId(currentRoute),
      to: screenId(targetRoute),
      source: 'code',
      trigger: 'programmatic',
      elementId: null,
      requiresAuth: false,
      requiredRoles: [],
      apiCalls: [],
      stateChanges: [],
      timingMs: null,
      metadata: { detectedIn: sourceFile.getFilePath() },
      redirectType: 'server',
    } as AKGEdge);
  }

  return edges;
}

function normalizeHref(href: string): string {
  // Remove query params and hash for route matching
  const route = href.split('?')[0].split('#')[0];
  return route || '/';
}
