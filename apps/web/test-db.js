const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.fixture.count();
  const scheduled = await prisma.fixture.count({ where: { status: 'scheduled' } });
  const finished = await prisma.fixture.count({ where: { status: 'finished' } });
  console.log(`Total: ${all}, Scheduled: ${scheduled}, Finished: ${finished}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
