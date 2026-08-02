"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import styles from "./template-import.module.css";

const initialTheme = JSON.stringify({ palette: { accent: "#FF595E" }, copy: { hook: "TỪ MỚI MỖI NGÀY:" } }, null, 2);

export default function TemplateImportForm() {
  const [id, setId] = useState("vocabulary-dark-reference-v2");
  const [theme, setTheme] = useState(initialTheme);
  const [message, setMessage] = useState("");
  function loadFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; file.text().then(setTheme).catch(() => setMessage("Không thể đọc file JSON.")); }
  async function lifecycle(action: "validate" | "preview" | "activate") {
    const response = await fetch(`/api/templates/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? (action === "activate" ? `Đã kích hoạt ${id}.` : action === "preview" ? `Preview đã qua ${payload.preview?.fixtures?.length ?? 0} fixtures.` : `Đã validate ${id}.`) : payload.message || payload.error || "Cập nhật template thất bại.");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    let parsed: unknown; try { parsed = JSON.parse(theme); } catch { setMessage("JSON không hợp lệ."); return; }
    const response = await fetch("/api/templates/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, theme: parsed }) });
    const payload = await response.json().catch(() => ({})); setMessage(response.ok ? `Đã import ${payload.id}. Template chưa hoạt động; hãy validate, preview rồi activate.` : payload.error || "Import thất bại.");
  }
  return <form className={styles.form} onSubmit={submit}>
    <label>Version ID<input value={id} onChange={(event) => setId(event.target.value)} pattern="[a-z0-9]+(-[a-z0-9]+)*-v[1-9][0-9]*" required /></label>
    <label>Theme JSON<input type="file" accept="application/json,.json" onChange={loadFile} /></label>
    <label>Review theme<textarea value={theme} onChange={(event) => setTheme(event.target.value)} rows={12} spellCheck={false} required /></label>
    <p className={styles.note}>Ảnh mẫu cần được chuyển thành JSON theme sau khi duyệt; uploader chỉ nhận JSON để không suy đoán nội dung hoặc thay đổi asset ngoài ý muốn.</p>
    <button type="submit">Import template</button>
    <div><button type="button" onClick={() => lifecycle("validate")}>Validate</button><button type="button" onClick={() => lifecycle("preview")}>Preview fixtures</button><button type="button" onClick={() => lifecycle("activate")}>Activate</button></div>
    <p className={styles.note}>Import không kích hoạt template. Activation chỉ mở sau khi validation và toàn bộ preview fixtures thành công.</p>{message && <p role="status">{message}</p>}
  </form>;
}
