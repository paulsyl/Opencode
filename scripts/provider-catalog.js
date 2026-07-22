const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ponytail: minimal provider API catalog manager & key gating module using stdlib
const homeDir = process.env.HOME || '';
const envPath = path.join(homeDir, '.config', 'opencode', 'env');
const cachePath = path.join(homeDir, '.config', 'opencode', 'model-cache.json');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function readEnvKeys() {
  const keys = { deepseek: '', gemini: '', anthropic: '' };
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*(DEEPSEEK_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY)\s*=\s*["']?(.*?)["']?\s*$/);
        if (match) {
          let k = 'gemini';
          if (match[1] === 'DEEPSEEK_API_KEY') k = 'deepseek';
          else if (match[1] === 'ANTHROPIC_API_KEY') k = 'anthropic';
          keys[k] = match[2].trim();
        }
      });
    } catch(e) {}
  }
  return keys;
}

function computeKeyHash(keys) {
  const sortedStr = Object.keys(keys).sort().map(k => `${k}:${keys[k]}`).join(';');
  return crypto.createHash('sha256').update(sortedStr).digest('hex');
}

function readCache(keyHash) {
  if (!fs.existsSync(cachePath)) return null;
  try {
    const raw = fs.readFileSync(cachePath, 'utf8');
    const data = JSON.parse(raw);
    if (data.keyHash !== keyHash) return null;
    const age = Date.now() - new Date(data.timestamp).getTime();
    if (age > CACHE_TTL_MS) return null;
    return data.providers;
  } catch(e) {
    return null;
  }
}

function writeCache(keyHash, providers) {
  const data = {
    keyHash,
    timestamp: new Date().toISOString(),
    providers
  };
  const tmpPath = `${cachePath}.tmp`;
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, cachePath);
  } catch(e) {}
}

function invalidateCache() {
  try {
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
  } catch(e) {}
}

function fetchDeepSeekModels(apiKey, callback) {
  if (!apiKey) return callback(null, []);
  const req = https.get('https://api.deepseek.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    timeout: 5000
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        const list = (json.data || []).map(m => ({
          id: `deepseek/${m.id}`,
          rawId: m.id,
          name: m.id,
          provider: 'DeepSeek'
        }));
        callback(null, list);
      } catch(e) {
        callback(e, []);
      }
    });
  });

  req.on('error', (err) => callback(err, []));
  req.on('timeout', () => { req.destroy(); callback(new Error('DeepSeek API timeout'), []); });
}

function fetchGeminiModels(apiKey, callback) {
  if (!apiKey) return callback(null, []);
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const req = https.get(url, { timeout: 5000 }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        const list = (json.models || []).map(m => {
          const rawId = m.name ? m.name.replace(/^models\//, '') : m.id;
          return {
            id: `gemini/${rawId}`,
            rawId,
            name: m.displayName || rawId,
            provider: 'Google AI Studio'
          };
        });

        // Curated Claude models accessible via Google subscription / Gemini integration
        const claudeModels = [
          { id: 'gemini/claude-3-5-sonnet', rawId: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (Google AI)', provider: 'Google AI Studio' },
          { id: 'gemini/claude-3-7-sonnet', rawId: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet (Google AI)', provider: 'Google AI Studio' },
          { id: 'gemini/claude-3-opus', rawId: 'claude-3-opus', name: 'Claude 3 Opus (Google AI)', provider: 'Google AI Studio' },
          { id: 'gemini/claude-sonnet-4-6', rawId: 'claude-sonnet-4-6', name: 'Claude 4.6 Sonnet (Google AI)', provider: 'Google AI Studio' }
        ];

        callback(null, [...list, ...claudeModels]);
      } catch(e) {
        callback(e, []);
      }
    });
  });

  req.on('error', (err) => callback(err, []));
  req.on('timeout', () => { req.destroy(); callback(new Error('Google AI Studio API timeout'), []); });
}

function fetchAnthropicModels(apiKey, callback) {
  if (!apiKey) return callback(null, []);
  const list = [
    { id: 'anthropic/claude-3-5-sonnet-latest', rawId: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'anthropic/claude-3-7-sonnet-latest', rawId: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', provider: 'Anthropic' },
    { id: 'anthropic/claude-3-opus-latest', rawId: 'claude-3-opus-latest', name: 'Claude 3 Opus', provider: 'Anthropic' },
    { id: 'anthropic/claude-sonnet-4-6', rawId: 'claude-sonnet-4-6', name: 'Claude 4.6 Sonnet', provider: 'Anthropic' }
  ];
  callback(null, list);
}

function getGatedModels(callback) {
  const keys = readEnvKeys();
  const hash = computeKeyHash(keys);

  const cached = readCache(hash);
  if (cached) {
    const flattened = [];
    Object.values(cached).forEach(arr => flattened.push(...arr));
    return callback(null, flattened, cached);
  }

  const providers = { deepseek: [], gemini: [], anthropic: [] };
  let pending = 0;
  if (keys.deepseek) pending++;
  if (keys.gemini) pending++;
  if (keys.anthropic) pending++;

  if (pending === 0) {
    return callback(null, [], providers);
  }

  function checkDone() {
    pending--;
    if (pending <= 0) {
      writeCache(hash, providers);
      const flattened = [...providers.deepseek, ...providers.gemini, ...providers.anthropic];
      callback(null, flattened, providers);
    }
  }

  if (keys.deepseek) {
    fetchDeepSeekModels(keys.deepseek, (err, list) => {
      providers.deepseek = list;
      checkDone();
    });
  }

  if (keys.gemini) {
    fetchGeminiModels(keys.gemini, (err, list) => {
      providers.gemini = list;
      checkDone();
    });
  }

  if (keys.anthropic) {
    fetchAnthropicModels(keys.anthropic, (err, list) => {
      providers.anthropic = list;
      checkDone();
    });
  }
}

module.exports = {
  readEnvKeys,
  computeKeyHash,
  invalidateCache,
  getGatedModels
};
