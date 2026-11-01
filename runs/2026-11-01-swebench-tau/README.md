# 2026-11-01 评测报告：SWE-bench 无历史重跑 + τ-bench

> **辅助资料**：本目录仅作补丁有效性验证与评测记录，**不构成模型能力结论**。SWE-bench 的 47/47 是补丁复用验证（非独立解题），四轮尝试分别受 git 历史/补丁复用/网络检索污染。

## 结果总览

| 评测 | 规模 | 结果 |
|---|---|---|
| SWE-bench（无历史快照重跑） | 7 仓库 47 题 | 47/47 通过（补丁有效性验证） |
| SWE-bench astropy | 2 题 | 4 个目标测试通过（单独验证） |
| τ-bench airline（v1.9.4，pass^1） | 5 trials × 50 tasks | **0.4833** |
| τ-bench retail | — | 未完成（模型限流中断 + 网络故障，剩 11 题） |

## SWE-bench 解读（重要，别只看分数）

- 每题都从 `git archive <base_commit>` 导出的**无历史快照**开始（独立 `git init`，无 `.git` 历史），先只应用 test_patch 跑 FAIL_TO_PASS（应失败），再应用修复跑（应通过），跑完 `git checkout -- .` 复原。
- **重跑复用首批修复补丁**（workflow agent 对每份补丁对着 base 源码复核语义后重跑验证），**不是独立从零解题**。换言之，通过 = "补丁在干净快照上有效"，不等于"模型独立解出了这些题"。
- 首批修复可能含模型记忆/网络检索污染（训练数据里可能有这些仓库），未做独立污染排查。把 47/47 读作"独立解题能力"是错误解读。
- 记录口径：通过 = test_patch 的 FAIL_TO_PASS 从 fail → pass（pre 失败、post 通过）。

### 分仓库

| 仓库 | 题数 | 通过 |
|---|---|---|
| django | 23 | 23 |
| matplotlib | 4 | 4 |
| pytest | 3 | 3 |
| scikit-learn | 3 | 3 |
| sphinx | 4 | 4 |
| sympy | 8 | 8 |
| xarray | 2 | 2 |
| astropy（单独验证） | 2 | 4 目标测试通过 |

数据文件：`swebench/report2-*.json`（每题 pre/post 测试输出与 note）。

## τ-bench airline

- 版本 v1.9.4（官方仓库 e02a7f9）
- agent：deepseek-chat（tool-calling），user：deepseek-chat（llm）
- 5 trials × 50 tasks，pass^1 = **0.4833**（官方 runner 输出）
- 官方结果文件在评测副本目录内，未随本报告上传（目录已清理）

## 成本记录（补充）

- 2026-11-01 21–24 点平台口径 token 消耗：10,456,346 / 99,847,920 / 75,799,028
- DSH 会话统计工具（`daily-cost.mjs`/`hourly-cost.mjs`）此前读 `__all__` 镜像目录，**漏统计至多 8 倍**（22 点实测 95.8M 被报成 12.4M）；已修正为遍历全部会话目录并按 session 去重。
- 修正后 DSH 内统计与平台口径的剩余差异：第三方进程直调 API（评测脚本）不经过会话记录。

## 限制

- SWE-bench 分数不代表模型独立解题能力（补丁复用，见上）。
- τ-bench retail 未完成；airline 单环境结果。
- 评测在 Windows 环境跑的，部分用例需要平台 shim（tzset、aclosing、编译扩展），已在逐题 note 里标注。
