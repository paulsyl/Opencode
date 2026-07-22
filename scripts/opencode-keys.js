#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { readEnvKeys, invalidateCache, getGatedModels } = require('./provider-catalog.js');

// ponytail: minimal key management CLI for opencode keys
const homeDir = process.env.HOME || '';
const envPath = path.join(homeDir, '.config', 'opencode', 'env');
const opencodeJsonPath = path.join(homeDir, '.config', 'opencode', 'opencode.json');

function maskKey(key) {
  if (!key) return '(not set)';
  if (key.length <= 8) return '****' + key.slice(-2);
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function writeEnvKeys(keys) {
  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  const lines = [
    '# Provider API Keys for OpenCode Direct Routing',
    `DEEPSEEK_API_KEY="${keys.deepseek || ''}"`,
    `GEMINI_API_KEY="${keys.gemini || ''}"`
  ];
  fs.writeFileSync(envPath, lines.join('\n') + '\n', { mode: 0o600 });
  invalidateCache();
  syncOpencodeJsonProviders(keys);
}

function syncOpencodeJsonProviders(keys) {
  if (!fs.existsSync(opencodeJsonPath)) return;
  try {
    const cfg = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));
    if (!cfg.provider) cfg.provider = {};

    // Remove legacy omniroute / openai / codex providers
    delete cfg.provider.omniroute;
    delete cfg.provider.openai;
    delete cfg.provider.codex;

    let defaultModel = 'gemini/gemini-2.5-pro';
    if (!keys.gemini && keys.deepseek) defaultModel = 'deepseek/deepseek-chat';

    if (!cfg.model || cfg.model.startsWith('omniroute/') || cfg.model.startsWith('codex/')) {
      cfg.model = defaultModel;
    }
    if (!cfg.small_model || cfg.small_model.startsWith('omniroute/') || cfg.small_model.startsWith('codex/')) {
      cfg.small_model = defaultModel;
    }

    if (keys.deepseek) {
      cfg.provider.deepseek = {
        name: "DeepSeek Direct API",
        npm: "@ai-sdk/openai",
        options: {
          baseURL: "https://api.deepseek.com/v1",
          apiKey: "${DEEPSEEK_API_KEY}"
        },
        models: {
          "deepseek-chat": { name: "DeepSeek Chat", limit: { context: 128000, output: 8192 } },
          "deepseek-reasoner": { name: "DeepSeek Reasoner", reasoning: true, limit: { context: 128000, output: 8192 } }
        }
      };
    } else {
      delete cfg.provider.deepseek;
    }

    if (keys.gemini) {
      cfg.provider.gemini = {
        name: "Google AI Studio API",
        npm: "@ai-sdk/google",
        options: {
          apiKey: "${GEMINI_API_KEY}"
        },
        models: {
          "gemini-2.5-pro": { name: "Gemini 2.5 Pro", limit: { context: 1000000, output: 8192 } },
          "gemini-2.0-flash": { name: "Gemini 2.0 Flash", limit: { context: 1000000, output: 8192 } }
        }
      };
    } else {
      delete cfg.provider.gemini;
    }

    fs.writeFileSync(opencodeJsonPath, JSON.stringify(cfg, null, 2), 'utf8');
  } catch(e) {}
}

const args = process.argv.slice(2);
const command = (args[0] || 'list').toLowerCase();
const providerArg = (args[1] || '').toLowerCase();
let valueArg = args.slice(2).join(' ');

const keys = readEnvKeys();
syncOpencodeJsonProviders(keys);

if (command === 'list' || command === 'status' || command === 'show') {
  console.log('\x1b[36m=====================================================\x1b[0m');
  console.log('\x1b[1m  OpenCode Provider API Key Management\x1b[0m');
  console.log('\x1b[36m=====================================================\x1b[0m\n');

  console.log(`DeepSeek (DEEPSEEK_API_KEY)     : \x1b[33m${maskKey(keys.deepseek)}\x1b[0m`);
  console.log(`Google AI (GEMINI_API_KEY)       : \x1b[33m${maskKey(keys.gemini)}\x1b[0m\n`);

  getGatedModels((err, models, providerMap) => {
    const dsCount = (providerMap.deepseek || []).length;
    const gCount = (providerMap.gemini || []).length;
    console.log(`Available Models -> DeepSeek: \x1b[32m${dsCount}\x1b[0m | Google AI Studio: \x1b[32m${gCount}\x1b[0m (Total: ${models.length})`);
    console.log('\nUsage:');
    console.log('  opencode keys set <deepseek|gemini> [key]');
    console.log('  opencode keys remove <deepseek|gemini>');
    process.exit(0);
  });
} else if (command === 'set') {
  if (!providerArg || (providerArg !== 'deepseek' && providerArg !== 'gemini')) {
    console.error('Error: Specify a valid provider ("deepseek" or "gemini").');
    console.error('Example: opencode keys set deepseek sk-xxxx');
    process.exit(1);
  }

  function applyKey(kVal) {
    keys[providerArg] = kVal.trim();
    writeEnvKeys(keys);
    console.log(`[+] API key for '${providerArg}' updated successfully.`);
    console.log(`[+] Model cache invalidated and provider blocks updated in opencode.json.`);
    process.exit(0);
  }

  if (valueArg) {
    applyKey(valueArg);
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Enter API key for ${providerArg}: `, (input) => {
      rl.close();
      if (!input.trim()) {
        console.error('Error: Key cannot be empty.');
        process.exit(1);
      }
      applyKey(input);
    });
  }
} else if (command === 'remove' || command === 'delete' || command === 'unset') {
  if (!providerArg || (providerArg !== 'deepseek' && providerArg !== 'gemini')) {
    console.error('Error: Specify a valid provider ("deepseek" or "gemini").');
    process.exit(1);
  }

  keys[providerArg] = '';
  writeEnvKeys(keys);
  console.log(`[+] API key for '${providerArg}' removed.`);
  console.log(`[+] Model cache invalidated.`);
  process.exit(0);
} else {
  console.log('Unknown command. Available commands: list, set <provider>, remove <provider>');
  process.exit(1);
}
