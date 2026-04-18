import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find test_user
  const user = await prisma.user.findUnique({
    where: { username: 'test_user' }
  });

  if (!user) {
    console.log("No test_user found. Run the previous seed-test.ts first or create a user.");
    return;
  }

  // Create or update the Renke device
  const renkeDevice = await prisma.device.upsert({
    where: { deviceId: '21146611' },
    update: {},
    create: {
      deviceId: '21146611',
      deviceName: '山东仁科气象站 001',
      deviceType: 'RENKE',
      userId: user.id,
    }
  });

  console.log('Success! Upserted Renke Device:');
  console.dir(renkeDevice, { depth: null });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
