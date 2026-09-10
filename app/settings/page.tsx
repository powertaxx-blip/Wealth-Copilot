import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import { DataControls } from "@/components/features/DataControls";
import { OrgTypeToggle } from "@/components/features/OrgTypeToggle";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card title="Settings" lede="New in the React rebuild — the old prototype had no dedicated settings screen.">
        <ThemeToggle />
      </Card>
      <Card
        title="Nonprofit Mode"
        lede="A 501(c)(3) runs on different rules than a for-profit business — this is where that gets set once for the whole app."
      >
        <OrgTypeToggle />
      </Card>
      <Card title="Your Data" lede="Everything here lives only in this browser, on this device — no account, nothing sent anywhere.">
        <DataControls />
      </Card>
    </div>
  );
}
