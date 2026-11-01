# longbench-harness

LongBench v1 全量外推 harness：在 deepseek-flash API 上跑 900 题（hotpotqa 200 / gov_report 200 / qasper 200 / passage_retrieval 300），自建检索+压缩管线，逐题落盘。

## 最新结果（2026-11-01，官方 eval.py 口径）

| 任务 | 指标 | 分数 |
|---|---|---|
| hotpotqa | token F1 | 71.04 |
| gov_report | ROUGE-L | 23.14 |
| qasper | token F1 | 49.40 |
| passage_retrieval | 准确率 | 100.0 |

自建判分与官方 eval.py 相差 < 2.1 个点。人工抽检 32 条，判分合理 30/32，2 条为 token-F1 固有局限。

## 目录

- `longbench/` — 运行脚本（run、peek、balance、usage-check）
- `scripts/` — 官方口径判分脚本（eval_v1.py + metrics.py，来自 THUDM/LongBench v1 git 历史）
- `runs/2026-11-01-longbench-900/` — 900 题逐题明细、汇总、官方判分、人工抽检

## 口径说明

- 结果按 LongBench v1 官方 `eval.py` 判分（qa_f1 / rouge-l / retrieval），不是自建口径。
- 官方只公开论文全量均值（hotpotqa 64.5 / gov_report 26.7 / qasper 27.6 / passage_retrieval 89.7），无逐题分数，无法做严格同题对照。
- 900 题是 v1 全量约一半，小样本估计 ±3%；gov_report 低于官方均值属真实短板。
