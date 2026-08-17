export default function PageLoading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="onzeup-page-loading" role="status" aria-live="polite">
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
