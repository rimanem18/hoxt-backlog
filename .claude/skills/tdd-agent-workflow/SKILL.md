---
name: tdd-agent-workflow
description: Use this for TDD-oriented implementation work where exploration, planning, Red, Green, and Refactor should be separated across main and subagents.
model: sonnet
effort: medium
---

ユーザーから TDD で解決可能な課題を提示されたときに、それを解決する。

1. Haiku Explore サブエージェントで探索
2. @tdd-opus-planner エージェントで計画または計画に不足する情報の明示をメインエージェントに返却。不足情報があれば 1 へ。情報が十分であれば計画を済ませて 3 へ。（1 へ戻ってよいのは 2 回までとする）
3. 計画に基づき、 Red をメインエージェントで加筆修正。 Green をサブエージェントで書く。メインエージェントで Refactor 対応。Green は重みに応じて、@green-haiku-worker or @green-minimal-implementer を選択
4. @quality-gate-runner で test / typecheck / lint / semgrep / build check を実行
5. 4 と並行してレビューを依頼。レビュー結果が返ってきたら、 `/resolve-feedback` スキルを使用
