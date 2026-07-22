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
    'omniroute/deepseek-r1',
    'omniroute/deepseek-v3',
    'omniroute/gemini-2.0-flash',
    'omniroute/claude-3.5-sonnet',
    'omniroute/gpt-4o',
    'gemini-2.0-flash',
    'deepseek-chat'
  ];

  const req = http.get('http://localhost:20128/v1/models', { timeout: 1500 }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        const models = (json.data || []).map(m => m.id || m.name).filter(Boolean);
        callback(models.length > 0 ? models : staticFallback);
      } catch(e) {
        callback(staticFallback);
      }
    });
  });

  req.on('error', () => callback(staticFallback));
  req.on('timeout', () => { req.destroy(); callback(staticFallback); });
}

module.exports = { discoverAgents, fetchModels };
