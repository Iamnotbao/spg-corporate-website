import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

const allowedEnvExamples = new Set([
  'front-end/.env.example',
  'back-end/.env.example',
]);

const forbiddenTrackedFiles = tracked.filter((file) => {
  const normalized = file.replace(/\\/g, '/');
  if (allowedEnvExamples.has(normalized)) return false;
  return (
    /(^|\/)\.env(?:\.|$)/.test(normalized) ||
    /\.(?:pem|key|p12|pfx)$/i.test(normalized) ||
    /(^|\/)node_modules\//.test(normalized) ||
    /(^|\/)dist\//.test(normalized)
  );
});

const secretPatterns = [
  { name: 'MongoDB Atlas credential', pattern: /mongodb\+srv:\/\/[^\s"'<>]+:[^\s"'<>]+@/gi },
  { name: 'OpenAI-style secret key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'GitHub personal access token', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { name: 'Private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'JWT-looking literal', pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g },
  { name: 'Cloudinary API secret assignment', pattern: /CLOUDINARY_API_SECRET\s*=\s*(?!$|replace|example|your-|<)[^\s#]+/gi },
  { name: 'Resend API key', pattern: /\bre_[A-Za-z0-9_-]{20,}\b/g },
  { name: 'JWT secret assignment', pattern: /JWT_SECRET\s*=\s*(?!$|replace|example|your-|<)[^\s#]+/gi },
  { name: 'Admin password assignment', pattern: /ADMIN_PASSWORD\s*=\s*(?!$|replace|example|your-|<)[^\s#]+/gi },
];

const textExtensions = new Set([
  '.cjs', '.css', '.csv', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.txt', '.xml', '.yml', '.yaml',
]);

function extension(path) {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot).toLowerCase();
}

const findings = [];

for (const file of tracked) {
  const normalized = file.replace(/\\/g, '/');
  if (normalized.endsWith('package-lock.json')) continue;
  if (!textExtensions.has(extension(normalized)) && !normalized.endsWith('.env.example')) continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push(`${normalized}: ${name}`);
  }
}

if (forbiddenTrackedFiles.length || findings.length) {
  console.error('Repository safety check failed.');

  if (forbiddenTrackedFiles.length) {
    console.error('\nForbidden tracked files:');
    forbiddenTrackedFiles.forEach((file) => console.error(`- ${file}`));
  }

  if (findings.length) {
    console.error('\nPotential secret patterns:');
    findings.forEach((finding) => console.error(`- ${finding}`));
  }

  console.error('\nReview each finding. Rotate any real exposed credential instead of merely deleting the current file.');
  process.exit(1);
}

console.log(`Repository safety check passed (${tracked.length} tracked files scanned).`);
