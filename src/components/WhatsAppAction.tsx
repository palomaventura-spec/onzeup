"use client";

export default function WhatsAppAction({
  phone,
  message,
  label = "Abrir WhatsApp",
}: {
  phone?: string | null;
  message: string;
  label?: string;
}) {
  const number = String(phone || "").replace(/\D/g, "");

  async function copy() {
    await navigator.clipboard.writeText(message);
    alert("Mensagem copiada.");
  }

  return (
    <div className="actions">
      {number ? (
        <a
          className="btn btn-small"
          target="_blank"
          href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
        >
          {label}
        </a>
      ) : null}
      <button type="button" className="btn-secondary btn-small" onClick={copy}>
        Copiar mensagem
      </button>
    </div>
  );
}
