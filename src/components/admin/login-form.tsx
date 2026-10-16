"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

const genericErrorMessage =
  "Giriş tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.";

export function LoginForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        setErrorMessage(
          result.error.status === 429
            ? "Çok fazla giriş denemesi yapıldı. Lütfen kısa bir süre sonra tekrar deneyin."
            : genericErrorMessage,
        );
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setErrorMessage(genericErrorMessage);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      aria-busy={isPending}
      className="login-form"
      onSubmit={handleSubmit}
    >
      <div className="form-field">
        <label htmlFor="email">E-posta</label>
        <input
          autoComplete="username"
          disabled={isPending}
          id="email"
          inputMode="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="form-field">
        <label htmlFor="password">Parola</label>
        <input
          autoComplete="current-password"
          disabled={isPending}
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button className="button button-primary" disabled={isPending} type="submit">
        {isPending ? "Giriş doğrulanıyor..." : "Giriş yap"}
      </button>
      <p className="field-note">
        Bu alan yalnızca yetkili yönetici hesabına açıktır. Public kayıt akışı
        bulunmamaktadır.
      </p>
    </form>
  );
}
