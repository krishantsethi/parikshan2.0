import {
  Activity,
  BrainCircuit,
  FileText,
  History,
  LayoutDashboard,
  MessageSquareHeart,
  Pill,
  Settings,
  ShieldCheck,
  ShieldPlus,
  UploadCloud,
  Users,
} from "lucide-react";
import type { MessageKey } from "@/i18n";

export interface DashboardNavItem {
  href: string;
  key: MessageKey;
  icon: typeof LayoutDashboard;
  badge?: string;
}

export interface DashboardNavGroup {
  label: string;
  items: DashboardNavItem[];
}

export const DASHBOARD_NAV: DashboardNavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Records",
    items: [
      { href: "/dashboard/documents", key: "nav.documents", icon: FileText },
      { href: "/dashboard/documents/upload", key: "nav.upload", icon: UploadCloud },
      { href: "/dashboard/health-trends", key: "nav.healthTrends", icon: Activity },
    ],
  },
  {
    label: "Care",
    items: [
      { href: "/dashboard/medications", key: "nav.medications", icon: Pill },
      { href: "/dashboard/interactions", key: "nav.interactions", icon: ShieldPlus },
      { href: "/dashboard/assistant", key: "nav.assistant", icon: BrainCircuit },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/dashboard/family", key: "nav.family", icon: Users },
      { href: "/dashboard/history", key: "nav.history", icon: History },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/settings", key: "nav.settings", icon: Settings },
      { href: "/dashboard/privacy", key: "nav.privacy", icon: ShieldCheck },
      { href: "/dashboard/feedback", key: "nav.feedback", icon: MessageSquareHeart },
    ],
  },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
