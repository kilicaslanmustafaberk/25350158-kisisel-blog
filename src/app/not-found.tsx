import { NotFoundContent } from "@/components/layout/not-found-content";
import { MinimalFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

// Unmatched URLs render only inside the root layout, so the chrome is added here.
export default function NotFound() {
  return <>
    <SiteHeader />
    <NotFoundContent />
    <MinimalFooter />
  </>;
}
