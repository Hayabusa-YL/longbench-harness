import fs from 'node:fs';
for (const [f, n] of [['hotpotqa.jsonl', 1], ['gov_report.jsonl', 1], ['qasper.jsonl', 1], ['passage_retrieval_en_e.jsonl', 1]]) {
  const lines = fs.readFileSync('data/' + f, 'utf8').split('\n').filter(Boolean);
  const o = JSON.parse(lines[0]);
  console.log('===', f, 'rows=', lines.length);
  console.log('keys:', Object.keys(o).join(','));
  console.log('input:', JSON.stringify(o.input || '').slice(0, 300));
  console.log('context:', JSON.stringify(o.context || '').slice(0, 150));
  console.log('answers:', JSON.stringify(o.answers || o.answer || '').slice(0, 150));
  console.log('length:', o.length, 'id:', o._id);
}
