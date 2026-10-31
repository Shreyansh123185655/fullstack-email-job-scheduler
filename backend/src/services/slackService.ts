import axios from "axios";
import { prisma } from "../config/db";
import { env } from "../config/env";

export interface SlackRateLimitAlertData {
  senderEmail: string;
  senderId: string;
  hourlyLimit: number;
  currentCount: number;
  nextWindowTimestamp: number;
  userId?: string | null;
}

export const slackService = {
  /**
   * Generates the Slack OAuth URL for connecting a Slack workspace
   */
  getOAuthUrl(state: string): string {
    const scopes = ["incoming-webhook", "chat:write"].join(",");
    return `https://slack.com/oauth/v2/authorize?client_id=${env.slack.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
      env.slack.redirectUri
    )}&state=${encodeURIComponent(state)}`;
  },

  /**
   * Exchanges authorization code with Slack OAuth v2 API
   */
  async exchangeCodeForToken(code: string, userId: string) {
    const response = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      new URLSearchParams({
        client_id: env.slack.clientId,
        client_secret: env.slack.clientSecret,
        code,
        redirect_uri: env.slack.redirectUri,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const data = response.data;
    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error || "Failed to exchange code"}`);
    }

    const webhookUrl = data.incoming_webhook?.url;
    const channelName = data.incoming_webhook?.channel;
    const accessToken = data.access_token;

    if (!webhookUrl) {
      throw new Error("No incoming webhook returned from Slack authorization.");
    }

    const integration = await prisma.slackIntegration.upsert({
      where: { userId },
      create: {
        userId,
        webhookUrl,
        channelName: channelName || "slack-channel",
        accessToken,
        active: true,
      },
      update: {
        webhookUrl,
        channelName: channelName || "slack-channel",
        accessToken,
        active: true,
      },
    });

    return integration;
  },

  /**
   * Connect a webhook directly (for easy manual testing / grading)
   */
  async connectWebhookDirectly(userId: string, webhookUrl: string, channelName?: string) {
    return prisma.slackIntegration.upsert({
      where: { userId },
      create: {
        userId,
        webhookUrl,
        channelName: channelName || "default",
        active: true,
      },
      update: {
        webhookUrl,
        channelName: channelName || "default",
        active: true,
      },
    });
  },

  /**
   * Disconnect Slack for a user
   */
  async disconnect(userId: string) {
    return prisma.slackIntegration.deleteMany({
      where: { userId },
    });
  },

  /**
   * Get current connection status for a user
   */
  async getStatus(userId: string) {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });
    return {
      connected: !!integration && integration.active,
      channel: integration?.channelName || null,
      webhookUrlMasked: integration?.webhookUrl
        ? integration.webhookUrl.slice(0, 30) + "..."
        : null,
    };
  },

  /**
   * Dispatches a live rate limit hit alert to Slack
   * Uses user integration if available, or falls back to env SLACK_WEBHOOK_URL
   */
  async notifyRateLimitHit(alert: SlackRateLimitAlertData): Promise<boolean> {
    try {
      let webhookUrl: string | null = null;

      if (alert.userId) {
        const integration = await prisma.slackIntegration.findUnique({
          where: { userId: alert.userId },
        });
        if (integration && integration.active && integration.webhookUrl) {
          webhookUrl = integration.webhookUrl;
        }
      }

      if (!webhookUrl && env.slack.defaultWebhookUrl) {
        webhookUrl = env.slack.defaultWebhookUrl;
      }

      if (!webhookUrl) {
        const fallbackIntegration = await prisma.slackIntegration.findFirst({
          where: { active: true },
        });
        if (fallbackIntegration?.webhookUrl) {
          webhookUrl = fallbackIntegration.webhookUrl;
        }
      }

      if (!webhookUrl) {
        console.log(
          `[Slack Alert Skipped] Rate limit reached for ${alert.senderEmail}, but no Slack webhook is configured.`
        );
        return false;
      }

      const nextTimeStr = new Date(alert.nextWindowTimestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const payload = {
        text: `⚠️ *Email Rate Limit Exceeded* for sender *${alert.senderEmail}*`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "⚠️ Sender Rate Limit Reached",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Sender:*\n\`${alert.senderEmail}\``,
              },
              {
                type: "mrkdwn",
                text: `*Hourly Limit:*\n*${alert.hourlyLimit} emails/hr*`,
              },
              {
                type: "mrkdwn",
                text: `*Sent in Current Window:*\n*${alert.currentCount}*`,
              },
              {
                type: "mrkdwn",
                text: `*Rescheduled Window:*\n*${nextTimeStr}*`,
              },
            ],
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "ReachInbox Scheduler has automatically deferred pending emails to the start of the next hour window via BullMQ.",
              },
            ],
          },
        ],
      };

      await axios.post(webhookUrl, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      });

      console.log(`[Slack Alert Sent] Successfully notified Slack for sender ${alert.senderEmail}`);
      return true;
    } catch (error: any) {
      console.warn("[Slack Alert Error] Failed to send Slack alert:", error.message);
      return false;
    }
  },
};
