import { PageShell } from "@/components/layout";
import { getBills } from "@/lib/actions/bills";
import { getCategories } from "@/lib/actions/categories";
import { BillsContent } from "./bills-content";

export default async function BillsPage() {
  const [allBills, categories] = await Promise.all([
    getBills({ status: "all" }),
    getCategories(),
  ]);

  return (
    <PageShell>
      <BillsContent initialBills={allBills} categories={categories} />
    </PageShell>
  );
}