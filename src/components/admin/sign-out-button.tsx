"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      className="button button-secondary"
      disabled={isPending}
      onClick={handleSignOut}
      type="button"
    >
      {isPending ? "Oturum kapatılıyor..." : "Oturumu kapat"}
    </button>
  );
}
