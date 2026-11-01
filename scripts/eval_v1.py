import json, sys
sys.path.insert(0, r'tmp\lb-eval')
from metrics import qa_f1_score, rouge_score, retrieval_score
import os

dataset2metric = {
    'hotpotqa': qa_f1_score,
    'qasper': qa_f1_score,
    'gov_report': rouge_score,
    'passage_retrieval_en': retrieval_score,
}
pred_dir = r'tmp\lb-eval\pred\x'
results = {}
for fn in sorted(os.listdir(pred_dir)):
    if not fn.endswith('.jsonl'): continue
    ds = fn.split('.')[0]
    preds, answers = [], []
    with open(os.path.join(pred_dir, fn), encoding='utf-8') as f:
        for line in f:
            d = json.loads(line)
            preds.append(d['pred'])
            answers.append(d['answers'])
    total = 0.0
    for p, ans in zip(preds, answers):
        score = 0.0
        for gt in ans:
            score = max(score, dataset2metric[ds](p, gt))
        total += score
    results[ds] = round(100 * total / len(preds), 2)
    print(ds, results[ds], f'({len(preds)} items)')
json.dump(results, open(r'tmp\lb-eval\official-scores.json', 'w'), ensure_ascii=False, indent=2)
