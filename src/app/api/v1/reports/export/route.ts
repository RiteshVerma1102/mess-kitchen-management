import { NextResponse } from 'next/server';
import { protectedRoute, parse } from '@/lib/http';
import { generateReportCSV } from '@/modules/analysis/analysis.service';
import { reportExportQuerySchema } from '@/modules/analysis/analysis.schema';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('analytics:read', async ({ req, session }) => {
  const query = parse(reportExportQuerySchema, Object.fromEntries(req.nextUrl.searchParams));
  const { filename, csvContent } = await generateReportCSV(session, query);

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
