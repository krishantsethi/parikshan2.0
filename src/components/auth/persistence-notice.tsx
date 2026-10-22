import { getConfig } from "@/lib/env";
import { getServerTranslator } from "@/i18n/server";
import { Alert } from "@/components/ui/alert";

/**
 * Rendered on the auth screens when this deployment has no database.
 *
 * Without shared storage, a real account's session row lives in one serverless
 * instance's memory: the next request can land on a different instance and
 * bounce back to /login. The demo workspace is unaffected (its session is a
 * signed stateless token), so the notice says exactly that instead of letting
 * a visitor conclude the buttons are broken.
 */
export async function PersistenceNotice() {
  const cfg = getConfig();
  if (cfg.databaseUrl) return null;

  const t = await getServerTranslator();
  return (
    <Alert tone="warning" title={t("auth.persistence.title")} className="mb-4">
      {t("auth.persistence.body")}
    </Alert>
  );
}
