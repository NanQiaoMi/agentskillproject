# 规格说明书 (Specifications) 交互化重构设计规程

本文档定义了 MIMIcode Studio 客户端中“规格说明书 (Specifications)”面板下三个标签页（PRD、Design、API Contracts）的交互化重构设计方案。旨在消除原有的静态占位，实现具有双向数据绑定、动态提取和可视化测试功能的组件。

---

## 1. 架构与组件职责划分

采用**方案 B：模块化子组件拆分**设计。主页面 [SpecificationsView.tsx](file:///d:/agentcode/mimicode-desktop/src/views/SpecificationsView.tsx) 将负责处理 Markdown 文件的异步读写和全局调度，而具体的交互和渲染逻辑将下放到四个独立的子组件中，存放于 `src/components/specs/` 目录：

1. **`PRDSection.tsx`**：负责 PRD 交互式复选框状态同步、需求进度条展示和一键同步任务到系统 Task 模块。
2. **`DesignSection.tsx`**：负责提取 HEX 色卡、提供可互动的 UI 组件沙盒、以及加载/空数据/报错三态（Loading/Empty/Error）的实时预览。
3. **`APIContractsSection.tsx`**：负责提取 API 路由，渲染 Swagger 风格的契约展示，提供 Mock 请求测试沙盒和 JSON 格式校验。
4. **`SpecificationsView.tsx`**（核心调度）：
   - 管理 `activeTab`（PRD, Design, Architecture, API Contracts）和 `activeSection`（侧边栏子目录）。
   - 管理 Markdown 内容的加载（`loadContent`）与保存（`write_file_content`）。
   - 根据当前 `activeTab` 渲染对应的子组件。

---

## 2. 详细设计规范

### 2.1 PRDSection: 交互式需求完成度与任务同步

* **复选框双向绑定**：
  - 前端利用正则表达式提取文本中的所有 `- [ ]` (未完成) 与 `- [x]` (已完成) 条目。
  - 在阅读模式下将它们渲染为真实的 `<input type="checkbox" />`。
  - 当用户点击复选框时，触发回调，在 Markdown 文本中精确定位并修改该行对应的状态（例如将 `- [ ] MVP 核心功能` 修改为 `- [x] MVP 核心功能`），并自动调用 Tauri 后端命令保存回 `PRD.md`，实现零延迟的双向保存。
* **需求进度条**：
  - 顶部显示总需求数、已完成数，并配合一个渐变色发光进度条（如朱红色到柔和绿的渐变），公式：`完成百分比 = (已完成数 / 总需求数) * 100%`。
* **一键同步 Task 任务**：
  - 底部提供“任务一键同步”卡片。
  - 点击“同步为项目任务”时，调用 `run_agentflow_cmd` 后端命令：
    ```bash
    python .agentflow/agentflow.py add --title "PRD需求: <需求标题>" --desc "来自 PRD 导入的需求描述..." --assignee "antigravity"
    ```
  - 同步成功后弹出 Toast 提示，并自动刷新左侧任务看板。

### 2.2 DesignSection: 色卡提取、UI沙盒与三态预览

* **智能调色板**：
  - 正则表达式匹配文本中出现的 HEX 颜色（例如 `#09090b`、`#18181b`、`#10B981`、`#EF4444`）。
  - 渲染为精美的色块卡片，显示色彩名称和 HEX 代码。
  - 点击卡片时使用 `navigator.clipboard.writeText` 写入系统剪贴板，并显示 1.5s 的 "Copied!" 气泡提示。
* **UI 组件沙盒**：
  - 在中间提供一个交互沙盒，现场展示 MIMIcode 风格 of UI 组件：
    - 主操作按钮 (Primary Button)
    - 次操作按钮 (Secondary Button)
    - 幽灵按钮 (Ghost Button)
    - 输入框 (Standard Input)
  - 允许鼠标悬浮、点击、对焦，实时展示组件的 Hover（发光边框）、Active（按压微缩）以及 Focus 效果，验证设计规范。
* **三态（Loading/Empty/Error）预览面板**：
  - 右侧/底部展示三态预览区，提供三个切换 tab。
  - **Loading**：展示带毛玻璃模糊和动态渐变条纹的骨架屏（Skeleton Screen）动画。
  - **Empty**：展示精美的 SVG 磁盘/文件箱空状态插画，配合柔和的文字提示。
  - **Error**：展示带有红色警示发光图标、报错信息以及可点击交互的“重试”按钮。

### 2.3 APIContractsSection: Swagger契约折叠列表与测试沙盒

* **API 折叠列表**：
  - 正则匹配 Markdown 中的 `GET /api/...` 或 `POST /api/...` 段落以及随后的代码块（Request / Response JSON）。
  - 渲染为 Swagger / Postman 风格的接口列表，带有对应的 Method 徽章（`GET` 为蓝色，`POST` 为绿色，`DELETE` 为朱红色）。
* **测试发送沙盒 (API Playground)**：
  - 展开 API 详情时，左边显示预填的 Request JSON 文本域（可编辑），右边显示 API 响应终端面板。
  - 点击“Send Mock Request”按钮，模拟 500ms 的网络延时（显示加载动画），随后展示契约中约定的 Response JSON 响应体，并附带 `Status: 200 OK` 状态徽标。
* **JSON Schema 校验器**：
  - 如果用户修改了 Request Body，点击“校验格式”，前端会解析 JSON 格式。
  - 若格式错误（如缺少逗号、双引号未闭合），则在响应终端中高亮显示具体错误信息；若校验成功，则绿色发光显示 "JSON 契约校验通过 (Valid Schema)"。

---

## 3. 文件变更与验证

- 新建 `src/components/specs/PRDSection.tsx`
- 新建 `src/components/specs/DesignSection.tsx`
- 新建 `src/components/specs/APIContractsSection.tsx`
- 修改 `src/views/SpecificationsView.tsx`（重构渲染部分，接入子组件）
