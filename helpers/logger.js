/**
 * Centralized logger.
 *
 * Uses winston so every part of the framework (helpers, pages, hooks,
 * steps) writes to the same place with consistent formatting. Logs go
 * to stdout AND to `logs/test-<date>.log` for post-mortem analysis.
 */

const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');

const env = require('../config/env');
const { PATHS } = require('../config/constants');

fs.ensureDirSync(PATHS.LOGS);

const today = new Date().toISOString().slice(0, 10);
const logFile = path.join(PATHS.LOGS, `test-${today}.log`);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({ filename: logFile, format: fileFormat }),
  ],
});

logger.step = (message, meta = {}) => logger.info(`STEP: ${message}`, meta);
logger.action = (message, meta = {}) => logger.debug(`ACTION: ${message}`, meta);
logger.assertion = (message, meta = {}) => logger.info(`ASSERT: ${message}`, meta);

module.exports = logger;
