import type { AKGElement } from './elements.js';
import type { ApiCallReference } from './api.js';

/** How a node/edge/element was discovered. */
export type AKGSource = 'code' | 'exploration' | 'both' | 'documentation';

/** Platform the application targets. */
export type AKGPlatform = 'web' | 'ios' | 'android' | 'hybrid';

/** Discriminant for node type. Core types are fixed; custom types use 'x-' prefix. */
export type NodeType =
  | 'screen'
  | 'modal'
  | 'drawer'
  | 'toast'
  | 'bottomSheet'
  | 'component';

/** How an overlay node can be dismissed. */
export type DismissMethod =
  | 'closeButton'
  | 'backdropClick'
  | 'escapeKey'
  | 'swipeDown'
  | 'programmatic';

/** Accessibility audit results for a node. */
export interface AccessibilityInfo {
  /** Overall score (0-100). Null if not audited. */
  score: number | null;
  /** List of accessibility violations. */
  violations: AccessibilityViolation[];
}

export interface AccessibilityViolation {
  rule: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  element: string;
  description: string;
}

/** Core Web Vitals and load performance captured during exploration. */
export interface PerformanceMetrics {
  loadTimeMs: number | null;
  lcpMs: number | null;
  cls: number | null;
  fidMs: number | null;
  tbtMs: number | null;
}

/** Metadata attached to every node. */
export interface NodeMetadata {
  title: string;
  description?: string;
  authRequired: boolean;
  requiredRoles: string[];
  custom: Record<string, unknown>;
}

/** Route/query/path parameter definition. */
export interface ParamDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required: boolean;
  enumValues?: string[];
  description?: string;
}

/** Base interface shared by all node types. */
export interface AKGNodeBase {
  id: string;
  type: NodeType | string;
  name: string;
  source: AKGSource;
  elements: AKGElement[];
  onLoadApiCalls: ApiCallReference[];
  screenshot?: string;
  domSnapshot?: string;
  accessibility: AccessibilityInfo;
  performance: PerformanceMetrics;
  metadata: NodeMetadata;
  lastObserved?: string;
}

/** A routable screen/page. */
export interface ScreenNode extends AKGNodeBase {
  type: 'screen';
  route: string;
  method?: string;
  queryParams?: ParamDefinition[];
  pathParams?: ParamDefinition[];
}

/** A modal overlay. */
export interface ModalNode extends AKGNodeBase {
  type: 'modal';
  parentNodeId: string;
  dismissMethods: DismissMethod[];
}

/** A side drawer overlay. */
export interface DrawerNode extends AKGNodeBase {
  type: 'drawer';
  parentNodeId: string;
  position: 'left' | 'right' | 'top' | 'bottom';
  dismissMethods: DismissMethod[];
}

/** A temporary toast/snackbar notification. */
export interface ToastNode extends AKGNodeBase {
  type: 'toast';
  durationMs: number | null;
  variant: 'info' | 'success' | 'warning' | 'error' | string;
  contextNodeId: string;
}

/** A bottom sheet overlay (mobile). */
export interface BottomSheetNode extends AKGNodeBase {
  type: 'bottomSheet';
  parentNodeId: string;
  snapPoints?: number[];
  dismissMethods: DismissMethod[];
}

/** A reusable component tracked across multiple nodes. */
export interface ComponentNode extends AKGNodeBase {
  type: 'component';
  componentName: string;
  filePath?: string;
  usedInNodes: string[];
}

/** Discriminated union of all node types. */
export type AKGNode =
  | ScreenNode
  | ModalNode
  | DrawerNode
  | ToastNode
  | BottomSheetNode
  | ComponentNode;
