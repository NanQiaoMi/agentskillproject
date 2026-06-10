/**
 * Built-in Team Workflow Templates
 * 
 * Each template defines a complete multi-agent collaboration graph
 * with nodes, edges, task descriptions, and expected outputs.
 */

import { Node, Edge } from '@xyflow/react';

export interface TeamTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;        // emoji
  category: string;
  nodes: Node[];
  edges: Edge[];
}

// ─────────────────────────────────────────────────────────
// Template 1: Full Software Development Lifecycle
// PM → Architect → Frontend + Backend (parallel) → Auditor → QA → PM (loop)
// ─────────────────────────────────────────────────────────
const softwareLifecycle: TeamTemplate = {
  id: 'software-lifecycle',
  name: '软件开发全生命周期',
  description: 'PM→架构师→前后端并行开发→代码审计→测试→PM 闭环',
  icon: '🏗️',
  category: 'engineering',
  nodes: [
    {
      id: 'pm',
      type: 'agentNode',
      position: { x: 400, y: 0 },
      data: {
        label: 'Project Manager',
        role: '项目经理 / 总协调',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名资深项目经理。接收用户需求后：\n1. 分析需求，拆解为可执行的子任务\n2. 制定里程碑时间表\n3. 将前端任务分配给前端工程师、后端任务分配给后端工程师\n4. 汇总所有审计和测试结果，输出最终项目交付报告\n\n如果审计或测试返回了问题，你需要重新分配修复任务。',
        expectedOutput: '结构化的项目计划 (Markdown)，包含任务分配表、时间表、最终交付总结'
      }
    },
    {
      id: 'architect',
      type: 'agentNode',
      position: { x: 400, y: 150 },
      data: {
        label: 'Architect',
        role: '系统架构师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名系统架构师。根据项目经理给出的需求分析：\n1. 设计整体技术架构（前后端分离 / 微服务 / 单体）\n2. 确定技术栈选型\n3. 设计数据库 Schema\n4. 定义前后端 API 接口契约\n5. 输出架构设计文档',
        expectedOutput: '完整的架构设计文档 (Markdown)，包括系统拓扑图描述、技术栈、数据库设计、API 接口列表'
      }
    },
    {
      id: 'frontend',
      type: 'agentNode',
      position: { x: 150, y: 320 },
      data: {
        label: 'Frontend Engineer',
        role: '前端工程师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        asyncExecution: true,
        taskDescription: '你是一名高级前端工程师。根据架构师的设计文档：\n1. 实现前端页面和组件\n2. 对接后端 API\n3. 实现响应式布局和交互动效\n4. 编写前端单元测试',
        expectedOutput: '完整的前端代码文件，包含组件、页面、样式、API 调用层和测试文件'
      }
    },
    {
      id: 'backend',
      type: 'agentNode',
      position: { x: 650, y: 320 },
      data: {
        label: 'Backend Engineer',
        role: '后端工程师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        asyncExecution: true,
        taskDescription: '你是一名高级后端工程师。根据架构师的设计文档：\n1. 实现后端 API 端点\n2. 实现数据库模型和迁移\n3. 实现业务逻辑层\n4. 编写 API 测试\n5. 处理认证/授权逻辑',
        expectedOutput: '完整的后端代码文件，包含路由、控制器、模型、中间件和测试文件'
      }
    },
    {
      id: 'auditor',
      type: 'agentNode',
      position: { x: 400, y: 490 },
      data: {
        label: 'Code Auditor',
        role: '代码审计员',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名资深代码审计员。审查前端和后端工程师输出的代码：\n1. 检查代码质量（命名规范、结构清晰度）\n2. 检查安全漏洞（SQL 注入、XSS、CSRF）\n3. 检查性能瓶颈\n4. 检查 API 接口是否与架构设计一致\n5. 输出审计报告，标注 PASS / FAIL 及改进建议',
        expectedOutput: '代码审计报告 (Markdown)，每个文件的审查结果、严重级别、改进建议列表'
      }
    },
    {
      id: 'qa',
      type: 'agentNode',
      position: { x: 400, y: 640 },
      data: {
        label: 'QA Tester',
        role: '质量保证测试员',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名 QA 测试工程师。基于审计后的代码：\n1. 设计测试用例（正常流、边界条件、异常处理）\n2. 执行端到端测试\n3. 验证前后端集成是否正常\n4. 输出测试报告，标注通过率和发现的 Bug',
        expectedOutput: '测试报告 (Markdown)，包含测试用例表、执行结果、Bug 列表、总体通过率'
      }
    }
  ],
  edges: [
    { id: 'e-pm-arch', source: 'pm', target: 'architect', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-arch-fe', source: 'architect', target: 'frontend', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
    { id: 'e-arch-be', source: 'architect', target: 'backend', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
    { id: 'e-fe-audit', source: 'frontend', target: 'auditor', sourceHandle: 'bottom-source', targetHandle: 'left-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-be-audit', source: 'backend', target: 'auditor', sourceHandle: 'bottom-source', targetHandle: 'right-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-audit-qa', source: 'auditor', target: 'qa', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 2 } },
    { id: 'e-qa-pm', source: 'qa', target: 'pm', sourceHandle: 'right-source', targetHandle: 'right-target', type: 'default', animated: true, style: { stroke: '#EF4444', strokeWidth: 2, strokeDasharray: '8 4' } },
  ]
};

// ─────────────────────────────────────────────────────────
// Template 2: Content Creation Pipeline
// Researcher → Writer → Editor/Reviewer → SEO → Publisher
// ─────────────────────────────────────────────────────────
const contentPipeline: TeamTemplate = {
  id: 'content-pipeline',
  name: '内容创作与审查流水线',
  description: '调研→写作→编辑审核→SEO 优化→发布',
  icon: '✍️',
  category: 'content',
  nodes: [
    {
      id: 'researcher',
      type: 'agentNode',
      position: { x: 100, y: 100 },
      data: {
        label: 'Researcher',
        role: '调研分析师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名专业的市场调研分析师。\n1. 针对给定主题进行深入研究\n2. 收集关键数据点、行业趋势、竞品分析\n3. 提供有说服力的论据和数据支撑\n4. 整理参考来源列表',
        expectedOutput: '调研报告 (Markdown)，包含主题概述、关键发现、数据表格、参考文献列表'
      }
    },
    {
      id: 'writer',
      type: 'agentNode',
      position: { x: 350, y: 100 },
      data: {
        label: 'Content Writer',
        role: '内容创作者',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名优秀的内容创作者。基于调研报告：\n1. 撰写一篇高质量的长文（2000-3000 字）\n2. 使用引人入胜的标题和副标题\n3. 融入数据和案例\n4. 保持专业但易读的语调',
        expectedOutput: '完整的文章草稿 (Markdown)，包含标题、副标题、正文段落、引用数据'
      }
    },
    {
      id: 'editor',
      type: 'agentNode',
      position: { x: 600, y: 100 },
      data: {
        label: 'Editor',
        role: '编辑 / 审稿人',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名资深编辑。审阅内容创作者的文章：\n1. 检查语法、拼写、措辞\n2. 优化文章结构和逻辑流\n3. 确保事实准确性\n4. 提升可读性和吸引力\n5. 标注修改建议或直接修改',
        expectedOutput: '修改后的终稿 (Markdown)，附带修改记录和改进建议清单'
      }
    },
    {
      id: 'seo',
      type: 'agentNode',
      position: { x: 350, y: 280 },
      data: {
        label: 'SEO Specialist',
        role: 'SEO 优化专家',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名 SEO 优化专家。优化编辑审定后的文章：\n1. 提取和优化目标关键词\n2. 优化标题和 Meta Description\n3. 添加内链/外链建议\n4. 优化文章结构以提升搜索排名\n5. 生成最终发布版本',
        expectedOutput: 'SEO 优化后的最终文章，附带关键词列表、Meta 标签建议、内链策略'
      }
    }
  ],
  edges: [
    { id: 'e-res-wri', source: 'researcher', target: 'writer', sourceHandle: 'right-source', targetHandle: 'left-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-wri-edi', source: 'writer', target: 'editor', sourceHandle: 'right-source', targetHandle: 'left-target', type: 'default', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
    { id: 'e-edi-seo', source: 'editor', target: 'seo', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 2 } },
    { id: 'e-edi-res', source: 'editor', target: 'researcher', sourceHandle: 'top-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#EF4444', strokeWidth: 2, strokeDasharray: '8 4' } },
  ]
};

