/**
 * Unit tests for Attestcoin ETH→CTC credit helper
 */

import { ethToCtcCredit } from '../deposit';

// Mock config rate via env before import is hard; test math with known rate assumption.
// deposit.ts reads attestcoinConfig.ethToCtcRate (default 1000).

describe('ethToCtcCredit', () => {
  it('credits ETH * rate as CTC decimal string', () => {
    const result = ethToCtcCredit('0.01');
    expect(parseFloat(result)).toBeCloseTo(10, 5); // 0.01 * 1000
  });

  it('rejects zero', () => {
    expect(() => ethToCtcCredit('0')).toThrow();
  });

  it('rejects invalid', () => {
    expect(() => ethToCtcCredit('abc')).toThrow();
  });
});
