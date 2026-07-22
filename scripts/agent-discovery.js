const fs = require('fs');
const path = require('path');
const http = require('http');

function discoverAgents(workspaceRoot = process.cwd()) {
  const agents = new Set([
    'architect', 'executor', 'specifier-grill', 'specifier-prd', 'review-council', 'prototype'
  ]);

  const homeDir = process.env.HOME || '';

  // 1. Read agent keys from ~/.config/opencode/opencode.json
  const opencodeJsonPath = path.join(homeDir, '.config', 'opencode', 'opencode.json');
  if (fs.existsSync(opencodeJsonPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));
      if (cfg.agent) {
        Object.keys(cfg.agent).forEach(a => agents.add(a));
      }
    } catch(e) {}
  }

  // 2. Scan skill directories for custom skills / agents
  const skillDirs = [
    path.join(workspaceRoot, '.agents', 'skills'),
    path.join(workspaceRoot, '.agents'),
    path.join(homeDir, '.config', 'opencode', 'skills'),
    path.join(homeDir, '.config', 'skills')
  ];

  skillDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        files.forEach(f => {
          const skillPath = path.join(dir, f, 'SKILL.md');
          if (fs.existsSync(skillPath)) {
            try {
              const content = fs.readFileSync(skillPath, 'utf8');
              const match = content.match(/^name:\s*([^\s]+)/m);
              if (match && match[1]) agents.add(match[1].trim());
              else agents.add(f);
            } catch(e) {
              agents.add(f);
            }
          }
        });
      } catch(e) {}
    }
  });

  // 3. Scan matrix config files
  const matrixPaths = [
    path.join(workspaceRoot, '.agents', 'agent-models.json'),
    path.join(homeDir, '.config', 'opencode', 'agent-models.json')
  ];
  matrixPaths.forEach(matrixPath => {
    if (fs.existsSync(matrixPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
        if (cfg.mappings) Object.keys(cfg.mappings).forEach(a => agents.add(a));
      } catch(e) {}
    }
  });

  return Array.from(agents).sort();
}

function fetchModels(callback) {
  const staticFallback = [
    'antigravity/gemini-2.0-flash',
    'antigravity/gemini-1.5-pro',
    'antigravity/claude-3-5-sonnet',
    'antigravity/claude-3-opus',
    'gemini/gemini-2.0-flash',
    'gemini/gemini-1.5-pro',
    'gemini/gemini-1.5-flash',
    'omniroute/gemini-3.6-pro',
    'omniroute/gemini-3.6-flash',
    'omniroute/gemini-3.5-pro',
    'omniroute/gemini-3.5-flash',
    'omniroute/gemini-3.1-pro-high',
    'omniroute/gemini-3.1-pro-low',
    'omniroute/gemini-2.5-pro',
    'omniroute/gemini-2.5-flash',
    'omniroute/gemini-2.0-flash',
    'omniroute/gemini-2.0-flash-lite',
    'omniroute/gemini-2.0-pro-exp-02-05',
    'omniroute/gemini-2.0-flash-thinking-exp',
    'omniroute/gemini-1.5-pro',
    'omniroute/gemini-1.5-flash',
    'gemini-3.6-pro',
    'gemini-3.6-flash',
    'gemini-3.5-pro',
    'gemini-3.5-flash',
    'gemini-3.1-pro-high',
    'gemini-3.1-pro-low',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro-agent',
    'gemini-3-flash-agent',
    'gemini-3.5-flash-low',
    'omniroute/claude-3.7-sonnet',
    'omniroute/claude-3.5-sonnet',
    'omniroute/claude-3.5-haiku',
    'omniroute/claude-3-opus',
    'claude-3-5-sonnet',
    'claude-3-7-sonnet',
    'claude-3-opus',
    'claude-sonnet-4-6',
    'claude-opus-4-7',
    'claude-opus-4-8',
    'omniroute/deepseek-v4',
    'omniroute/deepseek-v4-flash',
    'omniroute/deepseek-v4-pro',
    'omniroute/deepseek-r1',
    'omniroute/deepseek-v3',
    'omniroute/deepseek-coder',
    'omniroute/deepseek-v2.5',
    'omniroute/gpt-4o',
    'omniroute/gpt-4o-mini',
    'deepseek-v4',
    'deepseek-v4-flash',
    'deepseek-v4-pro',
    'deepseek-r1',
    'deepseek-v3',
    'deepseek-coder',
    'gpt-4o',
    'gpt-4o-mini'
  ];

  const req = http.get('http://localhost:20128/v1/models', { timeout: 2000 }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        const fetched = (json.data || []).map(m => m.id);
        const combined = Array.from(new Set([...fetched, ...staticFallback]));
        callback(combined);
      } catch(e) {
        callback(staticFallback);
      }
    });
  });

  req.on('error', () => callback(staticFallback));
  req.on('timeout', () => { req.destroy(); callback(staticFallback); });
}

function groupModelsByProvider(models) {
  const groups = {};

  function add(provider, model) {
    if (!groups[provider]) groups[provider] = [];
    if (!groups[provider].includes(model)) {
      groups[provider].push(model);
    }
  }

  models.forEach(model => {
    const m = model.toLowerCase();

    // 1. Prefix-based grouping
    if (model.startsWith('omniroute/')) {
      add('OmniRoute Gateway', model);
    }
    if (model.startsWith('antigravity/')) {
      add('Antigravity (OAuth)', model);
    }
    if (model.startsWith('gemini/')) {
      add('Google AI Studio (API Key)', model);
    }
    if (model.startsWith('auto/')) {
      add('Auto Combos (OmniRoute)', model);
    }
    if (model.startsWith('openrouter/')) {
      add('OpenRouter', model);
    }
    if (model.startsWith('ollama/')) {
      add('Ollama / Local', model);
    }
    if (model.startsWith('bedrock/')) {
      add('Amazon Bedrock', model);
    }
    if (model.startsWith('vertex/')) {
      add('Google Vertex AI', model);
    }
    if (model.startsWith('tllm/')) {
      add('Together AI', model);
    }

    // 2. Cross-category provider mapping for Claude, Gemini, DeepSeek, OpenAI
    if (m.includes('claude') || m.includes('opus') || m.includes('sonnet') || m.includes('haiku')) {
      add('Google AI (Subscriptions)', model);
      add('Google AI Studio (API Key)', model);
      add('Antigravity (OAuth)', model);
      add('Anthropic (Direct API)', model);
    }

    if (m.includes('gemini') || m.includes('google')) {
      add('Google AI Studio (API Key)', model);
      add('Google AI (Subscriptions)', model);
      add('Antigravity (OAuth)', model);
    }

    if (m.includes('deepseek') || m.includes('r1') || m.includes('coder')) {
      add('DeepSeek (Direct API)', model);
    }

    if (m.includes('gpt') || m.includes('openai') || m.includes('o1') || m.includes('o3')) {
      add('OpenAI (Direct API)', model);
    }

    if (model.includes('/') && !groups['Other Direct Providers']) {
      const prefix = model.split('/')[0];
      const pName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      add(pName, model);
    }
  });

  return groups;
}

module.exports = { discoverAgents, fetchModels, groupModelsByProvider };
