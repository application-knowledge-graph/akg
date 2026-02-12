import {
  Project,
  SourceFile,
  SyntaxKind,
  Node,
  CallExpression,
  JsxOpeningElement,
  JsxSelfClosingElement,
  ImportDeclaration,
  type ts,
} from 'ts-morph';

/** Create a ts-morph project from a directory. */
export function createProject(projectRoot: string): Project {
  return new Project({
    tsConfigFilePath: undefined,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      allowJs: true,
      jsx: 4 /* JsxEmit.ReactJSX */,
      esModuleInterop: true,
      moduleResolution: 100 /* ModuleResolutionKind.Bundler */,
      target: 9 /* ScriptTarget.ES2022 */,
      noEmit: true,
    },
  });
}

/** Find all JSX elements matching a component name. */
export function findJsxElements(
  sourceFile: SourceFile,
  componentName: string,
): (JsxOpeningElement | JsxSelfClosingElement)[] {
  const results: (JsxOpeningElement | JsxSelfClosingElement)[] = [];

  sourceFile.forEachDescendant((node) => {
    if (Node.isJsxOpeningElement(node) || Node.isJsxSelfClosingElement(node)) {
      const tagName = node.getTagNameNode().getText();
      if (tagName === componentName) {
        results.push(node);
      }
    }
  });

  return results;
}

/** Get a string attribute from a JSX element. */
export function getJsxStringAttribute(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string,
): string | undefined {
  const attr = element.getAttribute(attrName);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const initializer = attr.getInitializer();
  if (!initializer) return undefined;

  if (Node.isStringLiteral(initializer)) {
    return initializer.getLiteralValue();
  }
  if (Node.isJsxExpression(initializer)) {
    const expr = initializer.getExpression();
    if (expr && Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }
    // Template literals
    if (expr && Node.isTemplateExpression(expr)) {
      return expr.getText();
    }
  }

  return undefined;
}

/** Find all function calls matching a name. */
export function findCallExpressions(
  sourceFile: SourceFile,
  functionName: string,
): CallExpression[] {
  const results: CallExpression[] = [];

  sourceFile.forEachDescendant((node) => {
    if (Node.isCallExpression(node)) {
      const expr = node.getExpression();
      const text = expr.getText();
      // Match: functionName(), obj.functionName(), useRouter().functionName
      if (
        text === functionName ||
        text.endsWith(`.${functionName}`)
      ) {
        results.push(node);
      }
    }
  });

  return results;
}

/** Get all imports from a source file. */
export function getImports(sourceFile: SourceFile): ImportDeclaration[] {
  return sourceFile.getImportDeclarations();
}

/** Check if a source file imports from a specific module. */
export function hasImportFrom(sourceFile: SourceFile, moduleSpecifier: string): boolean {
  return sourceFile.getImportDeclarations().some(
    (imp) => imp.getModuleSpecifierValue() === moduleSpecifier ||
             imp.getModuleSpecifierValue().startsWith(moduleSpecifier),
  );
}

/** Get all exported function/variable names from a file. */
export function getExportedNames(sourceFile: SourceFile): string[] {
  const names: string[] = [];

  for (const fn of sourceFile.getFunctions()) {
    if (fn.isExported()) {
      const name = fn.getName();
      if (name) names.push(name);
    }
  }

  for (const decl of sourceFile.getVariableDeclarations()) {
    if (decl.isExported()) {
      names.push(decl.getName());
    }
  }

  for (const cls of sourceFile.getClasses()) {
    if (cls.isExported()) {
      const name = cls.getName();
      if (name) names.push(name);
    }
  }

  return names;
}

/** Read a string argument from a call expression at given index. */
export function getCallStringArg(call: CallExpression, index: number): string | undefined {
  const args = call.getArguments();
  if (index >= args.length) return undefined;
  const arg = args[index];
  if (Node.isStringLiteral(arg)) return arg.getLiteralValue();
  if (Node.isTemplateExpression(arg)) return arg.getText();
  return undefined;
}
