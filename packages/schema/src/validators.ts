import { z } from 'zod';

// ─── Shared Enums ───

export const AKGSourceSchema = z.enum(['code', 'exploration', 'both', 'documentation']);
export const AKGPlatformSchema = z.enum(['web', 'ios', 'android', 'hybrid']);
export const DismissMethodSchema = z.enum(['closeButton', 'backdropClick', 'escapeKey', 'swipeDown', 'programmatic']);
export const ElementStateSchema = z.enum(['enabled', 'disabled', 'hidden', 'loading', 'readonly']);
export const FindingSeveritySchema = z.enum(['info', 'warning', 'error', 'critical']);
export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

// ─── Elements ───

export const AriaAttributesSchema = z.object({
  role: z.string().optional(),
  label: z.string().optional(),
  describedBy: z.string().optional(),
  expanded: z.boolean().optional(),
  checked: z.boolean().optional(),
  selected: z.boolean().optional(),
  required: z.boolean().optional(),
  invalid: z.boolean().optional(),
  live: z.enum(['polite', 'assertive', 'off']).optional(),
});

export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const AKGElementBaseSchema = z.object({
  id: z.string(),
  type: z.string(),
  selector: z.string(),
  label: z.string(),
  state: ElementStateSchema,
  isInteractive: z.boolean(),
  isDead: z.boolean(),
  aria: AriaAttributesSchema,
  boundingBox: BoundingBoxSchema.optional(),
});

export const ButtonElementSchema = AKGElementBaseSchema.extend({
  type: z.literal('button'),
  buttonType: z.enum(['submit', 'reset', 'button']),
  triggersEdges: z.array(z.string()),
});

export const LinkElementSchema = AKGElementBaseSchema.extend({
  type: z.literal('link'),
  href: z.string(),
  isExternal: z.boolean(),
  triggersEdge: z.string().optional(),
});

export const InputElementSchema = AKGElementBaseSchema.extend({
  type: z.literal('input'),
  inputType: z.string(),
  placeholder: z.string().optional(),
  validation: z.string().optional(),
  maxLength: z.number().optional(),
  autocomplete: z.string().optional(),
});

export const SelectElementSchema = AKGElementBaseSchema.extend({
  type: z.literal('select'),
  options: z.array(z.object({ value: z.string(), label: z.string() })),
  isMultiple: z.boolean(),
});

export const CheckboxElementSchema = AKGElementBaseSchema.extend({
  type: z.literal('checkbox'),
  checked: z.boolean(),
  groupName: z.string().optional(),
});

export const TextElementSchema = AKGElementBaseSchema.extend({
  type: z.literal('text'),
  textContent: z.string(),
  semanticTag: z.string(),
});

export const ImageElementSchema = AKGElementBaseSchema.extend({
  type: z.literal('image'),
  src: z.string(),
  alt: z.string(),
  loaded: z.boolean(),
});

export const IconElementSchema = AKGElementBaseSchema.extend({
  type: z.literal('icon'),
  iconName: z.string().optional(),
});

export const AKGElementSchema = z.discriminatedUnion('type', [
  ButtonElementSchema,
  LinkElementSchema,
  InputElementSchema,
  SelectElementSchema,
  CheckboxElementSchema,
  TextElementSchema,
  ImageElementSchema,
  IconElementSchema,
]).or(AKGElementBaseSchema);

// ─── API ───

export const ApiCallReferenceSchema = z.object({
  endpointId: z.string(),
  method: z.string(),
  path: z.string(),
  statusCode: z.number().optional(),
  responseTimeMs: z.number().optional(),
});

export const SchemaDefinitionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum(['object', 'array', 'string', 'number', 'boolean', 'null']),
    properties: z.record(SchemaDefinitionSchema).optional(),
    items: SchemaDefinitionSchema.optional(),
    required: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
);

