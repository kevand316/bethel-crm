import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { contacts } = await request.json();
    const supabase = createAdminClient();

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts provided' }, { status: 400 });
    }

    const results = [];
    for (let i = 0; i < contacts.length; i += 100) {
      const batch = contacts.slice(i, i + 100).map((c: Record<string, string | string[]>) => ({
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        email: c.email || null,
        phone: c.phone || null,
        tags: c.tags || [],
        source: 'csv_import',
        status: 'active',
        org_id: 1,
      }));

      const { data, error } = await supabase.from('contacts').insert(batch).select();
      if (error) {
        results.push({ error: error.message, batch: i });
      } else {
        results.push({ imported: data?.length || 0, batch: i });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
