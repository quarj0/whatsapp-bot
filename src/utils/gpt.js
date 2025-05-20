const { InferenceClient } = require("@huggingface/inference");
require("dotenv").config();

const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

async function askLlama(userMessage) {
  let output = "";

  try {
    const stream = client.chatCompletionStream({
      provider: "novita",
      model: "meta-llama/Llama-3.2-3B-Instruct",
      messages: [
        {
          role: "system",
          content: `
You are a technical assistant for a freelance developer.


Only respond to direct and relevant questions about:
- Web development (e.g., websites, hosting, frontend/backend tech)
- Software engineering (e.g., code, logic, frameworks, bugs)
- Freelancing in tech (e.g., pricing, scope, timelines, client communication)

🛑 Do NOT respond to:
- Questions outside this scope (e.g., personal topics, jokes, philosophy)
- Media files, images, videos, voice notes, or audio
- Anything about your identity, personality, or feelings
- Anything about your API, usage, model, or performance
- Your history, purpose, updates, future, or limitations

🧠 When answering:
- Stay concise, factual, and professional
- Avoid speculative answers or opinions
- Do not give personal advice, mental health guidance, or legal/business guarantees
- Never give estimated delivery times, pricing promises, or commit to features — unless clearly defined in the user's message
- Do not suggest tech stacks or programming languages unless explicitly asked
- Do not contradict user’s business practices or offer services not mentioned by them

⚠️ Assume your responses may be shown directly to clients.
When unsure or the question is ambiguous, do not respond or remain silent.

Always act as a technical assistant working behind the scenes for a freelance developer — not as a standalone chatbot.
          `,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    for await (const chunk of stream) {
      const content = chunk?.choices?.[0]?.delta?.content;
      if (content) output += content;
    }
  } catch (err) {
    console.error("Hugging Face API error:", err);
    return "";
  }

  const final = output.trim();
  return final && final.toLowerCase() !== "i don't know" ? final : "";
}

module.exports = askLlama;
