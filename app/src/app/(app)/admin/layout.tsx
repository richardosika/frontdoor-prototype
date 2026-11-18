import { AdminSidebar } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
      <AdminSidebar />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
