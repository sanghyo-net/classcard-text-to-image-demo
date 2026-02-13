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

    const images = [];
    for (const f of files) images.push(await toDataUrl(f));

    const resp = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });

    const data = await resp.json();
    if (!resp.ok) setResult(`ERROR: ${data?.error || "Unknown error"}`);
    else setResult(data.result || "");

    setLoading(false);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(result);
    alert("작업을 완료했습니다. 복사 후 필요한 곳에 붙여넣기하십시오.");
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: 28, maxWidth: 900 }}>
      <h2>이미지 → Excel 붙여넣기 형식 변환 (데모)</h2>
      <p style={{ lineHeight: 1.6 }}>
        이미지를 선택한 뒤 “변환하기”를 누르면 결과가 아래에 나타납니다.
        결과를 복사해서 Excel에 붙여넣으세요.
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
    </div>
  );
}
