export type EmailStatus = "scheduled" | "processing" | "sent" | "failed";
export interface User { id: string; name: string; email: string; avatarUrl?: string }
export interface Sender { id: string; email: string }
export interface Attachment { name: string; sizeLabel: string; url?: string }
export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;           
  status: EmailStatus;
  scheduledAt?: string;   
  sentAt?: string;    
  attachments: Attachment[];
}
export interface EmailCounts { scheduled: number; sent: number }
export interface ScheduleEmailPayload {
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: string | null; 
  delaySeconds: number;  
  hourlyLimit: number;  
}
