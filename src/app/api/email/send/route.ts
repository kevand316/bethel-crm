import { createAdminClient } from '@/lib/supabase-admin';
import { mergeTags, generateUnsubscribeUrl } from '@/lib/utils';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Parse body
  let body: {
    campaign_id?: string;
    template_id?: string;
    contacts?: { id: string; email: string; first_name: string | null; last_name: string | null }[];
    from_email?: string;
    from_name?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { campaign_id, template_id, contacts, from_email, from_name } = body;

  // Validate required fields
  if (!template_id) {
    return NextResponse.json({ error: 'template_id is required' }, { status: 400 });
  }
  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ error: 'contacts array is required and must not be empty' }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set in Vercel environment variables' }, { status: 500 });
  }

  const fromEmail = from_email || process.env.RESEND_FROM_EMAIL || 'noreply@bethelresidency.com';
  const fromName = from_name || process.env.RESEND_FROM_NAME || 'Bethel Residency';

  // Fetch template
  let template: { name: string; subject: string | null; html_body: string | null } | null = null;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('email_templates')
      .select('name, subject, html_body')
      .eq('id', template_id)
      .single();

    if (error) {
      return NextResponse.json({ error: `Template fetch error: ${error.message} (code: ${error.code})` }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: `No template found with id: ${template_id}` }, { status: 404 });
    }
    template = data;
  } catch (e) {
    return NextResponse.json({ error: `Database error: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const contact of contacts) {
    if (!contact.email) {
      failed++;
      continue;
    }

    const subject = mergeTags(template.subject || '(no subject)', contact);
    const unsubscribeUrl = generateUnsubscribeUrl(contact.id);

    const bodyHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#faf7f2;margin:0;padding:0">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:white;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
      ${mergeTags(template.html_body || '', contact)}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center">
        <p style="font-size:12px;color:#999">
          You're receiving this from Bethel Residency.<br>
          <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    let resendResponse: Response;
    let resendResult: Record<string, unknown>;

    try {
      resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [contact.email],
          subject,
          html: bodyHtml,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      });
      resendResult = await resendResponse.json() as Record<string, unknown>;
    } catch (e) {
      const msg = `Network error sending to ${contact.email}: ${e instanceof Error ? e.message : String(e)}`;
      errors.push(msg);
      failed++;
      continue;
    }

    if (resendResponse.ok && resendResult.id) {
      sent++;
      // Record asynchronously — don't let DB errors break email sending
      const supabase = createAdminClient();
      supabase.from('email_sends').insert({
        campaign_id: campaign_id || null,
        contact_id: contact.id,
        resend_id: resendResult.id as string,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).then(() => {});
      supabase.from('activity_log').insert({
        contact_id: contact.id,
        type: 'email_sent',
        description: `Email sent: "${subject}"`,
      }).then(() => {});
    } else {
      const errMsg = (resendResult.message || resendResult.name || JSON.stringify(resendResult)) as string;
      errors.push(`Resend rejected ${contact.email}: ${errMsg}`);
      failed++;
      const supabase = createAdminClient();
      supabase.from('email_sends').insert({
        campaign_id: campaign_id || null,
        contact_id: contact.id,
        status: 'failed',
        sent_at: new Date().toISOString(),
      }).then(() => {});
    }
  }

  return NextResponse.json({
    sent,
    failed,
    errors: errors.length > 0 ? errors.join(' | ') : undefined,
  });
}
