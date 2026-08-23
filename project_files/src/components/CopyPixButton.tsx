"use client";

import { useState } from "react";

export default function CopyPixButton({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <button className="btn" type="button" onClick={copy}>{copied ? "PIX copiado ✓" : "Copiar PIX"}</button>;
}
