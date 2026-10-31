import Redis from "ioredis";
import { env } from "./env";

export const redisConnectionOptions = {
  host: env.redis.host,
  port: env.redis.port,
  maxRetriesPerRequest: null,
};
export const redisClient = new Redis(redisConnectionOptions);
redisClient.on("connect", () => {
  console.log("Connected to Redis at", `${env.redis.host}:${env.redis.port}`);
});
redisClient.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});
