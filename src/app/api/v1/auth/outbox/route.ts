import { NextResponse, type NextRequest } from 'next/server';
import { getOutboxForEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: { message: 'Email query parameter required' } }, { status: 400 });
  }

  const emails = getOutboxForEmail(email);
  const latest = emails[emails.length - 1] || null;
  return NextResponse.json({ data: { emails, latest } });
}
