import React from "react";

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="page-container pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      {children}
    </main>
  );
}
