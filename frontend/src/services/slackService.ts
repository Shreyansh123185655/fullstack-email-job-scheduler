import { http } from "./http";
export interface SlackStatus {
  connected: boolean;
  channel?: string | null;
  webhookUrlMasked?: string | null;
}
export const slackService = {
  async getStatus(): Promise<SlackStatus> {
    try {
      return await http<SlackStatus>("/slack/status");
    } catch {
      return { connected: false };
    }
  },
  connectOAuth(): void {
    window.location.href = "/api/slack/oauth";
  },
  async connectWebhook(webhookUrl: string, channelName?: string): Promise<{ success: boolean }> {
    return http<{ success: boolean }>("/slack/webhook", {
      method: "POST",
      body: JSON.stringify({ webhookUrl, channelName }),
    });
  },
  async disconnect(): Promise<void> {
    await http("/slack/disconnect", { method: "POST" });
  },
  async testAlert(): Promise<{ success: boolean; message: string }> {
    return http<{ success: boolean; message: string }>("/slack/test-alert", {
      method: "POST",
    });
  },
};
