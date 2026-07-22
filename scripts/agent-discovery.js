const fs = require('fs');
const path = require('path');
const http = require('http');

function discoverAgents(workspaceRoot = process.cwd()) {
  const agents = new Set([
    'architect', 'executor', 'specifier-grill', 'specifier-prd', 'review-council', 'prototype'
  ]);

  const skillDirs = [
    path.join(workspaceRoot, '.agents', 'skills'),
    path.join(workspaceRoot, '.agents'),
    path.join(process.env.HOME || '', '.config', 'skills')
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

  const matrixPath = path.join(workspaceRoot, '.agents', 'agent-models.json');
  if (fs.existsSync(matrixPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
      if (cfg.mappings) Object.keys(cfg.mappings).forEach(a => agents.add(a));
    } catch(e) {}
  }

  return Array.from(agents).sort();
}

function fetchModels(callback) {
  const staticFallback = [
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
    'omniroute/deepseek-r1',
    'omniroute/deepseek-v3',
    'omniroute/deepseek-coder',
    'omniroute/deepseek-v2.5',
    'omniroute/gpt-4o',
    'omniroute/gpt-4o-mini',
    'deepseek-chat',
    'deepseek-reasoner',
    'deepseek-coder'
  ];

  const req = http.get('http://localhost:20128/v1/models', { timeout: 1500 }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        const liveModels = (json.data || []).map(m => m.id || m.name).filter(Boolean);
        const merged = Array.from(new Set([...liveModels, ...staticFallback]));
        callback(merged);
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
    if (model.startsWith('auto/')) {
      add('Auto Combos (OmniRoute)', model);
    } else if (model.startsWith('omniroute/')) {
      add('OmniRoute Gateway', model);
    } else if (model.startsWith('openrouter/')) {
      add('OpenRouter', model);
    } else if (model.startsWith('ollama/')) {
      add('Ollama / Local', model);
    } else if (model.startsWith('bedrock/')) {
      add('Amazon Bedrock', model);
    } else if (model.startsWith('vertex/')) {
      add('Google Vertex AI', model);
    } else if (m.startsWith('gemini') || m.startsWith('google/') || m.includes('google')) {
      add('Google AI Studio', model);
    } else if (m.startsWith('claude') || m.startsWith('anthropic/') || m.includes('anthropic')) {
      add('Anthropic', model);
    } else if (m.startsWith('deepseek') || m.includes('deepseek')) {
      add('DeepSeek', model);
    } else if (m.startsWith('gpt') || m.startsWith('openai/') || m.startsWith('o1') || m.startsWith('o3')) {
      add('OpenAI', model);
    } else {
      const parts = model.split('/');
      if (parts.length > 1) {
        const pName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        add(pName, model);
      } else {
        add('Other Direct Providers', model);
      }
    }
  });

  return groups;
}

module.exports = { discoverAgents, fetchModels, groupModelsByProvider };
