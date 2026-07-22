#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { discoverAgents, fetchModels, groupModelsByProvider } = require('./agent-discovery.js');

const homeDir = process.env.HOME || '';

function loadConfig() {
  let mappings = {};

  // 1. Read existing models from ~/.config/opencode/opencode.json
  const opencodeJsonPath = path.join(homeDir, '.config', 'opencode', 'opencode.json');
  if (fs.existsSync(opencodeJsonPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));
      if (cfg.agent) {
        Object.keys(cfg.agent).forEach(a => {
          if (cfg.agent[a] && cfg.agent[a].model) {
            mappings[a] = cfg.agent[a].model;
          }
        });
      }
    } catch(e) {}
  }

  // 2. Override with ~/.config/opencode/agent-models.json
  const globalMatrixPath = path.join(homeDir, '.config', 'opencode', 'agent-models.json');
  if (fs.existsSync(globalMatrixPath)) {
    try {
      const gCfg = JSON.parse(fs.readFileSync(globalMatrixPath, 'utf8'));
      if (gCfg.mappings) Object.assign(mappings, gCfg.mappings);
    } catch(e) {}
  }

  // 3. Override with workspace .agents/agent-models.json
  const localMatrixPath = '.agents/agent-models.json';
  if (fs.existsSync(localMatrixPath)) {
    try {
      const lCfg = JSON.parse(fs.readFileSync(localMatrixPath, 'utf8'));
      if (lCfg.mappings) Object.assign(mappings, lCfg.mappings);
    } catch(e) {}
  }

  return { mappings, fallbacks: { default: 'omniroute/gemini-2.0-flash' } };
}

const matrixPath = '.agents/agent-models.json';
let config = loadConfig();

const agents = discoverAgents();

if (!process.stdin.isTTY) {
  console.log('--- Agent Model Mapping Matrix ---');
  agents.forEach(agent => {
    console.log(`${agent.padEnd(20)} -> ${config.mappings[agent] || config.fallbacks?.default || '(unmapped)'}`);
  });
  console.log('\nRun in an interactive terminal to configure mappings.');
  process.exit(0);
}

