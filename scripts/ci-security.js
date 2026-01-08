#!/usr/bin/env node
/*
 * Lightweight static security checks for HTML.
 * Fails on suspected secrets, tracking scripts, or unsafe patterns.
 * Warns on weaker patterns (e.g., missing noopener on target=_blank).
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const trackingSignatures = [
  'googletagmanager.com',
  'www.google-analytics.com',
  'gtag(',
  'ga(',
  'clarity.ms',
  'hotjar.com',
  'segment.io',
  'mixpanel.com',
  'plausible.io',
  'facebook.net',
  'pixel.fb',
  'matomo',
];

// Ignore design-time token attributes while still catching real secrets
const secretPattern =
  /(?<!uses-)(api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9_\-\.=]{16,}["']/i;

const inlineScriptPattern = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const targetBlankPattern = /<a[^>]*target=["']_blank["'][^>]*>/gi;

function readHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .git, .github
      if (['.git', '.github', 'node_modules', '.DS_Store'].includes(entry.name)) {
        return [];
      }
      return readHtmlFiles(fullPath);
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      return [fullPath];
    }
    return [];
  });
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relative = path.relative(rootDir, filePath);
  const issues = [];

  if (secretPattern.test(content)) {
    issues.push({ severity: 'error', message: 'Suspected hardcoded secret/token found.' });
  }

  if (
    trackingSignatures.some((sig) =>
      content.toLowerCase().includes(sig.toLowerCase())
    )
  ) {
    issues.push({ severity: 'error', message: 'Potential third-party tracking script detected.' });
  }

  const inlineScripts = [...content.matchAll(inlineScriptPattern)]
    .map((match) => (match[1] || '').trim())
    .filter((body) => body.length > 0 && !/^<!--/.test(body));
  if (inlineScripts.length > 0) {
    issues.push({
      severity: 'warn',
      message: 'Inline <script> detected. Prefer external JS to reduce XSS risk.',
    });
  }

  const targetBlankLinks = [...content.matchAll(targetBlankPattern)];
  for (const link of targetBlankLinks) {
    if (!/rel\s*=\s*["'][^"']*(noopener|noreferrer)[^"']*["']/i.test(link[0])) {
      issues.push({
        severity: 'warn',
        message: 'target="_blank" without rel="noopener"/"noreferrer".',
      });
    }
  }

  if (/src=["']http:\/\//i.test(content)) {
    issues.push({ severity: 'warn', message: 'HTTP asset detected; prefer HTTPS.' });
  }

  return { file: relative, issues };
}

function main() {
  if (!fs.existsSync(rootDir)) {
    console.error('Root directory not found.');
    process.exit(1);
  }

  const files = readHtmlFiles(rootDir);
  if (files.length === 0) {
    console.warn('No HTML files found.');
    return;
  }

  const results = files.map(scanFile);
  let hasErrors = false;

  for (const result of results) {
    if (result.issues.length === 0) {
      continue;
    }
    console.log(`\n[security] ${result.file}`);
    for (const issue of result.issues) {
      const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
      console[issue.severity === 'error' ? 'error' : 'warn'](
        `  ${prefix}: ${issue.message}`
      );
      if (issue.severity === 'error') {
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error('\nSecurity scan failed due to errors.');
    process.exit(1);
  }

  console.log('\nSecurity scan completed with no blocking errors.');
}

main();
