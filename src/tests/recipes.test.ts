import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/core/auth/jwt';
import { RecipeModel } from '@/modules/menus/recipe.model';
import { calculateIngredientRequirements } from '@/modules/menus/recipe.service';
import * as db from '@/lib/db';
import * as rateLimit from '@/lib/rate-limit';
import { POST as createRecipeRoute } from '@/app/api/v1/recipes/route';

describe('Recipe APIs and Ingredient Requirements Calculation', () => {
  beforeAll(() => {
    process.env.MONGODB_URI ??= 'mongodb://localhost:27017/test';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
  });

  beforeEach(() => {
    vi.spyOn(db, 'connectDb').mockResolvedValue({} as never);
    vi.spyOn(rateLimit, 'enforceRateLimit').mockResolvedValue(undefined);
  });

  it('calculates ingredient requirements accurately with scaling, waste %, and inventory shortfall', async () => {
    const mockRecipe = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      institutionId: 'inst_1',
      dishId: {
        _id: { toString: () => '507f1f77bcf86cd799439022' },
        name: 'Dal Makhani',
        category: 'main',
      },
      yieldPortions: 100,
      ingredients: [
        {
          quantity: 10, // 10 kg for 100 portions
          unit: 'kg',
          wastePercentage: 0,
          ingredientId: {
            _id: { toString: () => '507f1f77bcf86cd799439033' },
            name: 'Black Urad Dal',
            category: 'pulse',
            costPerUnitPaise: 12000, // ₹120.00/kg
            currentStock: 15, // 15 kg in stock
          },
        },
        {
          quantity: 5, // 5 kg for 100 portions
          unit: 'kg',
          wastePercentage: 20, // 20% peeling/cleaning loss
          ingredientId: {
            _id: { toString: () => '507f1f77bcf86cd799439044' },
            name: 'Onions',
            category: 'vegetable',
            costPerUnitPaise: 3500, // ₹35.00/kg
            currentStock: 50, // 50 kg in stock
          },
        },
      ],
    };

    vi.spyOn(RecipeModel, 'findOne').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockRecipe),
    } as never);

    const session = {
      userId: 'u_manager',
      institutionId: 'inst_1',
      role: 'mess_manager' as const,
      hallIds: [],
    };

    // Calculate for 250 portions (scale factor = 2.5)
    const result = await calculateIngredientRequirements(session, '507f1f77bcf86cd799439011', 250);

    expect(result.scaleFactor).toBe(2.5);
    expect(result.requestedPortions).toBe(250);
    expect(result.ingredients.length).toBe(2);

    // Ingredient 1: Dal
    // Net: 10 * 2.5 = 25 kg
    // Gross: 25 kg (0% waste)
    // Shortfall: 25 - 15 (stock) = 10 kg
    // Cost: 25 * 12000 paise = 300,000 paise (₹3,000)
    const dal = result.ingredients[0];
    expect(dal.netQuantity).toBe(25);
    expect(dal.grossQuantity).toBe(25);
    expect(dal.shortfall).toBe(10);
    expect(dal.estimatedCostPaise).toBe(300000);

    // Ingredient 2: Onions
    // Net: 5 * 2.5 = 12.5 kg
    // Gross: 12.5 / (1 - 0.20) = 15.625 kg
    // Shortfall: max(0, 15.625 - 50) = 0 kg
    // Cost: round(15.625 * 3500) = 54688 paise
    const onions = result.ingredients[1];
    expect(onions.netQuantity).toBe(12.5);
    expect(onions.grossQuantity).toBe(15.625);
    expect(onions.shortfall).toBe(0);
    expect(onions.estimatedCostPaise).toBe(54688);

    expect(result.totalEstimatedCostPaise).toBe(300000 + 54688);
  });

  it('student role cannot create recipe (403 Forbidden)', async () => {
    const studentToken = await signAccessToken({
      userId: 'u_student',
      institutionId: 'inst_1',
      role: 'student',
      hallIds: [],
    });

    const req = new NextRequest('http://localhost:3000/api/v1/recipes', {
      method: 'POST',
      headers: { authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        dishId: '507f1f77bcf86cd799439011',
        ingredients: [],
      }),
    });

    const res = await createRecipeRoute(req, { params: {} });
    expect(res.status).toBe(403);
  });
});
