import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';

interface AgentInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  role: string;
  filename: string;
  fallback: string;
  desc: string;
  inputsDesc: string;
}

const AGENTS_LIST: AgentInfo[] = [
  {
    id: 'hermes',
    name: 'Hermes Agent',
    icon: '🪐',
    color: '#ec4899',
    role: '需求路由与总规划师',
    filename: 'hermes.md',
    fallback: '你是 Hermes，专注于项目规划与任务拆解的专家。\n\n## 核心能力与工具箱\n你专注于完整的任务卡片流程创建。使用方法：运行 `npx @smithery/cli@latest skill add [技能名称]`。\n1. `brainstorm`：必须在进行任何任务创建前，使用该技能完成头脑风暴，探索用户意图、需求和设计方案。\n2. `copywriting`：全能高质量文案输出。\n3. `content-strategy`：规划选题和内容发布日历。\n4. `marketing-ideas`：发散营销活动创意点子。\n5. `social-content`：定制小红书、朋友圈等平台网感爆款文案。\n6. `document-formatter`：自动整理排版精美的Markdown文档。\n7. `meeting-notes`：快速提炼会议摘要和待办事项。\n\n请在创建任务时，务必使用brainstorm功能，并输出完整、结构清晰的流程卡片。特别注意：如果在规划过程中涉及到前后端接口交互，必须显式地规划并生成 API Contracts (接口契约) 文件，确保其他Agent接手时有明确的接口标准。',
    desc: '规划智能体。负责项目的顶层架构规划、Grill-Me 深度脑暴问答、SDD 规格定义以及任务卡片的精细化拆解。所有开发的起始阶段均由其发起。',
    inputsDesc: '在 Chat 界面中通过输入 `@Hermes 帮我规划一下...` 触发。也可以在任务中心或 Agent TUI 中直接发起。\n\n**详细任务提示词示例：**\n`@Hermes 请帮我规划 [项目/功能名称] 的整体架构与任务拆解。在开始前，请先调用 brainstorm 技能进行头脑风暴，探索最佳的实现方案和设计规范，然后输出标准的任务流程卡片。`\n* 注：PTY 终端悬浮窗中启动该 Agent 时的独立模态弹窗提示词，也会同步调用当前修改后的系统提示词。'
  },
  {
    id: 'gemini',
    name: 'Gemini (Antigravity)',
    icon: '✨',
    color: '#10b981',
    role: '前端开发与 UI 专家',
    filename: 'antigravity.md',
    fallback: 'You are Antigravity, an advanced AI coding assistant powered by Gemini. You have access to tools and the user\'s workspace.',
    desc: '前端开发智能体。负责网页页面拼装、精美 UI 设计与交互体验的编写。注重细节动效、响应式设计以及高质量的前端代码产出。',
    inputsDesc: '在 Chat 界面中选中任务后，点击 "Design" 按钮或输入 `@Antigravity 前端设计: <任务详情>` 触发开发。\n\n**详细任务提示词示例：**\n`@Antigravity 请根据设计规范与 API 契约，完成 [页面/组件名称] 的前端开发任务。请注意：\n1. 优先使用 TailwindCSS / shadcn-ui 保持现代设计。\n2. 增加细腻的交互动效（如 Hover 状态、过渡动画）。\n3. 开发完成后，自行调用工具在本地运行并截图确认样式是否达标。`\n* 注：PTY 终端悬浮窗中启动该 Agent 时的独立模态弹窗提示词，也会同步调用当前修改后的系统提示词。'
  },
  {
    id: 'codex',
    name: 'Codex',
    icon: '💻',
    color: '#8b5cf6',
    role: '后端服务与逻辑实现',
    filename: 'codex.md',
    fallback: 'You are Codex. Provide concise code snippets to solve the problems I present.',
    desc: '后端逻辑与数据库开发智能体。负责设计数据结构、编写 API 接口服务、数据交互对接以及各类后端逻辑的具体实现。',
    inputsDesc: '在 Chat 界面中选中任务后，点击 "Build" 按钮或输入 `@Codex 开始构建: <后端需求>` 触发开发。\n\n**详细任务提示词示例：**\n`@Codex 请根据任务详情中的 API 契约（API Contracts）开发后端接口。\n1. 请遵守项目既定的架构模式（如 Controller/Service 分层）。\n2. 为关键逻辑添加详尽的日志和注释。\n3. 完成后编写对应的单元测试并确保所有测试通过。`\n* 注：PTY 终端悬浮窗中启动该 Agent 时的独立模态弹窗提示词，也会同步调用当前修改后的系统提示词。'
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: '⚡',
    color: '#3b82f6',
    role: '代码重构与系统调优',
    filename: 'opencode.md',
    fallback: 'You are OpenCode, an open-source AI assistant. Help me explore this repository.',
    desc: '重构智能体。负责对现有臃肿、难以维保的代码进行模块化重构、清理无用变量、优化打包体积以及重构整体依赖层次。',
    inputsDesc: '在 Chat 界面中选中任务后，点击 "Refactor" 按钮或输入 `@OpenCode 重构代码: <重构范围>` 触发重构。\n\n**详细任务提示词示例：**\n`@OpenCode 请对 [文件/模块] 进行代码重构与系统调优。\n1. 消除冗余代码与重复逻辑，提升可维护性。\n2. 优化运行性能与打包体积。\n3. 确保重构后不会破坏现有功能的测试用例。`\n* 注：PTY 终端悬浮窗中启动该 Agent 时的独立模态弹窗提示词，也会同步调用当前修改后的系统提示词。'
  },
  {
    id: 'claudecode',
    name: 'Claude Code',
    icon: '©',
    color: '#f97316',
    role: '代码质量把关与审计',
    filename: 'claudecode.md',
    fallback: 'You are Claude Code, an AI coding assistant. Please help me write some code.',
    desc: '审计智能体。负责对新增和修改的代码进行语法安全扫描、TypeScript 类型覆盖率检查，并根据设计文件验证最终实现是否 100% 达标。',
    inputsDesc: '在 Chat 界面中选中任务后，点击 "Review" 按钮或输入 `@ClaudeCode 审查代码: <审查点>` 触发审计。\n\n**详细任务提示词示例：**\n`@ClaudeCode 请作为代码质量把关者，对我最近提交的 [文件/PR] 进行深度代码审查。\n1. 检查是否存在潜在的安全漏洞或内存泄漏。\n2. 验证 TypeScript 类型是否严谨，覆盖率是否达标。\n3. 提出优化建议并直接生成修复代码的 diff。`\n* 注：PTY 终端悬浮窗中启动该 Agent 时的独立模态弹窗提示词，也会同步调用当前修改后的系统提示词。'
  }
];

