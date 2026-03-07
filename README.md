# Bethel CRM

A modern CRM built for **Bethel Residency** — manage contacts, send email broadcasts via Resend, and handle SMS send/receive via Twilio. Built with Next.js, Supabase, and Tailwind CSS.

---

## Features

### Contact Management
- **Auto-ingest** from intake form submissions (Supabase trigger)
- Searchable, filterable contacts list (by tag, status, source)
- Contact detail pages with full activity timeline
- Custom tagging system with bulk-tag support
- CSV import with column mapping
- Manual contact creation

### Email Broadcasts
- **Resend** integration for transactional and broadcast email
- TipTap rich text template builder with merge fields (`{{first_name}}`, etc.)
- Campaign workflow: pick template → filter by tags → preview → send
- Batch sending with staggered delivery
- Automatic unsubscribe link injection
- Webhook handling for opens, clicks, bounces, and spam complaints
- Campaign analytics (sent, opened, clicked, bounced)

### SMS Send & Receive
- **Twilio** integration for outbound and inbound SMS
- SMS template builder with merge fields
- Send SMS from contact profile or as a broadcast
- Inbound SMS webhook:
  - Known numbers → message logged on contact
  - Unknown numbers → auto-create contact tagged "SMS Lead"
  - `ADD FirstName LastName email@example.com` → creates a full contact via text
- iMessage-style conversation view with real-time updates

### Dashboard
- Total contacts, active contacts, new this month
- Email stats: total sent, open rate, bounce rate
- SMS stats: sent and received counts
- Recent activity feed

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Email | Resend |
| SMS | Twilio |
| Hosting | Vercel |
| Editor | TipTap (rich text) |

---

## Project Structure

```
bethel-crm/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page
│   │   ├── (dashboard)/           # Authenticated layout
│   │   │   ├── contacts/          # Contact list + detail
│   │   │   ├── dashboard/         # Dashboard with stats
│   │   │   ├── email/
│   │   │   │   ├── campaigns/     # Campaign list, new, detail
│   │   │   │   └── templates/     # Template list, new, edit
│   │   │   ├── settings/          # Account & integration settings
│   │   │   └── sms/
│   │   │       ├── broadcast/     # SMS broadcast
│   │   │       ├── conversations/ # Conversation list + thread
│   │   │       └── templates/     # SMS templates
│   │   └── api/
│   │       ├── auth/callback/     # Supabase auth callback
│   │       ├── contacts/import/   # CSV import endpoint
│   │       ├── email/send/        # Resend batch send
│   │       ├── email/webhook/     # Resend event webhook
│   │       ├── sms/send/          # Twilio send single SMS
│   │       ├── sms/broadcast/     # Twilio broadcast SMS
│   │       ├── sms/webhook/       # Twilio inbound SMS webhook
│   │       └── unsubscribe/       # Email unsubscribe handler
│   ├── components/
│   │   ├── contacts/              # AddContactModal, CsvImportModal, BulkTagModal
│   │   ├── email/                 # EmailEditor (TipTap)
│   │   ├── layout/                # Sidebar
│   │   └── ui/                    # Button, Modal, Badge, EmptyState
│   ├── lib/
│   │   ├── supabase-browser.ts    # Browser client
│   │   ├── supabase-server.ts     # Server client (cookies)
│   │   ├── supabase-admin.ts      # Admin client (service role)
│   │   ├── supabase-middleware.ts  # Middleware client
│   │   └── utils.ts               # Helpers (formatDate, mergeTags, etc.)
│   ├── middleware.ts               # Auth guard + session refresh
│   └── types/index.ts             # TypeScript interfaces
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql # All tables, triggers, RLS, functions
│   └── functions/
│       ├── resend-webhook/        # Edge function for Resend events
│       └── twilio-webhook/        # Edge function for inbound SMS
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/kevand316/bethel-crm.git
cd bethel-crm
pnpm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in your actual values:

| Variable | Where to find it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key (keep secret!) |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | Your verified sending domain in Resend |
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number (E.164 format: `+1XXXXXXXXXX`) |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL (e.g., `https://crm.bethelresidency.com`) |

