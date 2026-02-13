import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No image provided" });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.responses.create({
    model: "gpt-5-mini",
    reasoning: { effort: "high" },
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "사용자가 사진만 첨부해도 바로 작업을 시작하세요. 첨부한 사진들에서 글자를 인식해서 Microsoft Excel에 쉽게 붙여넣을 수 있는 형식으로 만들어 주세요. 영어, 한국어 뜻, 예문 이렇게 세 개를 인식하여 셀이 나눠지게 표시해야 합니다. 예문에서 영어와 같은 부분은 {}로 묶어 주십시오."
          },
          {
            type: "input_image",
            image_url: image
          }
        ]
      }
    ]
  });

  return res.status(200).json({ result: response.output_text });
}
