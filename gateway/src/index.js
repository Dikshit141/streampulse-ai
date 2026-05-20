require("dotenv").config();
const http = require("http");
const app = require("./app");
const { initSocket } = require("./socket");
const { connectRedis } = require("./config/redis");
const { connectPostgres } = require("./config/postgres");
const { startConsumer } = require("./consumers/analyticsConsumer");
const { startSimulator } = require("./producers/eventSimulator");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    await connectRedis();
    await connectPostgres();

    const server = http.createServer(app);
    initSocket(server);

    await startConsumer();
    startSimulator();

    server.listen(PORT, () => {
      logger.info(`🚀 Gateway running on port ${PORT}`);
      logger.info(`   REST    → http://localhost:${PORT}/api`);
      logger.info(`   WS      → ws://localhost:${PORT}`);
      logger.info(`   Metrics → http://localhost:${PORT}/metrics`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(() => process.exit(0));
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));

  } catch (err) {
    logger.error("Bootstrap failed:", err);
    process.exit(1);
  }
}

bootstrap();
