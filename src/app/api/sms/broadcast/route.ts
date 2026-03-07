import { createAdminClient } from '@/lib/supabase-admin';
import { mergeTags } from '@/lib/utils';
import { NextResponse } from 'next/server';

interface ContactPayload {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
}

export async function POST(request: Request) {
  try {
    const { body, contacts } = await request.json();

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
    }

    const supabase = createAdminClient();
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    let sent = 0;
    let failed = 0;

    // Send in batches with staggering
    for (let i = 0; i < (contacts as ContactPayload[]).length; i++) {
      const contact = (contacts as ContactPayload[])[i];
      if (!contact.phone) {
        failed++;
        continue;
      }

      const personalizedBody = mergeTags(body, contact);

      try {
        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: contact.phone,
            From: fromNumber,
            Body: personalizedBody,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          await supabase.from('sms_messages').insert({
            contact_id: contact.id,
            direction: 'outbound',
            body: personalizedBody,
            twilio_sid: result.sid,
            status: 'sent',
          });

          await supabase.from('activity_log').insert({
            contact_id: contact.id,
            type: 'sms_sent',
            description: `SMS broadcast sent: "${personalizedBody.slice(0, 60)}..."`,
          });

          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      // Stagger: 200ms between each message
      if (i < (contacts as ContactPayload[]).length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return NextResponse.json({ sent, failed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Broadcast failed' },
      { status: 500 }
    );
  }
}
