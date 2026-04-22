const OpenAI = require('openai');
const { pool } = require('./db');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.GROK_API_KEY || 'dummy_key',
  baseURL: "https://api.groq.com/openai/v1", 
});

async function getConversationHistory(userId, limit = 30) {
  try {
    const result = await pool.query(
      `SELECT sender, body, created_at 
       FROM messages 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows.reverse();
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    return [];
  }
}

async function generateResponse(userId, userMessage, promptContext = '') {
  try {
    const conversationHistory = await getConversationHistory(userId);
    
    const messages = [
      { 
        role: "system", 
        content: `You are an experienced, empathetic physician providing healthcare support through WhatsApp. You have medical knowledge and clinical experience to:

- Assess symptoms and provide medical guidance
- Review patient history and identify patterns in their health concerns
- Offer evidence-based health recommendations
- Provide medication information and side effect management
- Recognize medical emergencies and escalate when necessary
- Maintain professional medical ethics and patient confidentiality

Important guidelines:
- Always review the patient's conversation history to provide contextual, personalized care
- Be warm, compassionate, and professional in your communication
- Provide clear, actionable medical advice when appropriate
- When uncertain or dealing with complex cases, acknowledge limitations and recommend in-person consultation
- Never issue definitive diagnoses remotely, but offer clinical insights based on symptoms
- Prioritize patient safety above all else
- Ask relevant follow-up questions to better understand the patient's condition

${promptContext ? `Additional context: ${promptContext}` : ''}`
      }
    ];

    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.body
      });
    });

    messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      messages: messages
    });
    
    const reply = response.choices[0].message.content;
    return reply;
  } catch (error) {
    console.error("Grok LLM error:", error);
    return "I am experiencing some technical difficulties right now. Can I get back to you shortly?";
  }
}

async function classifyIntent(userMessage) {
   // This can also use the LLM to classify if it's an emergency, general query, or active flow response
   try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Classify the following user message intent into one of these exact categories: EMERGENCY, QUESTION, SIDE_EFFECT_REPORT, ACTIVE_FLOW_RESPONSE. Return ONLY the category name." },
        { role: "user", content: userMessage }
      ]
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Classification error:", error);
    return "QUESTION";
  }
}

module.exports = { generateResponse, classifyIntent };
