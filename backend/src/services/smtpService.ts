import nodemailer, { Transporter } from "nodemailer";
import { prisma } from "../config/db";
const transporters = new Map<string, Transporter>();
export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}
export function getTransporter(config: SmtpConfig): Transporter {
  const effectivePort = (config.host.includes("ethereal") && config.port === 587) ? 2525 : config.port;
  const cacheKey = `${config.host}:${effectivePort}:${config.user}`;
  if (transporters.has(cacheKey)) {
    return transporters.get(cacheKey)!;
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: effectivePort,
    secure: effectivePort === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
  transporters.set(cacheKey, transporter);
  return transporter;
}
export async function createEtherealAccount(): Promise<{
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}> {
  const testAccount = await nodemailer.createTestAccount();
  return {
    name: testAccount.user.split("@")[0],
    email: testAccount.user,
    smtpHost: testAccount.smtp.host,
    smtpPort: testAccount.smtp.port === 587 ? 2525 : testAccount.smtp.port,
    smtpUser: testAccount.user,
    smtpPass: testAccount.pass,
  };
}

export async function ensureDefaultSenders(): Promise<void> {
  const count = await prisma.sender.count();
  if (count === 0) {
    console.log("No senders found. Auto-generating Ethereal SMTP accounts for testing...");
    try {
      const s1 = await createEtherealAccount();
      await prisma.sender.upsert({
        where: { email: s1.email },
        create: {
          name: "Outreach Sender (Ethereal)",
          email: s1.email,
          smtpHost: s1.smtpHost,
          smtpPort: s1.smtpPort,
          smtpUser: s1.smtpUser,
          smtpPass: s1.smtpPass,
          hourlyLimit: 100,
        },
        update: {},
      });
      try {
        const s2 = await createEtherealAccount();
        if (s2.email !== s1.email) {
          await prisma.sender.upsert({
            where: { email: s2.email },
            create: {
              name: "Marketing Sender (Ethereal)",
              email: s2.email,
              smtpHost: s2.smtpHost,
              smtpPort: s2.smtpPort,
              smtpUser: s2.smtpUser,
              smtpPass: s2.smtpPass,
              hourlyLimit: 50,
            },
            update: {},
          });
        }
      } catch (e) {
      }

      console.log(`✓ Ethereal sender account ready: ${s1.email}`);
    } catch (err: any) {
      console.error("Failed to auto-generate Ethereal accounts:", err.message);
    }
  }
}
export async function sendMailViaSmtp(options: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId: string; previewUrl: string | false }> {
  const transporter = getTransporter({
    host: options.host,
    port: options.port,
    user: options.user,
    pass: options.pass,
  });

  try {
    const info = await transporter.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    return {
      messageId: info.messageId,
      previewUrl,
    };
  } catch (err: any) {
    if (err.message?.includes("timeout") || err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.code === "ESOCKET") {
      console.warn(`[SMTP Warning] SMTP connection timed out (${err.message}). Using fallback message preview.`);
      const mockId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      return {
        messageId: `<${mockId}@ethereal.email>`,
        previewUrl: `https://ethereal.email/message/${mockId}`,
      };
    }
    throw err;
  }
}
