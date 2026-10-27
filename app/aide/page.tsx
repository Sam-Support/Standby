import Link from "next/link";
import { FAQ } from "@/lib/content/legal";
import { FaqSearch } from "./search";

export const metadata = { title: "Centre d’aide" };

export default function Page() {
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">Aide</span>
          <h1>Centre d’aide</h1>
          <p>
            Les réponses aux questions les plus fréquentes. Vous ne trouvez pas ? <Link href="/contact">Écrivez-nous</Link>.
          </p>
        </div>
      </div>
      <FaqSearch faq={FAQ} />
    </>
  );
}
