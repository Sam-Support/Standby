import { getDb } from "@/db";
import { getCurrentCompany } from "@/lib/auth/session";
import { exportLeadsXlsx } from "@/lib/services/leads";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCurrentCompany();
  if (!company) return new Response("Non autorisé", { status: 401 });
  try {
    const { data, filename } = await exportLeadsXlsx(await getDb(), id, company.id);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
