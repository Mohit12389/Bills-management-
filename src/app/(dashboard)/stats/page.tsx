import { PageShell } from "@/components/layout";
import { getStatsData } from "@/lib/actions/stats";
import { StatsContent } from "./stats-content";

export default async function StatsPage() {
  const stats = await getStatsData({});

  return (
    <PageShell>
      <StatsContent stats={stats} />
    </PageShell>
  );
}