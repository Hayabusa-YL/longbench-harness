import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const t = fs.readFileSync(path.join(os.homedir(), '.dsh', '.credentials.yaml'), 'utf8');
const key = (t.match(/DEEPSEEK_API_KEY:\s*(\S+)/) || [])[1];
if (!key) { console.log('no key'); process.exit(0); }
const r = await fetch('https://api.deepseek.com/user/balance', { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } });
console.log('status', r.status);
console.log(await r.text());
