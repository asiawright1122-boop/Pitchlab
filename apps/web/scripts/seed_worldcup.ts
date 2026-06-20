import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding World Cup 2026 Data...');

  const dataDir = path.join(__dirname, '../../../worldcup_data');
  
  if (!fs.existsSync(dataDir)) {
    console.error('❌ worldcup_data directory not found. Please run the engine export first.');
    process.exit(1);
  }

  const fixturesRaw = fs.readFileSync(path.join(dataDir, 'fixtures.json'), 'utf-8');
  const predictionsRaw = fs.readFileSync(path.join(dataDir, 'predictions.json'), 'utf-8');

  const fixturesData = JSON.parse(fixturesRaw);
  const predictionsData = JSON.parse(predictionsRaw);

  const fixtures = fixturesData.fixtures;
  
  // Clean existing fixtures for WC to avoid duplicates
  await prisma.fixture.deleteMany({
    where: { league: 'WC' }
  });

  let createdCount = 0;

  for (const f of fixtures) {
    // Make kickoff time in the future based on matchday
    // e.g. matchday 1 is tomorrow, matchday 2 is day after tomorrow
    const kickoff = new Date();
    kickoff.setDate(kickoff.getDate() + f.matchday);
    kickoff.setHours(18 + (f.matchday % 3), 0, 0, 0); // Randomize hours a bit

    // Find predictions for this match
    const preds = predictionsData.filter((p: any) => p.home === f.home && p.away === f.away);
    const pred = preds.length > 0 ? preds[0] : null;

    await prisma.fixture.create({
      data: {
        id: f.id,
        league: 'WC',
        home: f.home,
        away: f.away,
        kickoffUtc: kickoff,
        status: 'scheduled',
        predictions: {
          create: pred ? [
            { market: '1x2', selection: 'home', prob: pred.home_prob, modelVersion: 'wc2026-v1' },
            { market: '1x2', selection: 'draw', prob: pred.draw_prob, modelVersion: 'wc2026-v1' },
            { market: '1x2', selection: 'away', prob: pred.away_prob, modelVersion: 'wc2026-v1' },
            { market: 'o/u', selection: 'over25', prob: pred.over25, modelVersion: 'wc2026-v1' },
            { market: 'o/u', selection: 'under25', prob: 1 - pred.over25, modelVersion: 'wc2026-v1' },
          ] : []
        }
      }
    });

    createdCount++;
  }

  console.log(`✅ Successfully seeded ${createdCount} World Cup fixtures and their predictions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
