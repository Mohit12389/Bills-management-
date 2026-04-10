import { PageShell } from "@/components/layout";
import { getCategories } from "@/lib/actions/categories";
import { getAllVendors } from "@/lib/actions/vendors";
import { NewBillForm } from "./new-bill-form";

export default async function NewBillPage() {
  const [categories, vendors] = await Promise.all([
    getCategories(),
    getAllVendors(),
  ]);

  return (
    <PageShell>
      <NewBillForm categories={categories} vendors={vendors} />
    </PageShell>
  );
}
