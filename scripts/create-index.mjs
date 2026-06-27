import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const indexPath = path.join(projectRoot, 'dist/server/index.js');

const content = "export { default } from './server.js';\n";
fs.writeFileSync(indexPath, content);
console.log('✓ Created dist/server/index.js');
