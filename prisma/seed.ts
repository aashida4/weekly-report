import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  const studentEmail = "student1@example.com";
  const password = "password123";
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash: hash,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      email: studentEmail,
      name: "Student One",
      passwordHash: hash,
      role: "student",
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Seeded users:\n  ${adminEmail} (admin)\n  ${studentEmail} (student)\nPassword for both: ${password}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
