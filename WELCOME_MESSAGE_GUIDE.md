# Welcome Message Guide - Send First Message via WATI

## Overview

To send a **first message** to a user who hasn't contacted you yet, you must use **WhatsApp Template Messages**. This is required due to WhatsApp's 24-hour session window policy.

## Step 1: Create a Template in WATI Dashboard

### 1.1 Login to WATI
- Go to https://app.wati.io
- Login with your credentials

### 1.2 Navigate to Templates
- Click **Broadcast** in left sidebar
- Click **Templates**

### 1.3 Create New Template
Click **"Create Template"** button and fill in:

**Basic Info:**
- **Template Name**: `welcome_message` (lowercase, no spaces, use underscores)
- **Category**: Select **UTILITY** (for customer service) or **MARKETING** (for promotions)
- **Language**: English

**Message Body:**
```
Hello! 👋

Welcome to our Health WhatsApp Agent. I'm here to help answer your health-related questions 24/7.

How can I assist you today?
```

**Optional Fields:**
- **Header**: You can add a greeting like "Welcome!" or leave blank
- **Footer**: You can add small text at bottom like "Reply STOP to unsubscribe"
- **Buttons**: You can add quick reply buttons (optional)

### 1.4 Submit for Approval
- Click **"Submit for Approval"**
- WhatsApp will review your template
- **Approval time**: Usually 5 minutes to 24 hours
- You'll receive notification when approved

### 1.5 Check Approval Status
- Go back to **Broadcast** → **Templates**
- Look for green checkmark ✓ next to your template
- Status should show **"APPROVED"**

---

## Step 2: Send Welcome Message

Once your template is approved, you have 3 ways to send it:

### Method 1: From WATI Dashboard (Manual)

**Steps:**
1. Go to **Team Inbox** in WATI dashboard
2. Click **"New Message"** or **"+"** button
3. Enter user's phone number with country code:
   - Example: `+919876543210` (India)
   - Example: `+15559735665` (USA)
4. Select your approved template from dropdown
5. Click **"Send"**

**When to use:** For testing or sending to a few users manually.

---

### Method 2: Via API (curl)

Test with command line:

```bash
curl -X POST "https://live-mt-server.wati.io/api/v1/sendTemplateMessage?whatsappNumber=919876543210" \
  -H "Authorization: Bearer YOUR_WATI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "welcome_message",
    "broadcast_name": "Welcome Campaign",
    "parameters": []
  }'
```

**Replace:**
- `919876543210` with actual phone number (digits only, no `+`)
- `YOUR_WATI_API_TOKEN` with your actual token from `.env` file
- `welcome_message` with your actual template name

**When to use:** For testing the API before implementing in code.

---

### Method 3: Via Your Backend API (Programmatic)

Use the new endpoint I just added:

**Endpoint:** `POST /api/users/welcome`

**Request Body:**
```json
{
  "phoneNumber": "+919876543210",
  "templateName": "welcome_message"
}
```

**Example with curl:**
```bash
curl -X POST "http://localhost:3000/api/users/welcome" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "templateName": "welcome_message"
  }'
```

**Example with Postman:**
- Method: `POST`
- URL: `http://localhost:3000/api/users/welcome`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
  ```json
  {
    "phoneNumber": "+919876543210",
    "templateName": "welcome_message"
  }
  ```

**Success Response:**
```json
{
  "success": true,
  "message": "Welcome message sent",
  "templateName": "welcome_message",
  "user": {
    "id": 1,
    "phone_number": "whatsapp:+919876543210",
    "name": "John Doe"
  }
}
```

**When to use:** For automated onboarding, bulk welcome messages, or integration with your app.

---

## Step 3: After User Receives Template

Once the user receives and opens your template message:
- A **24-hour session window** opens
- You can now send regular messages (non-template) for the next 24 hours
- Your agent will auto-reply via the webhook when user responds

---

## Template Message Best Practices

