"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface CategoryPieChartProps<T extends { name: string; color: string }> {
  data: T[];
  dataKey: keyof T & string;
  innerRadius: number;
  outerRadius: number;
}

export default function CategoryPieChart<T extends { name: string; color: string }>({
  data,
  dataKey,
  innerRadius,
  outerRadius,
}: CategoryPieChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          strokeWidth={2}
          stroke="hsl(var(--background))"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
