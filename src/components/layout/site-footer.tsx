/**
 * Public footer (Phase 13): a quiet closing line only. Navigation lives in the
 * header, social/e-mail/phone/CV links in Contact — nothing is repeated here.
 */
export function SiteFooter({ name }: { name: string }) {
  return (
    <footer className="site-footer">
      <div className="site-container site-footer-inner site-footer-closing">
        <span className="footer-name">{name}<span className="brand-mark">.</span></span>
        <small>© {new Date().getFullYear()}</small>
      </div>
    </footer>
  );
}

/** Unchanged Phase 0–6 footer, still used by admin and the global 404 page. */
export function MinimalFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container site-footer-inner">
        <span>Bağımsız kişisel portfolyo</span>
      </div>
    </footer>
  );
}
