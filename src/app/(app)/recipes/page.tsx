'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

interface Ingredient {
  _id: string;
  name: string;
  category: string;
  unit: string;
  costPerUnitPaise: number;
  currentStock: number;
}

interface Dish {
  _id: string;
  name: string;
  category: string;
  vegetarian: boolean;
}

interface RecipeItem {
  ingredientId: string | { _id: string; name: string; unit: string; costPerUnitPaise: number };
  quantity: number;
  unit: string;
  wastePercentage: number;
  preparationNotes?: string;
}

interface Recipe {
  _id: string;
  dishId: { _id: string; name: string; category: string } | string;
  version: number;
  yieldPortions: number;
  ingredients: RecipeItem[];
  instructions?: string;
  cookingTimeMinutes?: number;
}

interface CalculatedRequirement {
  ingredientId: string;
  name: string;
  category: string;
  unit: string;
  costPerUnitPaise: number;
  netQuantity: number;
  wastePercentage: number;
  grossQuantity: number;
  currentStock: number;
  shortfall: number;
  estimatedCostPaise: number;
}

interface CalculationResult {
  recipeId: string;
  dish: { id: string; name: string; category: string };
  requestedPortions: number;
  baseYieldPortions: number;
  scaleFactor: number;
  ingredients: CalculatedRequirement[];
  totalEstimatedCostPaise: number;
  estimatedCostPerPortionPaise: number;
}

