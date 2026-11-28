"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Terminal } from "lucide-react";
const names: Record<string, string> = {
  teams: "Teams",
  hackathons: "Hackathons",
  dashboard: "Dashboard",
  messages: "Messages",
  profile: "Profile",
  u: "Builder profile",
  login: "Sign in",
  signup: "Create account",
  "forgot-password": "Recover account",
  "reset-password": "Reset password",
};
export function WorkspaceStrip() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  const segment = pathname.split("/")[1];
  return (
    <div className="border-b border-border bg-secondary/30">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 font-mono text-[11px] sm:px-6">
        <Terminal size={13} className="text-muted-foreground" />
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          forge
        </Link>
        <ChevronRight size={12} />
        <span>{names[segment] || segment}</span>
        <span className="ml-auto hidden text-muted-foreground sm:inline">
          Find your people. Ship together.
        </span>
      </div>
    </div>
  );
}
