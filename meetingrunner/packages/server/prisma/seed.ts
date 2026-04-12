import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@meetingrunner.app' },
    update: {},
    create: {
      email: 'admin@meetingrunner.app',
      passwordHash,
      displayName: 'Admin',
      role: 'admin',
    },
  });

  console.log('Seeded admin user:', admin.email);
  console.log('Default password: admin123 (change this immediately!)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