interface PromptsViewProps {
  projectPath: string;
}

export const PromptsView: React.FC<PromptsViewProps> = ({ projectPath }) => {
  const [selectedAgentId, setSelectedAgentId] = useState('hermes');
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingAgentId, setSavingAgentId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load all prompts from files
  const loadAllPrompts = async () => {
    if (!projectPath) return;
    setLoading(true);
    const separator = projectPath.includes('/') ? '/' : '\\';
    const loadedPrompts: Record<string, string> = {};

    for (const agent of AGENTS_LIST) {
      try {
        const path = `${projectPath}${separator}.agentflow${separator}prompts${separator}${agent.filename}`;
        const content = await invoke<string | null>('read_file_content', { path });
        if (content) {
          loadedPrompts[agent.id] = content;
        } else {
          loadedPrompts[agent.id] = agent.fallback;
        }
      } catch (err) {
        console.error(`Failed to read prompt file for ${agent.id}:`, err);
        loadedPrompts[agent.id] = agent.fallback;
      }
    }
    setPrompts(loadedPrompts);
    setLoading(false);
  };

  useEffect(() => {
    loadAllPrompts();
  }, [projectPath]);

  const handleSave = async (agentId: string) => {
    if (!projectPath) return;
    const agent = AGENTS_LIST.find(a => a.id === agentId);
    if (!agent) return;

    setSavingAgentId(agentId);
    const separator = projectPath.includes('/') ? '/' : '\\';
    const promptsDir = `${projectPath}${separator}.agentflow${separator}prompts`;
    const filePath = `${promptsDir}${separator}${agent.filename}`;
    const content = prompts[agentId] || '';

    try {
      // Ensure directory exists
      await invoke('run_shell_command', {
        command: `mkdir "${promptsDir}"`,
        cwd: projectPath
      }).catch(() => {});

      await invoke('write_file_content', { path: filePath, content });
      showToast(`🎉 ${agent.name} 提示词已保存成功！`);
    } catch (err) {
      console.error(`Failed to save prompt:`, err);
      showToast(`❌ 保存失败: ${String(err)}`);
    } finally {
      setSavingAgentId(null);
    }
  };

  const handleReset = (agentId: string) => {
    const agent = AGENTS_LIST.find(a => a.id === agentId);
    if (!agent) return;

    if (window.confirm(`确认要将 ${agent.name} 的提示词重置为系统默认值吗？`)) {
      setPrompts(prev => ({
        ...prev,
        [agentId]: agent.fallback
      }));
      showToast(`🔄 已重置为默认提示词，请记得点击保存！`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activeAgent = AGENTS_LIST.find(a => a.id === selectedAgentId) || AGENTS_LIST[0];
  const separator = projectPath.includes('/') ? '/' : '\\';
  const currentFilePath = `${projectPath}${separator}.agentflow${separator}prompts${separator}${activeAgent.filename}`;

  return (
    <div className="view-container bg-panel">
      <div className="view-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
        <h1 className="view-title">提示词中心 (Prompts Hub)</h1>
        <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
          在这里定制所有协同开发智能体的系统 Prompt 规程。提示词与当前项目的 <code>.agentflow/prompts/</code> 目录保持同步。
        </p>
      </div>

      <div className="view-content" style={{ display: 'flex', gap: '24px', padding: '24px', height: 'calc(100% - 80px)', overflow: 'hidden' }}>
        {/* Left Agent List */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          {AGENTS_LIST.map(agent => {
            const isActive = agent.id === selectedAgentId;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${isActive ? 'var(--color-primary-orange)' : 'var(--color-border)'}`,
                  backgroundColor: isActive ? 'rgba(249, 115, 22, 0.08)' : 'var(--bg-main)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(249, 115, 22, 0.1)' : 'var(--shadow-soft)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{agent.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-main)' }}>{agent.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{agent.role}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--color-text-muted)' }}>
              加载提示词配置中...
            </div>
          ) : (
            <div className="spec-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
              {/* Agent Intro Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '32px' }}>{activeAgent.icon}</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text-main)' }}>{activeAgent.name} - 系统提示词规程</h2>
                    <div style={{ fontSize: '12px', color: 'var(--color-primary-orange)', fontWeight: 600, marginTop: '4px' }}>角色定位：{activeAgent.role}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-ghost" onClick={() => handleReset(activeAgent.id)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <Icons.RefreshCw style={{ width: '12px', height: '12px', marginRight: '6px' }} /> 重置默认
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSave(activeAgent.id)}
                    disabled={savingAgentId === activeAgent.id}
                    style={{ padding: '6px 16px', fontSize: '12px' }}
                  >
                    {savingAgentId === activeAgent.id ? '正在保存...' : (
                      <>
                        <Icons.CheckCircle2 style={{ width: '12px', height: '12px', marginRight: '6px' }} /> 保存修改
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Agent Description */}
              <div style={{ backgroundColor: 'var(--bg-panel)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '6px' }}>功能说明：</div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>{activeAgent.desc}</div>
              </div>

              {/* Edit Prompt Area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>核心系统提示词配置 (System Prompt Markdown)：</label>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>配置文件路径：<code>{currentFilePath.length > 50 ? '...' + currentFilePath.substring(currentFilePath.length - 47) : currentFilePath}</code></span>
                </div>
                <textarea
                  className="intercept-input bg-panel"
                  style={{
                    width: '100%',
                    height: '280px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '12.5px',
                    lineHeight: '1.6',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-main)',
                    resize: 'vertical'
                  }}
                  value={prompts[activeAgent.id] || ''}
                  onChange={e => setPrompts(prev => ({ ...prev, [activeAgent.id]: e.target.value }))}
                />
              </div>

              {/* Trigger & Dev Workflows */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Icons.Zap style={{ width: '14px', height: '14px', color: 'var(--color-primary-orange)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>后续开发流程触发说明：</span>
                </div>
                <div style={{ padding: '12px 16px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-main)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {activeAgent.inputsDesc}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    * 注：PTY 终端悬浮窗中启动该 Agent 时的独立模态弹窗提示词，也会同步调用当前修改后的系统提示词。
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          backgroundColor: 'var(--bg-panel)',
          color: 'var(--color-text-main)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)',
          fontSize: '12px',
          zIndex: 10000,
          animation: 'fadein 0.3s'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};
