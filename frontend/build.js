const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const buildDir = path.join(rootDir, 'build');
const publicDir = path.join(rootDir, 'public');
const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const socketBase = process.env.REACT_APP_SOCKET_URL || apiBase.replace(/\/api\/?$/, '');

function removeDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function copyDir(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

removeDir(buildDir);
fs.mkdirSync(buildDir, { recursive: true });

fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(buildDir, 'index.html'));
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, path.join(buildDir, 'public'));
}

const config = [
  'window.APP_CONFIG = {',
  `  API_BASE: ${JSON.stringify(apiBase)},`,
  `  SOCKET_BASE: ${JSON.stringify(socketBase)},`,
  '  APP_NAME: "Project Management Tool"',
  '};'
].join('\n');

fs.writeFileSync(path.join(buildDir, 'public', 'config.js'), `${config}\n`, 'utf8');
console.log('Frontend build complete');