import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: {
      // 이미지 data URL 전송 시 여유 있게
      sizeLimit: "20mb",
    },
  },
};

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

function contentToText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text") return part?.text || "";
        // 혹시 다른 형태가 와도 안전하게 처리
        return part?.text || "";
      })
      .join("");
  }
  return "";
}

function isTruncatedFinishReason(reason) {
  const r = String(reason || "").toLowerCase();
  // 제공자별 표기 차이 방어
  return (
    r.includes("length") ||
    r.includes("max_tokens") ||
    r.includes("max_output_tokens")
  );
}

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

    // data URL 이미지들을 멀티모달 입력으로 전달
    const userContent = [
      { type: "text", text: "첨부한 이미지들을 순서대로 처리해 주세요." },
      ...images.map((img) => ({
        type: "image_url",
        image_url: { url: img },
      })),
    ];

    // 대화 컨텍스트 (끊기면 이어받기 위해 messages를 누적)
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ];

    let finalText = "";
    const finishReasons = [];
    const MAX_ROUNDS = 4; // 최초 + 최대 3회 이어쓰기

    for (let i = 0; i < MAX_ROUNDS; i++) {
      const response = await client.chat.completions.create({
        // env로 바꿔쓰기 쉽게 처리 (없으면 기본값)
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        temperature: 0,
        // OCR/추출 작업은 low가 보통 더 빠르고 충분히 안정적
        reasoning_effort: "low",
        messages,
      });

      const choice = response?.choices?.[0];
      const partText = contentToText(choice?.message?.content || "");
      const finishReason = choice?.finish_reason || "";

      finishReasons.push(String(finishReason));

      if (partText) {
        finalText += (finalText ? "\n" : "") + partText;
      }

      // 잘림이 아니면 종료
      if (!isTruncatedFinishReason(finishReason)) {
        break;
      }

      // 잘렸으면 "이어쓰기" 요청
      messages.push({ role: "assistant", content: partText || "" });
      messages.push({
        role: "user",
        content:
          "직전 출력의 마지막 줄 다음부터 이어서 계속 출력하세요. 이미 출력한 줄은 반복하지 말고, 최종 마무리 문구까지 완성하세요.",
      });
    }

    if (!finalText.trim()) {
      return res.status(502).json({
        error: "Empty model output",
        detail: "Model returned empty content",
      });
    }

    return res.status(200).json({
      result: finalText,
      text: finalText,
      finishReasons, // 디버깅용(필요 없으면 나중에 삭제)
    });
  } catch (err) {
    console.error("Gemini OCR error:", err);
    return res.status(500).json({
      error: "Gemini OCR failed",
      detail: err?.message || "Unknown error",
    });
  }
}
