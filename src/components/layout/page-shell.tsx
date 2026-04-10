import React from "react";

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="page-container pb-24 md:pb-6">
      {children}
    </main>
  );
}
