import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { MenuModel, type MenuDoc } from './menu.model';
import { DishModel } from './dish.model';
import { menuRepository } from './menu.repository';
import type { CreateMenuInput, UpdateMenuInput, ListMenuQuery } from './menu.schema';

export async function createMenu(session: Session, input: CreateMenuInput, ip?: string): Promise<MenuDoc> {
  await connectDb();
  const repo = menuRepository(session.institutionId);

  // Cast string dishIds to Types.ObjectId
  const formatMeals = {
    breakfast: input.meals.breakfast.map((m) => ({ ...m, dishId: new Types.ObjectId(m.dishId) })),
    lunch: input.meals.lunch.map((m) => ({ ...m, dishId: new Types.ObjectId(m.dishId) })),
    snacks: input.meals.snacks.map((m) => ({ ...m, dishId: new Types.ObjectId(m.dishId) })),
    dinner: input.meals.dinner.map((m) => ({ ...m, dishId: new Types.ObjectId(m.dishId) })),
  };

  const created = await repo.create({
    name: input.name,
    cycleType: input.cycleType,
    dayOfWeek: input.dayOfWeek,
    effectiveDate: input.effectiveDate,
    messHallId: input.messHallId,
    status: input.status,
    meals: formatMeals,
    specialNotice: input.specialNotice,
    isSynthetic: false,
  });

  const menu = created as unknown as MenuDoc;

  await writeAudit({
    session,
    ip,
    action: 'menu.create',
    target: { type: 'Menu', id: menu._id.toString() },
    after: { name: menu.name, cycleType: menu.cycleType, status: menu.status },
  });

  return menu;
}

export async function updateMenu(
  session: Session,
  menuId: string,
  input: UpdateMenuInput,
  ip?: string,
): Promise<MenuDoc> {
  await connectDb();
  const repo = menuRepository(session.institutionId);

  const existing = await repo.get(menuId);
  if (!existing) {
    throw new NotFoundError('Menu not found');
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.cycleType !== undefined) updateData.cycleType = input.cycleType;
  if (input.dayOfWeek !== undefined) updateData.dayOfWeek = input.dayOfWeek;
  if (input.effectiveDate !== undefined) updateData.effectiveDate = input.effectiveDate;
  if (input.messHallId !== undefined) updateData.messHallId = input.messHallId;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.specialNotice !== undefined) updateData.specialNotice = input.specialNotice;

  if (input.meals) {
    updateData.meals = {
      breakfast: input.meals.breakfast.map((m) => ({ ...m, dishId: new Types.ObjectId(m.dishId) })),
      lunch: input.meals.lunch.map((m) => ({ ...m, dishId: new Types.ObjectId(m.dishId) })),
      snacks: input.meals.snacks.map((m) => ({ ...m, dishId: new Types.ObjectId(m.dishId) })),
      dinner: input.meals.dinner.map((m) => ({ ...m, dishId: new Types.ObjectId(m.dishId) })),
    };
  }

  const updated = await repo.update(menuId, updateData);
  if (!updated) {
    throw new NotFoundError('Menu not found after update');
  }

  const menu = updated as unknown as MenuDoc;

  await writeAudit({
    session,
    ip,
    action: 'menu.update',
    target: { type: 'Menu', id: menuId },
    before: { name: existing.name, status: existing.status },
    after: { name: menu.name, status: menu.status },
  });

  return menu;
}

export async function deleteMenu(
  session: Session,
  menuId: string,
  ip?: string,
): Promise<{ success: boolean; id: string; archived: boolean }> {
  await connectDb();
  const repo = menuRepository(session.institutionId);

  const existing = await repo.get(menuId);
  if (!existing) {
    throw new NotFoundError('Menu not found');
  }

  // Soft archive if published; delete if draft
  if (existing.status === 'published') {
    await repo.update(menuId, { status: 'archived' });
    await writeAudit({
      session,
      ip,
      action: 'menu.archive',
      target: { type: 'Menu', id: menuId },
      before: { status: 'published' },
      after: { status: 'archived' },
    });
    return { success: true, id: menuId, archived: true };
  } else {
    await repo.remove(menuId);
    await writeAudit({
      session,
      ip,
      action: 'menu.delete',
      target: { type: 'Menu', id: menuId },
      before: { name: existing.name, status: existing.status },
    });
    return { success: true, id: menuId, archived: false };
  }
}

