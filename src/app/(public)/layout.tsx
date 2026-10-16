import { CommandCenterProvider } from "@/components/command/command-center";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicShellData } from "@/server/public/shell";

// Public shell (Phase 7): header, footer and the lazily loaded command palette /
// terminal. Admin routes use src/app/admin/layout.tsx and never mount these.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const shell = await getPublicShellData();
  return <CommandCenterProvider data={shell.command}>
    <SiteHeader />
    {children}
    <SiteFooter {...shell.footer} />
  </CommandCenterProvider>;
}
