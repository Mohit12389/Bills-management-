import { PageShell } from "@/components/layout";
import { UserProfile } from "@clerk/nextjs";

export default function SettingsPage() {
  return (
    <PageShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">Manage your account</p>
        </div>
      </div>
      <div className="flex justify-center">
        <UserProfile routing="hash" />
      </div>
    </PageShell>
  );
}