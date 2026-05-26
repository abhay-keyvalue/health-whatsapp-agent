const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { pool, initDB } = require("./db");
const { classifyIntent, generateResponse } = require("./llm");
const { checkSafety } = require("./safetyRules");
const { handleFlowEngine } = require("./flowEngine");
const watiClient = require("./services/wati");
const { toWaId, fromWaId } = require("./utils/phone");

// Add process error handlers to prevent silent exits
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "video-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB limit (WhatsApp's limit)
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|3gp|mkv/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only video files are allowed (mp4, mov, avi, 3gp, mkv)"));
    }
  },
});

async function getUser(phoneNumber) {
  const res = await pool.query("SELECT * FROM users WHERE phone_number = $1", [
    phoneNumber,
  ]);
  if (res.rows.length === 0) {
    const newUser = await pool.query(
      "INSERT INTO users (phone_number, name) VALUES ($1, $2) RETURNING *",
      [phoneNumber, "Member"],
    );
    return newUser.rows[0];
  }
  return res.rows[0];
}

async function logMessage(
  userId,
  sender,
  body,
  mediaUrl = null,
  mediaType = null,
) {
  await pool.query(
    "INSERT INTO messages (user_id, sender, body, media_url, media_type) VALUES ($1, $2, $3, $4, $5)",
    [userId, sender, body, mediaUrl, mediaType],
  );
}

async function triggerEscalation(userId, reason) {
  // Insert into database
  await pool.query(
    "INSERT INTO escalations (user_id, reason) VALUES ($1, $2)",
    [userId, reason],
  );

  // Send notification to admin (non-blocking)
  try {
    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    if (!adminNumber) {
      console.warn(
        "ADMIN_WHATSAPP_NUMBER not configured - escalation logged but admin not notified",
      );
      return;
    }

    // Get user info
    const userResult = await pool.query(
      "SELECT phone_number, name FROM users WHERE id = $1",
      [userId],
    );
    if (userResult.rows.length === 0) {
      console.error("User not found for escalation notification");
      return;
    }

    const user = userResult.rows[0];
    const timestamp = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    // Build notification message
    const notificationMessage = `🚨 ESCALATION ALERT

User: ${user.name}
Phone: ${user.phone_number}
Time: ${timestamp}

Reason: ${reason}

Please review this escalation in the admin dashboard.`;

    // Send to admin via WATI
    await watiClient.sendSessionMessage(adminNumber, notificationMessage);
    console.log(`Escalation notification sent to admin: ${adminNumber}`);
  } catch (error) {
    // Log error but don't fail the escalation
    console.error("Failed to send escalation notification to admin:", error);
  }
}

