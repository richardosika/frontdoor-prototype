import { prisma } from "@/lib/prisma";

export async function notify(userId: string, input: { title: string; body: string; href?: string; audience?: "member" | "admin" }) {
  await prisma.notification.create({
    data: {
      userId,
      audience: input.audience ?? "member",
      title: input.title,
      body: input.body,
      href: input.href ?? "",
    },
  });
}

export async function notifyAdmins(input: { title: string; body: string; href?: string }) {
  const admins = await prisma.user.findMany({
    where: { isAdmin: true, status: "ACTIVE" },
    select: { id: true },
  });
  // Staff notices (applicant grades, review queues) never show on a member Alerts page, including an admin's own.
  await Promise.all(admins.map((admin) => notify(admin.id, { ...input, audience: "admin" })));
}
