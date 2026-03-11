import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

async function ensureTable() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  await fetch(`${url}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      sql: `CREATE TABLE IF NOT EXISTS email_senders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, is_default BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE email_senders ENABLE ROW LEVEL SECURITY; DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_senders' AND policyname='auth') THEN CREATE POLICY "auth" ON email_senders FOR ALL TO authenticated USING (true); END IF; END $$;`
    }),
  }).catch(() => null);
}

// GET - list configured senders + verified Resend domains
export async function GET() {
  const supabase = createAdminClient();

  // Fetch configured senders from DB
  let { data: senders, error } = await supabase
    .from('email_senders')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at');

  // Table missing — auto-create it and retry
  if (error?.code === '42P01') {
    await ensureTable();
    const retry = await supabase
      .from('email_senders')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at');
    senders = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ senders: [], verifiedDomains: [] });
  }

  // Fetch verified domains from Resend
  let verifiedDomains: string[] = [];
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (res.ok) {
      const data = await res.json();
      verifiedDomains = (data.data || [])
        .filter((d: { status: string }) => d.status === 'verified')
        .map((d: { name: string }) => d.name);
    }
  } catch {
    // Resend unreachable — continue without domain list
  }

  // Auto-create a default sender if none configured but domains are verified
  let finalSenders = senders || [];
  if (finalSenders.length === 0 && verifiedDomains.length > 0) {
    const domain = verifiedDomains[0];
    const defaultEmail = `noreply@${domain}`;
    const { data: created } = await supabase
      .from('email_senders')
      .insert({ name: 'Bethel Residency', email: defaultEmail, is_default: true })
      .select()
      .single();
    if (created) finalSenders = [created];
  }

  return NextResponse.json({ senders: finalSenders, verifiedDomains });
}

// POST - add a sender
export async function POST(request: Request) {
  const { name, email, is_default } = await request.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // If setting as default, clear existing default first
  if (is_default) {
    await supabase.from('email_senders').update({ is_default: false }).eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('email_senders')
    .insert({ name: name.trim(), email: email.trim().toLowerCase(), is_default: !!is_default })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sender: data });
}

// DELETE - remove a sender
export async function DELETE(request: Request) {
  const { id } = await request.json();
  const supabase = createAdminClient();
  const { error } = await supabase.from('email_senders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH - set default sender
export async function PATCH(request: Request) {
  const { id } = await request.json();
  const supabase = createAdminClient();
  await supabase.from('email_senders').update({ is_default: false }).eq('is_default', true);
  const { error } = await supabase.from('email_senders').update({ is_default: true }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
