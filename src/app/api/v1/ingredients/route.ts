import { z } from 'zod';
import { protectedRoute, parse, created } from '@/lib/http';
import { connectDb } from '@/lib/db';
import { IngredientModel, type IngredientDoc } from '@/modules/menus/ingredient.model';
import { ingredientRepository } from '@/modules/menus/ingredient.repository';
import { writeAudit } from '@/core/audit/audit.service';

export const dynamic = 'force-dynamic';

const listIngredientQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  skip: z.coerce.number().int().min(0).default(0),
  category: z.string().optional(),
  search: z.string().trim().optional(),
  countOnly: z.enum(['true', 'false']).optional(),
});

const createIngredientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(['grain', 'pulse', 'vegetable', 'dairy', 'spice', 'oil', 'poultry', 'bakery', 'dry_ration', 'other']),
  unit: z.enum(['kg', 'g', 'l', 'ml', 'piece', 'packet', 'dozen']),
  costPerUnitPaise: z.number().int().nonnegative(),
  currentStock: z.number().nonnegative().default(0),
  reorderThreshold: z.number().nonnegative().default(10),
  shelfLifeDays: z.number().int().positive().default(7),
  storageType: z.enum(['dry', 'cold_storage', 'deep_freezer', 'ambient']).default('dry'),
});

export const GET = protectedRoute('dish:read', async ({ req, session }) => {
  await connectDb();
  const query = parse(listIngredientQuery, Object.fromEntries(req.nextUrl.searchParams));
  const repo = ingredientRepository(session.institutionId);

  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };

  if (query.countOnly === 'true') {
    const total = await repo.count(filter);
    return { count: total };
  }

  const [ingredients, total] = await Promise.all([
    repo.list(filter, { limit: query.limit, skip: query.skip, sort: { name: 1 } }),
    repo.count(filter),
  ]);

  return {
    ingredients: ingredients as unknown as IngredientDoc[],
    total,
    limit: query.limit,
    skip: query.skip,
  };
});

export const POST = protectedRoute('ingredient:write', async ({ req, session, ip }) => {
  await connectDb();
  const body = parse(createIngredientSchema, await req.json());
  const repo = ingredientRepository(session.institutionId);

  const createdDoc = await repo.create({
    ...body,
    active: true,
    isSynthetic: false,
  });

  const ing = createdDoc as unknown as IngredientDoc;

  await writeAudit({
    session,
    ip,
    action: 'ingredient.create',
    target: { type: 'Ingredient', id: ing._id.toString() },
    after: { name: ing.name, category: ing.category, costPerUnitPaise: ing.costPerUnitPaise },
  });

  return created(ing);
});
