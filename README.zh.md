# vigil

一个安静的、基于文件监听的 dashboard，给 [GSD][gsd] 风格的
coding-agent 工作流用 —— 它们把持久状态写进 `.planning/` 目录。
早上打开它，大概三十秒就能想起昨天停在哪里。

[gsd]: https://github.com/open-gsd/get-shit-done-redux

> 只读。vigil 不会执行任何工作流命令，不会拉起 agent，不会改任何
> 文件。它只看和渲染。

English: [README.md](README.md)

---

## 它是什么

vigil 监听一个 `.planning/` 目录 —— 这是 [Get Shit Done (GSD)][gsd]
的磁盘约定，GSD 是一种把编码任务拆成阶段（`discuss` → `ui` →
`plan` → `execute` → `verify` → `ui-review`）、把每个 phase 的产物和
每个 plan 的进度落盘的结构化工作流 —— 并把当前状态渲染成一个信息
密度高的页面：

- **顶栏** — 项目路径、当前 phase、推荐的下一个命令、最近项目切换器。
- **Stages 列** — 当前 phase 的六个阶段（`discuss` / `ui` / `plan` /
  `execute` / `verify` / `ui-review`），当前阶段以烛火琥珀色强调条
  标出。多文件阶段（如多个 `*-PLAN.md`，或 `CONTEXT` +
  `DISCUSSION-LOG` + `RESEARCH`）会就地展开为可点击的子条目。
- **Plans 列**（选中 `execute` 时） — plan 按 wave 分组，每行带字符
  glyph（`✓ ◐ ○ ✗`）、plan id、名称，以及证据 chip：运行中 mtime、
  人工 checkpoint 标志、失败 chip。
- **Artifact 抽屉**（选中非 execute 阶段的文档时） — markdown 全文
  渲染（GFM 支持），frontmatter 抽成结构化卡片，GSD 自定义 XML 标签
  （`<task>`、`<verify>` 等）渲染为 callout，`@file/path` 引用渲染为
  可点击的编辑器跳转链接。超长文档截到 500 行 / 8000 字符，底部给出
  打开编辑器的提示。
- **实时更新** — 文件变化通过 SSE 推送；多个浏览器 tab 同步；连接断
  开自动重连。
- **空状态** — 分别覆盖 "找不到 `.planning/`"、"刚创建的
  `.planning/`"、"部分文件格式有问题" 三种情况。不弹窗，不在早晨九点
  给你一个红色错误。

视觉语言是 "Night-watch journal"：温暖的暗色墨水底，旧纸张色的前景，
唯一的琥珀色用于此刻正在燃烧的那一件事，鼠尾草绿表示已完成，赤陶色
表示失败。没有蓝色，没有卡片阴影，没有 icon 库。

## 安装

> **暂未发布到 npm**，很快会发。现在请 clone 仓库从源码运行 ——
> 见 [开发](#开发)。

```bash
# 即将上线
npm install -g vigil
```

需要 Node ≥ 20。

## 运行

```bash
vigil                       # 从当前目录向上自动查找 .planning/
vigil ~/project/foo         # 显式指定项目路径
```

然后访问 <http://localhost:7171>。

CLI 只有这两种形式，没有子命令，除了 `--help` / `--version` 之外没有
任何其他参数。

## 覆盖编辑器

默认情况下，"open in editor" 使用 `vscode://` URL scheme，这同样适用
于 Cursor、Windsurf、Trae 以及任何 VS Code fork。要换其他编辑器：

```bash
export VIGIL_OPEN_URL="cursor://file/%s"
```

`%s` 是 URL 编码后的绝对路径。每个 "open in editor" 链接旁边都有
"复制路径" 按钮作为兜底。

## 最近项目

vigil 在 `~/.config/vigil/recent.json` 中记住最多 8 个最近打开的项目
路径，在顶栏下拉框里切换。这个文件只存路径 —— 没有 per-project 偏好，
没有窗口状态，没有遥测。

## 它期望的磁盘布局

一个 GSD 风格工作流维护的 `.planning/` 目录：

```
.planning/
├── STATE.md               # YAML frontmatter: active_phase, next_action, …
├── ROADMAP.md             # plan id → 可读名称
└── phases/
    └── 03-drug-lookup/
        ├── 03-CONTEXT.md         # discuss
        ├── 03-DISCUSSION-LOG.md  # discuss
        ├── 03-RESEARCH.md        # discuss
        ├── 03-UI-SPEC.md         # ui
        ├── 03-01-PLAN.md         # plan（一个 plan 一个）
        ├── 03-01-SUMMARY.md      # execute（一个 plan 一个）
        ├── 03-02-PLAN.md
        ├── 03-02-SUMMARY.md
        ├── 03-VERIFICATION.md    # verify
        └── 03-REVIEW.md          # ui-review
```

背景与解释在
[`research/03-gsd-observations.md`](research/03-gsd-observations.md)。
产品定位见
[`research/01-product-thesis.md`](research/01-product-thesis.md)。

## 开发

```bash
npm install
npm run dev          # Hono server :7171 + Vite client :5173
npm run build        # Vite → dist/client，tsc → dist/server
npm start            # 运行构建后的 server
npm run typecheck    # 对 server / client 两套 tsconfig 都跑 tsc
npm run lint         # eslint --max-warnings=0
npx vitest run       # parsers + server 测试
```

架构边界由 `eslint.config.js` 中的 import 限制强制为严格依赖 DAG：

- `src/types/` — 叶子，不能从 server/client 引入
- `src/parsers/` — 纯函数，禁用 `fs` / `node:*` / `chokidar` / server / client
- `src/server/` — Hono 应用，独占文件系统 I/O
- `src/client/` — React 19 + Vite SPA

设计决策放在 `research/` 下（`00-INDEX.md` 是索引）。修改解析逻辑或
UI 语义前先读那些。

## Roadmap

vigil 当前只理解 [GSD][gsd] 的 `.planning/` 布局。但 parsers 是
host-agnostic 的纯函数，新工作流可以作为独立 adapter 接入，不需要动
渲染层。

下一步打算支持：

- **[Superpowers][superpowers]** — Jesse Vincent 的 Claude Code skill
  集合。等它的磁盘约定稳定后，目标是用同一套 Stages / Plans /
  Drawer 布局把它的产物渲染出来。

[superpowers]: https://github.com/obra/superpowers

## 许可

MIT
