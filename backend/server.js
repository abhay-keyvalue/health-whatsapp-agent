const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const { pool, initDB } = require('./db');
const { classifyIntent, generateResponse } = require('./llm');
const { checkSafety } = require('./safetyRules');
const { handleFlowEngine } = require('./flowEngine');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function getUser(phoneNumber) {
  const res = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phoneNumber]);
  if (res.rows.length === 0) {
      const newUser = await pool.query(
          'INSERT INTO users (phone_number, name) VALUES ($1, $2) RETURNING *',
          [phoneNumber, 'Member']
      );
      return newUser.rows[0];
  }
  return res.rows[0];
}

async function logMessage(userId, sender, body) {
   await pool.query(
       'INSERT INTO messages (user_id, sender, body) VALUES ($1, $2, $3)',
       [userId, sender, body]
   );
}

async function triggerEscalation(userId, reason) {
    await pool.query(
        'INSERT INTO escalations (user_id, reason) VALUES ($1, $2)',
        [userId, reason]
    );
}

// Webhook for Twilio WhatsApp incoming messages
app.post('/api/webhook', async (req, res) => {
    const incomingMessage = req.body.Body;
    const from = req.body.From; // e.g. "whatsapp:+12345678"

    const twiml = new twilio.twiml.MessagingResponse();
    let finalResponse = "";

    try {
        const user = await getUser(from);
        await logMessage(user.id, 'user', incomingMessage);

        // 1. Check if user is in an active Flow
        let flowResult = null;
        if (user.active_flow) {
            flowResult = handleFlowEngine(user, incomingMessage);
        }

        if (flowResult) {
            finalResponse = flowResult.nextMessage;
            if (flowResult.clearFlow) {
                await pool.query("UPDATE users SET active_flow = NULL WHERE id = $1", [user.id]);
            }
        } else {
            // 2. Classify intent if no active flow handled it
            const intent = await classifyIntent(incomingMessage);
            
            if (intent.includes("EMERGENCY") || incomingMessage.toLowerCase().includes("emergency")) {
                finalResponse = "This sounds like a critical situation. I am immediately alerting the clinician team. Please seek physical emergency care immediately.";
                await triggerEscalation(user.id, `Emergency triggered by user message: ${incomingMessage}`);
            } else {
                // 3. Free-Form Query -> LLM
                const llmResponse = await generateResponse(`User phone: ${from}`, incomingMessage);
                
                // 4. Safety Post-Processing
                const safetyResult = checkSafety(llmResponse);

                if (!safetyResult.safe) {
                    finalResponse = safetyResult.fallbackMessage;
                    await triggerEscalation(user.id, safetyResult.escalationReason);
                } else {
                    finalResponse = llmResponse;
                }
            }
        }

        await logMessage(user.id, 'agent', finalResponse);
        twiml.message(finalResponse);

        res.type('text/xml').send(twiml.toString());
    } catch (err) {
        console.error(err);
        twiml.message("I'm sorry, I encountered an error. Let me escalate this for later review.");
        res.type('text/xml').send(twiml.toString());
    }
});

// Admin Dashboard API
app.get('/api/escalations', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.id, e.reason, e.status, e.created_at, u.phone_number, u.name 
            FROM escalations e
            JOIN users u ON e.user_id = u.id
            ORDER BY e.created_at DESC
        `);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({error: "Server Error"});
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({error: "Server Error"});
    }
});

app.get('/api/users/:id/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at ASC', [req.params.id]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({error: "Server Error"});
    }
});

// Send message from admin to user
app.post('/api/users/:id/messages', async (req, res) => {
    try {
        const userId = req.params.id;
        const { message } = req.body;
        
        if (!message || !message.trim()) {
            return res.status(400).json({error: "Message is required"});
        }

        // Get user info
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({error: "User not found"});
        }
        
        const user = userResult.rows[0];
        
        // Log the message in database
        const messageResult = await pool.query(
            'INSERT INTO messages (user_id, sender, body) VALUES ($1, $2, $3) RETURNING *',
            [userId, 'admin', message.trim()]
        );
        
        // Send via Twilio WhatsApp
        try {
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
                await client.messages.create({
                    body: message.trim(),
                    from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
                    to: user.phone_number
                });
            }
        } catch (twilioErr) {
            console.error('Twilio error (message saved to DB but not sent):', twilioErr);
            // Continue even if WhatsApp sending fails - message is saved in DB
        }
        
        res.json(messageResult.rows[0]);
    } catch (e) {
        console.error('Error sending message:', e);
        res.status(500).json({error: "Server Error"});
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await initDB();
    console.log(`Backend server listening on port ${PORT}`);
});
