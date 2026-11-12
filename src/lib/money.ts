// Money is stored as INTEGER PAISE. Floating point is never used for money.
// 1 rupee = 100 paise.

export function rupeesToPaise(input: string | number): number {
  const s = typeof input === 'number' ? input.toFixed(2) : input.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid rupee amount: ${input}`);
  const neg = s.startsWith('-');
  const [whole, frac = ''] = s.replace('-', '').split('.');
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return neg ? -paise : paise;
}

export function paiseToRupeesString(paise: number): string {
  if (!Number.isInteger(paise)) throw new Error('Paise must be an integer');
  const neg = paise < 0;
  const abs = Math.abs(paise);
  const out = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return neg ? `-${out}` : out;
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
}

// Multiply paise by a quantity (e.g. kg) with a defined rounding rule:
// round half away from zero to the nearest paisa.
export function mulPaise(paise: number, qty: number): number {
  const v = paise * qty;
  return v < 0 ? -Math.round(-v) : Math.round(v);
}
