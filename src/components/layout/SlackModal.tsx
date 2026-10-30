import { useState } from "react";
import { CheckCircle2, MessageSquare, Power, Send, X } from "lucide-react";
import { slackService, SlackStatus } from "../../services/slackService";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";

interface SlackModalProps {
  status: SlackStatus;
  onClose: () => void;
  onRefresh: () => void;
}

export default function SlackModal({ status, onClose, onRefresh }: SlackModalProps) {
  const toast = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleConnectWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !webhookUrl.startsWith("https://hooks.slack.com/")) {
      return toast("error", "Please provide a valid https://hooks.slack.com/... URL");
    }

    setLoading(true);
    try {
      await slackService.connectWebhook(webhookUrl.trim(), channel.trim() || undefined);
      toast("success", "Slack webhook connected successfully!");
      setWebhookUrl("");
      onRefresh();
    } catch (err: any) {
      toast("error", err.message || "Failed to connect Slack webhook.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await slackService.disconnect();
      toast("success", "Slack disconnected.");
      onRefresh();
    } catch (err: any) {
      toast("error", err.message || "Failed to disconnect.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    try {
      const res = await slackService.testAlert();
      toast("success", res.message || "Slack test alert sent!");
    } catch (err: any) {
      toast("error", err.message || "Could not send test alert.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Slack Integration</h2>
              <p className="text-xs text-slate-500">Alerts when sender hourly limits are hit</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {status.connected ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <CheckCircle2 size={18} />
                <span>Connected to Slack</span>
              </div>
              {status.channel && (
                <p className="mt-1 text-xs text-slate-600">Channel: <strong className="font-semibold">{status.channel}</strong></p>
              )}
              {status.webhookUrlMasked && (
                <p className="mt-0.5 text-xs text-slate-400 font-mono truncate">Webhook: {status.webhookUrlMasked}</p>
              )}

              <div className="mt-4 flex gap-2">
                <Button onClick={handleTestAlert} loading={testing} className="flex-1 text-xs py-2">
                  <Send size={14} className="mr-1" /> Test Alert
                </Button>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Power size={14} /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => slackService.connectOAuth()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
                    <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.528 2.528 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
                  </svg>
                  Connect via Slack OAuth
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-slate-200"></div>
                <span className="bg-white px-2 text-[11px] text-slate-400 uppercase tracking-wider">or webhook url</span>
              </div>

              <form onSubmit={handleConnectWebhook} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Slack Incoming Webhook URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Channel (optional)</label>
                  <input
                    type="text"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    placeholder="#email-alerts"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-500"
                  />
                </div>
                <Button type="submit" loading={loading} className="w-full text-xs py-2">
                  Save Webhook Connection
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
