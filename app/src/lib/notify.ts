import { prisma } from "@/lib/prisma";

export async function notify(userId: string, input: { title: string; body: string; href?: string }) {
  await prisma.notification.create({
    data: {
      userId,
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
  await Promise.all(admins.map((admin) => notify(admin.id, input)));
}
