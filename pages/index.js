import { useState } from "react";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const toDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  async function onRun() {
    if (!files.length) {
      alert("이미지를 1장 이상 선택하세요.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const images = [];
      for (const f of files) images.push(await toDataUrl(f));

      const resp = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setResult(`ERROR: ${data?.error || "Unknown error"}`);
      } else {
        setResult(data.result || "");
      }
    } catch (e) {
      setResult(`ERROR: ${e?.message || "요청 중 오류가 발생했습니다."}`);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    alert("작업을 완료했습니다. 복사 후 필요한 곳에 붙여넣기하십시오.");
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: 28, maxWidth: 980 }}>
      <h2>클래스카드용 Image-to-Text 단어장 생성 AI</h2>

      <p style={{ lineHeight: 1.7, marginBottom: 8 }}>
        스캔 처리된 단어장 사진을 촬영해 첨부해주세요. VFlat Scan 같은 앱을 통해 반드시 스캔 처리되어있어야 합니다.{" "}
        <a
          href="https://drive.google.com/drive/folders/1VfdPG5qvjOapJ5BrwhnvVEdXjZxg113h?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
        >
          촬영 예시 보기
        </a>
      </p>

      <p style={{ lineHeight: 1.7 }}>
        이미지를 선택한 뒤 “변환하기”를 누르면 결과가 아래에 나타납니다. 결과를 복사해서 클래스카드 -&gt; 세트 만들기 -&gt; 단어 세트 -&gt; 자료 가져오기 -&gt; 엑셀, 한글 등 표 붙여넣기에 붙여넣으세요.
      </p>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={onRun} disabled={loading}>
          {loading ? "처리 중..." : "변환하기"}
        </button>
        <button
          onClick={copyToClipboard}
          disabled={!result || loading}
          style={{ marginLeft: 10 }}
        >
          결과 복사
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>결과</div>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#f5f5f5",
            padding: 16,
            borderRadius: 10,
            minHeight: 220,
          }}
        >
{result ? `\`\`\`\n${result}\n\`\`\`` : "여기에 결과가 표시됩니다."}
        </pre>
      </div>

      <p style={{ marginTop: 16, lineHeight: 1.7 }}>
        체험해보실 수 있도록 하기 위해 임시로 제작되었습니다. 클래스카드 서비스에 통합해 실제 사용을 진행하시려면{" "}
        <a href="mailto:sanghyokorea@gmail.com">sanghyokorea@gmail.com</a>
        로 연락 부탁드립니다.
      </p>
    </div>
  );
}