export const ApiEndpointSchema = z.object({
  id: z.string(),
  method: HttpMethodSchema,
  path: z.string(),
  baseUrl: z.string().optional(),
  source: AKGSourceSchema,
  requestShape: SchemaDefinitionSchema.optional(),
  responseShape: SchemaDefinitionSchema.optional(),
  contentType: z.string(),
  authRequired: z.boolean(),
  requiredRoles: z.array(z.string()),
  calledOnLoadBy: z.array(z.string()),
  calledByEdges: z.array(z.string()),
  responseTimesMs: z.tuple([z.number(), z.number(), z.number()]).optional(),
  observedStatusCodes: z.record(z.coerce.string(), z.number()).optional(),
});

export const ApiReconciliationSchema = z.object({
  deadEndpoints: z.array(z.string()),
  undocumentedEndpoints: z.array(z.string()),
  authMismatches: z.array(
    z.object({
      endpointId: z.string(),
      codeRequiresAuth: z.boolean(),
      explorationRequiredAuth: z.boolean(),
    }),
  ),
});

// ─── Nodes ───

export const AccessibilityViolationSchema = z.object({
  rule: z.string(),
  impact: z.enum(['minor', 'moderate', 'serious', 'critical']),
  element: z.string(),
  description: z.string(),
});

export const AccessibilityInfoSchema = z.object({
  score: z.number().min(0).max(100).nullable(),
  violations: z.array(AccessibilityViolationSchema),
});

export const PerformanceMetricsSchema = z.object({
  loadTimeMs: z.number().nullable(),
  lcpMs: z.number().nullable(),
  cls: z.number().nullable(),
  fidMs: z.number().nullable(),
  tbtMs: z.number().nullable(),
});

export const NodeMetadataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  authRequired: z.boolean(),
  requiredRoles: z.array(z.string()),
  custom: z.record(z.unknown()),
});

export const ParamDefinitionSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'enum']),
  required: z.boolean(),
  enumValues: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const AKGNodeBaseFields = {
  id: z.string(),
  type: z.string(),
  name: z.string(),
  source: AKGSourceSchema,
  elements: z.array(AKGElementSchema),
  onLoadApiCalls: z.array(ApiCallReferenceSchema),
  screenshot: z.string().optional(),
  domSnapshot: z.string().optional(),
  accessibility: AccessibilityInfoSchema,
  performance: PerformanceMetricsSchema,
  metadata: NodeMetadataSchema,
  lastObserved: z.string().optional(),
} as const;

export const ScreenNodeSchema = z.object({
  ...AKGNodeBaseFields,
  type: z.literal('screen'),
  route: z.string(),
  method: z.string().optional(),
  queryParams: z.array(ParamDefinitionSchema).optional(),
  pathParams: z.array(ParamDefinitionSchema).optional(),
});

export const ModalNodeSchema = z.object({
  ...AKGNodeBaseFields,
  type: z.literal('modal'),
  parentNodeId: z.string(),
  dismissMethods: z.array(DismissMethodSchema),
});

export const DrawerNodeSchema = z.object({
  ...AKGNodeBaseFields,
  type: z.literal('drawer'),
  parentNodeId: z.string(),
  position: z.enum(['left', 'right', 'top', 'bottom']),
  dismissMethods: z.array(DismissMethodSchema),
});

export const ToastNodeSchema = z.object({
  ...AKGNodeBaseFields,
  type: z.literal('toast'),
  durationMs: z.number().nullable(),
  variant: z.string(),
  contextNodeId: z.string(),
});

export const BottomSheetNodeSchema = z.object({
  ...AKGNodeBaseFields,
  type: z.literal('bottomSheet'),
  parentNodeId: z.string(),
  snapPoints: z.array(z.number()).optional(),
  dismissMethods: z.array(DismissMethodSchema),
});

export const ComponentNodeSchema = z.object({
  ...AKGNodeBaseFields,
  type: z.literal('component'),
  componentName: z.string(),
  filePath: z.string().optional(),
  usedInNodes: z.array(z.string()),
});

export const AKGNodeSchema = z.discriminatedUnion('type', [
  ScreenNodeSchema,
  ModalNodeSchema,
  DrawerNodeSchema,
  ToastNodeSchema,
  BottomSheetNodeSchema,
  ComponentNodeSchema,
]);

// ─── Edges ───

export const StateChangeSchema = z.object({
  key: z.string(),
  operation: z.enum(['set', 'update', 'delete', 'push', 'pop']),
  description: z.string().optional(),
});

