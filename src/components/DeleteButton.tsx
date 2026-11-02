"use client";

import { deleteNote } from "@/app/actions";

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteNote}
      onSubmit={(e) => {
        if (!confirm("Delete this note for good?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-red-600 hover:underline">
        Delete
      </button>
    </form>
  );
}