// Webhook for WATI WhatsApp incoming messages
app.post("/api/webhook", async (req, res) => {
  try {
    // Respond 200 immediately (WATI expects fast ack)
    res.status(200).json({ success: true });

    // Parse WATI webhook payload
    const {
      waId, // WhatsApp ID (sender's phone number, digits only)
      text, // Message text
      type, // Message type: text, image, video, document, audio, etc.
      senderName, // Display name of sender
      data, // Additional data for media messages (contains fileName)
      whatsappMessageId,
      eventType,
    } = req.body;

    // Log webhook for debugging
    console.log("WATI webhook received:", {
      waId,
      type,
      eventType,
      text: text?.substring(0, 50),
      hasData: !!data,
    });
    console.log(
      "WATI webhook full payload:",
      JSON.stringify(req.body, null, 2),
    ); // DEBUG

    // Only process message received events
    if (eventType !== "message") {
      console.log("Skipping non-message event");
      return;
    }

    const phoneNumber = fromWaId(waId); // Convert to DB format: whatsapp:+919...
    let incomingMessage = text || "";
    let mediaUrl = null;
    let mediaType = null;

    try {
      const user = await getUser(phoneNumber);

      // Handle media messages (image, video, document, audio, voice)
      const mediaTypes = [
        "image",
        "video",
        "document",
        "audio",
        "voice",
        "sticker",
      ];
      if (mediaTypes.includes(type) && data?.fileName) {
        console.log(
          `Processing ${type} message with fileName: ${data.fileName}`,
        );

        try {
          // Download media from WATI
          const mediaBuffer = await watiClient.getMedia(data.fileName);

          // Determine file extension from fileName or type
          const originalExt = path.extname(data.fileName);
          const ext =
            originalExt ||
            (type === "image"
              ? ".jpg"
              : type === "video"
                ? ".mp4"
                : type === "audio"
                  ? ".mp3"
                  : type === "voice"
                    ? ".ogg"
                    : ".bin");

          // Generate unique filename
          const filename = `${type}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          const filePath = path.join(__dirname, "uploads", filename);

          // Save file to disk
          const fs = require("fs");
          fs.writeFileSync(filePath, mediaBuffer);

          // Store relative URL for database
          mediaUrl = `/uploads/${filename}`;
          mediaType = type;

          // Set message body to indicate media
          incomingMessage =
            text || `[${type.charAt(0).toUpperCase() + type.slice(1)}]`;

          console.log(
            `Media saved: ${filePath}, size: ${mediaBuffer.length} bytes`,
          );
        } catch (mediaErr) {
          console.error("Failed to download/save media:", mediaErr);
          incomingMessage = `[${type} - download failed]`;
        }
      }

      // Log the message (with media info if applicable)
      await logMessage(user.id, "user", incomingMessage, mediaUrl, mediaType);

      // For media-only messages, send a simple acknowledgment
      // For text messages, process through LLM as before
      let finalResponse = "";

      if (mediaType && !text) {
        // Media without text - acknowledge receipt
        finalResponse =
          "Thank you for sharing that with me. How can I assist you today?";
      } else {
        // Process text message through existing logic
        // 1. Check if user is in an active Flow
        let flowResult = null;
        if (user.active_flow) {
          flowResult = handleFlowEngine(user, incomingMessage);
        }

        if (flowResult) {
          finalResponse = flowResult.nextMessage;
          if (flowResult.clearFlow) {
            await pool.query(
              "UPDATE users SET active_flow = NULL WHERE id = $1",
              [user.id],
            );
          }
        } else {
          // 2. Classify intent if no active flow handled it
          const intent = await classifyIntent(incomingMessage);

          if (
            intent.includes("EMERGENCY") ||
            incomingMessage.toLowerCase().includes("emergency")
          ) {
            finalResponse =
              "This sounds like a critical situation. I am immediately alerting the clinician team. Please seek physical emergency care immediately.";
            await triggerEscalation(
              user.id,
              `Emergency triggered by user message: ${incomingMessage}`,
            );
          } else {
            // 3. Free-Form Query -> LLM
            const llmResponse = await generateResponse(
              user.id,
              incomingMessage,
            );

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
      }

      await logMessage(user.id, "agent", finalResponse);

      // Send reply via WATI API (async, not in HTTP response)
      await watiClient.sendSessionMessage(waId, finalResponse);
    } catch (err) {
      console.error("Error processing webhook:", err);
      // Try to send error message to user
      try {
        await watiClient.sendSessionMessage(
          waId,
          "I'm sorry, I encountered an error. Let me escalate this for later review.",
        );
      } catch (sendErr) {
        console.error("Failed to send error message:", sendErr);
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Still return 200 to avoid retry storms
    if (!res.headersSent) {
      res.status(200).json({ success: false, error: "Internal error" });
    }
  }
});

// Admin Dashboard API
app.get("/api/escalations", async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT e.id, e.reason, e.status, e.created_at, u.phone_number, u.name 
            FROM escalations e
            JOIN users u ON e.user_id = u.id
            ORDER BY e.created_at DESC
        `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/api/users/:id/messages", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at ASC",
      [req.params.id],
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Send message from admin to user
app.post("/api/users/:id/messages", async (req, res) => {
  try {
    const userId = req.params.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get user info
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    // Log the message in database
    const messageResult = await pool.query(
      "INSERT INTO messages (user_id, sender, body) VALUES ($1, $2, $3) RETURNING *",
      [userId, "admin", message.trim()],
    );

    // Send via WATI WhatsApp
    try {
      if (watiClient.isConfigured()) {
        const waId = toWaId(user.phone_number);
        await watiClient.sendSessionMessage(waId, message.trim());
      } else {
        console.warn(
          "WATI client not configured - message saved to DB but not sent",
        );
      }
    } catch (watiErr) {
      console.error("WATI error (message saved to DB but not sent):", watiErr);
      // Continue even if WhatsApp sending fails - message is saved in DB
    }

    res.json(messageResult.rows[0]);
  } catch (e) {
    console.error("Error sending message:", e);
    res.status(500).json({ error: "Server Error" });
  }
});

// Send video from admin to user
app.post("/api/users/:id/video", upload.single("video"), async (req, res) => {
  try {
    const userId = req.params.id;
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Video file is required" });
    }

    // Get user info
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    // Store relative URL for database
    const videoUrl = `/uploads/${req.file.filename}`;

    // Log the message in database with video info
    const messageBody = caption ? `[Video] ${caption}` : "[Video]";
    const messageResult = await pool.query(
      "INSERT INTO messages (user_id, sender, body, media_url, media_type) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [userId, "admin", messageBody, videoUrl, "video"],
    );

    // Send via WATI WhatsApp with video
    try {
      if (watiClient.isConfigured()) {
        const waId = toWaId(user.phone_number);
        await watiClient.sendSessionFile(
          waId,
          req.file.path,
          caption || "Video message",
          req.file.mimetype,
        );
      } else {
        console.warn(
          "WATI client not configured - video saved to DB but not sent",
        );
      }
    } catch (watiErr) {
      console.error("WATI error sending video:", watiErr);
      // Continue even if WhatsApp sending fails - message is saved in DB
    }

    res.json({
      ...messageResult.rows[0],
      videoUrl: videoUrl,
    });
  } catch (e) {
    console.error("Error sending video:", e);
    res.status(500).json({ error: "Server Error" });
  }
});

// Send welcome template message to a new user (for first contact)
app.post("/api/users/welcome", async (req, res) => {
  try {
    const { phoneNumber, templateName } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Default template name if not provided
    const template = templateName || "welcome_message";

    // Ensure user exists in database
    const user = await getUser(`whatsapp:${phoneNumber}`);

    // Send template message via WATI
    try {
      if (watiClient.isConfigured()) {
        const waId = toWaId(`whatsapp:${phoneNumber}`);
        const result = await watiClient.sendTemplateMessage(waId, template);

        // Log the welcome message in database
        await pool.query(
          "INSERT INTO messages (user_id, sender, body) VALUES ($1, $2, $3)",
          [user.id, "admin", `[Template: ${template}] Welcome message sent`],
        );

        res.json({
          success: true,
          message: "Welcome message sent",
          templateName: template,
          user: user,
        });
      } else {
        return res.status(500).json({ error: "WATI client not configured" });
      }
    } catch (watiErr) {
      console.error("WATI error sending welcome template:", watiErr);
      return res.status(500).json({
        error: "Failed to send welcome message",
        details: watiErr.message,
      });
    }
  } catch (e) {
    console.error("Error sending welcome message:", e);
    res.status(500).json({ error: "Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await initDB();
  console.log(`Backend server listening on port ${PORT}`);
});
