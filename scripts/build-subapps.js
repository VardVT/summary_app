import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('Building Project-Management-main sub-app...');
  execSync('npm --prefix Project-Management-main/web run build', { stdio: 'inherit' });
  const pmSrc = path.join(process.cwd(), 'Project-Management-main/web/dist');
  const pmDest = path.join(process.cwd(), 'public/project-management');
  fs.rmSync(pmDest, { recursive: true, force: true });
  copyDirSync(pmSrc, pmDest);

  console.log('Building amaterlist-main ISO tools sub-app...');
  execSync('npm --prefix amaterlist-main run build', { stdio: 'inherit' });
  const isoSrc = path.join(process.cwd(), 'amaterlist-main/dist');
  const isoDest = path.join(process.cwd(), 'public/iso-tools');
  fs.rmSync(isoDest, { recursive: true, force: true });
  copyDirSync(isoSrc, isoDest);

  console.log('All sub-apps built and copied to public/ successfully!');
} catch (error) {
  console.error('Failed to build sub-apps:', error);
  process.exit(1);
}
