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
