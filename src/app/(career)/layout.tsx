import { CommandCenterProvider } from "@/components/command/command-center";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicShellData } from "@/server/public/shell";

// CV privacy includes the surrounding shell and its RSC payload.
export default async function CareerLayout({ children }: { children: React.ReactNode }) {
  const shell = await getPublicShellData(true);
  return <CommandCenterProvider data={shell.command}>
    <SiteHeader />{children}<SiteFooter {...shell.footer} />
  </CommandCenterProvider>;
}