// ─────────────────────────────────────────────────────────
// Template 3: Data Analysis & Insight
// Collector → Cleaner → Analyst → Visualizer → Reporter
// ─────────────────────────────────────────────────────────
const dataAnalysis: TeamTemplate = {
  id: 'data-analysis',
  name: '数据分析与洞察报告',
  description: '数据采集→清洗→分析→可视化→报告输出',
  icon: '📊',
  category: 'data',
  nodes: [
    {
      id: 'collector',
      type: 'agentNode',
      position: { x: 100, y: 200 },
      data: {
        label: 'Data Collector',
        role: '数据采集工程师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名数据采集工程师。\n1. 根据分析目标定义数据需求\n2. 编写数据获取脚本（API 调用 / 爬虫 / SQL）\n3. 收集原始数据\n4. 初步验证数据完整性',
        expectedOutput: '原始数据集描述和获取脚本，包含数据来源说明、字段定义、数据量统计'
      }
    },
    {
      id: 'cleaner',
      type: 'agentNode',
      position: { x: 350, y: 200 },
      data: {
        label: 'Data Cleaner',
        role: '数据清洗专家',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名数据清洗专家。处理采集到的原始数据：\n1. 处理缺失值（填充 / 删除）\n2. 去除重复记录\n3. 数据类型转换和标准化\n4. 异常值检测与处理\n5. 输出干净的结构化数据集',
        expectedOutput: '清洗后的数据集描述、清洗规则文档、数据质量报告'
      }
    },
    {
      id: 'analyst',
      type: 'agentNode',
      position: { x: 600, y: 200 },
      data: {
        label: 'Data Analyst',
        role: '数据分析师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名资深数据分析师。基于清洗后的数据集：\n1. 执行探索性数据分析 (EDA)\n2. 发现关键趋势和相关性\n3. 建立统计模型或预测模型\n4. 提出基于数据的业务建议',
        expectedOutput: '数据分析报告，包含描述统计、关键发现、相关性分析、预测结果、业务建议'
      }
    },
    {
      id: 'reporter',
      type: 'agentNode',
      position: { x: 350, y: 380 },
      data: {
        label: 'Report Generator',
        role: '报告生成 / 可视化',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '你是一名数据可视化和报告专家。整合分析师的成果：\n1. 设计图表和可视化方案\n2. 编写面向管理层的执行摘要\n3. 生成完整的分析报告\n4. 突出关键结论和行动建议',
        expectedOutput: '完整的数据报告 (Markdown)，包含图表描述、执行摘要、详细分析、行动建议列表'
      }
    }
  ],
  edges: [
    { id: 'e-col-cln', source: 'collector', target: 'cleaner', sourceHandle: 'right-source', targetHandle: 'left-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-cln-ana', source: 'cleaner', target: 'analyst', sourceHandle: 'right-source', targetHandle: 'left-target', type: 'default', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
    { id: 'e-ana-rep', source: 'analyst', target: 'reporter', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 2 } },
    { id: 'e-rep-col', source: 'reporter', target: 'collector', sourceHandle: 'left-source', targetHandle: 'bottom-target', type: 'default', animated: true, style: { stroke: '#EF4444', strokeWidth: 2, strokeDasharray: '8 4' } },
  ]
};

