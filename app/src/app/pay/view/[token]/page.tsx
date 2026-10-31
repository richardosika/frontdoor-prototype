import { redirect } from "next/navigation";
import Link from "next/link";
import { PayDues } from "@/components/pay-dues";
import { btn } from "@/components/ui";
import { currentUser } from "@/lib/current-user";
import { currentMonthlyCents } from "@/lib/dues";
import { checkoutModeForRole } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function PayTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const member = await prisma.user.findUnique({ where: { paymentToken: token } });
  if (!member || member.status !== "ACTIVE") redirect(`${await appBaseUrl()}/pay/${encodeURIComponent(token)}`);
  const viewer = await currentUser();
  if (viewer && viewer.id !== member.id) {
    return (
      <main className="min-h-dvh bg-cream px-6 py-16 text-forest">
        <p className="mx-auto max-w-md text-sm">This payment link belongs to another member.</p>
        <Link href="/feed" className={`${btn} mx-auto mt-4 max-w-md`}>
          Back to the floor
        </Link>
      </main>
    );
  }
  return (
    <PayDues
      name={member.name}
      role={member.role}
      cents={currentMonthlyCents(member.role, member.duesCents)}
      token={token}
      mode={checkoutModeForRole(member.role)}
      status={member.paymentStatus}
      renewalAt={member.renewalAt}
      signedIn={Boolean(viewer)}
      cancelled={Boolean(member.cancelRequestedAt)}
      error={query.error}
      notice={query.notice}
    />
  );
}