export const FormFieldInfoSchema = z.object({
  name: z.string(),
  inputType: z.string(),
  required: z.boolean(),
  label: z.string().optional(),
  validation: z.string().optional(),
});

const AKGEdgeBaseFields = {
  id: z.string(),
  type: z.string(),
  from: z.string(),
  to: z.string(),
  source: AKGSourceSchema,
  trigger: z.string(),
  elementId: z.string().nullable(),
  requiresAuth: z.boolean(),
  requiredRoles: z.array(z.string()),
  apiCalls: z.array(ApiCallReferenceSchema),
  stateChanges: z.array(StateChangeSchema),
  timingMs: z.number().nullable(),
  metadata: z.record(z.unknown()),
} as const;

export const NavigationEdgeSchema = z.object({
  ...AKGEdgeBaseFields,
  type: z.literal('navigation'),
  navigationType: z.enum(['spa', 'fullPage', 'backButton', 'deepLink']),
  resolvedUrl: z.string().optional(),
});

export const FormSubmitEdgeSchema = z.object({
  ...AKGEdgeBaseFields,
  type: z.literal('formSubmit'),
  formFields: z.array(FormFieldInfoSchema),
  formMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  isMultipart: z.boolean(),
  validationErrors: z.array(z.string()).optional(),
});

export const ApiCallEdgeSchema = z.object({
  ...AKGEdgeBaseFields,
  type: z.literal('apiCall'),
  endpoint: ApiCallReferenceSchema,
  isAsync: z.boolean(),
});

export const StateChangeEdgeSchema = z.object({
  ...AKGEdgeBaseFields,
  type: z.literal('stateChange'),
  stateSystem: z.string().optional(),
});

export const RedirectEdgeSchema = z.object({
  ...AKGEdgeBaseFields,
  type: z.literal('redirect'),
  httpStatus: z.union([z.literal(301), z.literal(302), z.literal(303), z.literal(307), z.literal(308)]).optional(),
  redirectType: z.enum(['server', 'client']),
});

export const ModalTriggerEdgeSchema = z.object({
  ...AKGEdgeBaseFields,
  type: z.literal('modalTrigger'),
  targetNodeType: z.enum(['modal', 'drawer', 'bottomSheet', 'toast']),
});

export const ErrorEdgeSchema = z.object({
  ...AKGEdgeBaseFields,
  type: z.literal('error'),
  errorType: z.enum(['network', 'validation', 'auth', 'server', 'client', 'unknown']),
  httpStatus: z.number().optional(),
  errorMessage: z.string().optional(),
});

export const AKGEdgeSchema = z.discriminatedUnion('type', [
  NavigationEdgeSchema,
  FormSubmitEdgeSchema,
  ApiCallEdgeSchema,
  StateChangeEdgeSchema,
  RedirectEdgeSchema,
  ModalTriggerEdgeSchema,
  ErrorEdgeSchema,
]);

// ─── Findings ───

export const AKGFindingSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  severity: FindingSeveritySchema,
  title: z.string(),
  description: z.string(),
  subjectType: z.enum(['node', 'edge', 'element', 'endpoint']),
  subjectId: z.string(),
  codeValue: z.unknown().optional(),
  explorationValue: z.unknown().optional(),
  documentationValue: z.unknown().optional(),
  detectedAt: z.string(),
});

// ─── Top-Level Graph ───

export const AKGMetadataSchema = z.object({
  specVersion: z.string(),
  appName: z.string(),
  appVersion: z.string(),
  generatedAt: z.string(),
  generatedBy: z.string(),
  baseUrl: z.string(),
  platform: AKGPlatformSchema,
  tags: z.record(z.string()),
});

export const ApplicationKnowledgeGraphSchema = z.object({
  specVersion: z.string(),
  metadata: AKGMetadataSchema,
  nodes: z.array(AKGNodeSchema),
  edges: z.array(AKGEdgeSchema),
  endpoints: z.array(ApiEndpointSchema),
  findings: z.array(AKGFindingSchema),
  apiReconciliation: ApiReconciliationSchema,
  entryNodeId: z.string(),
});
