# Fixes Applied to WATI Integration

## Date: May 22, 2026

### Issues Fixed

#### 1. Admin Panel Messages Not Reaching WhatsApp (CRITICAL)

**Problem:**
- Messages from admin panel were saving to database but not reaching user's WhatsApp
- WATI API was returning errors: "message text can not be empty" and "404 Not Found"

**Root Causes:**
1. Missing tenant ID in API URL path
2. Wrong request body format (was using JSON/plain text, should use URL-encoded form data)
3. Wrong Content-Type header

**Solution:**
Updated `backend/services/wati.js` - `sendSessionMessage()` method:

```javascript
// BEFORE (BROKEN):
const endpoint = `/api/v1/sendSessionMessage/${waId}`;
const payload = { messageText: text };
const response = await this.client.post(endpoint, payload);

// AFTER (FIXED):
const endpoint = this.tenantId 
    ? `/${this.tenantId}/api/v1/sendSessionMessage/${waId}`
    : `/api/v1/sendSessionMessage/${waId}`;

const formData = new URLSearchParams();
formData.append('messageText', text);

const response = await axios.post(
    `${this.baseURL}${endpoint}`,
    formData.toString(),
    {
        headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        params: { channelNumber: this.channelPhone }
    }
);
```

**Key Changes:**
- Added `/{tenantId}` to URL path: `/356791/api/v1/sendSessionMessage/...`
- Changed body format from JSON to URL-encoded: `messageText=...`
- Changed Content-Type from `application/json` to `application/x-www-form-urlencoded`
- Added `channelNumber` as query parameter

---

#### 2. Webhook Auto-Reply Database Error (CRITICAL)

**Problem:**
- When users sent messages to WhatsApp, webhook received them but crashed with:
  ```
  Error: invalid input syntax for type integer: "User phone: whatsapp:+919142426264"
  ```
- This prevented AI agent from replying to user messages

**Root Cause:**
- `generateResponse()` function in `llm.js` expects user ID (integer) as first parameter
- Webhook was passing phone number string: `"User phone: whatsapp:+919142426264"`

**Solution:**
Updated `backend/server.js` line 184:

```javascript
// BEFORE (BROKEN):
const llmResponse = await generateResponse(`User phone: ${phoneNumber}`, incomingMessage);

// AFTER (FIXED):
const llmResponse = await generateResponse(user.id, incomingMessage);
```

---

#### 3. WATI_CHANNEL_PHONE Format Error

**Problem:**
- `.env` file had `WATI_CHANNEL_PHONE=+15557106411` (with + prefix)
- WATI API expects digits only

**Solution:**
Updated `backend/.env`:

```env
# BEFORE:
WATI_CHANNEL_PHONE=+15557106411

# AFTER:
WATI_CHANNEL_PHONE=15557106411
```

---

### Testing Results

✅ **Admin Panel → User WhatsApp**: Messages now successfully delivered
✅ **User WhatsApp → Agent**: Webhook processes messages, AI generates responses
✅ **Message Status**: Delivery and read receipts received from WATI
✅ **Database**: Conversation history properly stored and retrieved
✅ **LLM Integration**: Grok AI successfully generates contextual responses

---

### Files Modified

1. `/backend/services/wati.js` - Fixed `sendSessionMessage()` API call format
2. `/backend/server.js` - Fixed webhook handler to pass user.id instead of phone string
3. `/backend/.env` - Fixed WATI_CHANNEL_PHONE format

---

### How to Verify

1. **Test Admin Panel Messaging:**
   ```bash
   # Open admin dashboard
   open http://localhost:5173
   
   # Send message to user
   # Should appear in user's WhatsApp within 1-2 seconds
   ```

2. **Test Webhook Auto-Reply:**
   ```bash
   # Send "Hello" from user's WhatsApp to business number
   # Should receive AI-generated reply immediately
   ```

3. **Check Backend Logs:**
   ```bash
   # Look for these success indicators:
   # [DEBUG] Full URL: https://live-mt-server.wati.io/356791/api/v1/...
   # WATI message sent to 919...: wamid.ABC...
   # eventType: 'sentMessageDELIVERED' or 'sentMessageREAD'
   ```

---

### Known Limitations

⚠️ **24-Hour Session Window**: 
- WhatsApp only allows session messages within 24 hours after user's last message
- Outside this window, must use template messages
- See `WELCOME_MESSAGE_GUIDE.md` for template message setup

⚠️ **User Must Message First**:
- To initiate conversation with new user, they must send first message OR
- Use template message endpoint: `POST /api/users/welcome`

---

### Next Steps

1. ✅ All core functionality working
2. ✅ Admin panel can message users
3. ✅ Webhook auto-replies to user messages
4. 🔄 Optional: Set up webhook URL in WATI dashboard if not done
5. 🔄 Optional: Create and approve message templates for first-contact messages

---

### Support Documentation

- **WATI Setup**: See `WATI_SETUP.md`
- **Welcome Messages**: See `WELCOME_MESSAGE_GUIDE.md`
- **Debugging**: See `README.md` debugging section
- **Migration Details**: See `MIGRATION_COMPLETE.md`
