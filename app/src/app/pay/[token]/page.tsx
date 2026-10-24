import { notFound } from "next/navigation";
import Link from "next/link";
import { PayDues } from "@/components/pay-dues";
import { btn } from "@/components/ui";
import { currentUser } from "@/lib/current-user";
import { annualDuesCents } from "@/lib/dues";
import { checkoutModeForRole } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

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
  if (!member || member.status !== "ACTIVE") notFound();
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
      cents={member.duesCents || annualDuesCents(member.role)}
      token={token}
      mode={checkoutModeForRole(member.role)}
      status={member.paymentStatus}
      renewalAt={member.renewalAt}
      signedIn={Boolean(viewer)}
      error={query.error}
      notice={query.notice}
    />
  );
}
