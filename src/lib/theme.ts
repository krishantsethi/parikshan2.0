import { cookies } from "next/headers";
import { THEME_COOKIE_NAME } from "@/lib/cookies";
import type { Theme } from "@/types/domain";

export const THEME_COOKIE = THEME_COOKIE_NAME;

export async function getThemeFromCookie(): Promise<Theme> {
  const store = await cookies();
  const raw = store.get(THEME_COOKIE)?.value;
  return raw === "light" ? "light" : "dark";
}
