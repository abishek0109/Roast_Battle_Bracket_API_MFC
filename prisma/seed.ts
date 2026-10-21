import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing seed data in reverse dependency order
  await prisma.notificationOutbox.deleteMany();
  await prisma.tiebreakVote.deleteMany();
  await prisma.tiebreakSession.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.roastLine.deleteMany();
  await prisma.matchup.deleteMany();
  await prisma.tournamentContestant.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.contestant.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Administrator
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin Roastmaster',
      email: 'admin@roastbattle.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log('✅ Created Admin user:', adminUser.email);

  // 2. Create 5 Contestants with User accounts (Demonstrates non-power-of-two bracket: N=5)
  const contestantsData = [
    { name: 'Jeff Ross', email: 'jeff@roastbattle.com', displayName: 'Roastmaster General', seed: 1 },
    { name: 'Nikki Glaser', email: 'nikki@roastbattle.com', displayName: 'Golden Tongue', seed: 2 },
    { name: 'Tony Hinchcliffe', email: 'tony@roastbattle.com', displayName: 'Kill Tony', seed: 3 },
    { name: 'Sarah Silverman', email: 'sarah@roastbattle.com', displayName: 'The Velvet Hammer', seed: 4 },
    { name: 'Bill Burr', email: 'bill@roastbattle.com', displayName: 'Red Menace', seed: 5 },
  ];

  const createdContestants = [];

  for (const c of contestantsData) {
    const user = await prisma.user.create({
      data: {
        name: c.name,
        email: c.email,
        passwordHash,
        role: Role.CONTESTANT,
      },
    });

    const contestant = await prisma.contestant.create({
      data: {
        userId: user.id,
        displayName: c.displayName,
        email: c.email,
      },
    });

    createdContestants.push({ contestant, seed: c.seed });
  }
  console.log(`✅ Created ${createdContestants.length} contestants`);

  // 3. Create General Voters
  const voterUsers = [];
  for (let i = 1; i <= 3; i++) {
    const voter = await prisma.user.create({
      data: {
        name: `Audience Voter ${i}`,
        email: `voter${i}@roastbattle.com`,
        passwordHash,
        role: Role.VOTER,
      },
    });
    voterUsers.push(voter);
  }
  console.log(`✅ Created ${voterUsers.length} general voter accounts`);

  // 4. Create Sample Tournament with 5 contestants
  const sampleTournament = await prisma.tournament.create({
    data: {
      name: 'All-Star Roast Showdown 2026',
      votingDurationSeconds: 300,
      status: 'REGISTRATION',
      currentRound: 1,
    },
  });

  for (const c of createdContestants) {
    await prisma.tournamentContestant.create({
      data: {
        tournamentId: sampleTournament.id,
        contestantId: c.contestant.id,
        seed: c.seed,
      },
    });
  }
  console.log(`✅ Created Tournament '${sampleTournament.name}' with 5 enrolled contestants (non-power-of-two)`);

  console.log('\n================ SEED SUMMARY ================');
  console.log('Default Password for all seed users: Password123!');
  console.log('Admin Account: admin@roastbattle.com');
  console.log('Contestant Accounts: jeff@roastbattle.com, nikki@roastbattle.com, tony@roastbattle.com, sarah@roastbattle.com, bill@roastbattle.com');
  console.log('Voter Accounts: voter1@roastbattle.com, voter2@roastbattle.com, voter3@roastbattle.com');
  console.log('Sample Tournament ID:', sampleTournament.id);
  console.log('==============================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
