/**
 * File-system helpers built on top of fs-extra.
 *
 * Adds:
 *  - safe path joining within the project root
 *  - JSON read/write with sane defaults
 *  - timestamped artifact paths (screenshots, traces)
 */

const fs = require('fs-extra');
const path = require('path');

const { PATHS } = require('../config/constants');

const ensureDir = (dir) => fs.ensureDirSync(dir);

const readJson = (filePath, fallback = null) => {
  try {
    return fs.readJsonSync(filePath);
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
};

const writeJson = (filePath, data) => {
  fs.ensureDirSync(path.dirname(filePath));
  fs.writeJsonSync(filePath, data, { spaces: 2 });
};

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const writeText = (filePath, content) => {
  fs.ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
};

/**
 * Build a timestamped artifact path inside `screenshots/`.
 */
const screenshotPath = (label) => {
  ensureDir(PATHS.SCREENSHOTS);
  const safe = String(label || 'screenshot').replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(PATHS.SCREENSHOTS, `${safe}-${Date.now()}.png`);
};

/**
 * Load a fixture JSON from `fixtures/`.
 */
const loadFixture = (name) => {
  const file = path.join(PATHS.FIXTURES, name);
  return readJson(file);
};

module.exports = {
  ensureDir,
  readJson,
  writeJson,
  readText,
  writeText,
  screenshotPath,
  loadFixture,
};
