# WorkBuddy Training Site

面向内部分享和会后复习的 WorkBuddy 使用教程站点。站点内容围绕真实办公任务组织，重点讲清楚怎么提任务、选模式、验收结果，以及如何把 Skill、专家团、资料库、连接器、Claw、自动化等能力放进业务场景里使用。

## 当前内容

网站主内容来自 `content.js`，配套教程原稿是 `WorkBuddy使用教程与分享文档_2026-06-01.md`。两者需要保持同步。

当前课程结构：

| 章节 | 内容 |
|---|---|
| 1 | 先认识 WorkBuddy：它能帮你做什么 |
| 2 | 学会提任务：怎么把想法说清楚 |
| 3 | 学会选模式：Ask / Plan / Craft 怎么用 |
| 4 | 学会看结果：怎么验收、追问和修正 |
| 5 | 学会扩展能力：Skill、专家、专家团、资料库 |
| 6 | 学会连接外部：连接器、MCP、Claw、自动化 |
| 7 | 常用办公场景：写材料、表格、PPT、纪要、周报 |
| 8 | 业务场景示例：流域治理工作中的真实应用 |
| 9 | Prompt 与模板：可复制、可改写、可复用 |
| 10 | 常见问题：新手卡点和避坑 |

延伸阅读页保留三类资源：项目仓库、WorkBuddy 官方文档、科研写作与 Skill 资源。

## 本地启动

需要先安装 Node.js。启动方式：

```bash
node server.js
```

默认访问地址：

```text
http://127.0.0.1:4321/training-site/
```

如果端口被占用，可以换端口：

```bash
PORT=3000 node server.js
```

然后访问：

```text
http://127.0.0.1:3000/training-site/
```

Windows PowerShell 如果不识别 `PORT=3000`，使用：

```powershell
$env:PORT=3000; node server.js
```

停止服务：在启动服务的终端按 `Ctrl + C`。

## 维护顺序

内容调整时建议按这个顺序：

1. 先改 `WorkBuddy使用教程与分享文档_2026-06-01.md`。
2. 再同步 `content.js`，确保网页内容和教程文档一致。
3. 如果涉及渲染或布局，再改 `app.js` / `styles.css`。
4. 最后启动本地服务并检查页面。

这样做可以避免“文档和网页说法不一致”的问题。

## 文件说明

| 文件 | 作用 |
|---|---|
| `index.html` | 页面入口，一般不用改 |
| `content.js` | 网站内容数据，章节、表格、Prompt、资源都在这里 |
| `app.js` | 前端渲染、路由、搜索、讲解模式、复制按钮 |
| `styles.css` | 页面样式和响应式布局 |
| `server.js` | 本地静态文件服务 |
| `WorkBuddy使用教程与分享文档_2026-06-01.md` | 教程文档原稿 |
| `WorkBuddy_流域生态环境业务应用场景.docx` | 业务场景参考材料 |

## 发布前检查

推荐检查：

```bash
node -e "global.window={}; require('./content.js'); console.log(window.siteContent.chapters.length)"
git diff --check
```

浏览器里重点看：

- 首页学习路线是否是“提任务、选模式、看结果”。
- 第 5 章 Skill 表是否保留所有 Skill，来源链接是否能点击。
- 第 6 章模型选择表是否是“主要差异与短板 / 使用建议”的口吻。
- 第 9 章 Prompt 模板复制按钮是否正常。
- 延伸阅读页是否只保留项目仓库、官方文档、科研写作与 Skill 资源。
- 桌面端和移动端是否没有页面级横向溢出。

如果浏览器仍显示旧内容，先强制刷新，或在地址后加查询参数，例如：

```text
http://127.0.0.1:4321/training-site/?v=1#/resources
```

## 仓库

GitHub 仓库：

```text
https://github.com/pilipalaboom27/train-site
```
