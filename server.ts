import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Intercept sub-app requests before Vite SPA middleware handles them
  app.use((req, res, next) => {
    const urlPath = req.path;
    let targetDir = '';
    let relativePath = '';

    if (urlPath.startsWith('/project-management')) {
      targetDir = path.join(__dirname, 'public/project-management');
      relativePath = urlPath.replace(/^\/project-management/, '');
    } else if (urlPath.startsWith('/iso-tools')) {
      targetDir = path.join(__dirname, 'public/iso-tools');
      relativePath = urlPath.replace(/^\/iso-tools/, '');
    }

    if (targetDir) {
      if (!relativePath || relativePath === '/') {
        relativePath = '/index.html';
      }
      const fullPath = path.join(targetDir, relativePath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return res.sendFile(fullPath);
      }
    }
    next();
  });

  // Serve static files from root public directory
  app.use(express.static(path.join(__dirname, 'public')));

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    appType: 'spa',
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
