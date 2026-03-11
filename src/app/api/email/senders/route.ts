import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

// GET - list configured senders + verified Resend domains
export async function GET() {
  const supabase = createAdminClient();

  // Fetch configured senders from DB
  const { data: senders, error } = await supabase
    .from('email_senders')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  return NextResponse.json({ senders: senders || [], verifiedDomains });
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
