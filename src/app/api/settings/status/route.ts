import { NextResponse } from 'next/server';

export async function GET() {
  // Check Resend by calling their API
  let resendStatus = 'missing';
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });
      resendStatus = res.ok ? 'connected' : 'invalid_key';
    } catch {
      resendStatus = 'unreachable';
    }
  }

  // Check Twilio by checking env vars (avoid making a live call)
  const twilioStatus =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
      ? 'connected'
      : 'missing';

  return NextResponse.json({ resend: resendStatus, twilio: twilioStatus });
}
