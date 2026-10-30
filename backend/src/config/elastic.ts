import { Client } from "@elastic/elasticsearch";
import { env } from "./env";

export const esClient = new Client({
  node: env.elasticsearch.node,
});

export const EMAIL_INDEX = "emails";

export async function initElasticIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAIL_INDEX,
        mappings: {
          properties: {
            id: { type: "keyword" },
            senderId: { type: "keyword" },
            userId: { type: "keyword" },
            from: { type: "keyword" },
            to: { type: "keyword" },
            subject: { type: "text" },
            body: { type: "text" },
            status: { type: "keyword" },
            scheduledAt: { type: "date" },
            sentAt: { type: "date" },
            createdAt: { type: "date" },
          },
        },
      });
      console.log(`Elasticsearch index '${EMAIL_INDEX}' created successfully.`);
    } else {
      console.log(`Elasticsearch index '${EMAIL_INDEX}' already exists.`);
    }
  } catch (error: any) {
    console.warn("Elasticsearch initialization notice:", error.message);
  }
}
