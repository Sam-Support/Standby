import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * Lecture des cartes de visite par Claude (vision + sortie structurée).
 * Sans ANTHROPIC_API_KEY, ou si la lecture échoue, la carte reste dans la file de saisie manuelle (admin).
 */

export const CardSchema = z.object({
  nom: z.string(),
  prenom: z.string(),
  societe: z.string(),
  fonction: z.string(),
  email: z.string(),
  telephone: z.string(),
  lisible: z.boolean(),
});
export type CardData = z.infer<typeof CardSchema>;

export function ocrEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const MEDIA: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

let client: Anthropic | undefined;

export async function readBusinessCard(image: Buffer, filename: string): Promise<CardData | null> {
  if (!ocrEnabled()) return null;
  const media = MEDIA[filename.split(".").pop()?.toLowerCase() ?? ""];
  if (!media) return null;
  client ??= new Anthropic();
  try {
    const response = await client.messages.parse({
      model: process.env.OCR_MODEL ?? "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(CardSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media, data: image.toString("base64") } },
            {
              type: "text",
              text:
                "Cette image est une carte de visite récupérée sur un stand de salon professionnel. " +
                "Recopie exactement les informations imprimées : nom de famille, prénom, société, fonction, e-mail, téléphone. " +
                "Laisse un champ vide s'il n'apparaît pas sur la carte, sans rien deviner. " +
                "Mets lisible à false si l'image n'est pas une carte de visite ou n'est pas lisible.",
            },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output?.lisible) return null;
    return response.parsed_output;
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error(`[ocr] erreur API ${e.status} : ${e.message}`);
    else console.error("[ocr] lecture impossible", e);
    return null;
  }
}
