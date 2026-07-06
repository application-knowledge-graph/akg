import type { AKGSource } from './nodes.js';
import type { ApiCallReference } from './api.js';
import type { EdgeTraversal } from './certificate.js';

/** Discriminant for edge type. */
export type EdgeType =
  | 'navigation'
  | 'formSubmit'
  | 'apiCall'
  | 'stateChange'
  | 'redirect'
  | 'modalTrigger'
  | 'error';

/** What user action triggers this transition. */
export type EdgeTrigger =
  | 'click'
  | 'type'
  | 'submit'
  | 'hover'
  | 'swipe'
  | 'longPress'
  | 'keyPress'
  | 'scroll'
  | 'programmatic'
  | 'timer'
  | 'pageLoad'
  | string;

/** A client-side state mutation caused by a transition. */
export interface StateChange {
  key: string;
  operation: 'set' | 'update' | 'delete' | 'push' | 'pop';
  description?: string;
}

/** Info about a form field submitted in a FormSubmitEdge. */
export interface FormFieldInfo {
  name: string;
  inputType: string;
  required: boolean;
  label?: string;
  validation?: string;
}

/** Base interface shared by all edge types. */
export interface AKGEdgeBase {
  id: string;
  type: EdgeType | string;
  from: string;
  to: string;
  source: AKGSource;
  trigger: EdgeTrigger;
  elementId: string | null;
  requiresAuth: boolean;
  requiredRoles: string[];
  apiCalls: ApiCallReference[];
  stateChanges: StateChange[];
  timingMs: number | null;
  /** Crawl-execution provenance, present when the edge came from a live crawl. */
  traversal?: EdgeTraversal;
  metadata: Record<string, unknown>;
}

/** Client-side or full-page navigation. */
export interface NavigationEdge extends AKGEdgeBase {
  type: 'navigation';
  navigationType: 'spa' | 'fullPage' | 'backButton' | 'deepLink';
  resolvedUrl?: string;
}

/** Form submission with field data. */
export interface FormSubmitEdge extends AKGEdgeBase {
  type: 'formSubmit';
  formFields: FormFieldInfo[];
  formMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  isMultipart: boolean;
  validationErrors?: string[];
}

/** An API call edge (not on-load, triggered by user action). */
export interface ApiCallEdge extends AKGEdgeBase {
  type: 'apiCall';
  endpoint: ApiCallReference;
  isAsync: boolean;
}

/** A client-side state mutation edge. */
export interface StateChangeEdge extends AKGEdgeBase {
  type: 'stateChange';
  stateSystem?: string;
}

/** A server or client redirect. */
export interface RedirectEdge extends AKGEdgeBase {
  type: 'redirect';
  httpStatus?: 301 | 302 | 303 | 307 | 308;
  redirectType: 'server' | 'client';
}

/** Opening a modal, drawer, bottom sheet, or toast. */
export interface ModalTriggerEdge extends AKGEdgeBase {
  type: 'modalTrigger';
  targetNodeType: 'modal' | 'drawer' | 'bottomSheet' | 'toast';
}

/** An error path (failed API call, validation error, etc.). */
export interface ErrorEdge extends AKGEdgeBase {
  type: 'error';
  errorType: 'network' | 'validation' | 'auth' | 'server' | 'client' | 'unknown';
  httpStatus?: number;
  errorMessage?: string;
}

/** Discriminated union of all edge types. */
export type AKGEdge =
  | NavigationEdge
  | FormSubmitEdge
  | ApiCallEdge
  | StateChangeEdge
  | RedirectEdge
  | ModalTriggerEdge
  | ErrorEdge;
