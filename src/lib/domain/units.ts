/** Unit conversion for kitchen quantities. Base units: g (mass), ml (volume), pcs (count). */
export type Unit = "g" | "kg" | "ml" | "l" | "pcs" | "dozen";

const TABLE: Record<Unit, { base: "g" | "ml" | "pcs"; factor: number }> = {
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  ml: { base: "ml", factor: 1 },
  l: { base: "ml", factor: 1000 },
  pcs: { base: "pcs", factor: 1 },
  dozen: { base: "pcs", factor: 12 },
};

export const UNITS = Object.keys(TABLE) as Unit[];

export function isUnit(value: string): value is Unit {
  return value in TABLE;
}

export function areCompatible(a: Unit, b: Unit): boolean {
  return TABLE[a].base === TABLE[b].base;
}

export function convert(quantity: number, from: Unit, to: Unit): number {
  if (!areCompatible(from, to)) {
    throw new Error(`Cannot convert ${from} to ${to}`);
  }
  return (quantity * TABLE[from].factor) / TABLE[to].factor;
}