export default function RecipeManagementPage() {
  const { success, error } = useToast();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  // BOM Calculation Modal state
  const [calculatingRecipe, setCalculatingRecipe] = useState<Recipe | null>(null);
  const [portionsInput, setPortionsInput] = useState<number>(350);
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Create Recipe Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDishId, setSelectedDishId] = useState('');
  const [yieldPortions, setYieldPortions] = useState(100);
  const [instructions, setInstructions] = useState('');
  const [cookingTime, setCookingTime] = useState(45);
  const [formIngredients, setFormIngredients] = useState<Array<{
    ingredientId: string;
    quantity: number;
    unit: 'kg' | 'g' | 'l' | 'ml' | 'piece' | 'packet' | 'dozen';
    wastePercentage: number;
  }>>([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recRes, dishRes, ingRes] = await Promise.all([
        fetch('/api/v1/recipes'),
        fetch('/api/v1/dishes'),
        fetch('/api/v1/ingredients?limit=200'),
      ]);

      if (recRes.ok) {
        const body = await recRes.json();
        setRecipes(body.data?.recipes || []);
      }
      if (dishRes.ok) {
        const body = await dishRes.json();
        setDishes(body.data || []);
      }
      if (ingRes.ok) {
        const body = await ingRes.json();
        setIngredients(body.data?.ingredients || []);
      }
    } catch {
      error('Network Error', 'Failed to retrieve recipe catalog');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCalculateModal = (recipe: Recipe) => {
    setCalculatingRecipe(recipe);
    setPortionsInput(recipe.yieldPortions * 3); // realistic default scaling
    setCalcResult(null);
    handleRunCalculation(recipe._id, recipe.yieldPortions * 3);
  };

  const handleRunCalculation = async (recipeId: string, portions: number) => {
    try {
      setCalculating(true);
      const res = await fetch(`/api/v1/recipes/${recipeId}/requirements?portions=${portions}`);
      if (res.ok) {
        const body = await res.json();
        setCalcResult(body.data);
      } else {
        error('Calculation Failed', 'Could not scale bill of materials');
      }
    } catch {
      error('Network Error', 'Failed to reach calculation endpoint');
    } finally {
      setCalculating(false);
    }
  };

  const openCreateModal = () => {
    if (dishes.length > 0) setSelectedDishId(dishes[0]._id);
    setYieldPortions(100);
    setInstructions('');
    setCookingTime(45);
    setFormIngredients(
      ingredients.slice(0, 2).map((ing) => ({
        ingredientId: ing._id,
        quantity: 5,
        unit: ing.unit as 'kg',
        wastePercentage: 10,
      })),
    );
    setIsCreateOpen(true);
  };

  const handleAddIngredient = () => {
    if (ingredients.length === 0) return;
    setFormIngredients([
      ...formIngredients,
      {
        ingredientId: ingredients[0]._id,
        quantity: 2,
        unit: ingredients[0].unit as 'kg',
        wastePercentage: 5,
      },
    ]);
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formIngredients.length === 0) {
      error('Validation', 'A recipe must contain at least one ingredient');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        dishId: selectedDishId,
        yieldPortions,
        ingredients: formIngredients,
        instructions: instructions || undefined,
        cookingTimeMinutes: cookingTime || undefined,
      };

      const res = await fetch('/api/v1/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        error('Create Failed', body?.error?.message ?? 'Could not create recipe');
        setSaving(false);
        return;
      }

      success('Recipe Created', 'New recipe and BOM recorded');
      setIsCreateOpen(false);
      loadData();
    } catch {
      error('Network Error', 'Failed to submit recipe');
    } finally {
      setSaving(false);
    }
  };

  const formatPaise = (paise: number) => {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(rupees);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Recipes & Bill of Materials (BOM)</h1>
          <p className="text-xs text-ink/70 mt-1">
            Ingredient specifications, waste ratios, preparation yields, and batch scaling.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow hover:opacity-95"
        >
          <span>+</span>
          <span>Add New Recipe</span>
        </button>
      </div>

      {/* Recipes Catalog Table */}
      {loading ? (
        <div className="rounded-xl border border-line bg-paper p-12 text-center text-xs text-ink/60 animate-pulse">
          Loading recipes catalog...
        </div>
      ) : recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-paper p-12 text-center">
          <span className="text-3xl">🥗</span>
          <p className="mt-2 text-sm font-semibold text-ink">No recipes configured yet</p>
          <p className="text-xs text-ink/60 mt-1">Add recipes with standard raw ingredient ratios</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white"
          >
            + Create First Recipe
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-paper shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-stone-50 dark:bg-stone-900/60 text-ink/70 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Dish / Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Yield Portions</th>
                <th className="px-4 py-3">BOM Ingredients</th>
                <th className="px-4 py-3">Cooking Time</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {recipes.map((recipe) => {
                const dishObj = typeof recipe.dishId === 'object' ? recipe.dishId : null;
                const dishName = dishObj?.name ?? 'Assigned Dish';
                const dishCategory = dishObj?.category ?? 'Main';

                return (
                  <tr key={recipe._id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition">
                    <td className="px-4 py-3.5 font-semibold text-ink">
                      <div>{dishName}</div>
                      <div className="text-[10px] text-ink/50 font-mono">v{recipe.version}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-ink/70">
                      {dishCategory}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {recipe.yieldPortions} portions
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-medium text-ink">
                        {recipe.ingredients?.length ?? 0} ingredients
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {recipe.cookingTimeMinutes ? `${recipe.cookingTimeMinutes} mins` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openCalculateModal(recipe)}
                        className="inline-flex items-center gap-1 rounded bg-brand/10 hover:bg-brand/20 text-brand px-3 py-1 font-semibold transition"
                      >
                        <span>⚖️</span>
                        <span>Calculate BOM</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Interactive BOM Requirements Calculation Modal */}
      {calculatingRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-line bg-paper p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 className="text-lg font-bold text-ink">
                  Scale Bill of Materials (BOM)
                </h2>
                <p className="text-xs text-ink/60">
                  {typeof calculatingRecipe.dishId === 'object' ? calculatingRecipe.dishId.name : 'Selected Dish'} — Baseline Yield: {calculatingRecipe.yieldPortions} portions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCalculatingRecipe(null)}
                className="text-sm text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>

            {/* Input portion control */}
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-stone-50 dark:bg-stone-900/40 p-4">
              <div>
                <label className="block text-xs font-semibold text-ink/80">
                  Target Required Portions:
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={portionsInput}
                    onChange={(e) => setPortionsInput(Number(e.target.value))}
                    className="w-36 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRunCalculation(calculatingRecipe._id, portionsInput)}
                    disabled={calculating}
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
                  >
                    {calculating ? 'Calculating...' : 'Recalculate'}
                  </button>
                </div>
              </div>

              {calcResult && (
                <div className="flex flex-1 justify-around border-l border-line pl-4 text-center">
                  <div>
                    <span className="text-[10px] uppercase text-ink/50 font-bold">Scaling Factor</span>
                    <p className="text-base font-extrabold text-brand">{calcResult.scaleFactor}x</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-ink/50 font-bold">Total Estimated Cost</span>
                    <p className="text-base font-extrabold text-ink">{formatPaise(calcResult.totalEstimatedCostPaise)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-ink/50 font-bold">Cost / Portion</span>
                    <p className="text-base font-extrabold text-brand">{formatPaise(calcResult.estimatedCostPerPortionPaise)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Calculated Breakdown Table */}
            {calcResult && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-stone-50 dark:bg-stone-900/60 text-ink/70 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Ingredient</th>
                      <th className="px-3 py-2">Net Qty</th>
                      <th className="px-3 py-2">Waste %</th>
                      <th className="px-3 py-2">Gross Required</th>
                      <th className="px-3 py-2">Current Stock</th>
                      <th className="px-3 py-2">Shortfall</th>
                      <th className="px-3 py-2 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink">
                    {calcResult.ingredients.map((item) => (
                      <tr key={item.ingredientId} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/40">
                        <td className="px-3 py-2.5 font-medium">
                          {item.name}
                          <span className="text-[10px] text-ink/50 block capitalize">{item.category}</span>
                        </td>
                        <td className="px-3 py-2">
                          {item.netQuantity} {item.unit}
                        </td>
                        <td className="px-3 py-2 text-ink/60">
                          {item.wastePercentage}%
                        </td>
                        <td className="px-3 py-2 font-bold text-ink">
                          {item.grossQuantity} {item.unit}
                        </td>
                        <td className="px-3 py-2 text-ink/70">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="px-3 py-2">
                          {item.shortfall > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">
                              ⚠️ Short {item.shortfall} {item.unit}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium text-[11px]">In Stock ✓</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {formatPaise(item.estimatedCostPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setCalculatingRecipe(null)}
                className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Close Calculator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Recipe Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-paper p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-lg font-bold text-ink">Add New Recipe</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-sm text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRecipe} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink/80">Select Dish</label>
                  <select
                    value={selectedDishId}
                    onChange={(e) => setSelectedDishId(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                  >
                    {dishes.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink/80">Base Yield Portions</label>
                  <input
                    type="number"
                    min={1}
                    value={yieldPortions}
                    onChange={(e) => setYieldPortions(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-3 pt-2 border-t border-line">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-ink">Bill of Materials (BOM) Ingredients</span>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="rounded bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand hover:bg-brand/20"
                  >
                    + Add Ingredient
                  </button>
                </div>

                {formIngredients.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-line p-2 bg-stone-50 dark:bg-stone-900/30">
                    <select
                      value={item.ingredientId}
                      onChange={(e) => {
                        const updated = [...formIngredients];
                        const ing = ingredients.find((i) => i._id === e.target.value);
                        updated[idx].ingredientId = e.target.value;
                        if (ing) updated[idx].unit = ing.unit as 'kg';
                        setFormIngredients(updated);
                      }}
                      className="flex-1 rounded border border-line bg-paper px-2 py-1 text-xs"
                    >
                      {ingredients.map((ing) => (
                        <option key={ing._id} value={ing._id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="Qty"
                      step="any"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...formIngredients];
                        updated[idx].quantity = Number(e.target.value);
                        setFormIngredients(updated);
                      }}
                      className="w-20 rounded border border-line bg-paper px-2 py-1 text-xs"
                    />

                    <span className="text-ink/60 text-xs w-8">{item.unit}</span>

                    <input
                      type="number"
                      placeholder="Waste %"
                      min="0"
                      max="100"
                      value={item.wastePercentage}
                      onChange={(e) => {
                        const updated = [...formIngredients];
                        updated[idx].wastePercentage = Number(e.target.value);
                        setFormIngredients(updated);
                      }}
                      className="w-20 rounded border border-line bg-paper px-2 py-1 text-xs"
                      title="Peeling/trimming waste %"
                    />

                    <button
                      type="button"
                      onClick={() => setFormIngredients(formIngredients.filter((_, i) => i !== idx))}
                      className="text-red-500 font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-ink/80">Cooking Time (Minutes)</label>
                <input
                  type="number"
                  min={0}
                  value={cookingTime}
                  onChange={(e) => setCookingTime(Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/80">Preparation Instructions (Optional)</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                  placeholder="Standard kitchen SOP: Soak dal 4 hours, slow cook on steam kettles..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
