import { createApp } from './app.js';
import { config, getListenHost } from './config.js';
import { logger } from './utils/logger.js';

const app = createApp();
const host = getListenHost();

app.listen(config.PORT, host, () => {
  logger.info(`backend listening on http://${host}:${config.PORT} (${config.NODE_ENV})`);
  logger.info(`LLM provider: ${config.LLM_PROVIDER}`);
});
