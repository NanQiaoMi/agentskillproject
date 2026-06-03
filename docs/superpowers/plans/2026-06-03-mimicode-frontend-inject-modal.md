# MIMIcode AgentFlow Prompt Injection Frontend Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 当用户在 MIMIcode Studio 启动外部智能体 CLI 后，立刻在前端界面弹出一个美观的毛玻璃模态提示窗，引导用户在终端按 Ctrl+V 粘贴注入角色提示词，并支持键盘 Esc/Enter 快捷键关闭。

**Architecture:** 
1. 在 `src/App.css` 中追加专门针对提示对话框、动效图标、操作指令框和 `<kbd>` 键盘按键风格的高保真样式（支持 Glassmorphism 毛玻璃特效与微粒子投影）。
2. 在 `AgentsView.tsx` 引入 `injectModalAgent` 状态，触发渲染并注册键盘快捷键监听，拦截回车与 Esc 以关闭对话框。

**Tech Stack:** React, TypeScript, Vanilla CSS, Tailwind (optional, but vanilla CSS preferred for variables)

---

### Task 1: 优化前端样式系统，在 App.css 中加入 Modal 与 Kbd 专属样式

**Files:**
- Modify: `mimicode-desktop/src/App.css`

- [ ] **Step 1: 在 App.css 的末尾追加毛玻璃 Modal 专用样式**
  在 `App.css` 底部追加以下类：
  ```css
  /* AgentFlow Prompt Injection Modal Styles */
  .inject-modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
    animation: fadeIn 0.25s ease-out;
  }

  .inject-modal-card {
    width: 440px;
    background: rgba(30, 41, 59, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    padding: 32px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    color: #f8fafc;
    animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .inject-modal-icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }

  .inject-success-icon {
    width: 28px;
    height: 28px;
    color: #10b981;
    animation: pulseGlow 2s infinite;
  }

  .inject-modal-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #f1f5f9;
  }

  .inject-modal-desc {
    font-size: 13px;
    line-height: 1.6;
    color: #94a3b8;
    margin-bottom: 24px;
  }

  .inject-modal-desc strong {
    color: #e2e8f0;
  }

  .action-hint-box {
    width: 100%;
    background: rgba(15, 23, 42, 0.4);
    border: 1px dashed rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 14px 16px;
    font-size: 12px;
    line-height: 1.6;
    color: #cbd5e1;
    margin-bottom: 28px;
  }

  .kbd-badge {
    background: #334155;
    border: 1px solid #475569;
    border-radius: 4px;
    box-shadow: 0 2px 0 #1e293b;
    color: #f8fafc;
    display: inline-block;
    font-size: 11px;
    font-family: inherit;
    font-weight: 600;
    line-height: 1;
    padding: 3px 6px;
    margin: 0 2px;
    vertical-align: middle;
  }

  .inject-modal-btn {
    width: 100%;
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    background: #10b981;
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .inject-modal-btn:hover {
    background: #059669;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes pulseGlow {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    50% { transform: scale(1.05); box-shadow: 0 0 12px 4px rgba(16, 185, 129, 0.15); }
  }
  ```

- [ ] **Step 2: Commit 任务一**
  运行：
  ```bash
  git add mimicode-desktop/src/App.css
  git commit -m "style: add prompt injection modal styles to App.css"
  ```

---

### Task 2: 在 AgentsView.tsx 中增加提示弹窗逻辑与 UI

**Files:**
- Modify: `mimicode-desktop/src/views/AgentsView.tsx`

- [ ] **Step 1: 声明新状态 `injectModalAgent`**
  在 `AgentsView` 组件顶部的状态定义区中插入：
  ```typescript
  const [injectModalAgent, setInjectModalAgent] = useState<AgentConfig | null>(null);
  ```

- [ ] **Step 2: 键盘监听逻辑注册**
  当弹窗弹出时，监听 `keydown` 事件以拦截 `Esc` 与 `Enter` 快捷关闭。在组件内增加如下 `useEffect`：
  ```typescript
  // Listen for Enter / Escape keys to quickly dismiss the modal
  useEffect(() => {
    if (!injectModalAgent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        setInjectModalAgent(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [injectModalAgent]);
  ```

- [ ] **Step 3: 重构 handleLaunch 触发弹窗**
  在 `handleLaunch` 成功后激活弹窗。在 `handleLaunch` 底部 `try` 块的成功路径上（第 140 行左右），添加：
  ```typescript
        setRunningAgents(prev => ({ ...prev, [agent.id]: true }));
        setInjectModalAgent(agent); // 激活弹窗
        setTimeout(() => setLaunchingId(null), 1000);
  ```

- [ ] **Step 4: 渲染弹窗 UI**
  在 `AgentsView.tsx` 的最终 `return` 的最底部（`</div>` 结束标签前）渲染这个 Modal UI：
  ```tsx
        {/* Prompt Injection Instructions Modal */}
        {injectModalAgent && (
          <div className="inject-modal-overlay" onClick={() => setInjectModalAgent(null)}>
            <div className="inject-modal-card" onClick={e => e.stopPropagation()}>
              <div className="inject-modal-icon-wrapper">
                <Icons.CheckCircle className="inject-success-icon" />
              </div>
              <h2 className="inject-modal-title">智能体已就绪 (Agent Ready)</h2>
              <p className="inject-modal-desc">
                系统已自动将 <strong>{injectModalAgent.name}</strong> 的专属提示词复制到您的剪贴板。
              </p>
              <div className="action-hint-box">
                请在刚刚弹出的命令行终端窗口中，直接按下 <kbd className="kbd-badge">Ctrl</kbd> + <kbd className="kbd-badge">V</kbd> 粘贴并按回车以注入协作规程。
              </div>
              <button className="inject-modal-btn" onClick={() => setInjectModalAgent(null)}>
                我知道了 (Got it)
              </button>
            </div>
          </div>
        )}
  ```

- [ ] **Step 5: 运行编译静态检查**
  在 `mimicode-desktop` 目录下运行：
  `npm run build`
  期待：编译成功，无类型绑定错误。

- [ ] **Step 6: Commit 任务二**
  运行：
  ```bash
  git add mimicode-desktop/src/views/AgentsView.tsx
  git commit -m "feat: add prompt injection guidance modal to AgentsView.tsx"
  ```

---

### Task 3: 运行本地打包和测试

**Files:**
- Run Commands

- [ ] **Step 1: 运行本地 Tauri 构建**
  在 `mimicode-desktop` 运行：
  `npm run build`
  期待：无语法报错，前端正常编译。

- [ ] **Step 2: 验证弹窗表现**
  - 点击 Agents 面板中的 Play 按钮启动智能体。
  - 确认界面是否弹出精美的模态弹窗。
  - 验证剪贴板是否存入该智能体的 prompts，并按下 Enter / Esc 键验证弹窗能否安全关闭。
