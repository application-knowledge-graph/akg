import { describe, it, expect } from 'vitest';
import type {
  OracleResult,
  StepResult,
  JourneyCertificate,
  StateVariant,
  StateCertificate,
} from '@akg/types';

describe('@akg/types journey prover certificates', () => {
  it('constructs a passing OracleResult per tier', () => {
    const tiers: OracleResult['tier'][] = ['t0', 't1', 't2'];
    for (const tier of tiers) {
      const result: OracleResult = { tier, kind: 'blank-screen', ok: true, reportOnly: false, detail: 'ok' };
      expect(result.tier).toBe(tier);
    }
  });

  it('constructs a StepResult carrying ContractViolation-shaped violations', () => {
    const step: StepResult = {
      trigger: 'save-line',
      to: 'screen:/song/[slug]',
      feedback: 'contract',
      violations: [{ invariant: 'silent-element', target: 'save-line', detail: 'no feedback', severity: 'error' }],
      ok: false,
    };
    expect(step.violations[0].severity).toBe('error');
  });

  it('constructs a JourneyCertificate whose status reflects its oracles', () => {
    const cert: JourneyCertificate = {
      journeyId: 'mutation:screen:/songs->screen:/song/[slug]#save-line',
      status: 'proven',
      steps: [],
      oracles: [{ tier: 't1', kind: 'db-conservation', ok: true, reportOnly: false, detail: 'grew by 1' }],
      durationMs: 42,
    };
    expect(cert.status).toBe('proven');
    expect(cert.oracles).toHaveLength(1);
  });

  it('constructs a StateCertificate for each state variant', () => {
    const variants: StateVariant[] = ['empty', 'error', 'pending'];
    const certs: StateCertificate[] = variants.map((variant) => ({
      nodeId: 'screen:/songs',
      variant,
      status: 'pass',
    }));
    expect(certs.map((c) => c.variant)).toEqual(['empty', 'error', 'pending']);
  });

  it('allows a StateCertificate finding with a detail', () => {
    const cert: StateCertificate = {
      nodeId: 'screen:/songs',
      variant: 'error',
      status: 'finding',
      detail: 'no-recovery-affordance',
    };
    expect(cert.status).toBe('finding');
    expect(cert.detail).toBe('no-recovery-affordance');
  });
});
