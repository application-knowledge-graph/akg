import type { SourceFile } from 'ts-morph';
import type { InputElement, AKGElement, FormSubmitEdge, AKGEdge } from '@akg/types';
import { edgeId, screenId, elementId } from '@akg/core';
import { findJsxElements, getJsxStringAttribute } from './ast-utils.js';

/**
 * Extract form elements and form submission edges from:
 * - Native <input> and <Input> elements
 * - Zod schemas (z.object field names)
 * - <form action="..."> submissions
 */
export function extractForms(
  sourceFile: SourceFile,
  currentRoute: string,
  nodeId: string,
): { elements: AKGElement[]; edges: AKGEdge[] } {
  const elements: AKGElement[] = [];
  const edges: AKGEdge[] = [];

  // 1. Extract native <input> elements
  for (const tagName of ['input', 'Input']) {
    const inputElements = findJsxElements(sourceFile, tagName);
    for (const input of inputElements) {
      const name = getJsxStringAttribute(input, 'name');
      const type = getJsxStringAttribute(input, 'type') ?? 'text';
      const placeholder = getJsxStringAttribute(input, 'placeholder');
      const label = placeholder ?? name ?? type;

      if (!name) continue;

      const elId = elementId(nodeId, name);

      elements.push({
        id: elId,
        type: 'input',
        selector: `input[name='${name}']`,
        label,
        state: 'enabled',
        isInteractive: true,
        isDead: false,
        inputType: type,
        placeholder,
        aria: {},
      } as InputElement);
    }
  }

  // 2. Detect Zod schema fields for additional context
  const zodFields = extractZodFields(sourceFile);

  // 3. Detect form submissions via <form action="...">
  const formElements = findJsxElements(sourceFile, 'form');
  for (const form of formElements) {
    const action = getJsxStringAttribute(form, 'action');
    if (action && action.startsWith('/')) {
      const id = edgeId(nodeId, screenId(action), 'submit');
      edges.push({
        id,
        type: 'formSubmit',
        from: nodeId,
        to: screenId(action),
        source: 'code',
        trigger: 'submit',
        elementId: null,
        requiresAuth: false,
        requiredRoles: [],
        apiCalls: [],
        stateChanges: [],
        timingMs: null,
        metadata: { detectedIn: sourceFile.getFilePath() },
        formFields: elements
          .filter((e): e is InputElement => e.type === 'input')
          .map((e) => ({
            name: e.label,
            inputType: e.inputType,
            required: false,
          })),
        formMethod: 'POST',
        isMultipart: false,
      } satisfies FormSubmitEdge);
    }
  }

  return { elements, edges };
}

interface ZodField {
  name: string;
  type: string;
  required: boolean;
}

function extractZodFields(sourceFile: SourceFile): ZodField[] {
  const fields: ZodField[] = [];
  const text = sourceFile.getFullText();

  // Match z.object({ field: z.string(), ... }) using matchAll
  const zodObjectMatches = [...text.matchAll(/z\.object\s*\(\s*\{([^}]+)\}/g)];
  for (const match of zodObjectMatches) {
    const body = match[1];
    const fieldMatches = [...body.matchAll(/(\w+)\s*:\s*z\.(\w+)\(\)/g)];
    for (const fieldMatch of fieldMatches) {
      fields.push({
        name: fieldMatch[1],
        type: fieldMatch[2],
        required: !body.includes('.optional()'),
      });
    }
  }

  return fields;
}
