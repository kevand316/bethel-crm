import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('id');

    if (!contactId) {
      return new NextResponse(renderPage('Invalid unsubscribe link.', false), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const supabase = createAdminClient();

    const { data: contact } = await supabase
      .from('contacts')
      .select('id, first_name, email')
      .eq('id', contactId)
      .single();

    if (!contact) {
      return new NextResponse(renderPage('Contact not found.', false), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Update contact status
    await supabase
      .from('contacts')
      .update({ status: 'unsubscribed' })
      .eq('id', contactId);

    // Log activity
    await supabase.from('activity_log').insert({
      contact_id: contactId,
      type: 'unsubscribed',
      description: 'Contact unsubscribed via email link',
    });

    return new NextResponse(
      renderPage('You have been successfully unsubscribed from Bethel Residency emails.', true),
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch {
    return new NextResponse(renderPage('An error occurred. Please try again.', false), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// Also handle POST for List-Unsubscribe-Post
export async function POST(request: Request) {
  return GET(request);
}

function renderPage(message: string, success: boolean) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribe — Bethel Residency</title>
      <style>
        body {
          font-family: 'DM Sans', Arial, sans-serif;
          background-color: #faf7f2;
          color: #0f1f3d;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 16px;
        }
        .card {
          background: white;
          border-radius: 12px;
          padding: 48px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 28px;
        }
        .success { background: #dcfce7; }
        .error { background: #fee2e2; }
        h1 { font-family: 'DM Serif Display', serif; font-size: 20px; margin-bottom: 8px; }
        p { color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon ${success ? 'success' : 'error'}">${success ? '&#10003;' : '&#10007;'}</div>
        <h1>${success ? 'Unsubscribed' : 'Error'}</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;
}
