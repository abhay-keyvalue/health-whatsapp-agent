# WATI Account Setup Guide

This guide walks you through setting up a WATI account for WhatsApp Business API integration.

## Prerequisites

- WhatsApp Business number (not used with regular WhatsApp)
- Valid business documentation (for WhatsApp Business verification)

## Step 1: Create WATI Account

1. Go to [wati.io](https://www.wati.io) and sign up for an account
2. Choose your plan (free trial available for testing)
3. Complete business verification process

## Step 2: Connect WhatsApp Business Number

1. In WATI dashboard, navigate to **Settings → Phone Numbers**
2. Click **"Add Phone Number"**
3. Follow the wizard to connect your WhatsApp Business number
   - WATI uses Meta's Cloud API (recommended)
   - You'll need to verify your phone number via SMS/call
4. Complete the Meta Business verification if required

## Step 3: Generate API Access Token

1. In WATI dashboard, go to **Connectors → API**
2. Click **"Create API Token"** or **"Generate Token"**
3. Select scopes/permissions:
   - ✅ Send Messages
   - ✅ Send Media/Files
   - ✅ Receive Messages
   - ✅ Get Media
4. Copy and save your **Bearer Token** securely
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 4: Get API Configuration Details

From the WATI API documentation page in your dashboard:

1. **API Base URL** (tenant-specific):
   ```
   https://live-mt-server.wati.io
   ```
   Or region-specific variants like:
   - `https://live-server-XXXX.wati.io`

2. **Tenant ID** (if required by your endpoint):
   - Found in API docs or account settings
   - Example: `12345` or similar

3. **Channel Phone Number** (for multi-number accounts):
   - Your connected WhatsApp Business number
   - Format: digits only (e.g., `919876543210`)
   - Find in **Settings → Phone Numbers**

## Step 5: Configure Webhook

1. In WATI dashboard, go to **Connectors → Webhooks**
2. Click **"Add Webhook"** or **"Configure"**
3. Set webhook URL:
   ```
   https://<your-ngrok-or-production-url>/api/webhook
   ```
   - For local development: use ngrok URL
   - For production: use your deployed backend URL
4. Enable webhook events:
   - ✅ **Message Received** (required)
   - ☑️ Message Sent (optional)
   - ☑️ Message Status Updated (optional)
5. Save webhook configuration
6. Use **"Trigger sample callback"** to test

## Step 6: Update Backend Environment Variables

Add these to your `backend/.env` file:

```env
# WATI Configuration
WATI_API_BASE_URL=https://live-mt-server.wati.io
WATI_API_TOKEN=your_bearer_token_from_step_3
WATI_TENANT_ID=your_tenant_id_from_step_4
WATI_CHANNEL_PHONE=919876543210

# Grok API Configuration (unchanged)
GROK_API_KEY=gsk_...

# Database Configuration (unchanged)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/healthagent

# Server Configuration
PORT=3000
PUBLIC_URL=https://your-ngrok-url.ngrok-free.dev
```

Remove these old Twilio variables:
- ~~TWILIO_ACCOUNT_SID~~
- ~~TWILIO_AUTH_TOKEN~~
- ~~TWILIO_WHATSAPP_NUMBER~~

## Step 7: (Optional) India Data Localization

For DPDP compliance and storing message data in India:

1. During WhatsApp Business number registration in WATI:
   - Enable **Meta Cloud API local storage**
   - Set `data_localization_region: "IN"`
2. This is configured through WATI/Meta onboarding, not in code
3. Contact WATI support if you need to enable this on an existing number

## Verification Checklist

- [ ] WATI account created and business verified
- [ ] WhatsApp Business number connected and verified
- [ ] API token generated with correct scopes
- [ ] API base URL and tenant ID documented
- [ ] Webhook configured with backend URL
- [ ] Webhook test callback successful
- [ ] Environment variables updated in backend/.env
- [ ] Ngrok running and URL matches webhook configuration

## Important Notes

### 24-Hour Session Window

WATI session messages only work within a 24-hour window after the user last messaged you:
- ✅ **Within 24h**: Use `sendSessionMessage` or `sendSessionFile`
- ❌ **Outside 24h**: Requires template messages (different API)

### Testing

1. Send a test message to your WhatsApp Business number from your personal WhatsApp
2. Check WATI dashboard → **Conversations** to see the message
3. Check your backend logs to see webhook delivery
4. Reply from admin dashboard to test outbound messaging

### Troubleshooting

**Webhook not receiving messages:**
- Verify webhook URL is publicly accessible (test with curl)
- Check WATI webhook logs in dashboard
- Ensure ngrok is running and URL hasn't changed
- Verify webhook events are enabled

**API authentication errors:**
- Confirm Bearer token is correct
- Check token hasn't expired
- Verify API base URL matches your tenant

**Message sending fails:**
- Ensure 24-hour session window is active
- Check phone number format (digits only for WATI API)
- Verify `channelPhoneNumber` matches your connected number

## Support Resources

- WATI Documentation: [docs.wati.io](https://docs.wati.io)
- WATI Support: Available in dashboard or help@wati.io
- WhatsApp Business API docs: [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
