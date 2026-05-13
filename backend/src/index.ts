import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

const app = createApp();

app.listen(config.PORT, () => {
  logger.info(`backend listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
  logger.info(`LLM provider: ${config.LLM_PROVIDER}`);
});
