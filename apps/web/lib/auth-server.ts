import { prisma } from "./prisma";
import { ensurePaperWallet } from "./paper";
import { parseEntitlements, type Entitlements, type PlanId } from "./entitlements";
import { getSession } from "./session";

export type AuthUser = {
  id: string;
  email: string;
  planId: PlanId;
  entitlements: Entitlements;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session.userId) return null;

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.userId },
    include: { plan: true },
  });
  if (!sub) return null;

  return {
    id: session.userId,
    email: session.email ?? "",
    planId: sub.planId as PlanId,
    entitlements: parseEntitlements(sub.plan.entitlements),
  };
}

export async function loginWithEmail(email: string): Promise<AuthUser> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Invalid email");
  }

  let user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    user = await prisma.user.create({ data: { email: normalized } });
    await prisma.subscription.create({
      data: { userId: user.id, planId: "free", status: "active" },
    });
    await ensurePaperWallet(prisma, user.id);
  } else {
    await ensurePaperWallet(prisma, user.id);
  }

  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { userId: user.id },
    include: { plan: true },
  });

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.planId = sub.planId;
  await session.save();

  return {
    id: user.id,
    email: user.email,
    planId: sub.planId as PlanId,
    entitlements: parseEntitlements(sub.plan.entitlements),
  };
}
