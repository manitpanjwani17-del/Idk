"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export function AdminActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: "restore" | "delete") {
    if (action === "delete" && !window.confirm("Delete this test and all its data?")) return;
    setBusy(true);
    await api(`/api/admin/tests/${id}`, { body: { action } });
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="flex shrink-0 gap-2">
      <button type="button" className="btn btn-sm btn-lime" disabled={busy} onClick={() => act("restore")}>
        Restore
      </button>
      <button type="button" className="btn btn-sm btn-tomato" disabled={busy} onClick={() => act("delete")}>
        Delete
      </button>
    </div>
  );
}
