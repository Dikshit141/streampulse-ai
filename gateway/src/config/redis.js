const Redis = require("ioredis");
const logger = require("../utils/logger");

// Two clients: one for producing, one for consuming (blocking reads need own connection)
let producer = null;
let consumer = null;

const STREAM_KEY = "streampulse:events";
const GROUP_NAME = "analytics-group";

async function connectRedis() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  producer = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
  consumer = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null }); // null = retry forever for blocking reads

  await producer.connect();
  await consumer.connect();

  // Create consumer group if it doesn't exist
  try {
    await producer.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "$", "MKSTREAM");
    logger.info(`Redis Streams: created group '${GROUP_NAME}' on '${STREAM_KEY}'`);
  } catch (err) {
    if (err.message.includes("BUSYGROUP")) {
      logger.info(`Redis Streams: group '${GROUP_NAME}' already exists — OK`);
    } else {
      throw err;
    }
  }

  logger.info("✅ Redis connected");
}

function getProducer() {
  if (!producer) throw new Error("Redis producer not initialised");
  return producer;
}

function getConsumer() {
  if (!consumer) throw new Error("Redis consumer not initialised");
  return consumer;
}

module.exports = { connectRedis, getProducer, getConsumer, STREAM_KEY, GROUP_NAME };
