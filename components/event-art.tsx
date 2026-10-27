/** Illustration « stand » du design ; affiche le logo du salon s'il est autorisé. */
export function EventArt({ logoUrl, name, height, ratio }: { logoUrl: string | null; name: string; height?: number; ratio?: string }) {
  return (
    <div className={ratio ? "sunk stand" : "stand"} style={{ height, aspectRatio: ratio, borderRadius: ratio ? 16 : 20 }} aria-hidden={logoUrl ? undefined : true}>
      <div className="floor" style={{ height: ratio ? 22 : 24 }}></div>
      <span className="clay s bx" style={{ ["--c" as string]: "#B39BFF", left: "8%", bottom: ratio ? 22 : 24, width: "22%", height: "38%" }}></span>
      <span className="clay s bx" style={{ ["--c" as string]: "#FFCD4A", left: "36%", bottom: ratio ? 22 : 24, width: "24%", height: "52%" }}></span>
      <span className="clay s bx" style={{ ["--c" as string]: "#82C9FF", left: "65%", bottom: ratio ? 22 : 24, width: "20%", height: "33%" }}></span>
      {!ratio && <span className="clay s bx" style={{ ["--c" as string]: "#FCFBF9", left: "88%", bottom: 24, width: "9%", height: "44%" }}></span>}
      {logoUrl && (
        <div className="logo-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={`Logo ${name}`} />
        </div>
      )}
    </div>
  );
}
