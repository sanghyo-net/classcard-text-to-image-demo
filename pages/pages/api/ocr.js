import OpenAI from "openai";

const PROMPT_ID = "pmpt_698bced063648190962730f698052da4037477181c4ba725";
const PROMPT_VERSION = "20";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { images } = req.body || {};

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const content = images.map((img) => ({
      type: "input_image",
      image_url: img
    }));

    const response = await client.responses.create({
      model: "gpt-5-mini",
      reasoning: { effort: "high" },
      prompt: {
        id: PROMPT_ID,
        version: PROMPT_VERSION
      },
      input: [
        {
          role: "user",
          content
        }
      ]
    });

    return res.status(200).json({
      result: response.output_text || ""
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "Server error"
    });
  }
}
