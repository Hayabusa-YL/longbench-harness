// LongBench 抽样跑分（Node 版）：4 个子集 × N 条，DeepSeek API，逐条落日志。
// 用法：node run.mjs [--n=15] [--subset=hotpotqa,gov_report,...] [--out=runs/<tag>]
// 证据：每条样本的 prompt 摘要 / 模型输出 / 耗时 / usage 全写 details.jsonl；汇总写 summary.json。
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
}));
const N = parseInt(args.n || '15', 10);
const SUBSETS = (args.subset || 'hotpotqa,gov_report,qasper,passage_retrieval_en_e').split(',');
const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replace(/\//g, '\\'));
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUTDIR = path.join(ROOT, args.out || path.join('runs', STAMP));
fs.mkdirSync(OUTDIR, { recursive: true });

// ---------- API key ----------
function readKey() {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  const p = path.join(os.homedir(), '.dsh', '.credentials.yaml');
  const t = fs.readFileSync(p, 'utf8');
  const m = t.match(/DEEPSEEK_API_KEY:\s*(\S+)/);
  if (!m) throw new Error('no DEEPSEEK_API_KEY');
  return m[1];
}
const KEY = readKey();

// ---------- LongBench official-ish prompts ----------
const P = {
  hotpotqa: (o) => `Answer the question based on the given passages. Only give me the answer and do not output any other words.\n\nThe following are given passages.\n${o.context}\n\nAnswer the question based on the given passages. Only give me the answer and do not output any other words.\n\nQuestion: ${o.input}\nAnswer:`,
  qasper: (o) => `Answer the question based on the given passages. Only give me the answer and do not output any other words.\n\nThe following are given passages.\n${o.context}\n\nAnswer the question based on the given passages. Only give me the answer and do not output any other words.\n\nQuestion: ${o.input}\nAnswer:`,
  gov_report: (o) => `Write a one-page summary of the report.\n\n${o.context}\n\n`,
  passage_retrieval_en_e: (o) => `Below is a narrative and a series of numbered paragraphs. Select the paragraph that answers the question. \n\n${o.context}\n\nQuestion: ${o.input}\nAnswer:`,
};
const MAXTOK = { hotpotqa: 64, qasper: 64, gov_report: 512, passage_retrieval_en_e: 32 };

// ---------- scoring ----------
const norm = (s) => String(s || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
function f1(pred, gold) {
  const p = norm(pred).split(' ').filter(Boolean);
  const g = norm(gold).split(' ').filter(Boolean);
  if (!p.length || !g.length) return 0;
  const common = g.filter((w) => p.includes(w)).length;
  if (!common) return 0;
  const prec = common / p.length, rec = common / g.length;
  return (2 * prec * rec) / (prec + rec);
}
function rougeL(pred, gold) {
  const a = norm(gold).split(' ').filter(Boolean);
  const b = norm(pred).split(' ').filter(Boolean);
  if (!a.length || !b.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  }
  const lcs = dp[a.length][b.length];
  const prec = lcs / b.length, rec = lcs / a.length;
  return (2 * prec * rec) / (prec + rec) || 0;
}
const scoreFn = {
  hotpotqa: (pred, ans) => Math.max(...ans.map((g) => f1(pred, g))),
  qasper: (pred, ans) => Math.max(...ans.map((g) => f1(pred, g))),
  gov_report: (pred, ans) => Math.max(...ans.map((g) => rougeL(pred, g))),
  passage_retrieval_en_e: (pred, ans) => (ans.some((g) => norm(pred).includes(norm(g).replace(/^paragraph\s*/i, '')) || norm(pred).includes(norm(g))) ? 1 : 0),
};

// ---------- model call ----------
async function callModel(prompt, maxTokens, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const t0 = Date.now();
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: AbortSignal.timeout(180000),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
      const j = await r.json();
      const text = j.choices?.[0]?.message?.content ?? '';
      return { text, ms: Date.now() - t0, usage: j.usage || {}, ok: true };
    } catch (e) {
      if (i === retries - 1) return { text: '', ms: Date.now() - t0, usage: {}, ok: false, err: String(e?.message || e).slice(0, 200) };
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
}

// ---------- main ----------
const meta = {
  stamp: STAMP, n: N, model: 'deepseek-chat', subsets: SUBSETS,
  endpoint: 'https://api.deepseek.com/chat/completions',
  dataDir: path.join(ROOT, 'data'),
  node: process.version, startedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(OUTDIR, 'meta.json'), JSON.stringify(meta, null, 1));
const details = fs.openSync(path.join(OUTDIR, 'details.jsonl'), 'a');
const summary = {};

for (const sub of SUBSETS) {
  const file = path.join(ROOT, 'data', sub + '.jsonl');
  if (!fs.existsSync(file)) { console.log('missing subset', sub); continue; }
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(0, N).map((l) => JSON.parse(l));
  const scores = [];
  let cost = { input: 0, output: 0 };
  let fails = 0;
  console.log(`\n===== ${sub}: ${rows.length} rows =====`);
  for (let i = 0; i < rows.length; i++) {
    const o = rows[i];
    const prompt = P[sub](o);
    const res = await callModel(prompt, MAXTOK[sub] || 128);
    const gold = o.answers || [];
    const sc = res.ok ? scoreFn[sub](res.text, gold) : 0;
    if (!res.ok) fails++;
    if (res.usage?.prompt_tokens) { cost.input += res.usage.prompt_tokens; cost.output += res.usage.completion_tokens || 0; }
    scores.push(sc);
    const rec = {
      subset: sub, idx: i, id: o._id, inputLen: (o.input || '').length, ctxLen: (o.context || '').length,
      promptChars: prompt.length, pred: String(res.text || '').slice(0, 300), gold: gold.map((g) => String(g).slice(0, 200)),
      score: sc, ms: res.ms, usage: res.usage, ok: res.ok, err: res.err || null, at: new Date().toISOString(),
    };
    fs.writeSync(details, JSON.stringify(rec) + '\n');
    if (i % 5 === 0 || i === rows.length - 1) console.log(`  [${i + 1}/${rows.length}] score=${sc.toFixed(3)} ms=${res.ms} out=${JSON.stringify(rec.pred).slice(0, 80)}`);
  }
  const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  summary[sub] = {
    n: rows.length, meanScore: +avg.toFixed(4), fails,
    promptTokens: cost.input, completionTokens: cost.output,
  };
  console.log(`${sub} => mean=${avg.toFixed(4)} fails=${fails} tokens=${cost.input}/${cost.output}`);
  fs.writeFileSync(path.join(OUTDIR, 'summary.json'), JSON.stringify({ meta, summary }, null, 1));
}
fs.closeSync(details);
console.log('\nDONE', JSON.stringify(summary, null, 1));
console.log('outdir:', OUTDIR);
