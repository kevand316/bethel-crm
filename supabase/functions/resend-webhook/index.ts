// Supabase Edge Function: Resend Webhook
// Handles email open, click, bounce, and delivery events from Resend
//
// Deploy: supabase functions deploy resend-webhook --no-verify-jwt
// Set in Resend dashboard: https://<project-ref>.supabase.co/functions/v1/resend-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, data } = body;

    if (!data?.email_id) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendId = data.email_id;

    // Find the email send record
    const { data: emailSend } = await supabase
      .from('email_sends')
      .select('id, contact_id, campaign_id')
      .eq('resend_id', resendId)
      .single();

    if (!emailSend) {
      return new Response(JSON.stringify({ received: true, matched: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (type) {
      case 'email.delivered': {
        await supabase
          .from('email_sends')
          .update({ status: 'delivered' })
          .eq('id', emailSend.id);
        break;
      }

      case 'email.opened': {
        await supabase
          .from('email_sends')
          .update({ status: 'opened', opened_at: new Date().toISOString() })
          .eq('id', emailSend.id);

        if (emailSend.campaign_id) {
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: emailSend.campaign_id,
            p_field: 'total_opened',
          });
        }

        await supabase.from('activity_log').insert({
          contact_id: emailSend.contact_id,
          type: 'email_opened',
          description: 'Opened email',
        });
        break;
      }

      case 'email.clicked': {
        await supabase
          .from('email_sends')
          .update({ status: 'clicked', clicked_at: new Date().toISOString() })
          .eq('id', emailSend.id);

        if (emailSend.campaign_id) {
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: emailSend.campaign_id,
            p_field: 'total_clicked',
          });
        }
        break;
      }

      case 'email.bounced': {
        await supabase
          .from('email_sends')
          .update({ status: 'bounced', bounced_at: new Date().toISOString() })
          .eq('id', emailSend.id);

        if (emailSend.campaign_id) {
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: emailSend.campaign_id,
            p_field: 'total_bounced',
          });
        }

        if (emailSend.contact_id) {
          await supabase
            .from('contacts')
            .update({ status: 'bounced' })
            .eq('id', emailSend.contact_id);

          await supabase.from('activity_log').insert({
            contact_id: emailSend.contact_id,
            type: 'email_bounced',
            description: 'Email bounced — contact marked as bounced',
          });
        }
        break;
      }

      case 'email.complained': {
        // Spam complaint — unsubscribe the contact
        if (emailSend.contact_id) {
          await supabase
            .from('contacts')
            .update({ status: 'unsubscribed' })
            .eq('id', emailSend.contact_id);

          await supabase.from('activity_log').insert({
            contact_id: emailSend.contact_id,
            type: 'unsubscribed',
            description: 'Unsubscribed due to spam complaint',
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true, type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
