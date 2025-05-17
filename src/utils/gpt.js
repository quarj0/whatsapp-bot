const { InferenceClient } = require("@huggingface/inference");
require("dotenv").config();

const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

async function askLlama(userMessage) {
  let output = "";

  const stream = client.chatCompletionStream({
    provider: "novita",
    model: "meta-llama/Llama-3.2-3B-Instruct",
    messages: [
        {
            role: "system",
            content:
              "You are a strict assistant for a freelance web developer. \
          Only answer concrete questions about web development, software engineering, or freelancing in tech. \
          If a question is outside that scope, respond with an empty string (i.e. do not output any text) or just keep quiet.",
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
    
  
  

  const final = output.trim();
  return final && final.toLowerCase() !== "i don't know" ? final : "";
  }

module.exports = askLlama;
