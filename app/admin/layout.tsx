import { requireAdmin } from "@/lib/auth/session";
import { AdminTabs } from "./tabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AdminTabs />
      {children}
    </>
  );
}
