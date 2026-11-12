import { describe, it, expect } from 'vitest';
import { rupeesToPaise, paiseToRupeesString, mulPaise, formatINR } from '@/lib/money';

describe('money (integer paise)', () => {
  it('converts rupees to paise without float error', () => {
    expect(rupeesToPaise('0.10')).toBe(10);
    expect(rupeesToPaise('0.3')).toBe(30);
    expect(rupeesToPaise('1234.56')).toBe(123456);
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise('-5.5')).toBe(-550);
  });
  it('rejects bad input', () => {
    expect(() => rupeesToPaise('1.234')).toThrow();
    expect(() => rupeesToPaise('abc')).toThrow();
  });
  it('formats paise back to rupees', () => {
    expect(paiseToRupeesString(123456)).toBe('1234.56');
    expect(paiseToRupeesString(-5)).toBe('-0.05');
    expect(() => paiseToRupeesString(1.5)).toThrow();
  });
  it('multiplies with half-away-from-zero rounding', () => {
    expect(mulPaise(1000, 2.5)).toBe(2500);
    expect(mulPaise(3, 0.5)).toBe(2); // 1.5 -> 2
    expect(mulPaise(-3, 0.5)).toBe(-2);
  });
  it('formats INR', () => {
    expect(formatINR(123456)).toContain('1,234.56');
  });
});
