import { prisma } from "../config/db";
import { ensureDefaultSenders } from "../services/smtpService";

async function main() {
  console.log("Seeding senders and demo user...");
  await ensureDefaultSenders();

  // Create standard demo user if none exists
  const user = await prisma.user.upsert({
    where: { email: "oliver.brown@reachinbox.ai" },
    create: {
      email: "oliver.brown@reachinbox.ai",
      name: "Oliver Brown",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    },
    update: {},
  });
  console.log("Demo user:", user.email);

  const senders = await prisma.sender.findMany();
  console.log("Current Senders in DB:", senders.map((s) => ({ id: s.id, email: s.email, limit: s.hourlyLimit })));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
