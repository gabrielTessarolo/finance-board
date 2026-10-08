import { TelegramSettings } from '@/components/telegram-settings';
import { PageHeader } from '@/components/ui';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" />
      <div className="space-y-6">
        <TelegramSettings />
      </div>
    </>
  );
}
