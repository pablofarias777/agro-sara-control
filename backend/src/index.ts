import { buildServer } from "./server.js";
import { env } from "./env.js";

const app = buildServer();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