### 3. Run the database migration

Go to your Supabase project → **SQL Editor** → paste the contents of `supabase/migrations/001_initial_schema.sql` → **Run**.

This creates:
- All 7 tables (contacts, email_templates, sms_templates, email_campaigns, email_sends, sms_messages, activity_log)
- Intake auto-ingest trigger (intake_submissions → contacts)
- Updated_at auto-update trigger
- Row Level Security policies
- `increment_campaign_stat` RPC function

### 4. Create a staff user

In Supabase → **Authentication** → **Users** → **Add User** → enter an email and password. This is your CRM login.

### 5. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Bethel CRM MVP"
git remote add origin https://github.com/kevand316/bethel-crm.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import `bethel-crm`
2. Add all environment variables from `.env.local`
3. Deploy

### 3. Custom domain

In Vercel → **Settings** → **Domains** → add `crm.bethelresidency.com` and configure your DNS.

---

## Webhook Configuration

After deploying, configure these webhook URLs:

### Resend (Email Events)

Go to [resend.com](https://resend.com) → **Webhooks** → add:

```
https://crm.bethelresidency.com/api/email/webhook
```

Select events: `email.opened`, `email.clicked`, `email.bounced`, `email.complained`

### Twilio (Inbound SMS)

Go to Twilio Console → **Phone Numbers** → select your number → **Messaging** → set webhook:

```
https://crm.bethelresidency.com/api/sms/webhook
```

Method: **HTTP POST**

### Alternative: Supabase Edge Functions

If you prefer to handle webhooks via Supabase Edge Functions instead of Next.js API routes (e.g., for better cold-start performance), deploy the included edge functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link
supabase login
supabase link --project-ref dorqtterkztyqfnxwxoo

# Deploy edge functions (no JWT verification for webhooks)
supabase functions deploy resend-webhook --no-verify-jwt
supabase functions deploy twilio-webhook --no-verify-jwt
```

Then update your webhook URLs to:
- Resend: `https://dorqtterkztyqfnxwxoo.supabase.co/functions/v1/resend-webhook`
- Twilio: `https://dorqtterkztyqfnxwxoo.supabase.co/functions/v1/twilio-webhook`

---

## Resend Domain Setup

To send emails from `@bethelresidency.com`:

1. Go to [resend.com](https://resend.com) → **Domains** → **Add Domain**
2. Enter `bethelresidency.com`
3. Add the DNS records Resend provides (SPF, DKIM, DMARC)
4. Wait for verification (usually a few minutes)
5. Update `RESEND_FROM_EMAIL` in your env to `noreply@bethelresidency.com`

---

## SMS-to-CRM Commands

When someone texts your Twilio number:

| Text Message | What Happens |
|-------------|---------------|
| `ADD John Smith john@email.com` | Creates a new contact with name + email |
| Any other message (known number) | Logged on existing contact's conversation |
| Any other message (unknown number) | Auto-creates contact tagged "SMS Lead" |

---

## Branding

| Element | Value |
|---------|-------|
| Navy | `#0f1f3d` |
| Gold | `#c9a84c` |
| Cream | `#faf7f2` |
| Body font | DM Sans |
| Heading font | DM Serif Display |

---

## Database Tables

| Table | Purpose |
|-------|----------|
| `contacts` | All CRM contacts with tags, status, source |
| `email_templates` | Reusable email templates (HTML) |
| `sms_templates` | Reusable SMS templates |
| `email_campaigns` | Email broadcast campaigns with stats |
| `email_sends` | Individual email send records per campaign |
| `sms_messages` | All SMS messages (inbound + outbound) |
| `activity_log` | Timeline of all events per contact |

---

## License

Private — Bethel Residency
