#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { discoverAgents, fetchModels } = require('./agent-discovery.js');

const matrixPath = '.agents/agent-models.json';
let config = { mappings: {}, fallbacks: { default: 'omniroute/gemini-2.0-flash' } };

if (fs.existsSync(matrixPath)) {
  try { config = JSON.parse(fs.readFileSync(matrixPath, 'utf8')); } catch (e) {}
}

const agents = discoverAgents();

if (!process.stdin.isTTY) {
  console.log('--- Agent Model Mapping Matrix ---');
  agents.forEach(agent => {
    console.log(`${agent.padEnd(20)} -> ${config.mappings[agent] || config.fallbacks?.default || '(unmapped)'}`);
  });
  console.log('\nRun in an interactive terminal to configure mappings.');
  process.exit(0);
}

fetchModels((models) => {
  let agentIndex = 0;
  let modelIndex = 0;
  let mode = 'SELECT_AGENT'; // SELECT_AGENT | SELECT_MODEL

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  function cleanupAndExit(code = 0) {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    console.clear();
    process.exit(code);
  }

  function render() {
    console.clear();
    console.log('\x1b[36m=====================================================\x1b[0m');
    console.log('\x1b[1m  OpenCode Agent Model Mapping Matrix (Arrow Keys)\x1b[0m');
    console.log('\x1b[36m=====================================================\x1b[0m\n');

    if (mode === 'SELECT_AGENT') {
      console.log('Select an agent persona to configure (\x1b[1m↑/↓\x1b[0m, \x1b[1mEnter\x1b[0m to select, \x1b[1mq\x1b[0m to quit):\n');
      agents.forEach((agent, i) => {
        const isSelected = i === agentIndex;
        const currentModel = config.mappings[agent] || config.fallbacks?.default || '(unmapped)';
        const prefix = isSelected ? '\x1b[32m➔ \x1b[1m' : '  ';
        const suffix = isSelected ? '\x1b[0m' : '';
        console.log(`${prefix}${agent.padEnd(20)} -> ${currentModel}${suffix}`);
      });
    } else {
      const targetAgent = agents[agentIndex];
      console.log(`Select model for \x1b[1m${targetAgent}\x1b[0m (\x1b[1m↑/↓\x1b[0m, \x1b[1mEnter\x1b[0m to save, \x1b[1mEsc\x1b[0m to cancel):\n`);
      models.forEach((m, i) => {
        const isSelected = i === modelIndex;
        const prefix = isSelected ? '\x1b[33m➔ \x1b[1m' : '  ';
        const suffix = isSelected ? '\x1b[0m' : '';
        console.log(`${prefix}${m}${suffix}`);
      });
    }
  }

  function saveMapping(agent, model) {
    if (!config.mappings) config.mappings = {};
    config.mappings[agent] = model;
    const tmpPath = `${matrixPath}.tmp`;
    fs.mkdirSync(path.dirname(matrixPath), { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2));
    fs.renameSync(tmpPath, matrixPath);
  }

  render();

  process.stdin.on('keypress', (str, key) => {
    if (!key) return;
    if (key.ctrl && key.name === 'c') cleanupAndExit(0);

    if (mode === 'SELECT_AGENT') {
      if (key.name === 'q' || key.name === 'escape') cleanupAndExit(0);
      if (key.name === 'up') { agentIndex = (agentIndex - 1 + agents.length) % agents.length; render(); }
      if (key.name === 'down') { agentIndex = (agentIndex + 1) % agents.length; render(); }
      if (key.name === 'return') {
        const currentM = config.mappings[agents[agentIndex]];
        modelIndex = Math.max(0, models.indexOf(currentM));
        mode = 'SELECT_MODEL';
        render();
      }
    } else {
      if (key.name === 'escape' || key.name === 'q') { mode = 'SELECT_AGENT'; render(); }
      if (key.name === 'up') { modelIndex = (modelIndex - 1 + models.length) % models.length; render(); }
      if (key.name === 'down') { modelIndex = (modelIndex + 1) % models.length; render(); }
      if (key.name === 'return') {
        saveMapping(agents[agentIndex], models[modelIndex]);
        mode = 'SELECT_AGENT';
        render();
      }
    }
  });
});
