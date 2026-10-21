"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LogOut, Save, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";

export function AccountForm({ initialName, initialEmail }: { initialName: string; initialEmail: string }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/settings/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({ title: t("settings.saved"), variant: "success" });
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("state.error.title"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {error && <Alert tone="danger" title="Could not save">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("common.name")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          required
        />
        <Input
          label={t("common.email")}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
          required
        />
      </div>
      <Button type="submit" size="sm" loading={saving} icon={<Save className="size-3.5" />}>
        {t("common.save")}
      </Button>
    </form>
  );
}

export function DataControls() {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function deleteAccount() {
    if (confirmation !== "DELETE") {
      setError('Type DELETE exactly to confirm.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("state.error.title"));
      toast({ title: "Account deleted", variant: "success" });
      router.push("/");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("state.error.title"));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel/40 p-4">
        <div>
          <p className="text-sm font-medium text-ink">{t("settings.exportData")}</p>
          <p className="mt-0.5 max-w-md text-xs leading-relaxed text-muted">{t("settings.exportHint")}</p>
        </div>
        <a
          href="/api/settings/export"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs text-ink transition-colors hover:border-line-strong"
        >
          <Download className="size-3.5" aria-hidden />
          {t("common.export")}
        </a>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel/40 p-4">
        <div>
          <p className="text-sm font-medium text-ink">{t("nav.logout")}</p>
          <p className="mt-0.5 text-xs text-muted">End this session on this device.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={logout} icon={<LogOut className="size-3.5" />}>
          {t("nav.logout")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-dim/40 p-4">
        <div>
          <p className="text-sm font-medium text-danger">{t("settings.deleteAccount")}</p>
          <p className="mt-0.5 max-w-md text-xs leading-relaxed text-muted">
            {t("settings.deleteAccountHint")}
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)} icon={<Trash2 className="size-3.5" />}>
          {t("common.delete")}
        </Button>
      </div>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setConfirmation("");
          setError(null);
        }}
        title={t("settings.deleteAccount")}
        description="This removes your account and every associated record. It cannot be undone."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteOpen(false);
                setConfirmation("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={deleteAccount} loading={busy} disabled={confirmation !== "DELETE"}>
              {t("settings.deleteAccount")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {error && <Alert tone="danger" title="Not deleted">{error}</Alert>}
          <p className="text-sm text-muted">
            Documents, extracted text, measurements, medications, conversations, and audit events are
            all removed. Export your data first if you want a copy.
          </p>
          <Input
            label='Type "DELETE" to confirm'
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
        </div>
      </Dialog>
    </div>
  );
}
