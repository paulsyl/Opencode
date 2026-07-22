#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');

const autoMode = process.argv.includes('--auto');
const matrixPath = '.agents/agent-models.json';

const fallbackOptions = [
  { name: 'OmniRoute Gemini 2.0 Flash', model: 'omniroute/gemini-2.0-flash' },
  { name: 'OmniRoute DeepSeek V3', model: 'omniroute/deepseek-v3' },
  { name: 'Direct Native Gemini Flash (Fallback)', model: 'gemini-2.0-flash' },
  { name: 'Direct Native DeepSeek (Fallback)', model: 'deepseek-chat' }
];

if (autoMode) {
  let fallback = 'omniroute/gemini-2.0-flash';
  try {
    if (fs.existsSync(matrixPath)) {
      const cfg = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
      fallback = cfg.fallbacks?.default || fallback;
    }
  } catch(e) {}
  console.log(fallback);
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('\n=====================================================');
console.log('  [!] Upstream API Failure / Rate Limit Detected');
console.log('=====================================================');
fallbackOptions.forEach((opt, i) => {
  console.log(`  [${i + 1}] ${opt.name} (${opt.model})`);
});
console.log('  [Q] Cancel session\n');

rl.question('Select fallback model to resume: ', (ans) => {
  const idx = parseInt(ans.trim(), 10) - 1;
  if (idx >= 0 && idx < fallbackOptions.length) {
    console.log(`REROUTE:${fallbackOptions[idx].model}`);
  } else {
    console.log('CANCEL');
  }
  rl.close();
});
