import Link from "next/link";

import { PrimaryNav } from "@/components/layout/primary-nav";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-container site-header-inner">
        <Link className="brand" href="/" aria-label="Berk ana sayfa">
          Berk<span className="brand-mark">.</span>
        </Link>
        <PrimaryNav />
      </div>
    </header>
  );
}
