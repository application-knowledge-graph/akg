/**
 * Deterministic ID generation for AKG entities.
 * Enables matching between sources: `screen:/dashboard` from code matches
 * `screen:/dashboard` from exploration.
 */

/** Generate a deterministic ID for a screen node. */
export function screenId(route: string): string {
  return `screen:${route}`;
}

/** Generate a deterministic ID for an API endpoint. */
export function endpointId(method: string, path: string): string {
  return `api:${method}:${path}`;
}

/** Generate a deterministic ID for an edge. */
export function edgeId(from: string, to: string, trigger: string): string {
  return `edge:${from}:${to}:${trigger}`;
}

/** Generate a deterministic ID for a finding. */
export function findingId(ruleId: string, subjectId: string): string {
  return `finding:${ruleId}:${subjectId}`;
}

/** Generate a deterministic ID for a modal node. */
export function modalId(name: string): string {
  return `modal:${slugify(name)}`;
}

/** Generate a deterministic ID for a drawer node. */
export function drawerId(name: string): string {
  return `drawer:${slugify(name)}`;
}

/** Generate a deterministic ID for a toast node. */
export function toastId(name: string): string {
  return `toast:${slugify(name)}`;
}

/** Generate a deterministic ID for a bottom sheet node. */
export function bottomSheetId(name: string): string {
  return `bottomSheet:${slugify(name)}`;
}

/** Generate a deterministic ID for a component node. */
export function componentId(componentName: string): string {
  return `component:${componentName}`;
}

/** Generate a deterministic ID for an element. */
export function elementId(nodeId: string, label: string): string {
  return `el:${nodeId}:${slugify(label)}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
