# Twilio to WATI Migration - Completion Summary

## Migration Status: ✅ COMPLETED

All code changes have been implemented to migrate from Twilio to WATI WhatsApp API.

## What Was Changed

### 1. New Files Created

- **`backend/services/wati.js`** - WATI API client for sending messages, files, and fetching media
- **`backend/utils/phone.js`** - Phone number normalization utilities for WATI format conversion
- **`WATI_SETUP.md`** - Comprehensive WATI account setup guide

### 2. Dependencies Updated

**Removed:**
- `twilio` - No longer needed

**Added:**
- `axios` - HTTP client for WATI API calls
- `form-data` - Required for multipart file uploads to WATI

### 3. Backend Changes (`backend/server.js`)

- ✅ Removed Twilio imports and client initialization
- ✅ Added WATI client and phone utilities imports
- ✅ Rewrote webhook handler for WATI JSON payload (async reply via API)
- ✅ Added inbound media handling (image, video, document, audio, voice)
- ✅ Updated admin text message endpoint to use WATI `sendSessionMessage`
- ✅ Updated admin video endpoint to use WATI `sendSessionFile` (direct upload, no PUBLIC_URL dependency)
- ✅ Updated `logMessage` function to support media_url and media_type

### 4. Database Schema (`backend/db.js`)

- ✅ Extended `messages` table with:
  - `media_url TEXT` - Path to saved media file
  - `media_type VARCHAR(20)` - Type of media (video, image, audio, etc.)
- ✅ Added migration to add columns to existing tables

### 5. Admin Dashboard (`admin-dashboard/src/pages/UserChat.jsx`)

- ✅ Added media rendering for messages:
  - Video player for video messages
  - Image display for image messages
  - Audio player for audio/voice messages
  - Download links for documents
- ✅ Updated comments (WhatsApp instead of Twilio)

### 6. Configuration Files

- ✅ **`backend/.env`** - Replaced Twilio vars with WATI vars
- ✅ **`render.yaml`** - Updated environment variables for deployment
- ✅ **`README.md`** - Updated setup instructions for WATI
- ✅ **`admin-dashboard/src/config.js`** - Updated webhook provider comment

## Environment Variables

### Old (Twilio):
```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=...
```

### New (WATI):
```env
WATI_API_BASE_URL=https://live-mt-server.wati.io
WATI_API_TOKEN=your_bearer_token
WATI_TENANT_ID=your_tenant_id
WATI_CHANNEL_PHONE=919876543210
```

## Next Steps

### 1. Complete WATI Setup

Follow the instructions in **[WATI_SETUP.md](WATI_SETUP.md)**:

