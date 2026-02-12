import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface NextJSDetection {
  isNextJS: boolean;
  routerType: 'app' | 'pages' | 'both' | 'unknown';
  version?: string;
  appDir?: string;
  pagesDir?: string;
  srcDir: boolean;
}

/** Detect Next.js version, router type, and source directory structure. */
export function detectNextJS(projectRoot: string): NextJSDetection {
  // Check for Next.js in package.json
  const pkgPath = join(projectRoot, 'package.json');
  let version: string | undefined;

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      version =
        pkg.dependencies?.next ??
        pkg.devDependencies?.next;
    } catch {
      // Ignore parse errors
    }
  }

  const isNextJS = version !== undefined || existsSync(join(projectRoot, 'next.config.js')) ||
    existsSync(join(projectRoot, 'next.config.mjs')) ||
    existsSync(join(projectRoot, 'next.config.ts'));

  // Detect src directory
  const srcDir = existsSync(join(projectRoot, 'src'));

  // Detect router type
  const appDirCandidates = [
    join(projectRoot, 'app'),
    join(projectRoot, 'src', 'app'),
  ];
  const pagesDirCandidates = [
    join(projectRoot, 'pages'),
    join(projectRoot, 'src', 'pages'),
  ];

  const appDir = appDirCandidates.find((d) => existsSync(d));
  const pagesDir = pagesDirCandidates.find((d) => existsSync(d));

  let routerType: NextJSDetection['routerType'] = 'unknown';
  if (appDir && pagesDir) routerType = 'both';
  else if (appDir) routerType = 'app';
  else if (pagesDir) routerType = 'pages';

  return {
    isNextJS,
    routerType,
    version,
    appDir,
    pagesDir,
    srcDir,
  };
}
