"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { useCommandCenter } from "@/components/command/command-context";
import { TerminalTrigger } from "@/components/command/terminal-trigger";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/ui/icons";
import { primaryNavigation } from "@/lib/site-config";

function isActive(pathname: string, href: string) {
  if (href.includes("#")) return false; // landing anchors: no scroll spy, route state only
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const subscribeNoop = () => () => {};
const isApplePlatform = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function PrimaryNav() {
  const pathname = usePathname();
  const commandCenter = useCommandCenter();
  const apple = useSyncExternalStore(subscribeNoop, isApplePlatform, () => false);
  // The menu is tied to the path it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === pathname;

  return <div
    className="nav-cluster"
    onKeyDown={(event) => {
      if (event.key === "Escape" && menuOpen) { setOpenOn(null); document.getElementById("primary-menu-toggle")?.focus(); }
    }}
  >
    {/* DOM order = keyboard order: toggle → links → search. */}
    <button
      type="button"
      id="primary-menu-toggle"
      className="menu-toggle"
      aria-expanded={menuOpen}
      aria-controls="primary-navigation"
      onClick={() => setOpenOn(menuOpen ? null : pathname)}
    >
      {menuOpen ? <CloseIcon /> : <MenuIcon />}
      <span>{menuOpen ? "Kapat" : "Menü"}</span>
    </button>
    <nav id="primary-navigation" className="primary-nav" data-open={menuOpen} aria-label="Ana navigasyon">
      {primaryNavigation.map((item) => {
        // API-backed destinations (the CV PDF) are plain anchors: no client routing or prefetch.
        if (item.newTab) return <a key={item.href} href={item.href} target="_blank" rel="noopener" onClick={() => setOpenOn(null)}>{item.label}<span className="sr-only"> (PDF, yeni sekmede açılır)</span></a>;
        const active = isActive(pathname, item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setOpenOn(null)}>{item.label}</Link>;
      })}
    </nav>
    {commandCenter && <button type="button" className="command-trigger" aria-label="Komut paletini aç" onClick={() => commandCenter.open("palette")} aria-keyshortcuts={apple ? "Meta+K" : "Control+K"}>
      <SearchIcon />
      <span className="command-trigger-label">Ara</span>
      <kbd aria-hidden="true">{apple ? "⌘K" : "Ctrl K"}</kbd>
    </button>}
    {commandCenter && <TerminalTrigger />}
  </div>;
}
