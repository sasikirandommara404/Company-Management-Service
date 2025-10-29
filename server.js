import dotenv from 'dotenv';
dotenv.config();
import logger from './logger.js';
import app from './app.js';

const PORT = process.env.PORT || 3002;

(async () => {

  app.listen(PORT, (err) => {
    if (err) {
      logger.error({ msg: 'Server failed to start', error: err.message });
      process.exit(1);
    }
    logger.info({ msg: 'Server started', url: `http://localhost:${PORT}/api/company` });
  });
})();