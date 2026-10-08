"use client";

export default function CategoryDocumentsCloseButton() {
  function handleClose(
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    const details =
      event.currentTarget.closest("details");

    if (details instanceof HTMLDetailsElement) {
      details.open = false;

      details.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }

  return (
    <button
      type="button"
      className="category-v2-documents-save"
      onClick={handleClose}
    >
      Salvar e fechar
    </button>
  );
}