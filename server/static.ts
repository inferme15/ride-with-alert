import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production, __dirname is 'dist' and client files are in 'dist/public'
  const distPath = path.resolve(__dirname, "public");
  
  console.log(`[STATIC] Looking for static files in: ${distPath}`);
  console.log(`[STATIC] __dirname is: ${__dirname}`);
  console.log(`[STATIC] Directory exists: ${fs.existsSync(distPath)}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(`[STATIC ERROR] Could not find build directory: ${distPath}`);
    console.log(`[STATIC] Available files in __dirname:`, fs.readdirSync(__dirname));
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // List files in the static directory for debugging
  console.log(`[STATIC] Files in ${distPath}:`, fs.readdirSync(distPath));

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    console.log(`[STATIC] Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
  });
}
