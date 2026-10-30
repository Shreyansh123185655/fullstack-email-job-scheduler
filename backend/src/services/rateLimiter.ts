import { redisClient } from "../config/redis";

// Lua script guarantees atomicity across multiple distributed workers
const RATE_LIMIT_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = tonumber(redis.call('get', key) or '0')

if current >= limit then
  local ttl = redis.call('ttl', key)
  return { 0, current, ttl }
else
  local new_count = redis.call('incr', key)
  if new_count == 1 then
    -- expire after remaining hour window (3600 seconds)
    redis.call('expire', key, 3600)
  end
  local ttl = redis.call('ttl', key)
  return { 1, new_count, ttl }
end
`;

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  ttlSeconds: number;
  nextWindowTimestamp: number;
}

export const rateLimiter = {
  /**
   * Checks whether the given sender can dispatch an email in the current hourly window
   */
  async checkAndIncrement(senderId: string, hourlyLimit: number): Promise<RateLimitResult> {
    const currentHourIndex = Math.floor(Date.now() / 3600000);
    const key = `rl:${senderId}:${currentHourIndex}`;

    // Execute atomic Lua script
    const result = (await redisClient.eval(
      RATE_LIMIT_LUA,
      1,
      key,
      hourlyLimit.toString()
    )) as [number, number, number];

    const allowed = result[0] === 1;
    const currentCount = result[1];
    const ttlSeconds = Math.max(1, result[2]);

    // Next hour boundary timestamp in ms
    const nextWindowTimestamp = (currentHourIndex + 1) * 3600000;

    return {
      allowed,
      currentCount,
      ttlSeconds,
      nextWindowTimestamp,
    };
  },

  /**
   * Get current usage for a sender in this hour
   */
  async getCurrentUsage(senderId: string): Promise<number> {
    const currentHourIndex = Math.floor(Date.now() / 3600000);
    const key = `rl:${senderId}:${currentHourIndex}`;
    const val = await redisClient.get(key);
    return val ? parseInt(val, 10) : 0;
  },
};
