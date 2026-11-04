import { ownedTest } from "@/lib/server/guard";
import { getStats } from "@/lib/server/repo";
import { formatMoney } from "@/lib/money";
import { sourceLabel } from "@/lib/sources";

/** Neutralises spreadsheet formulas (CSV injection) and escapes quotes. */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Download everyone who reserved, as a CSV. */
export async function GET(_req: Request, ctx: RouteContext<"/api/tests/[id]/export">) {
  const { id } = await ctx.params;
  const owned = await ownedTest(id);
  if ("error" in owned) return owned.error;
  const { test } = owned;
  const stats = await getStats(test);

  const lines = [["email", "would_pay", "source", "reserved_at"].map(cell).join(",")];
  for (const s of [...stats.signups].reverse()) {
    lines.push(
      [
        s.email,
        s.wouldPay !== null ? formatMoney(s.wouldPay, test.currency) : "",
        sourceLabel(s.source),
        new Date(s.createdAt).toISOString(),
      ]
        .map(cell)
        .join(","),
    );
  }

  const fileName = `${test.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "test"}-reservations.csv`;
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
