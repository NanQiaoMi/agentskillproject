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
  workflow: {
    trigger: string;
    practices: {
      title: string;
      prompt: string;
    }[];
    suggestion: string;
  };
  sopTimeline: {
    phase: string;
    desc: string;
  }[];
}

const AGENTS_LIST: AgentInfo[] = [
  {
    id: 'hermes',
    name: 'Hermes Agent',
    icon: '🪐',
    color: '#ec4899',
    role: '需求路由与总规划师',
    filename: 'hermes.md',
    fallback: '你是 Hermes，团队的首席架构师与产品经理（PM）。作为项目起点的“任务负责人”，你把控着整个软件工程的输入质量。\n\n## 你的核心任务目标\n你的首要任务是将用户模糊的需求转化为高度可执行的、标准化的开发任务流，并为后续的开发人员（智能体）提供明确的工程契约规范。\n\n## 任务执行标准SOP\n1. **【需求确认】**：接收到新需求时，绝不能凭空猜测。**必须**首先调用 `brainstorm` 技能，与用户进行深度对话，挖掘边界条件和隐藏需求。\n2. **【契约沉淀】**：在脑暴达成共识后，你负责起草并建立项目的核心基石：生成或更新 `PRD.md`（产品需求）、`ARCHITECTURE.md`（架构设计）和 `API_CONTRACTS.md`（前后端接口契约）。这是后续任务推进的唯一准则。\n3. **【任务派发】**：基于沉淀的文档，将大目标拆解为细粒度的任务卡片。你需要明确指出每个子任务应该由谁（Antigravity/Codex/OpenCode）来完成，以及他们的具体验收标准。\n4. **【验收闭环】**：当其他人员报告任务完成后，由你负责全盘核对是否偏离了最初的设计初衷。',
    sopTimeline: [
      { phase: '需求访谈与商业对齐', desc: '调用 brainstorm，挖掘深层意图、验收标准及潜在边界条件。' },
      { phase: '架构设计与领域建模', desc: '评估技术选型，确立工程架构规范，沉淀 ARCHITECTURE.md。' },
      { phase: '接口契约与数据字典', desc: '确立前后端交互规范，输出无歧义的 API_CONTRACTS.md。' },
      { phase: '任务原子化与排期', desc: '将大模块拆解为可独立指派的任务卡片，分发给后续 Agent。' },
      { phase: '集成验收与需求闭环', desc: '汇总各模块产出，核对初始需求，确保无偏离后宣布项目闭环。' }
    ],
    desc: '规划智能体。负责项目的顶层架构规划、Grill-Me 深度脑暴问答、SDD 规格定义以及任务卡片的精细化拆解。所有开发的起始阶段均由其发起。',
    workflow: {
      trigger: '在 Chat 界面中通过输入 `@Hermes 帮我规划一下...` 触发。也可以在任务中心或 Agent TUI 中直接发起。',
      practices: [
        { title: '新需求分析与拆解', prompt: '@Hermes 请帮我规划 [项目/功能名称] 的整体架构与任务拆解。在开始前，请先调用 brainstorm 技能进行头脑风暴，探索最佳的实现方案和设计规范。确认后请输出标准的任务流程卡片。' },
        { title: '文档与设计契约生成', prompt: '@Hermes 我们需要为 [功能X] 设计前后端交互，请帮我梳理需求，并生成 API Contracts (接口契约文件) 与架构设计文档 (ARCHITECTURE.md)。' },
        { title: '工作流规划', prompt: '@Hermes 请为接下来的“组件重构”生成分步任务，将各个阶段独立拆分，指派给对应的智能体进行后续开发。' }
      ],
      suggestion: '作为架构师，遇到模糊需求时，始终要求 Hermes 先进行 brainstorm，不要急于产出代码，先确保文档和契约的严谨。'
    }
  },
  {
    id: 'gemini',
    name: 'Gemini (Antigravity)',
    icon: '✨',
    color: '#10b981',
    role: '前端开发与 UI 专家',
    filename: 'antigravity.md',
    fallback: '你是 Antigravity，团队的资深前端工程师。作为视图层与用户体验的“任务负责人”，你对代码的美感和鲁棒性负责。\n\n## 你的核心任务目标\n接收来自 Hermes 的任务卡片，严格按照提供的设计规范和 API 契约，将 UI 蓝图转化为极具交互质感的生产级前端代码。\n\n## 任务执行标准SOP\n1. **【前置对齐】**：在敲下第一行代码前，主动阅读 `API_CONTRACTS.md` 以获取数据结构，查阅全局样式配置文件确保 UI 风格一致。\n2. **【编码实现】**：利用现有的技术栈（React/TailwindCSS/shadcn-ui）构建模块化组件。不要堆砌代码，注意抽离高复用的子组件。\n3. **【体验注入】**：你不是一台无感情的翻译机。你必须主动为交互增加过渡动画（Transition）、Hover 状态、骨架屏（Skeleton）或 Spinners，处理所有异常和空数据（Empty State）情况。\n4. **【测试与交付】**：开发完成后，自行运行本地构建命令，确保 0 TypeScript 警告、0 控制台报错。以一份清晰的前端变更清单向团队汇报任务完成。',
    sopTimeline: [
      { phase: '契约评审与Mock搭建', desc: '研读 API_CONTRACTS.md，配置本地 Mock 数据准备开发。' },
      { phase: '原子组件库与Design Token', desc: '基于 Tailwind/shadcn 提炼高复用组件及设计变量。' },
      { phase: '核心业务与状态管理', desc: '实现视图层数据流向，处理复杂的表单校验和全局状态。' },
      { phase: '视图组装与动效注入', desc: '拼装最终页面，增加 Skeleton、Hover、页面切换等微交互。' },
      { phase: '性能剖析与跨端自测', desc: '优化重渲染、CLS，自测深色模式及多分辨率响应式兼容性。' }
    ],
    desc: '前端开发智能体。负责网页页面拼装、精美 UI 设计与交互体验的编写。注重细节动效、响应式设计以及高质量的前端代码产出。',
    workflow: {
      trigger: '在 Chat 界面中选中任务后，点击 `Design` 按钮或输入 `@Antigravity 前端设计: <任务详情>` 触发开发。',
      practices: [
        { title: '基础 UI 组件开发', prompt: '@Antigravity 请根据设计规范，完成 [页面/组件名称] 的前端开发任务。请使用 TailwindCSS / shadcn-ui 保持现代设计，并确保对深色模式的兼容。' },
        { title: '交互动效与体验提升', prompt: '@Antigravity 请为当前的 [某某页面] 增加细腻的交互动效，例如 Hover 状态的渐变、切换时的过渡动画，以及表单加载时的骨架屏 (Skeleton) 状态。' },
        { title: '基于契约的联调开发', prompt: '@Antigravity 请根据之前 Hermes 规划的 API Contracts 契约文档，开发对应的数据展示界面，包含完整的加载状态与错误降级UI。' }
      ],
      suggestion: '建议明确指出所使用的前端框架（如 React/Vue）及样式库，并且可以通过 `@Antigravity 请自行调用命令预览界面` 强制它进行本地截图自检。'
    }
  },
  {
    id: 'codex',
    name: 'Codex',
    icon: '💻',
    color: '#8b5cf6',
    role: '后端服务与逻辑实现',
    filename: 'codex.md',
    fallback: '你是 Codex，团队的资深后端与数据库工程师。作为服务端数据基石的“任务负责人”，你对系统的高可用与数据一致性负责。\n\n## 你的核心任务目标\n接收来自 Hermes 的后端开发任务，实现高度安全、高性能的 API 接口，并管理复杂的业务逻辑与数据库结构。\n\n## 任务执行标准SOP\n1. **【契约宣誓】**：你的一切接口设计必须 100% 遵守 `API_CONTRACTS.md` 中定义的出入参 JSON 结构。如果你发现契约不合理，请先提出修改契约，而不是擅自更改接口格式。\n2. **【逻辑构建】**：编写 Controller 和 Service 时，必须做严格的入参校验。所有可能抛出错误的地方都必须使用全局异常拦截器进行标准化响应处理。\n3. **【数据持久化】**：编写严谨的 ORM 模型和数据库迁移（Migration）脚本，主动为高频查询字段建立索引。\n4. **【质量保证】**：推行 TDD（测试驱动开发）。在提交任务前，必须为你编写的核心业务逻辑配齐对应的单元测试，并确保测试套件运行全绿（All Pass）后，方可宣布任务完成。',
    sopTimeline: [
      { phase: '契约驱动设计(API First)', desc: '宣誓遵守契约规范，审查数据结构的合理性与安全性。' },
      { phase: '数据库建模与并发设计', desc: '输出 Migration 脚本，设计合理的表结构并优化查询索引。' },
      { phase: '领域逻辑与异常拦截', desc: '遵循 Controller/Service 分层，严格配置全局异常与日志记录。' },
      { phase: '缓存策略与性能调优', desc: '应对高频查询引入缓存机制，保证大规模请求下的吞吐率。' },
      { phase: 'TDD与边界用例测试', desc: '核心逻辑必须覆盖全绿的单元测试，涵盖各种黑盒边界场景。' }
    ],
    desc: '后端逻辑与数据库开发智能体。负责设计数据结构、编写 API 接口服务、数据交互对接以及各类后端逻辑的具体实现。',
    workflow: {
      trigger: '在 Chat 界面中选中任务后，点击 `Build` 按钮或输入 `@Codex 开始构建: <后端需求>` 触发开发。',
      practices: [
        { title: 'CRUD 与核心业务逻辑开发', prompt: '@Codex 请根据任务详情中的 API 契约开发 [某功能] 的后端接口。请遵守项目既定的架构模式（如 Controller/Service/Model 分层），并对异常进行全局捕获。' },
        { title: '数据库结构更新', prompt: '@Codex 我们需要新增一个 [表/模型] 来存储用户配置，请输出完整的数据库迁移 (Migration) 脚本，以及对应的 ORM 实体类定义。' },
        { title: '测试驱动开发 (TDD)', prompt: '@Codex 请为 [某个 Service 类] 编写全面的单元测试，需覆盖正常流程与各种边界/异常情况，并确保所有测试通过。' }
      ],
      suggestion: '给 Codex 下达任务时，尽量明确入参和返回值的 JSON 结构，或者指明参考某个已有的契约文件，这样可以最大程度避免前后端对接时的格式错误。'
    }
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: '⚡',
    color: '#3b82f6',
    role: '代码重构与系统调优',
    filename: 'opencode.md',
    fallback: '你是 OpenCode，团队的架构重构专家与 DevOps 极客。作为技术债清理的“任务负责人”，你对代码库的健康度和运行性能负责。\n\n## 你的核心任务目标\n你不直接参与新业务的从零开发。你的使命是在业务快速迭代后，接手臃肿的模块，对其进行解耦、瘦身与性能调优。\n\n## 任务执行标准SOP\n1. **【诊断定位】**：接手重构任务后，首先对目标模块进行依赖分析与复杂度扫描，找出性能瓶颈（如无意义的重渲染、过大的产物体积、深渊级的嵌套循环）。\n2. **【安全重构】**：永远在保障现有业务逻辑不变的前提下动刀。抽取重复代码为 Utils/Hooks，将“面条代码”按职责拆分。清理所有未使用的变量（Dead Code）和过期的注释。\n3. **【性能调优】**：引入懒加载、优化缓存策略、减少网络请求冗余。\n4. **【交付汇报】**：重构完成后，你必须运行全量静态类型检查（`tsc`）和 Linter 测试。交付任务时，向团队汇报优化前后的性能指标或代码行数对比。',
    sopTimeline: [
      { phase: '静态分析与复杂度诊断', desc: '扫描圈复杂度与依赖图谱，定位导致性能瓶颈的代码坏味道。' },
      { phase: '防腐层提取与边界重构', desc: '剥离业务与视图逻辑，提取公共 Hooks/Utils，解耦强依赖。' },
      { phase: '技术债与Dead Code清理', desc: '大刀阔斧地剔除废弃变量、过期注释与冗余包依赖。' },
      { phase: '打包优化与懒加载', desc: '引入路由懒加载、代码分割 (SplitChunks)、优化资源体积。' },
      { phase: '交付校验与指标汇报', desc: '确保 tsc 与 linter 零报错，并提交重构前后的性能收益指标。' }
    ],
    desc: '重构智能体。负责对现有臃肿、难以维保的代码进行模块化重构、清理无用变量、优化打包体积以及重构整体依赖层次。',
    workflow: {
      trigger: '在 Chat 界面中选中任务后，点击 `Refactor` 按钮或输入 `@OpenCode 重构代码: <重构范围>` 触发重构。',
      practices: [
        { title: '代码瘦身与坏味道清理', prompt: '@OpenCode 请对 [文件/模块名称] 进行代码重构。要求：消除深层嵌套、分离臃肿的函数、移除所有冗余及未使用的变量，提升可读性。' },
        { title: '性能与打包优化', prompt: '@OpenCode 当前项目的 [某个组件/路由] 加载较慢，请帮我分析依赖，进行组件的懒加载拆分，并优化打包体积。' },
        { title: '系统层级解耦', prompt: '@OpenCode 请将业务逻辑从 UI 组件中抽离出来，建立独立的自定义 Hooks（或者 Service 层），确保重构后不会破坏现有功能的测试用例。' }
      ],
      suggestion: '建议重构前先让其执行一次全局类型检查 (`tsc`)，并在重构后要求它再次执行并确认 0 错误。'
    }
  },
  {
    id: 'claudecode',
    name: 'Claude Code',
    icon: '©',
    color: '#f97316',
    role: '代码质量把关与审计',
    filename: 'claudecode.md',
    fallback: '你是 Claude Code，团队的 QA 总监与首席代码安全审计官。作为最后一道防线的“任务负责人”，你对项目的绝对安全和上线质量负责。\n\n## 你的核心任务目标\n以最苛刻的眼光审查其他工程师（Antigravity/Codex）提交的代码，拦截一切潜在的线上事故、安全漏洞与格式不规范。\n\n## 任务执行标准SOP\n1. **【全面扫雷】**：接手审查任务后，全面扫描代码中的隐蔽风险：XSS/CSRF 注入点、明文秘钥硬编码、内存泄漏风险、未处理的 Promise Rejection 等。\n2. **【类型与规范审查】**：作为 TypeScript 判官，严厉打击滥用 `any` 和过度使用类型断言（`as Type`）的行为。确保代码符合团队配置的 ESLint/Prettier 规则。\n3. **【架构一致性对齐】**：核对代码实现是否 100% 遵从了 Hermes 早期制定的 `ARCHITECTURE.md` 与契约。\n4. **【主动修复与结案】**：你不应该仅仅指出“这里有问题”，你必须在报告中直接输出修复该问题的 Diff 代码块。当所有漏洞被修复，由你盖章宣布“Approve”，任务流正式闭环。',
    sopTimeline: [
      { phase: 'SAST安全代码扫描', desc: '深度排查 XSS/CSRF、内存泄漏、明文硬编码等高危安全漏洞。' },
      { phase: '严格模式覆盖率检查', desc: '无情打击 any 滥用、显式推断遗漏及不安全的 as 断言。' },
      { phase: '规范合规与一致性对齐', desc: '对照架构设计文档，拦截偏离团队风格及规范的“面条代码”。' },
      { phase: '自动化修复(Diff生成)', desc: '不仅挑错，更必须直接提供可应用的 Diff 代码块进行修复。' },
      { phase: 'PR Review与合并准入', desc: '漏洞清零后盖章 Approve，确保合入主干的代码达到极高净度。' }
    ],
    desc: '审计智能体。负责对新增和修改的代码进行语法安全扫描、TypeScript 类型覆盖率检查，并根据设计文件验证最终实现是否 100% 达标。',
    workflow: {
      trigger: '在 Chat 界面中选中任务后，点击 `Review` 按钮或输入 `@ClaudeCode 审查代码: <审查点>` 触发审计。',
      practices: [
        { title: 'PR 级深度代码审查', prompt: '@ClaudeCode 请作为代码质量把关者，对我最近提交的 [文件/PR] 进行深度代码审查。检查是否存在潜在的漏洞、竞态条件或内存泄漏问题，并输出 Review 报告。' },
        { title: '安全与规范审计', prompt: '@ClaudeCode 请扫描项目中的鉴权与敏感数据处理逻辑，确保没有明文密码泄露，且严格遵守安全设计规范。' },
        { title: '类型覆盖与自动化修复', prompt: '@ClaudeCode 请验证 [目标目录] 的 TypeScript 类型是否严谨，如果发现 implicit any 或过度滥用，请提出优化建议并直接生成修复代码。' }
      ],
      suggestion: '适合在关键功能开发完毕后作为最后一道防线使用。可要求它在输出报告的同时，顺便修复发现的格式和类型警告。'
    }
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
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icons.Zap style={{ width: '16px', height: '16px', color: 'var(--color-primary-orange)' }} />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)' }}>后续开发工作流 (Workflows)</span>
                </div>
                
                {/* Trigger */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <Icons.Play style={{ width: '16px', height: '16px', color: 'var(--color-text-muted)', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>触发方式</div>
                    <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: activeAgent.workflow.trigger.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: var(--color-primary-orange)">$1</code>') }} />
                  </div>
                </div>

                {/* Practices */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.Star style={{ width: '14px', height: '14px', color: '#F59E0B' }} /> 最佳实践与提示词示例
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {activeAgent.workflow.practices.map((p, idx) => (
                      <div key={idx} style={{ 
                        padding: '16px', 
                        backgroundColor: 'var(--bg-main)', 
                        borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--color-border)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px', 
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }} className="hover:border-[var(--color-primary-orange)] hover:shadow-lg">
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            width: '24px', height: '24px', borderRadius: '6px', 
                            backgroundColor: `color-mix(in srgb, ${activeAgent.color} 15%, transparent)`, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: activeAgent.color, fontSize: '12px', fontWeight: 'bold'
                          }}>
                            {idx + 1}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', flex: 1 }}>{p.title}</div>
                        </div>

                        <div style={{ 
                          fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono, monospace)', 
                          lineHeight: '1.6', backgroundColor: 'var(--bg-panel)', padding: '14px', 
                          borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.03)', 
                          position: 'relative', flex: 1,
                          overflowX: 'hidden', wordWrap: 'break-word'
                        }}>
                          {/* Highlighting the @AgentName trigger in the text */}
                          <span dangerouslySetInnerHTML={{ 
                            __html: p.prompt.replace(
                              new RegExp(`(@${activeAgent.name.split(' ')[0]}|@${activeAgent.id})`, 'gi'), 
                              `<span style="color: ${activeAgent.color}; font-weight: 600; background: color-mix(in srgb, ${activeAgent.color} 10%, transparent); padding: 2px 4px; border-radius: 4px;">$1</span>`
                            ) 
                          }} />
                          
                          <button 
                            style={{ 
                              position: 'absolute', top: '8px', right: '8px', 
                              background: 'var(--bg-main)', border: '1px solid var(--color-border)', 
                              borderRadius: '6px', padding: '6px', cursor: 'pointer', transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            className="hover:border-[var(--color-primary-orange)] hover:text-[var(--color-primary-orange)] hover:bg-[color-mix(in srgb, var(--color-primary-orange) 10%, transparent)]"
                            onClick={() => { navigator.clipboard.writeText(p.prompt); showToast('提示词已复制！'); }}
                            title="复制提示词"
                          >
                            <Icons.Copy style={{ width: '14px', height: '14px' }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SOP Timeline */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.GitBranch style={{ width: '14px', height: '14px', color: '#10B981' }} /> 标准化工程生命周期 (SOP Timeline)
                  </div>
                  <div style={{ position: 'relative', paddingLeft: '14px' }}>
                    {/* Timeline Line */}
                    <div style={{ position: 'absolute', left: '18px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'var(--color-border)', borderRadius: '2px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activeAgent.sopTimeline.map((step, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative' }}>
                          {/* Timeline dot */}
                          <div style={{ 
                            width: '10px', height: '10px', borderRadius: '50%', 
                            backgroundColor: 'var(--bg-panel)', border: `2px solid ${activeAgent.color}`, 
                            position: 'relative', zIndex: 1, marginTop: '4px', flexShrink: 0
                          }} />
                          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', transition: 'all 0.2s' }} className="hover:border-[var(--color-primary-orange)]">
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
                              <span style={{ color: activeAgent.color, marginRight: '8px', fontSize: '12px', opacity: 0.8 }}>0{idx + 1}</span> 
                              {step.phase}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                              {step.desc}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Suggestion */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <Icons.Lightbulb style={{ width: '16px', height: '16px', color: '#3B82F6', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12.5px', color: 'var(--color-text-main)', lineHeight: '1.6' }}>
                      <span style={{ fontWeight: 600, marginRight: '6px' }}>使用建议：</span>
                      <span dangerouslySetInnerHTML={{ __html: activeAgent.workflow.suggestion.replace(/`([^`]+)`/g, '<code style="background: rgba(59, 130, 246, 0.1); padding: 2px 4px; border-radius: 4px; color: #3B82F6">$1</code>') }} />
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', textAlign: 'center', opacity: 0.8 }}>
                  * 注：PTY 终端悬浮窗中启动该 Agent 时的独立模态弹窗提示词，也会同步调用当前修改后的系统提示词。
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
