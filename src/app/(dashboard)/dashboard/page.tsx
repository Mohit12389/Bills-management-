import { PageShell } from "@/components/layout";
import { getDashboardStats } from "@/lib/actions/stats";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <PageShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            Overview of your sweet shop bills & payments
          </p>
        </div>
      </div>
      <DashboardContent stats={stats} />
    </PageShell>
  );
}
