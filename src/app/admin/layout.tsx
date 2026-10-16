import { MinimalFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

// Keeps the Phase 0–6 admin chrome (shared header + minimal footer) after the
// header/footer moved out of the root layout. No command palette, terminal or
// GitHub code is imported here.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>
    <SiteHeader />
    {children}
    <MinimalFooter />
  </>;
}
