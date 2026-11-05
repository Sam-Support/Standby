import { textOn } from "@/lib/logo";

/**
 * Visuel d'un salon : son logo s'il est autorisé et aux bonnes dimensions (lib/logo.ts), sinon son nom écrit
 * sur la couleur de l'événement. Le nom figurant déjà à côté, ce repli est masqué aux lecteurs d'écran.
 */
export function EventArt({ logoUrl, name, color, height, ratio }: { logoUrl: string | null; name: string; color: string; height?: number; ratio?: string }) {
  if (logoUrl) {
    return (
      <div className="eart logo" style={{ height, aspectRatio: ratio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={name} />
      </div>
    );
  }
  return (
    <div className="eart name clay s" style={{ ["--c" as string]: color, color: textOn(color), height, aspectRatio: ratio }} aria-hidden="true">
      <span className={name.length > 30 ? "long" : undefined}>{name}</span>
    </div>
  );
}
