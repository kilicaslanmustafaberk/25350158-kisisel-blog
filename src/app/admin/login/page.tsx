import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Yönetim Girişi",
  description: "Portfolyo içerik yönetimi için güvenli giriş alanı.",
};

export default function AdminLoginPage() {
  return (
    <main className="site-container login-shell" id="main-content">
      <section className="login-panel" aria-labelledby="login-title">
        <header className="login-panel-header">
          <p className="eyebrow">Kısıtlı alan</p>
          <h1 id="login-title">Yönetim girişi</h1>
          <p>
            İçerik yönetimi yalnızca yetkili admin hesabıyla kullanılabilir.
          </p>
        </header>
        <LoginForm />
      </section>
    </main>
  );
}
