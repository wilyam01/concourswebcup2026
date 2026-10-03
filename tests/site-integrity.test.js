const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

function walk(directory, extension, results = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ['.git', 'node_modules', 'concourswebcup2026-main'].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, extension, results);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) results.push(fullPath);
  }
  return results;
}

test('HTML pages reference existing local files and fragment targets', () => {
  const pages = walk(projectRoot, '.html');
  assert.ok(pages.length > 0, 'HTML pages should be present');
  const idPattern = /\bid\s*=\s*["']([^"']+)["']/gi;
  const linkPattern = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;

  for (const page of pages) {
    const markup = fs.readFileSync(page, 'utf8');
    const ids = [...markup.matchAll(idPattern)].map((match) => match[1]);
    const pageIds = new Set(ids);
    assert.equal(pageIds.size, ids.length, `${path.relative(projectRoot, page)} contains duplicate IDs`);
    for (const [, reference] of markup.matchAll(linkPattern)) {
      if (/^(?:https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(reference)) continue;
      const [localPath] = reference.split(/[?#]/, 1);
      const fragment = reference.includes('#') ? reference.slice(reference.indexOf('#') + 1).split(/[?&]/, 1)[0] : '';
      if (!localPath) {
        if (reference.startsWith('#') && fragment) {
          assert.ok(pageIds.has(fragment), `${path.relative(projectRoot, page)} links to missing #${fragment}`);
        }
        continue;
      }
      const target = path.resolve(path.dirname(page), decodeURIComponent(localPath));
      assert.ok(fs.existsSync(target), `${path.relative(projectRoot, page)} references missing ${reference}`);
      if (fragment && /\.html?$/i.test(localPath)) {
        const targetMarkup = fs.readFileSync(target, 'utf8');
        const targetIds = new Set([...targetMarkup.matchAll(idPattern)].map((match) => match[1]));
        assert.ok(targetIds.has(fragment), `${path.relative(projectRoot, page)} links to missing ${reference}`);
      }
    }
  }
});
