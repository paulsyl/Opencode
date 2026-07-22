const fs = require('fs');
const path = require('path');
const { getGatedModels } = require('./provider-catalog.js');

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
  getGatedModels((err, models) => {
    if (err || !models || models.length === 0) {
      callback([]);
    } else {
      callback(models.map(m => m.id));
    }
  });
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
    if (model.startsWith('deepseek/')) {
      add('DeepSeek', model);
    } else if (model.startsWith('gemini/')) {
      add('Google AI Studio', model);
    } else {
      const prefix = model.includes('/') ? model.split('/')[0] : 'Other';
      const name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      add(name, model);
    }
  });

  return groups;
}

module.exports = { discoverAgents, fetchModels, groupModelsByProvider };