### ✅ DO:
- Keep messages concise and clear
- Use professional, friendly tone
- Include a clear call-to-action (e.g., "How can I help you today?")
- Test templates thoroughly before sending to real users
- Use **UTILITY** category for customer service messages

### ❌ DON'T:
- Don't use promotional language in UTILITY templates
- Don't add multiple paragraphs (keep it brief)
- Don't use excessive emojis (1-2 is fine)
- Don't include URLs in unapproved templates (they may get rejected)

---

## Common Template Examples

### Customer Service (UTILITY)
```
Hello {{1}}! 👋

Welcome to [Your Business Name]. I'm here to help with your health questions.

How can I assist you today?
```

### Appointment Reminder (UTILITY)
```
Hi {{1}},

This is a reminder for your appointment on {{2}} at {{3}}.

Reply YES to confirm or RESCHEDULE to change.
```

### Marketing (MARKETING)
```
Hello! 🎉

We're excited to announce our new health consultation service. Get expert advice from certified doctors via WhatsApp!

Reply START to learn more.
```

---

## Template Variables

If your template has variables (e.g., `{{1}}`, `{{2}}`), pass them in the `parameters` array:

**Backend endpoint:**
```json
{
  "phoneNumber": "+919876543210",
  "templateName": "appointment_reminder",
  "parameters": ["John", "May 25, 2026", "2:00 PM"]
}
```

**Direct WATI API:**
```json
{
  "template_name": "appointment_reminder",
  "broadcast_name": "Appointment Reminders",
  "parameters": [
    {"name": "1", "value": "John"},
    {"name": "2", "value": "May 25, 2026"},
    {"name": "3", "value": "2:00 PM"}
  ]
}
```

---

## Troubleshooting

### Template Not Sending

**Check 1: Template Approved?**
```bash
# Go to WATI Dashboard → Broadcast → Templates
# Verify status is "APPROVED" (green checkmark)
```

**Check 2: Correct Template Name?**
```bash
# Template name must match exactly (case-sensitive)
# Example: "welcome_message" not "Welcome_Message"
```

**Check 3: Valid Phone Number?**
```bash
# Format: Country code + number (no spaces, no +)
# ✅ Correct: 919876543210
# ❌ Wrong: +91 9876543210, 9876543210
```

**Check 4: WATI API Token Valid?**
```bash
# Test with curl:
curl -X GET "https://live-mt-server.wati.io/api/v1/getMessages?pageSize=1&pageNumber=1" \
  -H "Authorization: Bearer YOUR_WATI_API_TOKEN"

# Should return: {"result": "success", ...}
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Template not found" | Template name doesn't exist or not approved | Check template name spelling and approval status |
| "Invalid whatsapp number" | Wrong phone format | Use digits only (e.g., 919876543210) |
| "Template rejected" | Message violates WhatsApp policies | Revise content, avoid promotional language in UTILITY templates |
| "401 Unauthorized" | Wrong API token | Check `WATI_API_TOKEN` in `.env` |
| "Session already open" | User already messaged you in last 24h | Use regular `sendSessionMessage` instead |

---

## Testing Your Welcome Flow

1. **Create and approve a test template** (use a simple greeting)
2. **Get a test phone number** (your own WhatsApp or a colleague's)
3. **Send welcome message via dashboard** first (to verify template works)
4. **Test via backend API:**
   ```bash
   curl -X POST "http://localhost:3000/api/users/welcome" \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+919876543210"}'
   ```
5. **Verify:**
   - Message received on WhatsApp
   - User entry created in database
   - Backend logs show success

---

## Next Steps

After user receives welcome message and replies:
- Your webhook (`/api/webhook`) will automatically process their message
- Agent will respond via `sendSessionMessage` (regular session message)
- 24-hour session window is now active
- No more templates needed (unless 24h expires without user message)

---

## Need Help?

- Check backend logs for detailed error messages
- Verify WATI dashboard shows template as APPROVED
- Test with WATI dashboard first before using API
- Review [WATI API Documentation](https://docs.wati.io/) for more details
