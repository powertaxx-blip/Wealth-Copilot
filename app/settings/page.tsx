import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import { DataControls } from "@/components/features/DataControls";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card title="Settings" lede="New in the React rebuild — the old prototype had no dedicated settings screen.">
        <ThemeToggle />
      </Card>
      <Card title="Your Data" lede="Everything here lives only in this browser, on this device — no account, nothing sent anywhere.">
        <DataControls />
      </Card>
    </div>
  );
}