// ─────────────────────────────────────────────────────────
// Template 4: Manager-Subagent Delegation (Classic Agent Team)
// Manager → Worker A, Worker B, Worker C (parallel) → Aggregator → Manager
// ─────────────────────────────────────────────────────────
const agentTeamDelegation: TeamTemplate = {
  id: 'agent-team',
  name: '经典主从智能体协作',
  description: 'Manager 分发 → 多 Worker 并行执行 → 汇总器 → Manager 审核',
  icon: '🤖',
  category: 'agent',
  nodes: [
    {
      id: 'manager',
      type: 'agentNode',
      position: { x: 350, y: 0 },
      data: {
        label: 'Manager Agent',
        role: '主控智能体 (Orchestrator)',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '你是主控智能体 (Manager)。你的职责是：\n1. 接收用户的总任务\n2. 将任务拆解为 3 个独立的子任务\n3. 将子任务分发给 Worker A、B、C\n4. 接收聚合器返回的汇总结果\n5. 对最终结果进行质量审核，确保完整性和一致性\n6. 输出最终交付物',
        expectedOutput: '经过审核的最终交付物，包含所有子任务成果的整合版本和质量评审意见'
      }
    },
    {
      id: 'worker-a',
      type: 'agentNode',
      position: { x: 80, y: 200 },
      data: {
        label: 'Worker Alpha',
        role: '执行子智能体 A',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        asyncExecution: true,
        taskDescription: '你是执行子智能体 Alpha。接收 Manager 分配的子任务后：\n1. 理解子任务要求\n2. 独立完成任务执行\n3. 生成详细的执行结果\n4. 标注完成状态和遇到的问题',
        expectedOutput: '子任务 A 的完整执行结果，附带完成状态标记和问题记录'
      }
    },
    {
      id: 'worker-b',
      type: 'agentNode',
      position: { x: 350, y: 200 },
      data: {
        label: 'Worker Beta',
        role: '执行子智能体 B',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        asyncExecution: true,
        taskDescription: '你是执行子智能体 Beta。接收 Manager 分配的子任务后：\n1. 理解子任务要求\n2. 独立完成任务执行\n3. 生成详细的执行结果\n4. 标注完成状态和遇到的问题',
        expectedOutput: '子任务 B 的完整执行结果，附带完成状态标记和问题记录'
      }
    },
    {
      id: 'worker-c',
      type: 'agentNode',
      position: { x: 620, y: 200 },
      data: {
        label: 'Worker Gamma',
        role: '执行子智能体 C',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        asyncExecution: true,
        taskDescription: '你是执行子智能体 Gamma。接收 Manager 分配的子任务后：\n1. 理解子任务要求\n2. 独立完成任务执行\n3. 生成详细的执行结果\n4. 标注完成状态和遇到的问题',
        expectedOutput: '子任务 C 的完整执行结果，附带完成状态标记和问题记录'
      }
    },
    {
      id: 'aggregator',
      type: 'agentNode',
      position: { x: 350, y: 400 },
      data: {
        label: 'Aggregator',
        role: '结果汇聚器',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '你是结果汇聚器。接收所有 Worker 的输出后：\n1. 检查所有子任务的完成状态\n2. 合并和去重各子任务的结果\n3. 解决冲突和矛盾之处\n4. 生成统一的汇总文档',
        expectedOutput: '汇总文档 (Markdown)，整合所有 Worker 的成果，标注合并策略和冲突解决记录'
      }
    }
  ],
  edges: [
    { id: 'e-mgr-wa', source: 'manager', target: 'worker-a', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-mgr-wb', source: 'manager', target: 'worker-b', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-mgr-wc', source: 'manager', target: 'worker-c', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-wa-agg', source: 'worker-a', target: 'aggregator', sourceHandle: 'bottom-source', targetHandle: 'left-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-wb-agg', source: 'worker-b', target: 'aggregator', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-wc-agg', source: 'worker-c', target: 'aggregator', sourceHandle: 'bottom-source', targetHandle: 'right-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-agg-mgr', source: 'aggregator', target: 'manager', sourceHandle: 'right-source', targetHandle: 'right-target', type: 'default', animated: true, style: { stroke: '#EF4444', strokeWidth: 2, strokeDasharray: '8 4' } },
  ]
};

