import { connectDb } from '@/lib/db';
import { ConflictError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { dishRepository } from './dish.repository';
import type { CreateDishInput } from './dish.schema';
import type { DishDoc } from './dish.model';

function isDuplicateKeyError(e: unknown): e is { code: number } {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;
}

// Business logic lives here, not in the route. Testable without HTTP.
export async function listDishes(
  session: Session,
  opts: { limit: number; skip: number; active?: boolean },
): Promise<DishDoc[]> {
  await connectDb();
  const filter = opts.active === undefined ? {} : { active: opts.active };
  const items = await dishRepository(session.institutionId).list(filter, { limit: opts.limit, skip: opts.skip, sort: { name: 1 } });
  return items as unknown as DishDoc[];
}

export async function createDish(session: Session, input: CreateDishInput, ip?: string): Promise<DishDoc> {
  await connectDb();
  try {
    const raw = await dishRepository(session.institutionId).create(input);
    const dish = raw as unknown as DishDoc;
    await writeAudit({
      session, ip,
      action: 'dish.create',
      target: { type: 'Dish', id: dish._id.toString() },
      after: { name: dish.name, category: dish.category, costPerPortionPaise: dish.costPerPortionPaise },
    });
    return dish;
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      throw new ConflictError('A dish with this name already exists');
    }
    throw e;
  }
}
