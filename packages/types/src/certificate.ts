/**
 * Screen Contract certification — the headless "renderer + Yoga layout + semantic
 * invariants" proof that a screen is not merely reachable but usable: its journey
 * anchors are present, visible, big enough to hit, on-screen, and un-occluded, and
 * no text is stacked wrong. This is the layer above accessibility: it gates on
 * whether the screen *works*, computed from a real layout without pixels or a device.
 */

/** Severity of a single invariant violation. */
export type ViolationSeverity = 'error' | 'warn';

/** One failed (or warned) semantic invariant on a certified node. */
export interface ContractViolation {
  /** Which invariant fired, e.g. 'tappable', 'hit-target', 'below-fold', 'no-text-overlap'. */
  invariant: string;
  /** The element the invariant is about, when element-scoped. */
  target?: string;
  detail: string;
  severity: ViolationSeverity;
}

/** The certification result attached to a node the crawler rendered. */
export interface ScreenCertificate {
  /** 'pass' iff no error-severity violation; warnings do not fail the certificate. */
  status: 'pass' | 'fail' | 'error';
  violations: ContractViolation[];
  /** Device the layout was computed against, e.g. "390x844". */
  device?: string;
}

/** How the crawler treated an edge it discovered. */
export type EdgeTraversalStatus =
  /** Fired the trigger and observed the resulting node. */
  | 'traversed'
  /** Recorded from the graph but deliberately not fired (external / destructive / back). */
  | 'declared'
  /** Attempted but could not complete (fixture gap, render error). */
  | 'blocked';

/** Crawl-execution provenance for an edge. */
export interface EdgeTraversal {
  status: EdgeTraversalStatus;
  /** The edge's effect crossed the write boundary (POST/PATCH/PUT/DELETE observed). */
  mutating: boolean;
  /** Why an edge was declared or blocked. */
  reason?: string;
}

/**
 * Journey Prover certification — the layer above Screen Contract: proof that a
 * mined multi-step journey (a sequence of edge traversals from an entry node to a
 * terminal) actually works end to end under a tiered oracle ladder. T0 is
 * mechanical (no crash, non-blank, a real feedback signal, the graph and app agree
 * on where a trigger lands); T1 holds for journeys that write (the write renders
 * where its table is read, row count is conserved, no double-submit); T2 is
 * report-only intent oracles until a human approves them.
 */

/** One oracle check run against a journey, tiered by trust. */
export interface OracleResult {
  tier: 't0' | 't1' | 't2';
  /** Which check fired, e.g. 'blank-screen', 'journey-drift', 'db-conservation'. */
  kind: string;
  ok: boolean;
  /** True for T2 checks that are findings-only until their spec is approved. */
  reportOnly: boolean;
  detail: string;
}

/** The certified outcome of firing one step of a mined journey. */
export interface StepResult {
  trigger: string;
  to: string;
  /** How the step proved it did something: navigation, contract diff, a network request, or a declared no-op. */
  feedback: 'route' | 'contract' | 'request' | 'inert';
  violations: ContractViolation[];
  ok: boolean;
}

/** The certification result for one mined journey walked end to end. */
export interface JourneyCertificate {
  journeyId: string;
  /** 'failed' iff any error-severity oracle or step; 'findings' iff only report-only misses; else 'proven'. */
  status: 'proven' | 'failed' | 'findings';
  steps: StepResult[];
  oracles: OracleResult[];
  durationMs: number;
}

/** The three remote states every data-backed screen must survive. */
export type StateVariant = 'empty' | 'error' | 'pending';

/** The certification result for one screen rendered under one state variant. */
export interface StateCertificate {
  nodeId: string;
  variant: StateVariant;
  status: 'pass' | 'finding' | 'crash';
  detail?: string;
}
