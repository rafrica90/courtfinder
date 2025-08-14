import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

function getUserFromHeaders(req: NextRequest): { id: string | null; email: string | null } {
  const id = req.headers.get('x-user-id');
  const email = req.headers.get('x-user-email');
  return { id: id || null, email: email || null };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId, email } = getUserFromHeaders(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const adminEmails = [
      'ramiafeich@gmail.com',
      ...((process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean)),
    ];
    const isAdmin = !!email && adminEmails.includes(email);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body?.status as 'open' | 'reviewing' | 'resolved' | 'dismissed' | undefined;
    if (!status) return NextResponse.json({ error: 'Missing status' }, { status: 400 });

    const supabase = getSupabaseServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

    const { error } = await supabase
      .from('issue_reports')
      .update({ status })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update report' }, { status: 500 });
  }
}


