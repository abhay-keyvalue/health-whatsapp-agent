const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.GROK_API_KEY || 'dummy_key',
  baseURL: "https://api.groq.com/openai/v1", 
});

async function generateResponse(promptContext, userMessage) {
  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are a warm, knowledgeable health companion EA. Provide concise, caring responses to health queries. You do not issue official medical diagnoses but assist with compliance, general insights, and emotional support." },
        { role: "user", content: `Context: ${promptContext}. Message: ${userMessage}` }
      ]
    });
    return response.choices[0].message.content;
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
