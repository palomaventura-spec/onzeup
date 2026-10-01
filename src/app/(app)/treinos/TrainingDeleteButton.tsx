"use client";

import { useFormStatus } from "react-dom";
import { deleteTraining } from "./actions";

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn-danger btn-small"
      type="submit"
      disabled={pending}
    >
      {pending ? "Excluindo..." : "Excluir"}
    </button>
  );
}

export default function TrainingDeleteButton({
  trainingId,
}: {
  trainingId: string;
}) {
  return (
    <form
      className="inline-form"
      action={deleteTraining}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Excluir este treino?\n\nEsta ação não poderá ser desfeita.",
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={trainingId} />
      <DeleteSubmitButton />
    </form>
  );
}
