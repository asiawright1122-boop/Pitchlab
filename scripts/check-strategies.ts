import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      userStrategies: true,
      subscription: true,
    }
  });

  console.log("=== Existing Users & Strategies ===");
  for (const u of users) {
    console.log(`User: ${u.email} (${u.id}) - Plan: ${u.subscription?.planId}`);
    if (u.userStrategies.length > 0) {
      for (const s of u.userStrategies) {
        console.log(`  - Strategy: ${s.name} (id: ${s.id}, rules: ${JSON.stringify(s.rules)})`);
      }
    } else {
      console.log("  - No strategies.");
    }
  }

  // If there are users but no strategies, let's seed a strategy for the first user
  if (users.length > 0) {
    const firstUser = users[0];
    const hasStrategies = firstUser.userStrategies.length > 0;
    if (!hasStrategies) {
      console.log(`\nSeeding a strategy for ${firstUser.email}...`);
      const newStrategy = await prisma.userStrategy.create({
        data: {
          userId: firstUser.id,
          name: "Test Quant Strategy E0",
          rules: {
            min_edge: 0.02,
            leagues: ["E0"],
          },
          notify: true,
        }
      });
      console.log(`✓ Seeded Strategy: ${newStrategy.name} (id: ${newStrategy.id})`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
