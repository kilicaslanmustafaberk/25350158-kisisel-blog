import Link from "next/link";

export function NotFoundContent() {
  return <main id="main-content" className="site-container public-page-heading not-found">
    <p className="eyebrow">404</p>
    <h1>Sayfa bulunamadı</h1>
    <p>Aradığınız sayfa taşınmış, yayından kaldırılmış veya hiç var olmamış olabilir.</p>
    <div className="hero-actions"><Link className="button button-primary" href="/">Ana sayfa</Link><Link className="button button-secondary" href="/projects">Projeler</Link></div>
  </main>;
}
