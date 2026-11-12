import { describe, it, expect, vi } from 'vitest';
import { scopeFilter, tenantRepo } from '@/core/tenant/repository';
import type { Model } from 'mongoose';

describe('tenant isolation', () => {
  it('always applies institutionId and cannot be overridden by the caller', () => {
    expect(scopeFilter('inst-A', { name: 'x' })).toEqual({ name: 'x', institutionId: 'inst-A' });
    expect(scopeFilter('inst-A', { institutionId: 'inst-B' } as never)).toEqual({ institutionId: 'inst-A' });
  });

  it('repository injects the tenant into every query', async () => {
    const chain = { sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) };
    const model = {
      find: vi.fn().mockReturnValue(chain),
      findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      findOneAndDelete: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      countDocuments: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ toObject: () => ({}) }),
    } as unknown as Model<{ institutionId: string }>;
    const repo = tenantRepo(model, 'inst-A');

    await repo.list({ x: 1 } as never);
    expect(model.find).toHaveBeenCalledWith({ x: 1, institutionId: 'inst-A' });
    await repo.get('abc');
    expect(model.findOne).toHaveBeenCalledWith({ _id: 'abc', institutionId: 'inst-A' });
    await repo.remove('abc');
    expect(model.findOneAndDelete).toHaveBeenCalledWith({ _id: 'abc', institutionId: 'inst-A' });
    await repo.count();
    expect(model.countDocuments).toHaveBeenCalledWith({ institutionId: 'inst-A' });
    await repo.create({} as never);
    expect((model.create as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ institutionId: 'inst-A' });
  });

  it('caps list size at 200', async () => {
    const chain = { sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) };
    const model = { find: vi.fn().mockReturnValue(chain) } as unknown as Model<{ institutionId: string }>;
    await tenantRepo(model, 'i').list({}, { limit: 9999 });
    expect(chain.limit).toHaveBeenCalledWith(200);
  });
});
