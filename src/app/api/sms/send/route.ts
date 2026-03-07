import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { contact_id, to, body } = await request.json();

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
    }

    // Send via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: body,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.message || 'Failed to send SMS' },
        { status: response.status }
      );
    }

    // Record the message in database
    const supabase = createAdminClient();

    await supabase.from('sms_messages').insert({
      contact_id,
      direction: 'outbound',
      body,
      twilio_sid: result.sid,
      status: 'sent',
    });

    // Log activity
    await supabase.from('activity_log').insert({
      contact_id,
      type: 'sms_sent',
      description: `SMS sent: "${body.slice(0, 80)}${body.length > 80 ? '...' : ''}"`,
    });

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 }
    );
  }
}
