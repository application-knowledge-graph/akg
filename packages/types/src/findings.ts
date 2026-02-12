/** Severity level for a finding. */
export type FindingSeverity = 'info' | 'warning' | 'error' | 'critical';

/** A discrepancy detected during source reconciliation. */
export interface AKGFinding {
  id: string;
  ruleId: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  subjectType: 'node' | 'edge' | 'element' | 'endpoint';
  subjectId: string;
  codeValue?: unknown;
  explorationValue?: unknown;
  documentationValue?: unknown;
  detectedAt: string;
}

/** Metadata about a reconciliation rule. */
export interface ReconciliationRule {
  id: string;
  severity: FindingSeverity;
  title: string;
  description: string;
}

/** The 12 standard reconciliation rules from the spec. */
export const RECONCILIATION_RULES: ReconciliationRule[] = [
  {
    id: 'R1',
    severity: 'warning',
    title: 'Dead Route',
    description: 'Route exists in code but is not reachable during exploration.',
  },
  {
    id: 'R2',
    severity: 'info',
    title: 'Dynamic/Untracked Screen',
    description: 'Screen found during exploration but no corresponding route in code.',
  },
  {
    id: 'R3',
    severity: 'info',
    title: 'Dead Endpoint',
    description: 'API endpoint defined in code but never called during exploration.',
  },
  {
    id: 'R4',
    severity: 'warning',
    title: 'Undocumented Endpoint',
    description: 'API endpoint called during exploration but not found in code.',
  },
  {
    id: 'R5',
    severity: 'warning',
    title: 'Dead Element',
    description: 'Element appears interactive but produces no observable effect when activated.',
  },
  {
    id: 'R6',
    severity: 'critical',
    title: 'Auth Bypass',
    description: 'Node or endpoint requires auth in code but is accessible without auth during exploration.',
  },
  {
    id: 'R7',
    severity: 'critical',
    title: 'Authorization Gap',
    description: 'Node or endpoint requires role X in code but is accessible by role Y during exploration.',
  },
  {
    id: 'R8',
    severity: 'warning',
    title: 'Missing Element',
    description: 'Element defined in code but not found in DOM during exploration.',
  },
  {
    id: 'R9',
    severity: 'info',
    title: 'Dynamic Element',
    description: 'Element found during exploration but not detected in static code analysis.',
  },
  {
    id: 'R10',
    severity: 'error',
    title: 'Broken Navigation',
    description: 'Navigation A→B defined in code but fails or navigates elsewhere during exploration.',
  },
  {
    id: 'R11',
    severity: 'warning',
    title: 'Validation Gap',
    description: 'Form has validation in code but validation is not enforced at runtime.',
  },
  {
    id: 'R12',
    severity: 'info',
    title: 'Unimplemented Feature',
    description: 'Feature described in documentation but not found in code or exploration.',
  },
];
