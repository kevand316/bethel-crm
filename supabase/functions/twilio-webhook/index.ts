// Supabase Edge Function: Twilio SMS Webhook
// Handles inbound SMS messages from Twilio
//
// Deploy: supabase functions deploy twilio-webhook --no-verify-jwt
// Set in Twilio console → Phone Number → Messaging → Webhook URL:
//   https://<project-ref>.supabase.co/functions/v1/twilio-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    // Twilio sends form-encoded data
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = (formData.get('Body') as string || '').trim();
    const messageSid = formData.get('MessageSid') as string;

    if (!from || !body) {
      return twimlResponse('');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Normalize phone number for lookup
    const normalizedPhone = from.replace(/\D/g, '');

    // Check if this is an ADD command: ADD FirstName LastName email@example.com
    const addMatch = body.match(/^ADD\s+(\S+)\s+(\S+)\s+(\S+@\S+)$/i);

    if (addMatch) {
      const [, firstName, lastName, email] = addMatch;

      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          phone: from,
          source: 'sms',
          status: 'active',
          tags: ['SMS Lead'],
          org_id: 1,
        })
        .select()
        .single();

      if (newContact) {
        await supabase.from('sms_messages').insert({
          contact_id: newContact.id,
          direction: 'inbound',
          body,
          twilio_sid: messageSid,
        });

        await supabase.from('activity_log').insert({
          contact_id: newContact.id,
          type: 'contact_created',
          description: 'Contact created via SMS ADD command',
        });

        return twimlResponse(
          `Contact added: ${firstName} ${lastName} (${email}). Welcome to Bethel Residency!`
        );
      }

      return twimlResponse('Sorry, there was an error adding the contact. Please try again.');
    }

    // Look up existing contact by phone number
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id')
      .or(`phone.eq.${from},phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`)
      .limit(1);

    let contactId: string;

    if (existingContacts && existingContacts.length > 0) {
      contactId = existingContacts[0].id;
    } else {
      // Unknown number — auto-create contact
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          phone: from,
          source: 'sms',
          status: 'active',
          tags: ['SMS Lead'],
          org_id: 1,
        })
        .select()
        .single();

      if (!newContact) {
        return twimlResponse('');
      }

      contactId = newContact.id;

      await supabase.from('activity_log').insert({
        contact_id: contactId,
        type: 'contact_created',
        description: 'Auto-created from inbound SMS (unknown number)',
      });
    }

    // Record the inbound message
    await supabase.from('sms_messages').insert({
      contact_id: contactId,
      direction: 'inbound',
      body,
      twilio_sid: messageSid,
    });

    await supabase.from('activity_log').insert({
      contact_id: contactId,
      type: 'sms_received',
      description: `Inbound SMS: "${body.slice(0, 80)}${body.length > 80 ? '...' : ''}"`,
    });

    // Empty TwiML — no auto-reply
    return twimlResponse('');
  } catch (error) {
    console.error('Twilio webhook error:', error);
    return twimlResponse('');
  }
});

function twimlResponse(message: string) {
  const twiml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
