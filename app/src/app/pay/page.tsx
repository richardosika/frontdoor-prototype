import { redirect } from "next/navigation";
import { confirmStripeReturn } from "@/actions/payments";
import { PayDues } from "@/components/pay-dues";
import { requireAccount } from "@/lib/current-user";
import { currentMonthlyCents } from "@/lib/dues";
import { blocksMembership, checkoutModeForRole } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  if (params.session_id) await confirmStripeReturn(params.session_id);
  const user = await requireAccount();
  if (!blocksMembership(user.paymentStatus)) redirect("/feed");
  const fresh = (await prisma.user.findUnique({ where: { id: user.id } })) || user;
  return (
    <PayDues
      name={fresh.name}
      role={fresh.role}
      cents={currentMonthlyCents(fresh.role, fresh.duesCents)}
      token={fresh.paymentToken || ""}
      mode={checkoutModeForRole(fresh.role)}
      status={fresh.paymentStatus}
      renewalAt={fresh.renewalAt}
      signedIn
      cancelled={Boolean(fresh.cancelRequestedAt)}
      error={params.error}
      notice={params.notice}
    />
  );
}
