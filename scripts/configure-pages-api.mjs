import fs from 'node:fs';

const target = process.argv[2];
if (!target) throw new Error('Usage: node configure-pages-api.mjs <staged-config.js>');

const apiBaseUrl = (process.env.TERRA_NOVA_API_BASE_URL || '').trim().replace(/\/+$/, '');
if (!apiBaseUrl) {
  console.log('TERRA_NOVA_API_BASE_URL is empty; Pages will use local demo mode.');
  process.exit(0);
}

let parsed;
try { parsed = new URL(apiBaseUrl); }
catch { throw new Error('TERRA_NOVA_API_BASE_URL must be a valid HTTPS URL ending in /api'); }
if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.pathname.replace(/\/+$/, '').endsWith('/api')) {
  throw new Error('TERRA_NOVA_API_BASE_URL must be a public HTTPS URL ending in /api, without credentials, query, or fragment');
}

const source = fs.readFileSync(target, 'utf8');
const updated = source.replace(/const DEPLOYED_API_BASE_URL = "";/, `const DEPLOYED_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};`);
if (updated === source) throw new Error('Could not find the API URL placeholder in the staged config.js');
fs.writeFileSync(target, updated, 'utf8');
console.log(`Configured the public site to use ${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}.`);
