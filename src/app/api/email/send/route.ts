import { createAdminClient } from '@/lib/supabase-admin';
import { mergeTags, generateUnsubscribeUrl } from '@/lib/utils';
import { NextResponse } from 'next/server';

interface ContactPayload {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export async function POST(request: Request) {
  try {
    const { campaign_id, template_id, contacts, from_email, from_name } = await request.json();

    // Startup diagnostics
    console.log('[email/send] RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);
    console.log('[email/send] SUPABASE_SERVICE_ROLE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('[email/send] template_id:', template_id, '| contacts count:', contacts?.length);
    console.log('[email/send] from_email:', from_email || '(env default)');

    const supabase = createAdminClient();
    console.log('[email/send] admin client created');

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError) {
      console.error('[email/send] template fetch error:', templateError.message, templateError.code);
      return NextResponse.json({ error: `Template fetch failed: ${templateError.message}` }, { status: 500 });
    }

    if (!template) {
      console.error('[email/send] template not found for id:', template_id);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    console.log('[email/send] template found:', template.name);

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = from_email || process.env.RESEND_FROM_EMAIL || 'noreply@bethelresidency.com';
    const fromName = from_name || process.env.RESEND_FROM_NAME || 'Bethel Residency';

    if (!resendApiKey) {
      return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 });
    }

    let sent = 0;
    let failed = 0;

    for (const contact of contacts as ContactPayload[]) {
      if (!contact.email) {
        failed++;
        continue;
      }

      const personalizedSubject = mergeTags(template.subject || '', contact);
      const unsubscribeUrl = generateUnsubscribeUrl(contact.id);

      // Add unsubscribe link to email body
      const unsubscribeHtml = `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center;">
          <p style="font-size: 12px; color: #999;">
            You're receiving this because you're a contact of Bethel Residency.<br/>
            <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
          </p>
        </div>
      `;

      const personalizedBody = mergeTags(template.html_body || '', contact) + unsubscribeHtml;

      // Wrap in a basic email layout
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #faf7f2; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
            <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              ${personalizedBody}
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [contact.email],
            subject: personalizedSubject,
            html: fullHtml,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Resend error:', JSON.stringify(result));
        }

        if (response.ok && result.id) {
          // Record the send
          await supabase.from('email_sends').insert({
            campaign_id,
            contact_id: contact.id,
            resend_id: result.id,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          // Log activity
          await supabase.from('activity_log').insert({
            contact_id: contact.id,
            type: 'email_sent',
            description: `Email sent: "${personalizedSubject}"`,
          });

          sent++;
        } else {
          // Record failed send
          await supabase.from('email_sends').insert({
            campaign_id,
            contact_id: contact.id,
            status: 'failed',
            sent_at: new Date().toISOString(),
          });
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ sent, failed, errors: failed > 0 ? 'Check Vercel function logs for Resend error details' : undefined });
  } catch (error) {
    console.error('[email/send] FATAL:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 }
    );
  }
}
