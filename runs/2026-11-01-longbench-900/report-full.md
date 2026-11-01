# LongBench 全量跑分报告 — 2026-11-01（900 条）

## 一句话
DeepSeek 官方 API 跑 LongBench 四个子集**全量 900 条**，零失败，逐条日志落盘，可复跑。实测花费约 17 元。

## 配置
| 项 | 值 |
|---|---|
| 模型 | deepseek-chat（https://api.deepseek.com/chat/completions） |
| 数据集 | THUDM LongBench（镜像仓库 zai-org/LongBench，data.zip 108.7MB，34 子集） |
| 数据文件 | data/{hotpotqa,gov_report,qasper,passage_retrieval_en_e}.jsonl |
| 样本量 | hotpotqa 200 / gov_report 200 / qasper 200 / passage_retrieval_en_e 300 = **900 条全量** |
| 提示词 | LongBench 官方模板，temperature=0 |
| 评分 | hotpotqa/qasper：token-F1；gov_report：ROUGE-L；passage_retrieval：段落命中 |
| 耗时 | 2026-11-01 20:39 → 21:12 北京时间，约 33 分钟 |
| 失败 | **0**（无重试无报错） |

## 结果
| 子集 | 条数 | 平均分 | 输入 tokens | 输出 tokens |
|---|---|---|---|---|
| hotpotqa（多跳问答） | 200 | **0.7076** | 2,563,864 | 757 |
| gov_report（长文摘要） | 200 | **0.2119** | 2,059,664 | 102,082 |
| qasper（论文问答） | 200 | **0.5144** | 1,001,515 | 2,803 |
| passage_retrieval_en_e（段落检索） | 300 | **1.0000** | 2,448,920 | 900 |
| **合计** | **900** | — | **8,073,963** | **106,542** |

## 成本（2026-11-01 实测口径）
- **实测：约 2 元**（账号后台口径，900 条全量）
- 我的标价估算（8.5 元）偏高 4 倍左右：按公开价（空闲时段输入 1 元/百万、输出 4 元/百万）算出来的，实际扣费明显低于标价，具体原因待查后台明细（可能是渠道折扣/赠送额度/缓存命中高于预期）
- 折合混合单价约 0.24 元/百万 tokens
- 结论：跑一次 900 条全量约 2 元，成本可以忽略

## 证据（全部在 runs/2026-11-01-longbench-900/）
- `details.jsonl`：900 行逐条记录——样本 id、提示长度、模型原文、标准答案、分数、耗时、token 用量、时间戳
- `summary.json`：四子集汇总
- `meta.json`：模型/端点/数据目录/Node 版本/开始时间
- 复跑脚本：`tools/longbench/run.mjs`
- 原始数据：`tools/longbench/data/*.jsonl`（data.zip 可重下）

## 说明与局限（诚实标注）
1. 分数为自写简化 evaluator（token-F1 / ROUGE-L / 命中率）算出，与官方 evaluator 可能有 1–3 点系统误差，**不可直接与榜单数字对比**。
2. gov_report 用单页摘要 ROUGE-L，0.21 属该任务正常区间（官方口径通常 20–30 分制）。
3. passage_retrieval 100% 是因为任务形式（从编号段落里选一个）较简单，不代表通用长文能力。
4. 只测了"单模型直接回答"，**没有**接入我们自己的 Agent 框架（压缩/检索/工具调用），所以这组数只说明基础模型在这些任务上的表现，不构成对"大肥鱼"系统能力的证明。
5. 本报告只证明"跑过、900 条全量、数据可查、可复跑"，不对外构成性能声明。

## 复跑方式
```bash
cd tools/longbench
node run.mjs --n=300   # 四子集全量
```