export async function listMenus(
  session: Session,
  query: ListMenuQuery,
): Promise<{ menus: MenuDoc[]; total: number; limit: number; skip: number }> {
  await connectDb();
  const repo = menuRepository(session.institutionId);

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.cycleType) filter.cycleType = query.cycleType;
  if (query.dayOfWeek !== undefined) filter.dayOfWeek = query.dayOfWeek;
  if (query.effectiveDate) filter.effectiveDate = query.effectiveDate;
  if (query.messHallId && query.messHallId !== 'all') {
    filter.$or = [{ messHallId: query.messHallId }, { messHallId: 'all' }];
  }
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }

  const [menus, total] = await Promise.all([
    repo.list(filter, { limit: query.limit, skip: query.skip, sort: { dayOfWeek: 1, createdAt: -1 } }),
    repo.count(filter),
  ]);

  return {
    menus: menus as unknown as MenuDoc[],
    total,
    limit: query.limit,
    skip: query.skip,
  };
}

export async function getMenuById(session: Session, menuId: string): Promise<Record<string, unknown>> {
  await connectDb();
  const menu = await MenuModel.findOne({
    institutionId: session.institutionId,
    _id: menuId,
  })
    .populate('meals.breakfast.dishId')
    .populate('meals.lunch.dishId')
    .populate('meals.snacks.dishId')
    .populate('meals.dinner.dishId')
    .lean();

  if (!menu) {
    throw new NotFoundError('Menu not found');
  }

  return menu as unknown as Record<string, unknown>;
}

export async function getMenuByDate(
  session: Session,
  dateStr: string,
  messHallId = 'all',
): Promise<Record<string, unknown> | null> {
  await connectDb();

  // 1. Try date-specific menu
  const dateSpecific = await MenuModel.findOne({
    institutionId: session.institutionId,
    effectiveDate: dateStr,
    status: 'published',
    ...(messHallId !== 'all' ? { $or: [{ messHallId }, { messHallId: 'all' }] } : {}),
  })
    .populate('meals.breakfast.dishId')
    .populate('meals.lunch.dishId')
    .populate('meals.snacks.dishId')
    .populate('meals.dinner.dishId')
    .lean();

  if (dateSpecific) {
    return dateSpecific as unknown as Record<string, unknown>;
  }

  // 2. Fall back to weekly template by day of week
  const dateObj = new Date(`${dateStr}T12:00:00Z`);
  const dayOfWeek = dateObj.getUTCDay();

  const weeklyTemplate = await MenuModel.findOne({
    institutionId: session.institutionId,
    cycleType: 'weekly',
    dayOfWeek,
    status: 'published',
    ...(messHallId !== 'all' ? { $or: [{ messHallId }, { messHallId: 'all' }] } : {}),
  })
    .populate('meals.breakfast.dishId')
    .populate('meals.lunch.dishId')
    .populate('meals.snacks.dishId')
    .populate('meals.dinner.dishId')
    .lean();

  return (weeklyTemplate as unknown as Record<string, unknown>) || null;
}

export async function getWeeklyMenuCalendar(
  session: Session,
  messHallId = 'all',
): Promise<Array<{ dayOfWeek: number; dayName: string; menu: Record<string, unknown> | null }>> {
  await connectDb();

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const weeklyMenus = await MenuModel.find({
    institutionId: session.institutionId,
    cycleType: 'weekly',
    status: 'published',
    ...(messHallId !== 'all' ? { $or: [{ messHallId }, { messHallId: 'all' }] } : {}),
  })
    .populate('meals.breakfast.dishId')
    .populate('meals.lunch.dishId')
    .populate('meals.snacks.dishId')
    .populate('meals.dinner.dishId')
    .lean();

  const menuMap = new Map<number, Record<string, unknown>>();
  for (const m of weeklyMenus) {
    if (m.dayOfWeek !== undefined && !menuMap.has(m.dayOfWeek)) {
      menuMap.set(m.dayOfWeek, m as unknown as Record<string, unknown>);
    }
  }

  return dayNames.map((name, dayIndex) => ({
    dayOfWeek: dayIndex,
    dayName: name,
    menu: menuMap.get(dayIndex) || null,
  }));
}
