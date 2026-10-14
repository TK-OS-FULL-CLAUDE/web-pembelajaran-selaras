"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Spinner } from "./ui";
import { useToast } from "./toast";

export function DemoLoginButton({
  size = "lg",
  variant = "primary",
  label = "Masuk sebagai guru demo",
}: {
  size?: "md" | "lg";
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size={size}
      variant={variant}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/auth/demo", { method: "POST" });
          router.push("/guru");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
          setBusy(false);
        }
      }}
    >
      {busy && <Spinner />}
      {label}
    </Button>
  );
}
