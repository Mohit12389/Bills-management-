import { PageShell } from "@/components/layout";
import { getCategoryById } from "@/lib/actions/categories";
import { notFound } from "next/navigation";
import { CategoryDetailContent } from "./category-detail-content";

export default async function CategoryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const category = await getCategoryById(params.id);

  if (!category) {
    notFound();
  }

  return (
    <PageShell>
      <CategoryDetailContent category={category} />
    </PageShell>
  );
}
