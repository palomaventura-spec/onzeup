export default function PageLoading({
  label = "Carregando...",
  light = false,
}: {
  label?: string;
  light?: boolean;
}) {
  return (
    <div
      className={`onzeup-page-loading${light ? " club-loading-light" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="onzeup-loading-mark">
        <span />
        <span />
        <span />
      </div>
      <strong>{label}</strong>
      <small>Aguarde um instante.</small>
    </div>
  );
}
