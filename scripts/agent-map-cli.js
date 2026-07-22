#!/usr/bin/env node
const fs = require('fs');
const path = '.agents/agent-models.json';

const availableModels = [
  'omniroute/deepseek-r1',
  'omniroute/deepseek-v3',
  'omniroute/gemini-2.0-flash',
  'omniroute/claude-3.5-sonnet',
  'omniroute/gpt-4o',
  'gemini-2.0-flash',
  'deepseek-chat'
];

let config = { mappings: {}, fallbacks: { default: 'omniroute/gemini-2.0-flash' } };
if (fs.existsSync(path)) {
  try { config = JSON.parse(fs.readFileSync(path, 'utf8')); } catch (e) {}
}

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log('\n--- Agent Model Mapping Matrix ---');
const agents = Object.keys(config.mappings);
agents.forEach((agent, i) => {
  console.log(`[${i + 1}] ${agent}: ${config.mappings[agent]}`);
});
console.log('[Q] Quit\n');

rl.question('Select agent number to change mapping: ', (ans) => {
  if (ans.trim().toUpperCase() === 'Q') {
    rl.close();
    return;
  }
  const index = parseInt(ans, 10) - 1;
  if (index >= 0 && index < agents.length) {
    const selectedAgent = agents[index];
    console.log(`\nAvailable models:\n` + availableModels.map((m, i) => `[${i + 1}] ${m}`).join('\n'));
    rl.question(`Select new model for ${selectedAgent}: `, (mAns) => {
      const mIdx = parseInt(mAns, 10) - 1;
      if (mIdx >= 0 && mIdx < availableModels.length) {
        config.mappings[selectedAgent] = availableModels[mIdx];
        // Atomic file write
        const tmpPath = `${path}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2));
        fs.renameSync(tmpPath, path);
        console.log(`Updated ${selectedAgent} -> ${availableModels[mIdx]}`);
      }
      rl.close();
    });
  } else {
    rl.close();
  }
});
