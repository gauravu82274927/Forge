"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Code2, Zap } from "lucide-react";
import { ForgeWordmark } from "@/components/forge-logo";
import { NavbarUser } from "@/components/navbar-user";
import { SearchDialog } from "@/components/search-dialog";
import { NotificationsBell } from "@/components/notifications-bell";
import { MessagesLink } from "@/components/messages-link";
import { ThemeToggle } from "@/components/theme-toggle";
const links = [
  { href: "/teams", label: "Explore teams", icon: Code2 },
  { href: "/hackathons", label: "Hackathons", icon: Zap },
];
export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <ForgeWordmark />
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="forge-nav-link"
                aria-current={pathname.startsWith(href) ? "page" : undefined}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
            <MessagesLink variant="tab" />
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden sm:block">
            <SearchDialog />
          </div>
          <MessagesLink variant="icon" />
          <NotificationsBell />
          <ThemeToggle />
          <NavbarUser />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
            className="rounded-md p-2 hover:bg-secondary lg:hidden"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-border px-4 py-3 lg:hidden"
        >
          {[
            ...links,
            { href: "/dashboard", label: "Dashboard" },
            { href: "/profile", label: "Your profile" },
            { href: "/#how-it-works", label: "How it works" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="forge-nav-link"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
