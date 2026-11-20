import { convert, type Unit } from "./units";
import { fromPaise, roundRupees, toPaise } from "./money";

export interface IngredientLine {
  itemId: string;
  quantityPerServing: number;
  unit: Unit; // unit the recipe uses
  itemUnit: Unit; // unit the inventory item is stocked & priced in
  unitCost: number; // ₹ per itemUnit
}

/** Cost of one serving in ₹, rounded to the paisa. */
export function recipeCostPerServing(lines: IngredientLine[]): number {
  const total = lines.reduce((sum, l) => {
    const qty = convert(l.quantityPerServing, l.unit, l.itemUnit);
    return sum + qty * l.unitCost;
  }, 0);
  return roundRupees(total);
}

/** Ingredient quantities (in the item's stock unit) needed for `servings` plates. */
export function scaleRecipe(lines: IngredientLine[], servings: number) {
  return lines.map((l) => ({
    itemId: l.itemId,
    unit: l.itemUnit,
    quantity: convert(l.quantityPerServing, l.unit, l.itemUnit) * Math.max(0, servings),
  }));
}

/** Cost per plate = total cost / plates served (0 when nothing served). */
export function costPerPlate(totalCost: number, platesServed: number): number {
  if (platesServed <= 0) return 0;
  return roundRupees(totalCost / platesServed);
}

/** Waste % as a fraction of prepared quantity. */
export function wasteRatio(prepared: number, wasted: number): number {
  if (prepared <= 0) return 0;
  return Math.min(1, Math.max(0, wasted / prepared));
}

export interface NeedLine {
  itemId: string;
  required: number; // quantity needed for the horizon
  inStock: number;
  packSize?: number; // order in multiples of this
}

/**
 * Purchase suggestion = required × (1 + safety buffer) − stock, rounded up to pack size.
 * Lines that need nothing are dropped.
 */
export function purchaseSuggestions(lines: NeedLine[], safetyBuffer = 0.1) {
  return lines
    .map((l) => {
      const raw = l.required * (1 + safetyBuffer) - l.inStock;
      const pack = l.packSize && l.packSize > 0 ? l.packSize : 0;
      const toOrder = raw <= 0 ? 0 : pack ? Math.ceil(raw / pack - 1e-9) * pack : Math.ceil(raw * 100) / 100;
      return { itemId: l.itemId, toOrder };
    })
    .filter((l) => l.toOrder > 0);
}

export interface BillInput {
  mealsEaten: number;
  ratePerMeal: number; // ₹
  extras?: number; // ₹
  gstPercent?: number; // e.g. 5
}

/** Monthly student bill: meals × rate + extras, optional GST on the subtotal. */
export function monthlyBill({ mealsEaten, ratePerMeal, extras = 0, gstPercent = 0 }: BillInput) {
  const subtotalP = toPaise(mealsEaten * ratePerMeal) + toPaise(extras);
  const gstP = Math.round((subtotalP * gstPercent) / 100);
  return {
    subtotal: fromPaise(subtotalP),
    gst: fromPaise(gstP),
    total: fromPaise(subtotalP + gstP),
  };
}
