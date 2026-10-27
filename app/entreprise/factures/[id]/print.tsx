"use client";

export function PrintButton() {
  return (
    <button className="clay s btn sm" onClick={() => window.print()}>
      Imprimer ou enregistrer en PDF
    </button>
  );
}
