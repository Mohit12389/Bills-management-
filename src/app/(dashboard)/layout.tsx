import { Sidebar, MobileNav, MobileHeader } from "@/components/layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <div className="md:pl-64">
        <MobileHeader />
        {children}
      </div>
      <MobileNav />
    </div>
  );
}