1. Create WATI account at [wati.io](https://www.wati.io)
2. Connect WhatsApp Business number
3. Generate API token
4. Get API base URL and tenant ID
5. Configure webhook to point to your backend
6. Update `backend/.env` with your credentials

### 2. Update Environment Variables

Edit `backend/.env` with your actual WATI credentials:

```bash
cd backend
nano .env  # or use your preferred editor
```

### 3. Restart Backend

```bash
# Make sure PostgreSQL is running (Docker)
docker compose up db -d

# Install dependencies (already done)
cd backend
npm install

# Start backend
npm run dev  # from root directory
```

### 4. Test the Migration

**Inbound Messages (User → Agent):**
1. Send a text message to your WhatsApp Business number
2. Check backend logs for webhook receipt
3. Verify agent reply appears on WhatsApp
4. Send an image or video
5. Check it appears in admin dashboard

**Outbound Messages (Admin → User):**
1. Open admin dashboard: http://localhost:5173/
2. Navigate to Users → View Context
3. Send a text message
4. Send a video
5. Verify both appear on user's WhatsApp

**Admin Dashboard:**
1. Verify messages list loads
2. Verify media (videos/images) displays correctly
3. Verify emergency escalations still work

### 5. Update Render Deployment (if using Render)

In your Render dashboard:

1. Go to your backend service
2. Update environment variables:
   - Remove: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
   - Add: WATI_API_BASE_URL, WATI_API_TOKEN, WATI_TENANT_ID, WATI_CHANNEL_PHONE, PUBLIC_URL
3. Trigger manual deploy or push to main branch

## Key Architectural Changes

### Webhook Flow

**Before (Twilio):**
```
User → WhatsApp → Twilio → Your backend webhook
                            ↓ (sync TwiML response)
                            Twilio → WhatsApp → User
```

**After (WATI):**
```
User → WhatsApp → WATI → Your backend webhook (200 OK immediately)
                          ↓
                          Process message + LLM
                          ↓
                          WATI API call (async)
                          ↓
                          WATI → WhatsApp → User
```

### Media Handling

**Outbound Video (Before):**
- Saved to `backend/uploads/`
- Served via ngrok PUBLIC_URL
- Twilio fetches from your server
- Sent to WhatsApp

**Outbound Video (After):**
- Saved to `backend/uploads/`
- Uploaded directly to WATI via multipart/form-data
- No PUBLIC_URL dependency for sending
- WATI handles delivery to WhatsApp

**Inbound Media (New Feature):**
- WATI webhook includes `data.fileName`
- Backend calls `getMedia(fileName)` to download
- Saved to `backend/uploads/`
- Displayed in admin dashboard

## Important Notes

### 24-Hour Session Window

WATI session messages (`sendSessionMessage`, `sendSessionFile`) only work within 24 hours after the user last messaged you.

- ✅ **Within 24h:** Use session messages
- ❌ **Outside 24h:** Need template messages (not yet implemented)

### Phone Number Format

The migration preserves database format (`whatsapp:+919...`) for compatibility:
- Stored in DB: `whatsapp:+919876543210`
- Sent to WATI: `919876543210` (converted by `toWaId()`)
- Received from WATI: `919876543210` (converted to DB format by `fromWaId()`)

### Database Compatibility

Existing user records and messages are fully compatible. The migration adds optional columns:
- `messages.media_url` - NULL for old text-only messages
- `messages.media_type` - NULL for old text-only messages

## Troubleshooting

### Webhook Not Receiving Messages

1. Check ngrok is running: `ngrok http 3000`
2. Verify webhook URL in WATI dashboard matches ngrok URL
3. Test webhook with WATI's "Trigger sample callback" feature
4. Check backend logs for errors

### Messages Not Sending

1. Verify WATI credentials in `.env`
2. Check 24-hour session window is active
3. Ensure phone number format is correct (digits only for WATI API)
4. Review backend logs for WATI API errors

### Media Not Downloading

1. Verify `data.fileName` is present in webhook payload
2. Check WATI API token has media access permissions
3. Ensure `uploads/` directory exists and is writable
4. Review backend logs for getMedia errors

### Admin Dashboard Shows Old Layout

1. Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Restart frontend dev server

## Optional Enhancements (Future)

- **Template messages** for outreach outside 24h window
- **Webhook signature verification** for security
- **Blob storage** (S3/Azure) instead of local uploads
- **India data localization** via Meta Cloud API settings
- **Message status tracking** (sent, delivered, read)

## Rollback Instructions (if needed)

If you need to rollback to Twilio:

1. Restore `backend/package.json` Twilio dependency
2. Restore Twilio webhook handler in `backend/server.js`
3. Restore Twilio environment variables
4. Run `npm install` in backend
5. Restart backend

All original functionality is preserved - the migration is additive with media features.

## Support

- WATI Documentation: [docs.wati.io](https://docs.wati.io)
- WATI Setup Guide: [WATI_SETUP.md](WATI_SETUP.md)
- Migration Plan: `/.cursor/plans/twilio_to_wati_migration_*.plan.md`

---

**Migration completed on:** 2026-05-21

**All 7 todos completed successfully! ✅**
