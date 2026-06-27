import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const indexPath = path.join(projectRoot, 'dist/server/index.mjs');

// Read the template
const templatePath = path.join(projectRoot, 'dist/server/index.mjs');
const template = fs.readFileSync(templatePath, 'utf-8');

// Verify it's readable
console.log('✓ Found dist/server/index.mjs template');

// Ensure it has proper content
if (!template.includes('import server from')) {
  console.warn('⚠ index.mjs might not have correct content');
}
