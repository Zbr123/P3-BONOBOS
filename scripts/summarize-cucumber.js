/**
 * Summarize reports/cucumber-report.json scenario outcomes (Cucumber JSON array of features).
 * Run: node scripts/summarize-cucumber.js
 */
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'reports', 'cucumber-report.json');
if (!fs.existsSync(p)) {
  console.log('No reports/cucumber-report.json found.');
  process.exit(0);
}

const raw = fs.readFileSync(p, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Could not parse JSON:', e.message);
  process.exit(1);
}

let passed = 0;
let failed = 0;
let skipped = 0;

if (Array.isArray(data)) {
  for (const feat of data) {
    for (const el of feat.elements || []) {
      const steps = el.steps || [];
      const hasFail = steps.some((s) => s.result?.status === 'FAILED');
      const hasPassedStep = steps.some((s) => s.result?.status === 'PASSED');
      if (hasFail) failed += 1;
      else if (hasPassedStep) passed += 1;
      else skipped += 1;
    }
  }
}

const total = passed + failed + skipped;
console.log(JSON.stringify({ totalScenarios: total, passed, failed, skipped }, null, 2));
