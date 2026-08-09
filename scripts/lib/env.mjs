import fs from 'node:fs';
import path from 'node:path';

// Petit chargeur .env maison (évite une dépendance supplémentaire).
export function loadEnv(rootDir){
  const envPath = path.join(rootDir, '.env');
  if(!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for(const line of lines){
    const trimmed = line.trim();
    if(!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if(eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))){
      value = value.slice(1, -1);
    }
    if(!(key in process.env)) process.env[key] = value;
  }
}
