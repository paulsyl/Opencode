#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const { getGatedModels } = require('./provider-catalog.js');

// ponytail: fail-fast reroute using live key-gated model catalog
const autoMode = process.argv.includes('--auto');

getGatedModels((err, models) => {
  if (err || !models || models.length === 0) {
    if (autoMode) {
      console.log('gemini/gemini-2.5-pro');
    } else {
      console.log('CANCEL');
    }
    process.exit(0);
  }

  if (autoMode) {
    console.log(models[0].id);
    process.exit(0);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n=====================================================');
  console.log('  [!] Upstream API Failure / Rate Limit Detected');
  console.log('=====================================================');
  models.forEach((opt, i) => {
    console.log(`  [${i + 1}] ${opt.provider} - ${opt.name} (${opt.id})`);
  });
  console.log('  [Q] Cancel session\n');

  rl.question('Select fallback model to resume: ', (ans) => {
    const idx = parseInt(ans.trim(), 10) - 1;
    if (idx >= 0 && idx < models.length) {
      console.log(`REROUTE:${models[idx].id}`);
    } else {
      console.log('CANCEL');
    }
    rl.close();
  });
});
