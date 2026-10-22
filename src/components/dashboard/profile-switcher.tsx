"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/misc";
import { useLocale } from "@/components/providers/locale-provider";
import type { HealthProfile } from "@/types/domain";
import { PREFERENCE_MAX_AGE_SECONDS, PROFILE_COOKIE, writeClientCookie } from "@/lib/cookies";

/**
 * Switches the active health profile. The cookie only stores a profile id —
 * the server validates ownership before using it, so tampering cannot grant
 * access to another account's profile.
 */
export function ProfileSwitcher({
  profiles,
  activeProfile,
}: {
  profiles: HealthProfile[];
  activeProfile: HealthProfile;
}) {
  const router = useRouter();
  const { t } = useLocale();

  function select(profileId: string) {
    if (profileId === activeProfile.id) return;
    writeClientCookie(PROFILE_COOKIE, profileId, PREFERENCE_MAX_AGE_SECONDS);
    router.refresh();
  }

  return (
    <Dropdown
      label="Switch health profile"
      trigger={({ toggle, triggerId }) => (
        <button
          id={triggerId}
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-panel/60 p-2.5 text-left transition-colors hover:border-line-strong"
        >
          <Avatar name={activeProfile.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{activeProfile.name}</span>
            <span className="block truncate text-[10px] uppercase tracking-wider text-faint">
              {t(`family.relation.${activeProfile.relation}` as "family.relation.self")}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-faint" aria-hidden />
        </button>
      )}
    >
      {({ close }) => (
        <>
          {profiles.map((profile) => (
            <DropdownItem
              key={profile.id}
              onClick={() => {
                select(profile.id);
                close();
              }}
            >
              <Avatar name={profile.name} size="sm" className="size-6 text-[10px]" />
              <span className="min-w-0 flex-1 truncate">{profile.name}</span>
              {profile.id === activeProfile.id && <Check className="size-3.5 text-accent" aria-hidden />}
            </DropdownItem>
          ))}
          <DropdownSeparator />
          <DropdownItem
            onClick={() => {
              close();
              router.push("/dashboard/family");
            }}
          >
            <Plus className="size-4" aria-hidden />
            Manage profiles
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}
