import dynamic from "next/dynamic";
import { createElement } from "react";

// recharts is the heaviest dependency — load it lazily so pages render before the charts arrive
const chartPlaceholder = () =>
  createElement("div", { className: "h-full w-full animate-pulse rounded-lg bg-muted" });

export const CategoryPieChart = dynamic(() => import("./category-pie-chart"), {
  ssr: false,
  loading: chartPlaceholder,
}) as typeof import("./category-pie-chart").default;

export const MonthlyBarChart = dynamic(() => import("./monthly-bar-chart"), {
  ssr: false,
  loading: chartPlaceholder,
});
