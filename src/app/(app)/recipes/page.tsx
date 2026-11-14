'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

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
        setDishes(body.data?.dishes || []);
      }
      if (ingRes.ok) {
        const body = await ingRes.json();
        setIngredients(body.data?.items || []);
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

  const handleCalculateBOM = async (recipe: Recipe) => {
    setCalculatingRecipe(recipe);
    setPortionsInput(recipe.yieldPortions || 200);
    setCalcResult(null);
    setCalculating(true);

    try {
      const res = await fetch(
        `/api/v1/recipes/${recipe._id}/requirements?portions=${recipe.yieldPortions || 200}`,
      );
      if (res.ok) {
        const body = await res.json();
        setCalcResult(body.data);
      } else {
        error('Error', 'Failed to calculate recipe BOM requirements');
      }
    } catch {
      error('Network Error', 'Cannot calculate BOM');
    } finally {
      setCalculating(false);
    }
  };

  const handleRecalculate = async (portions: number) => {
    if (!calculatingRecipe || portions < 1) return;
    setCalculating(true);
    try {
      const res = await fetch(
        `/api/v1/recipes/${calculatingRecipe._id}/requirements?portions=${portions}`,
      );
      if (res.ok) {
        const body = await res.json();
        setCalcResult(body.data);
      }
    } catch {
      error('Error', 'Recalculation failed');
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
      <PageHeader
        icon="🥗"
        title="Recipes & Bill of Materials (BOM)"
        description="Ingredient specifications, prep wastage ratios, yield benchmarks, and dynamic batch portion scaling"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            icon={<span>+</span>}
          >
            Add New Recipe
          </Button>
        }
      />

      {/* Recipes Catalog Table */}
      {loading ? (
        <Card className="p-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : recipes.length === 0 ? (
        <EmptyState
          icon="🥗"
          title="No Recipes Configured"
          description="Create your first institutional recipe and ingredient BOM breakdown."
          actionText="Create Recipe"
          onAction={openCreateModal}
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Dish Name</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Standard Yield</TableHeaderCell>
              <TableHeaderCell>Ingredients Count</TableHeaderCell>
              <TableHeaderCell>Est. Prep Time</TableHeaderCell>
              <TableHeaderCell>Version</TableHeaderCell>
              <TableHeaderCell className="text-right">BOM Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recipes.map((recipe) => {
              const dishName =
                typeof recipe.dishId === 'object' && recipe.dishId !== null
                  ? recipe.dishId.name
                  : 'Dish Item';
              const dishCategory =
                typeof recipe.dishId === 'object' && recipe.dishId !== null
                  ? recipe.dishId.category
                  : 'General';

              return (
                <TableRow key={recipe._id}>
                  <TableCell className="font-bold text-slate-900">
                    {dishName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" className="capitalize">
                      {dishCategory}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-slate-800">
                    {recipe.yieldPortions} portions
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {recipe.ingredients.length} items mapped
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {recipe.cookingTimeMinutes ? `${recipe.cookingTimeMinutes} mins` : '45 mins'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary">v{recipe.version || 1}.0</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCalculateBOM(recipe)}
                      icon={<span>⚖️</span>}
                    >
                      Scale BOM
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* BOM Scaling Modal */}
      <Modal
        isOpen={!!calculatingRecipe}
        onClose={() => setCalculatingRecipe(null)}
        title={
          calculatingRecipe && typeof calculatingRecipe.dishId === 'object'
            ? `BOM Requirements: ${calculatingRecipe.dishId.name}`
            : 'Recipe Bill of Materials'
        }
        description={`Base Yield: ${calculatingRecipe?.yieldPortions || 100} portions`}
        maxWidth="xl"
      >
        {calculatingRecipe && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700">Target Preparation Portions:</label>
                <input
                  type="number"
                  min={1}
                  value={portionsInput}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPortionsInput(val);
                    handleRecalculate(val);
                  }}
                  className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-teal-900 shadow-2xs"
                />
              </div>

              {calcResult && (
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Total Batch Cost:</span>
                  <p className="text-sm font-black text-slate-900">
                    {formatPaise(calcResult.totalEstimatedCostPaise)}
                  </p>
                </div>
              )}
            </div>

            {calculating ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Recalculating batch quantities & stock availability...
              </div>
            ) : calcResult ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Ingredient</TableHeaderCell>
                      <TableHeaderCell>Gross Required</TableHeaderCell>
                      <TableHeaderCell>Waste %</TableHeaderCell>
                      <TableHeaderCell>Available Stock</TableHeaderCell>
                      <TableHeaderCell>Stock Status</TableHeaderCell>
                      <TableHeaderCell>Cost</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {calcResult.ingredients.map((ing) => (
                      <TableRow key={ing.ingredientId}>
                        <TableCell className="font-bold text-slate-900">{ing.name}</TableCell>
                        <TableCell className="font-bold text-slate-800">
                          {ing.grossQuantity} {ing.unit}
                        </TableCell>
                        <TableCell className="text-slate-500">{ing.wastePercentage}%</TableCell>
                        <TableCell className="text-slate-600">
                          {ing.currentStock} {ing.unit}
                        </TableCell>
                        <TableCell>
                          {ing.shortfall > 0 ? (
                            <Badge variant="danger" withDot>
                              Shortfall: {ing.shortfall} {ing.unit}
                            </Badge>
                          ) : (
                            <Badge variant="success">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {formatPaise(ing.estimatedCostPaise)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalculatingRecipe(null)}
              >
                Close BOM
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Recipe Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Institutional Recipe"
        description="Configure recipe yields, ingredient quantities, and wastage percentages"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateRecipe} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Select Dish"
              value={selectedDishId}
              onChange={(e) => setSelectedDishId(e.target.value)}
              required
            >
              {dishes.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.category})
                </option>
              ))}
            </Select>

            <Input
              label="Standard Yield (Portions)"
              type="number"
              min={1}
              value={yieldPortions}
              onChange={(e) => setYieldPortions(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cooking Time (Minutes)"
              type="number"
              min={1}
              value={cookingTime}
              onChange={(e) => setCookingTime(Number(e.target.value))}
            />
            <Input
              label="Instructions / Method"
              placeholder="e.g. Sauté spices, simmer on low heat for 30m"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          {/* Form Ingredients Mapping */}
          <div className="rounded-xl border border-slate-200/80 p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Bill of Materials Ingredients:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddIngredient}
                icon={<span>+</span>}
              >
                Add Ingredient
              </Button>
            </div>

            <div className="space-y-2">
              {formIngredients.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.ingredientId}
                    onChange={(e) => {
                      const updated = [...formIngredients];
                      updated[idx].ingredientId = e.target.value;
                      const matched = ingredients.find((ing) => ing._id === e.target.value);
                      if (matched) updated[idx].unit = matched.unit as 'kg';
                      setFormIngredients(updated);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing._id} value={ing._id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...formIngredients];
                      updated[idx].quantity = Number(e.target.value);
                      setFormIngredients(updated);
                    }}
                    className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-center"
                    placeholder="Qty"
                  />

                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={item.wastePercentage}
                    onChange={(e) => {
                      const updated = [...formIngredients];
                      updated[idx].wastePercentage = Number(e.target.value);
                      setFormIngredients(updated);
                    }}
                    className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-center"
                    placeholder="Waste %"
                  />

                  <button
                    type="button"
                    onClick={() => setFormIngredients(formIngredients.filter((_, i) => i !== idx))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
            >
              Save Recipe
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
