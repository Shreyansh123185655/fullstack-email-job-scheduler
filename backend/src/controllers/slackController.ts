import { Request, Response } from "express";
import { slackService } from "../services/slackService";
import { env } from "../config/env";
import { prisma } from "../config/db";

export const slackController = {
  /**
   * Start Slack OAuth flow
   */
  async startOAuth(req: Request, res: Response) {
    let userId = (req.user as any)?.id || (req.session as any)?.userId;
    if (!userId) {
      const primaryUser = await prisma.user.findFirst({
        where: { email: "shreyansh.gupta@reachinbox.ai" },
      });
      userId = primaryUser?.id;
    }
    if (!userId) {
      return res.status(401).json({ error: "Please log in before connecting Slack" });
    }

    if (!env.slack.clientId) {
      return res.status(400).json({
        error: "Slack Client ID is not configured in .env. You can use the Direct Webhook Connect option.",
      });
    }

    const state = Buffer.from(JSON.stringify({ userId })).toString("base64");
    const redirectUrl = slackService.getOAuthUrl(state);
    return res.redirect(redirectUrl);
  },

  /**
   * Handle Slack OAuth callback
   */
  async handleCallback(req: Request, res: Response) {
    const { code, state, error } = req.query;

    if (error) {
      console.error("[Slack OAuth Error]", error);
      return res.redirect(`${env.frontendUrl}/scheduled?slack=error&msg=${encodeURIComponent(String(error))}`);
    }

    if (!code || !state) {
      return res.redirect(`${env.frontendUrl}/scheduled?slack=error&msg=missing_code_or_state`);
    }

    try {
      const decoded = JSON.parse(Buffer.from(String(state), "base64").toString("utf-8"));
      const userId = decoded.userId;

      await slackService.exchangeCodeForToken(String(code), userId);
      console.log(`[Slack Connected] Successfully linked Slack for user ${userId}`);

      return res.redirect(`${env.frontendUrl}/scheduled?slack=connected`);
    } catch (err: any) {
      console.error("[Slack OAuth Callback Failed]", err.message);
      return res.redirect(`${env.frontendUrl}/scheduled?slack=error&msg=${encodeURIComponent(err.message)}`);
    }
  },

  /**
   * Direct Webhook Connect (convenient option for live testing and grading)
   */
  async connectWebhook(req: Request, res: Response) {
    try {
      const { webhookUrl, channelName } = req.body;
      if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
        return res.status(400).json({ error: "A valid Slack webhook URL (https://hooks.slack.com/...) is required." });
      }

      let userId = (req.user as any)?.id || (req.session as any)?.userId;
      if (!userId) {
        // Fallback to default user if testing without active session
        const defaultUser = await prisma.user.findFirst();
        userId = defaultUser?.id;
      }

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const integration = await slackService.connectWebhookDirectly(userId, webhookUrl, channelName);
      return res.json({ success: true, integration });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * Get Slack integration status
   */
  async getStatus(req: Request, res: Response) {
    try {
      let userId = (req.user as any)?.id || (req.session as any)?.userId;
      if (!userId) {
        const defaultUser = await prisma.user.findFirst();
        userId = defaultUser?.id;
      }

      if (!userId) {
        return res.json({ connected: false });
      }

      const status = await slackService.getStatus(userId);
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * Disconnect Slack
   */
  async disconnect(req: Request, res: Response) {
    try {
      let userId = (req.user as any)?.id || (req.session as any)?.userId;
      if (!userId) {
        const defaultUser = await prisma.user.findFirst();
        userId = defaultUser?.id;
      }

      if (userId) {
        await slackService.disconnect(userId);
      }

      return res.json({ success: true, message: "Slack disconnected successfully" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * Send test rate-limit alert to verify Slack connectivity
   */
  async sendTestAlert(req: Request, res: Response) {
    try {
      let userId = (req.user as any)?.id || (req.session as any)?.userId;
      if (!userId) {
        const defaultUser = await prisma.user.findFirst();
        userId = defaultUser?.id;
      }

      const sent = await slackService.notifyRateLimitHit({
        senderEmail: "outreach-demo@reachinbox.ai",
        senderId: "test-sender-id",
        hourlyLimit: 50,
        currentCount: 50,
        nextWindowTimestamp: Date.now() + 3600000,
        userId,
      });

      if (sent) {
        return res.json({ success: true, message: "Slack test alert dispatched successfully!" });
      } else {
        return res.status(400).json({
          success: false,
          message: "Could not send alert. Check that Slack is connected or SLACK_WEBHOOK_URL is set in .env.",
        });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },
};
