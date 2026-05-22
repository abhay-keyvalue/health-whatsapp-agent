# Health WhatsApp Agent

This project contains the complete infrastructure for your Health WhatsApp agent:
1. Node.js Backend Server (`/backend`)
2. React Admin Dashboard (`/admin-dashboard`)

## 1. Backend Setup

The backend handles the WATI webhook, Postgres DB logic, Flow Engine, Grok integration, and Safety rules.

1. Navigate to `/backend`.
2. **Set up WATI account** - See [WATI_SETUP.md](WATI_SETUP.md) for detailed instructions
3. **Send first welcome message** - See [WELCOME_MESSAGE_GUIDE.md](WELCOME_MESSAGE_GUIDE.md) to initiate conversations with new users
4. Edit the `.env` file to include your actual WATI and Grok credentials:
   - `WATI_API_BASE_URL`
   - `WATI_API_TOKEN`
   - `WATI_TENANT_ID`
   - `WATI_CHANNEL_PHONE`
   - `ADMIN_WHATSAPP_NUMBER` (Admin's WhatsApp number for escalation alerts - digits only with country code, e.g., 919876543210)
   - `GROK_API_KEY`
   - `DATABASE_URL` (Update this to point to a running postgres instance)
4. Make sure PostgreSQL is running on your machine.
5. Run `npm install` then `node server.js`.
6. The database tables (`users`, `messages`, `escalations`) will automatically initialize.
7. Ngrok Setup: Use `ngrok http 3000` to expose the local server, and set your WATI webhook URL to `https://<your-ngrok-url>.ngrok-free.app/api/webhook`.

### Architecture Flow:
1. **Flow Engine**: Triggers for states like `medication_reminder` overriding LLM.
2. **Intent Classifier**: Automatically detects Emergency or Questions.
3. **LLM Engine**: Uses Grok's API (via openai sdk standard wrapper) mapped to `api.x.ai/v1`. Pre-prompted to act as a warm health EA.
4. **Safety Rule Engine**: Catches keywords like 'emergency' and 'blood' generated in the LLM response, replacing it with a safe fallback and triggering an escalation in the DB.

### Important Notes:
- **24-hour session window**: WATI session messages only work within 24 hours after the user last messaged you. Outside this window, you need template messages.
- **Media support**: The system handles text, images, videos, documents, and audio from users.
- **Inbound media**: Downloaded from WATI and saved to `backend/uploads/`, visible in admin dashboard.
- **Outbound media**: Uploaded directly to WATI (no PUBLIC_URL dependency for sending).
- **Escalation Notifications**: When safety rules detect emergencies (keywords like "emergency", "chest pain", "can't breathe"), the system:
  1. Logs the escalation to the database
  2. Sends an immediate WhatsApp notification to the admin number configured in `ADMIN_WHATSAPP_NUMBER`
  3. The notification includes user info, timestamp, and escalation reason
  4. Admin must have an active 24-hour session with the WATI number to receive notifications

## 2. Admin Dashboard Setup

The dashboard provides a premium interface to monitor the fleet of members, active escalations, and messaging history.

1. Navigate to \`/admin-dashboard\`.
2. Run \`npm start\` or \`npm run dev\` depending on the vite setup to start the Vite UI.
3. By default, it connects to mock data for demonstration. You can edit the \`axios\` calls in \`Dashboard.jsx\` and \`UsersList.jsx\` to hit \`http://localhost:3000/api/...\` when your API is populated!

Features deployed:
- Premium Glassmorphism modern UI mapping.
- Dashboard with active counters and escalation table.
- Users monitoring list.
- Chronological chat history context window for manual escalation review.
