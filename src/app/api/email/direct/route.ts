import { createAdminClient } from '@/lib/supabase-admin';
import { generateUnsubscribeUrl } from '@/lib/utils';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { contact_id, subject, body, from_email, from_name } = await request.json();
    const supabase = createAdminClient();

    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contact_id)
      .single();

    if (!contact || !contact.email) {
      return NextResponse.json({ error: 'Contact not found or has no email' }, { status: 404 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = from_email || process.env.RESEND_FROM_EMAIL || 'noreply@bethelresidency.com';
    const fromName = from_name || process.env.RESEND_FROM_NAME || 'Bethel Residency';

    if (!resendApiKey) {
      return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 });
    }

    const unsubscribeUrl = generateUnsubscribeUrl(contact.id);

    // Convert plain text to HTML paragraphs
    const htmlBody = body
      .split('\n')
      .map((line: string) =>
        line.trim() ? `<p style="margin: 0 0 12px 0; line-height: 1.6;">${line}</p>` : '<br/>'
      )
      .join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #faf7f2; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
          <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="color: #1a2744; font-size: 15px;">
              ${htmlBody}
            </div>
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [contact.email],
        subject,
        html: fullHtml,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.id) {
      return NextResponse.json({ error: result.message || 'Send failed' }, { status: 500 });
    }

    // Create a campaign record for tracking
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .insert({
        name: `Direct: ${[contact.first_name, contact.last_name].filter(Boolean).join(' ')}`,
        status: 'sent',
        total_sent: 1,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    await supabase.from('email_sends').insert({
      campaign_id: campaign?.id || null,
      contact_id: contact.id,
      resend_id: result.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    await supabase.from('activity_log').insert({
      contact_id: contact.id,
      type: 'email_sent',
      description: `Email sent: "${subject}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 }
    );
  }
}
