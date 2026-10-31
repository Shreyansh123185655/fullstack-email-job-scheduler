import { esClient, EMAIL_INDEX } from "../config/elastic";
import { prisma } from "../config/db";

export interface EmailDoc {
  id: string;
  senderId: string;
  userId?: string | null;
  from: string;
  to: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}
export const elasticService = {
  async indexEmail(email: EmailDoc): Promise<void> {
    try {
      await esClient.index({
        index: EMAIL_INDEX,
        id: email.id,
        document: {
          ...email,
          scheduledAt: email.scheduledAt || null,
          sentAt: email.sentAt || null,
        },
      });
    } catch (err: any) {
      console.warn(`[Elasticsearch Index Warn] Could not index email ${email.id}:`, err.message);
    }
  },
  async updateEmailStatus(id: string, status: string, sentAt?: Date | null): Promise<void> {
    try {
      await esClient.update({
        index: EMAIL_INDEX,
        id,
        doc: {
          status,
          sentAt: sentAt ? sentAt.toISOString() : null,
        },
      });
    } catch (err: any) {
      console.warn(`[Elasticsearch Update Warn] Could not update email ${id}:`, err.message);
    }
  },
  async searchEmails(status: string, query: string): Promise<any[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return prisma.email.findMany({
        where: { status },
        orderBy: status === "sent" ? { sentAt: "desc" } : { scheduledAt: "asc" },
      });
    }

    try {
      const response = await esClient.search({
        index: EMAIL_INDEX,
        query: {
          bool: {
            must: [
              { term: { status } },
              {
                multi_match: {
                  query: trimmed,
                  fields: ["to^3", "subject^2", "body"],
                  fuzziness: "AUTO",
                },
              },
            ],
          },
        },
        size: 100,
      });

      const hits = response.hits.hits;
      const ids = hits.map((h: any) => h._id);

      if (ids.length === 0) {
        return [];
      }
      const records = await prisma.email.findMany({
        where: { id: { in: ids } },
      });
      const idMap = new Map(records.map((r) => [r.id, r]));
      return ids.map((id) => idMap.get(id)).filter(Boolean);
    } catch (err: any) {
      console.warn("[Elasticsearch Search Fallback] Querying PostgreSQL directly:", err.message);
      return prisma.email.findMany({
        where: {
          status,
          OR: [
            { to: { contains: trimmed, mode: "insensitive" } },
            { subject: { contains: trimmed, mode: "insensitive" } },
            { body: { contains: trimmed, mode: "insensitive" } },
          ],
        },
        orderBy: status === "sent" ? { sentAt: "desc" } : { scheduledAt: "asc" },
      });
    }
  },
};
