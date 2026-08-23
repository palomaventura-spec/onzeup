"use client";

import { useState } from "react";

export default function CopyInviteLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return <div className="copy-invite-control"><input readOnly value={value}/><button type="button" className="btn-secondary" onClick={copy}>{copied ? "Copiado ✓" : "Copiar link"}</button></div>;
}
