import { z } from 'zod';
import { protectedRoute, parse } from '@/lib/http';
import { connectDb } from '@/lib/db';
import { StudentModel, type StudentDoc } from '@/modules/students/student.model';
import { studentRepository } from '@/modules/students/student.repository';

export const dynamic = 'force-dynamic';

const listStudentQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
  messHallId: z.string().optional(),
  mealPlanStatus: z.enum(['active', 'paused', 'graduated', 'defaulter']).optional(),
  search: z.string().trim().optional(),
  countOnly: z.enum(['true', 'false']).optional(),
});

export const GET = protectedRoute('attendance:read', async ({ req, session }) => {
  await connectDb();
  const query = parse(listStudentQuery, Object.fromEntries(req.nextUrl.searchParams));
  const repo = studentRepository(session.institutionId);

  const filter: Record<string, unknown> = {};
  if (query.messHallId && query.messHallId !== 'all') filter.messHallId = query.messHallId;
  if (query.mealPlanStatus) filter.mealPlanStatus = query.mealPlanStatus;
  if (query.search) {
    filter.$or = [
      { fullName: { $regex: query.search, $options: 'i' } },
      { enrollmentNumber: { $regex: query.search, $options: 'i' } },
      { hostelName: { $regex: query.search, $options: 'i' } },
      { rfidCardId: query.search },
    ];
  }

  if (query.countOnly === 'true') {
    const count = await repo.count(filter);
    return { count };
  }

  const [students, total] = await Promise.all([
    repo.list(filter, { limit: query.limit, skip: query.skip, sort: { fullName: 1 } }),
    repo.count(filter),
  ]);

  return {
    students: students as unknown as StudentDoc[],
    total,
    limit: query.limit,
    skip: query.skip,
  };
});
