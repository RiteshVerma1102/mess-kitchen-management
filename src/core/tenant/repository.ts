import type { FilterQuery, Model, UpdateQuery } from 'mongoose';

// Every domain document carries institutionId. This wrapper makes it impossible
// to forget the tenant filter: modules get a repository already bound to the
// caller's institution and never touch the raw model.
export interface TenantDoc { institutionId: string }

export function scopeFilter<T>(institutionId: string, filter: FilterQuery<T> = {}): FilterQuery<T> {
  // institutionId is applied LAST so a caller cannot override it.
  return { ...filter, institutionId } as FilterQuery<T>;
}

export function tenantRepo<T extends TenantDoc>(model: Model<T>, institutionId: string) {
  const byId = (id: string) => scopeFilter<T>(institutionId, { _id: id } as FilterQuery<T>);
  return {
    list: (filter?: FilterQuery<T>, opts: { limit?: number; skip?: number; sort?: Record<string, 1 | -1> } = {}) =>
      model
        .find(scopeFilter<T>(institutionId, filter))
        .sort(opts.sort ?? { _id: -1 })
        .skip(opts.skip ?? 0)
        .limit(Math.min(opts.limit ?? 50, 200))
        .lean(),
    count: (filter?: FilterQuery<T>) => model.countDocuments(scopeFilter<T>(institutionId, filter)),
    get: (id: string) => model.findOne(byId(id)).lean(),
    create: async (doc: Omit<T, 'institutionId'>) => {
      const created = await model.create({ ...doc, institutionId } as unknown as T);
      return created.toObject();
    },
    update: (id: string, update: UpdateQuery<T>) =>
      model.findOneAndUpdate(byId(id), update, { new: true, runValidators: true }).lean(),
    remove: (id: string) => model.findOneAndDelete(byId(id)).lean(),
  };
}
