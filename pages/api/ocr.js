import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  const SYSTEM_PROMPT = process.env.OCR_SYSTEM_PROMPT;
  if (!SYSTEM_PROMPT) {
    return res.status(500).json({ error: "Missing OCR_SYSTEM_PROMPT" });
  }

  try {
    const { images } = req.body || {};

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    // 프론트에서 넘어온 data URL(base64)들을 그대로 이미지 입력으로 전달
    const userContent = [
      { type: "text", text: "첨부한 이미지들을 순서대로 처리해 주세요." },
      ...images.map((img) => ({
        type: "image_url",
        image_url: { url: img },
      })),
    ];

    const response = await client.chat.completions.create({
      model: "gemini-3-flash-preview",
      reasoning_effort: "high",
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    let output = response?.choices?.[0]?.message?.content ?? "";
    if (Array.isArray(output)) {
      output = output
        .map((part) => (typeof part === "string" ? part : part?.text || ""))
        .join("\n");
    }

    return res.status(200).json({ text: output });
  } catch (err) {
    console.error("Gemini OCR error:", err);
    return res.status(500).json({
      error: "Gemini OCR failed",
      detail: err?.message || "Unknown error",
    });
  }
}
