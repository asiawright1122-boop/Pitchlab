import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = Date.now();
  const oddsMoveWindowMs = 24 * 60 * 60 * 1000;

  // 1. Ensure we have an active Pro user with Telegram binding
  let user = await prisma.user.findFirst({ where: { email: "test-odds@example.com" } });
  if (!user) {
    user = await prisma.user.create({ data: { email: "test-odds@example.com" } });
  }

  // Ensure Plan and Subscription
  let plan = await prisma.plan.findFirst({ where: { id: "pro" } });
  if (!plan) {
    plan = await prisma.plan.create({
      data: { id: "pro", name: "Pro", priceCents: 2000, entitlements: { push: true, api: true } }
    });
  }
  
  const subRec = await prisma.subscription.findFirst({ where: { userId: user.id } });
  if (!subRec) {
    await prisma.subscription.create({
      data: { userId: user.id, planId: "pro", status: "active" }
    });
  }

  // Ensure ChannelBinding
  const bind = await prisma.channelBinding.findFirst({ where: { userId: user.id, channel: "telegram" } });
  if (!bind) {
    await prisma.channelBinding.create({
      data: { userId: user.id, channel: "telegram", externalId: "12345678" }
    });
  }

  // Ensure AlertSubscription
  let alertSub = await prisma.alertSubscription.findFirst({ where: { userId: user.id } });
  if (!alertSub) {
    alertSub = await prisma.alertSubscription.create({
      data: {
        userId: user.id,
        scopeType: "all",
        kinds: ["kickoff", "result", "value_hit", "odds_move"],
        active: true
      }
    });
  } else {
    const kinds = (alertSub.kinds as string[]) || [];
    if (!kinds.includes("odds_move")) {
      await prisma.alertSubscription.update({
        where: { id: alertSub.id },
        data: { kinds: [...kinds, "odds_move"] }
      });
    }
  }

  // 2. Ensure an upcoming Fixture
  let fixture = await prisma.fixture.findFirst({
    where: {
      status: "scheduled",
      kickoffUtc: { gte: new Date(now), lte: new Date(now + oddsMoveWindowMs) }
    }
  });

  if (!fixture) {
    fixture = await prisma.fixture.create({
      data: {
        league: "E0",
        home: "MockTeam A",
        away: "MockTeam B",
        kickoffUtc: new Date(now + 2 * 60 * 60 * 1000), // in 2 hours
        status: "scheduled"
      }
    });
    console.log("Created mock fixture");
  }

  // 3. Create two odds snapshots with >10% drop
  await prisma.oddsSnapshot.createMany({
    data: [
      {
        fixtureId: fixture.id,
        book: "pinnacle",
        market: "1x2",
        selection: "home",
        price: 2.10,
        takenAt: new Date(now - 2 * 60 * 60 * 1000)
      },
      {
        fixtureId: fixture.id,
        book: "pinnacle",
        market: "1x2",
        selection: "home",
        price: 1.85, // 2.10 -> 1.85 = ~12% drop
        takenAt: new Date(now - 5 * 60 * 1000)
      }
    ]
  });

  console.log(`Created mock odds snapshots for fixture ${fixture.home} vs ${fixture.away}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
