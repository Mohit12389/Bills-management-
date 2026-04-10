import { PageShell } from "@/components/layout";
import { getCategoriesWithStats } from "@/lib/actions/categories";
import { CategoriesContent } from "./categories-content";

export default async function CategoriesPage() {
  const categories = await getCategoriesWithStats();

  return (
    <PageShell>
      <CategoriesContent initialCategories={categories} />
    </PageShell>
  );
}
