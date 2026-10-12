"use client";

export default function TrainingCommunicationShortcut({
  categoryId,
  categoryName,
  weekday,
  startTime,
  endTime,
  location,
  notes,
}: {
  categoryId: string;
  categoryName: string;
  weekday: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
}) {
  function handleClick() {
    const title = `Aviso de treino · ${categoryName}`;

    const body =
      `Olá! Passando para lembrar o treino da categoria ${categoryName}.` +
      `\n\n📅 ${weekday}` +
      `\n⏰ ${startTime} às ${endTime}` +
      `\n📍 ${location || "Local a definir"}` +
      (notes ? `\n📝 ${notes}` : "");

    window.dispatchEvent(
      new CustomEvent("11up:training-communication", {
        detail: {
          categoryId,
          title,
          body,
        },
      }),
    );
  }

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={handleClick}
    >
      Comunicado 11UP
    </button>
  );
}