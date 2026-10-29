/** Mention d'un document légal : le français, puis sa traduction pour un lecteur d'une autre langue. */
export function Bi({ fr, tr, lang, inline }: { fr: React.ReactNode; tr?: React.ReactNode | null; lang?: string; inline?: boolean }) {
  if (tr === undefined || tr === null || tr === fr) return <>{fr}</>;
  return (
    <>
      {fr}
      <span className={inline ? "bi inl" : "bi"} lang={lang}>
        {inline ? " / " : null}
        {tr}
      </span>
    </>
  );
}