fetchModels((rawModels) => {
  const grouped = groupModelsByProvider(rawModels);
  const providerNames = [...Object.keys(grouped), '+ Enter custom model ID...'];

  let agentIndex = 0;
  let providerIndex = 0;
  let modelIndex = 0;
  let mode = 'SELECT_AGENT'; // SELECT_AGENT | SELECT_PROVIDER | SELECT_MODEL | CUSTOM_INPUT
  let selectedProvider = '';
  let currentProviderModels = [];

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  function cleanupAndExit(code = 0) {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    console.clear();
    process.exit(code);
  }

  function render() {
    if (mode === 'CUSTOM_INPUT') return;
    console.clear();
    console.log('\x1b[36m=====================================================\x1b[0m');
    console.log('\x1b[1m  OpenCode Agent Model Mapping Matrix\x1b[0m');
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
    } else if (mode === 'SELECT_PROVIDER') {
      const targetAgent = agents[agentIndex];
      console.log(`Persona: \x1b[1m${targetAgent}\x1b[0m`);
      console.log('Select a Model Provider (\x1b[1m↑/↓\x1b[0m, \x1b[1mEnter\x1b[0m to select, \x1b[1mEsc\x1b[0m to go back):\n');
      providerNames.forEach((p, i) => {
        const isSelected = i === providerIndex;
        const prefix = isSelected ? '\x1b[33m➔ \x1b[1m' : '  ';
        const suffix = isSelected ? '\x1b[0m' : '';
        console.log(`${prefix}${p}${suffix}`);
      });
    } else if (mode === 'SELECT_MODEL') {
      const targetAgent = agents[agentIndex];
      console.log(`Persona: \x1b[1m${targetAgent}\x1b[0m > Provider: \x1b[1m${selectedProvider}\x1b[0m`);
      console.log('Select model (\x1b[1m↑/↓\x1b[0m, \x1b[1mEnter\x1b[0m to save, \x1b[1mEsc\x1b[0m to go back):\n');
      currentProviderModels.forEach((m, i) => {
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

    // 1. Save local matrix
    const tmpPath = `${matrixPath}.tmp`;
    fs.mkdirSync(path.dirname(matrixPath), { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2));
    fs.renameSync(tmpPath, matrixPath);

    // 2. Save global matrix
    const globalMatrixDir = path.join(homeDir, '.config', 'opencode');
    const globalMatrixPath = path.join(globalMatrixDir, 'agent-models.json');
    try {
      fs.mkdirSync(globalMatrixDir, { recursive: true });
      fs.writeFileSync(globalMatrixPath, JSON.stringify(config, null, 2));
    } catch(e) {}

    // 3. Sync directly into ~/.config/opencode/opencode.json
    const opencodeJsonPath = path.join(homeDir, '.config', 'opencode', 'opencode.json');
    if (fs.existsSync(opencodeJsonPath)) {
      try {
        const opencodeCfg = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));
        if (!opencodeCfg.agent) opencodeCfg.agent = {};
        if (!opencodeCfg.agent[agent]) opencodeCfg.agent[agent] = {};
        
        let fullModel = model;
        if (!fullModel.includes('/')) fullModel = `omniroute/${fullModel}`;

        opencodeCfg.agent[agent].model = fullModel;

        if (!opencodeCfg.provider) opencodeCfg.provider = {};
        if (!opencodeCfg.provider.omniroute) {
          opencodeCfg.provider.omniroute = {
            name: "OmniRoute Gateway",
            npm: "@ai-sdk/openai",
            options: { baseURL: "http://localhost:20128/v1", apiKey: "omniroute-local" },
            models: {}
          };
        }
        if (!opencodeCfg.provider.omniroute.models) opencodeCfg.provider.omniroute.models = {};

        const parts = fullModel.split('/', 2);
        if (parts[0] === 'omniroute' && parts[1]) {
          const modelKey = parts[1];
          if (!opencodeCfg.provider.omniroute.models[modelKey]) {
            opencodeCfg.provider.omniroute.models[modelKey] = {
              name: modelKey,
              limit: { context: 200000, output: 8192 }
            };
          }
        }

        fs.writeFileSync(opencodeJsonPath, JSON.stringify(opencodeCfg, null, 2));
      } catch(e) {}
    }
  }

  function promptCustomModel() {
    mode = 'CUSTOM_INPUT';
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    console.clear();
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const targetAgent = agents[agentIndex];
    rl.question(`Enter custom model ID for \x1b[1m${targetAgent}\x1b[0m (e.g. omniroute/my-model): `, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed) {
        saveMapping(targetAgent, trimmed);
      }
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      mode = 'SELECT_AGENT';
      render();
    });
  }

  render();

  process.stdin.on('keypress', (str, key) => {
    if (mode === 'CUSTOM_INPUT') return;
    if (!key) return;
    if (key.ctrl && key.name === 'c') cleanupAndExit(0);

    if (mode === 'SELECT_AGENT') {
      if (key.name === 'q' || key.name === 'escape') cleanupAndExit(0);
      if (key.name === 'up') { agentIndex = (agentIndex - 1 + agents.length) % agents.length; render(); }
      if (key.name === 'down') { agentIndex = (agentIndex + 1) % agents.length; render(); }
      if (key.name === 'return') {
        providerIndex = 0;
        mode = 'SELECT_PROVIDER';
        render();
      }
    } else if (mode === 'SELECT_PROVIDER') {
      if (key.name === 'escape' || key.name === 'q') { mode = 'SELECT_AGENT'; render(); }
      if (key.name === 'up') { providerIndex = (providerIndex - 1 + providerNames.length) % providerNames.length; render(); }
      if (key.name === 'down') { providerIndex = (providerIndex + 1) % providerNames.length; render(); }
      if (key.name === 'return') {
        if (providerIndex === providerNames.length - 1) {
          promptCustomModel();
        } else {
          selectedProvider = providerNames[providerIndex];
          currentProviderModels = grouped[selectedProvider] || [];
          const currentM = config.mappings[agents[agentIndex]];
          const foundIdx = currentProviderModels.indexOf(currentM);
          modelIndex = foundIdx >= 0 ? foundIdx : 0;
          mode = 'SELECT_MODEL';
          render();
        }
      }
    } else if (mode === 'SELECT_MODEL') {
      if (key.name === 'escape' || key.name === 'q') { mode = 'SELECT_PROVIDER'; render(); }
      if (key.name === 'up') { modelIndex = (modelIndex - 1 + currentProviderModels.length) % currentProviderModels.length; render(); }
      if (key.name === 'down') { modelIndex = (modelIndex + 1) % currentProviderModels.length; render(); }
      if (key.name === 'return') {
        saveMapping(agents[agentIndex], currentProviderModels[modelIndex]);
        mode = 'SELECT_AGENT';
        render();
      }
    }
  });
});
