import { ownedTest } from "@/lib/server/guard";
import { fail, isSameOrigin, json } from "@/lib/server/http";
import { deleteSignup } from "@/lib/server/repo";

/** Remove a junk reservation (spam, a test entry, your mate trolling). */
export async function DELETE(req: Request, ctx: RouteContext<"/api/tests/[id]/signups/[signupId]">) {
  if (!isSameOrigin(req)) return fail("Cross-site request blocked", 403);
  const { id, signupId } = await ctx.params;
  const owned = await ownedTest(id);
  if ("error" in owned) return owned.error;
  if (owned.test.status === "closed") return fail("This test is closed. Reopen it to edit reservations.", 409);
  const sid = Number(signupId);
  if (!Number.isInteger(sid) || sid <= 0) return fail("Invalid reservation", 400);
  const removed = await deleteSignup(owned.test.id, sid);
  if (!removed) return fail("Reservation not found", 404);
  return json({ ok: true });
}