// ─────────────────────────────────────────────────────────
// Template 5: Full-Stack Product Launch
// Product Owner → UX Designer + Frontend + Backend + DevOps (diamond) → Code Review → E2E Testing → Product Owner (sign-off)
// ─────────────────────────────────────────────────────────
const productLaunch: TeamTemplate = {
  id: 'product-launch',
  name: '全栈产品上线流水线',
  description: 'PO→UX+前端+后端+运维(并行)→代码评审→E2E 测试→PO 验收',
  icon: '🚀',
  category: 'engineering',
  nodes: [
    {
      id: 'po',
      type: 'agentNode',
      position: { x: 380, y: 0 },
      data: {
        label: 'Product Owner',
        role: '产品负责人',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '你是产品负责人。\n1. 定义产品需求和用户故事\n2. 设定验收标准 (Acceptance Criteria)\n3. 优先级排序和 Sprint 规划\n4. 审核最终交付物是否满足用户需求\n5. 签发上线批准',
        expectedOutput: '产品需求文档 (PRD)，用户故事列表，验收标准，最终上线批准或改进意见'
      }
    },
    {
      id: 'ux',
      type: 'agentNode',
      position: { x: 50, y: 200 },
      data: {
        label: 'UX Designer',
        role: 'UI/UX 设计师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        asyncExecution: true,
        taskDescription: '你是一名 UX 设计师。根据产品需求：\n1. 设计用户流程图\n2. 创建线框图和高保真原型描述\n3. 定义设计规范（颜色、字体、间距）\n4. 确保可访问性标准',
        expectedOutput: '设计规范文档，包含用户流、页面布局描述、组件规范、交互说明'
      }
    },
    {
      id: 'fe',
      type: 'agentNode',
      position: { x: 280, y: 200 },
      data: {
        label: 'Frontend Dev',
        role: '前端开发工程师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        asyncExecution: true,
        taskDescription: '你是前端开发工程师。根据 UX 设计和产品需求：\n1. 实现 UI 组件和页面\n2. 集成设计系统\n3. 实现客户端状态管理\n4. 接入后端 API',
        expectedOutput: '前端源代码，组件库，路由配置，状态管理逻辑'
      }
    },
    {
      id: 'be',
      type: 'agentNode',
      position: { x: 510, y: 200 },
      data: {
        label: 'Backend Dev',
        role: '后端开发工程师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        asyncExecution: true,
        taskDescription: '你是后端开发工程师。根据产品需求：\n1. 设计和实现 RESTful / GraphQL API\n2. 实现数据库逻辑\n3. 编写业务逻辑\n4. 实现认证系统',
        expectedOutput: '后端源代码，API 文档，数据库迁移脚本，认证中间件'
      }
    },
    {
      id: 'devops',
      type: 'agentNode',
      position: { x: 730, y: 200 },
      data: {
        label: 'DevOps Engineer',
        role: 'DevOps / 运维工程师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        asyncExecution: true,
        taskDescription: '你是 DevOps 工程师。\n1. 配置 CI/CD 流水线\n2. 编写 Dockerfile / docker-compose\n3. 配置 Nginx / 反向代理\n4. 设置监控和告警\n5. 编写部署脚本',
        expectedOutput: 'CI/CD 配置文件、Docker 配置、部署脚本、监控配置、运维文档'
      }
    },
    {
      id: 'reviewer',
      type: 'agentNode',
      position: { x: 280, y: 420 },
      data: {
        label: 'Code Reviewer',
        role: '代码评审员',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '你是资深代码评审员。审查所有工程师的代码输出：\n1. 代码风格和一致性检查\n2. 架构合理性评估\n3. 安全漏洞扫描\n4. 性能问题识别\n5. 输出 PR Review 风格的评审意见',
        expectedOutput: '代码评审报告，每个模块的审查结论（Approve/Request Changes），改进建议列表'
      }
    },
    {
      id: 'e2e',
      type: 'agentNode',
      position: { x: 510, y: 420 },
      data: {
        label: 'E2E Tester',
        role: '端到端测试工程师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '你是 E2E 测试工程师。基于产品需求和验收标准：\n1. 设计端到端测试场景\n2. 编写 Playwright/Cypress 测试脚本\n3. 执行集成测试\n4. 验证用户流完整性\n5. 输出测试报告',
        expectedOutput: '端到端测试报告，测试脚本，覆盖率统计，Bug 列表和截图描述'
      }
    }
  ],
  edges: [
    { id: 'e-po-ux', source: 'po', target: 'ux', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-po-fe', source: 'po', target: 'fe', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-po-be', source: 'po', target: 'be', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-po-devops', source: 'po', target: 'devops', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-ux-rev', source: 'ux', target: 'reviewer', sourceHandle: 'bottom-source', targetHandle: 'left-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-fe-rev', source: 'fe', target: 'reviewer', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-be-e2e', source: 'be', target: 'e2e', sourceHandle: 'bottom-source', targetHandle: 'top-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-devops-e2e', source: 'devops', target: 'e2e', sourceHandle: 'bottom-source', targetHandle: 'right-target', type: 'default', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-rev-po', source: 'reviewer', target: 'po', sourceHandle: 'left-source', targetHandle: 'left-target', type: 'default', animated: true, style: { stroke: '#EF4444', strokeWidth: 2, strokeDasharray: '8 4' } },
    { id: 'e-e2e-po', source: 'e2e', target: 'po', sourceHandle: 'right-source', targetHandle: 'right-target', type: 'default', animated: true, style: { stroke: '#EF4444', strokeWidth: 2, strokeDasharray: '8 4' } },
  ]
};

// ─────────────────────────────────────────────────────────
// Export all templates
// ─────────────────────────────────────────────────────────
export const TEAM_TEMPLATES: TeamTemplate[] = [
  softwareLifecycle,
  productLaunch,
  agentTeamDelegation,
  contentPipeline,
  dataAnalysis,
];
