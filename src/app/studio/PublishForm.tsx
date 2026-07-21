"use client";

import { FormEvent, useState } from "react";
import styles from "./studio.module.css";

export default function PublishForm({ privacyOptions }: { privacyOptions: string[] }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Send this video to the connected TikTok account now?")) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/tiktok/publish", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const responseText = await response.text();
      let payload: { error?: string; message?: string; publishId?: string } = {};
      try {
        payload = responseText ? JSON.parse(responseText) as typeof payload : {};
      } catch {
        payload = {};
      }
      setResult({
        ok: response.ok,
        message: response.ok
          ? `${payload.message || "TikTok accepted the upload."}${payload.publishId ? ` Reference: ${payload.publishId}` : " Check TikTok notifications for processing status."}`
          : payload.error || `Upload returned HTTP ${response.status}. Check TikTok notifications before retrying.`,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "network connection closed";
      setResult({
        ok: false,
        message: `The response was interrupted (${detail}). Check TikTok notifications before retrying to avoid a duplicate.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.publishForm} onSubmit={submit}>
      <label>
        <span>Video file</span>
        <input name="video" type="file" accept="video/mp4,video/quicktime" required />
        <small>MP4 or MOV, up to 50 MB for this review demo.</small>
      </label>
      <label>
        <span>Caption</span>
        <textarea name="caption" maxLength={2200} placeholder="Write the caption shown on TikTok" required />
      </label>
      <div className={styles.formRow}>
        <label>
          <span>Destination</span>
          <select name="mode" defaultValue="draft">
            <option value="draft">TikTok draft</option>
            <option value="publish">Publish directly</option>
          </select>
        </label>
        <label>
          <span>Privacy</span>
          <select name="privacy" defaultValue="SELF_ONLY">
            {(privacyOptions.length ? privacyOptions : ["SELF_ONLY"]).map((value) => (
              <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.confirmation}>
        Nothing is posted automatically. The final button always asks for confirmation.
      </div>
      <button className={styles.publishButton} disabled={busy} type="submit">
        {busy ? "Sending to TikTok…" : "Review and send"}
      </button>
      {result && <p className={result.ok ? styles.success : styles.error} role="status">{result.message}</p>}
    </form>
  );
}
