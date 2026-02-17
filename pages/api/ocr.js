import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Upstream timeout (${ms}ms)`)), ms)
    ),
  ]);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const SYSTEM_PROMPT = (process.env.OCR_SYSTEM_PROMPT || "").trim();

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }
  if (!SYSTEM_PROMPT) {
    return res.status(500).json({ error: "Missing OCR_SYSTEM_PROMPT" });
  }

  try {
    const { images } = req.body || {};

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    // 현재 UI 정책: 1장만
    if (images.length > 1) {
      return res.status(400).json({ error: "Only one image is allowed per request" });
    }

    const img = images[0];
    if (typeof img !== "string" || !img.startsWith("data:image/")) {
      return res.status(400).json({ error: "Invalid image data URL" });
    }

    const userContent = [
      { type: "text", text: "첨부한 이미지들을 순서대로 처리해 주세요." },
      {
        type: "image_url",
        image_url: { url: img },
      },
    ];

    const response = await withTimeout(
      client.chat.completions.create({
        model: "gemini-3-flash-preview",
        temperature: 0,
        max_tokens: 2500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
      70000
    );

    let output = response?.choices?.[0]?.message?.content ?? "";

    if (Array.isArray(output)) {
      output = output
        .map((part) => (typeof part === "string" ? part : part?.text || ""))
        .join("\n");
    }

    if (typeof output !== "string") {
      output = String(output ?? "");
    }

    output = output.trim();

    if (!output) {
      return res.status(502).json({
        error: "Empty model output",
        detail: "Model returned empty content",
      });
    }

    return res.status(200).json({
      result: output,
      text: output,
    });
  } catch (err) {
    console.error("Gemini OCR error:", err);
    return res.status(500).json({
      error: "Gemini OCR failed",
      detail: err?.message || "Unknown error",
    });
  }
}
