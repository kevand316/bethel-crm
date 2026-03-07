import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

// Resend webhook for tracking opens, clicks, bounces
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const { type, data } = body;

    if (!data?.email_id) {
      return NextResponse.json({ received: true });
    }

    const resendId = data.email_id;

    // Find the email send record
    const { data: emailSend } = await supabase
      .from('email_sends')
      .select('id, contact_id, campaign_id')
      .eq('resend_id', resendId)
      .single();

    if (!emailSend) {
      return NextResponse.json({ received: true });
    }

    switch (type) {
      case 'email.opened': {
        await supabase
          .from('email_sends')
          .update({ status: 'opened', opened_at: new Date().toISOString() })
          .eq('id', emailSend.id);

        // Update campaign stats
        if (emailSend.campaign_id) {
          const { data: campaign } = await supabase
            .from('email_campaigns')
            .select('total_opened')
            .eq('id', emailSend.campaign_id)
            .single();

          if (campaign) {
            await supabase
              .from('email_campaigns')
              .update({ total_opened: campaign.total_opened + 1 })
              .eq('id', emailSend.campaign_id);
          }
        }

        // Log activity
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
          const { data: campaign } = await supabase
            .from('email_campaigns')
            .select('total_clicked')
            .eq('id', emailSend.campaign_id)
            .single();

          if (campaign) {
            await supabase
              .from('email_campaigns')
              .update({ total_clicked: campaign.total_clicked + 1 })
              .eq('id', emailSend.campaign_id);
          }
        }
        break;
      }

      case 'email.bounced': {
        await supabase
          .from('email_sends')
          .update({ status: 'bounced', bounced_at: new Date().toISOString() })
          .eq('id', emailSend.id);

        // Update campaign stats
        if (emailSend.campaign_id) {
          const { data: campaign } = await supabase
            .from('email_campaigns')
            .select('total_bounced')
            .eq('id', emailSend.campaign_id)
            .single();

          if (campaign) {
            await supabase
              .from('email_campaigns')
              .update({ total_bounced: campaign.total_bounced + 1 })
              .eq('id', emailSend.campaign_id);
          }
        }

        // Mark contact as bounced
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
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Email webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
