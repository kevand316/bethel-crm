import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const { to, from_email, from_name } = await request.json();

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = from_email || process.env.RESEND_FROM_EMAIL || 'noreply@bethelresidency.com';
  const fromName = from_name || process.env.RESEND_FROM_NAME || 'Bethel Residency';

  if (!resendApiKey) {
    return NextResponse.json({ success: false, error: 'RESEND_API_KEY is not set in environment variables.' });
  }

  if (!to) {
    return NextResponse.json({ success: false, error: 'No recipient email provided.' });
  }

  // Verify domain is verified in Resend first
  try {
    const domainRes = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    });

    if (!domainRes.ok) {
      const err = await domainRes.json();
      return NextResponse.json({
        success: false,
        error: `Resend API key rejected: ${err.message || err.name || 'Invalid key'}`,
      });
    }

    const domainData = await domainRes.json();
    const verifiedDomains: string[] = (domainData.data || [])
      .filter((d: { status: string }) => d.status === 'verified')
      .map((d: { name: string }) => d.name);

    const fromDomain = fromEmail.split('@')[1];
    if (verifiedDomains.length > 0 && !verifiedDomains.includes(fromDomain)) {
      return NextResponse.json({
        success: false,
        error: `Domain "${fromDomain}" is not verified in Resend. Verified domains: ${verifiedDomains.join(', ')}`,
      });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Could not reach Resend API. Check your network or API key.' });
  }

  // Send test email
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: 'Bethel CRM — Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #faf7f2;">
          <div style="background: white; border-radius: 8px; padding: 32px;">
            <h2 style="color: #1a2744; font-size: 20px; margin: 0 0 12px;">Test Email ✓</h2>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
              Your Bethel CRM email integration is working correctly.
            </p>
            <p style="color: #999; font-size: 12px; margin: 0;">
              Sent from: ${fromEmail}
            </p>
          </div>
        </div>
      `,
    }),
  });

  const result = await res.json();

  if (res.ok && result.id) {
    // Log to activity if possible
    try {
      const supabase = createAdminClient();
      await supabase.from('activity_log').insert({
        contact_id: null,
        type: 'email_test',
        description: `Test email sent successfully to ${to} from ${fromEmail}`,
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, id: result.id });
  }

  // Surface exact Resend error
  const errorMsg = result.message || result.name || JSON.stringify(result);
  return NextResponse.json({ success: false, error: `Resend rejected the send: ${errorMsg}` });
}
