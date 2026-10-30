// Shared shapes. Keep these in sync with the backend's API responses.
export type EmailStatus = "scheduled" | "processing" | "sent" | "failed";

export interface User { id: string; name: string; email: string; avatarUrl?: string }
export interface Sender { id: string; email: string }
export interface Attachment { name: string; sizeLabel: string; url?: string }

export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;            // HTML
  status: EmailStatus;
  scheduledAt?: string;    // ISO
  sentAt?: string;         // ISO
  attachments: Attachment[];
}

export interface EmailCounts { scheduled: number; sent: number }

/** What POST /api/emails/schedule will receive. */
export interface ScheduleEmailPayload {
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: string | null;  // null = send now
  delaySeconds: number;      // minimum gap between two emails
  hourlyLimit: number;       // emails per hour for this sender
}
