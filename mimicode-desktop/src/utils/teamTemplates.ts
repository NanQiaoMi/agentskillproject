/**
 * Built-in Team Workflow Templates
 * 
 * Each template defines a complete multi-agent collaboration graph
 * with dynamic role-based nodes, edges, task descriptions, and expected outputs.
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
// ─────────────────────────────────────────────────────────
const softwareLifecycle: TeamTemplate = {
  id: 'software-lifecycle',
  name: '软件开发全生命周期',
  description: '需求输入→项目经理→架构师→前端+后端→测试→部署代码',
  icon: '🏗️',
  category: 'engineering',
  nodes: [
    {
      id: 'input-req',
      type: 'inputNode',
      position: { x: 50, y: 150 },
      data: { prompt: '实现一个带有用户登录和积分系统的任务管理平台。' }
    },
    {
      id: 'pm',
      type: 'agentNode',
      position: { x: 350, y: 150 },
      data: {
        label: 'Project Manager',
        role: '项目经理 / Manager',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '分析需求，拆解为可执行的子任务，制定里程碑并分配任务。',
        expectedOutput: '项目计划 (Markdown)'
      }
    },
    {
      id: 'architect',
      type: 'agentNode',
      position: { x: 650, y: 150 },
      data: {
        label: 'Architect',
        role: '架构师 / Planner',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '设计技术架构、技术选型、数据库 Schema、前后端接口。',
        expectedOutput: '架构设计文档'
      }
    },
    {
      id: 'frontend',
      type: 'agentNode',
      position: { x: 950, y: 0 },
      data: {
        label: 'Frontend Engineer',
        role: '前端开发',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '根据设计文档实现页面、组件交互及 API 对接。',
        expectedOutput: '前端源代码'
      }
    },
    {
      id: 'backend',
      type: 'agentNode',
      position: { x: 950, y: 300 },
      data: {
        label: 'Backend Engineer',
        role: '后端开发',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '实现后端 API 端点、数据库模型和业务逻辑。',
        expectedOutput: '后端源代码'
      }
    },
    {
      id: 'qa',
      type: 'agentNode',
      position: { x: 1250, y: 150 },
      data: {
        label: 'QA Tester',
        role: 'QA / 测试员',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '基于产出的代码进行功能测试并生成报告。',
        expectedOutput: '测试报告'
      }
    },
    {
      id: 'tool-deploy',
      type: 'toolNode',
      position: { x: 1550, y: 150 },
      data: { tool: 'file_system' }
    }
  ],
  edges: [
    { id: 'e-in-pm', source: 'input-req', target: 'pm', sourceHandle: 'source-output', targetHandle: 'in-goal', animated: true, style: { stroke: '#9F7AEA', strokeWidth: 2 } },
    { id: 'e-pm-arch', source: 'pm', target: 'architect', sourceHandle: 'out-tasks', targetHandle: 'in-goal', animated: true, style: { stroke: '#63B3ED', strokeWidth: 2 } },
    { id: 'e-arch-fe', source: 'architect', target: 'frontend', sourceHandle: 'out-tasks', targetHandle: 'in-specs', animated: true, style: { stroke: '#63B3ED', strokeWidth: 2 } },
    { id: 'e-arch-be', source: 'architect', target: 'backend', sourceHandle: 'out-tasks', targetHandle: 'target-input', animated: true, style: { stroke: '#63B3ED', strokeWidth: 2 } },
    { id: 'e-fe-qa', source: 'frontend', target: 'qa', sourceHandle: 'out-code', targetHandle: 'in-code', animated: true, style: { stroke: '#48BB78', strokeWidth: 2 } },
    { id: 'e-be-qa', source: 'backend', target: 'qa', sourceHandle: 'source-output', targetHandle: 'in-code', animated: true, style: { stroke: '#48BB78', strokeWidth: 2 } },
    { id: 'e-qa-deploy', source: 'qa', target: 'tool-deploy', sourceHandle: 'out-report', targetHandle: 'left-target', animated: true, style: { stroke: '#63B3ED', strokeWidth: 2 } },
  ]
};

// ─────────────────────────────────────────────────────────
// Template 2: Content Creation Pipeline
// ─────────────────────────────────────────────────────────
const contentPipeline: TeamTemplate = {
  id: 'content-pipeline',
  name: '内容创作与审查流水线',
  description: '选题→调研→写作→路由(审阅)→SEO→发布',
  icon: '✍️',
  category: 'content',
  nodes: [
    {
      id: 'input-topic',
      type: 'inputNode',
      position: { x: 50, y: 100 },
      data: { prompt: '撰写一篇关于“AI在医疗领域未来五年发展”的万字深度报告。' }
    },
    {
      id: 'researcher',
      type: 'agentNode',
      position: { x: 300, y: 100 },
      data: {
        label: 'Researcher',
        role: '调研分析师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '收集数据点、行业趋势、竞品分析，提供论据。',
        expectedOutput: '调研素材'
      }
    },
    {
      id: 'writer',
      type: 'agentNode',
      position: { x: 600, y: 100 },
      data: {
        label: 'Content Writer',
        role: '内容创作者',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '基于调研结果，撰写一篇高质量长文。',
        expectedOutput: '文章草稿'
      }
    },
    {
      id: 'editor',
      type: 'agentNode',
      position: { x: 900, y: 100 },
      data: {
        label: 'Editor',
        role: '主编 / Manager',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '审阅内容，检查语法、逻辑并标注修改意见。',
        expectedOutput: '修改记录或通过标志'
      }
    },
    {
      id: 'router-check',
      type: 'routerNode',
      position: { x: 1200, y: 100 },
      data: { condition: '文章是否完美通过审核？' }
    },
    {
      id: 'seo',
      type: 'agentNode',
      position: { x: 1500, y: 0 },
      data: {
        label: 'SEO Specialist',
        role: 'SEO 优化专家',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '提取目标关键词，优化标题和 Meta 标签。',
        expectedOutput: 'SEO最终版'
      }
    },
    {
      id: 'tool-publish',
      type: 'toolNode',
      position: { x: 1800, y: 0 },
      data: { tool: 'web_search' }
    }
  ],
  edges: [
    { id: 'e-topic-res', source: 'input-topic', target: 'researcher', sourceHandle: 'source-output', targetHandle: 'target-input', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-res-wri', source: 'researcher', target: 'writer', sourceHandle: 'source-output', targetHandle: 'target-input', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-wri-edi', source: 'writer', target: 'editor', sourceHandle: 'source-output', targetHandle: 'in-goal', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-edi-rt', source: 'editor', target: 'router-check', sourceHandle: 'out-approved', targetHandle: 'left-target', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
    
    // True: pass to SEO
    { id: 'e-rt-seo', source: 'router-check', target: 'seo', sourceHandle: 'source-true', targetHandle: 'target-input', animated: true, style: { stroke: '#48BB78', strokeWidth: 2 } },
    { id: 'e-seo-pub', source: 'seo', target: 'tool-publish', sourceHandle: 'source-output', targetHandle: 'left-target', animated: true, style: { stroke: '#63B3ED', strokeWidth: 2 } },
    
    // False: back to writer
    { id: 'e-rt-wri', source: 'router-check', target: 'writer', sourceHandle: 'source-false', targetHandle: 'target-input', animated: true, style: { stroke: '#F56565', strokeWidth: 2, strokeDasharray: '5 5' } },
  ]
};

// ─────────────────────────────────────────────────────────
// Template 3: Data Analysis & Insight
// ─────────────────────────────────────────────────────────
const dataAnalysis: TeamTemplate = {
  id: 'data-analysis',
  name: '数据分析与洞察报告',
  description: '抓取工具→采集→清洗→分析→报告生成',
  icon: '📊',
  category: 'data',
  nodes: [
    {
      id: 'tool-fetch',
      type: 'toolNode',
      position: { x: 50, y: 200 },
      data: { tool: 'web_search' }
    },
    {
      id: 'collector',
      type: 'agentNode',
      position: { x: 350, y: 200 },
      data: {
        label: 'Data Collector',
        role: '数据采集工程师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '解析抓取的网页，提取结构化源数据。',
        expectedOutput: '原始数据集'
      }
    },
    {
      id: 'cleaner',
      type: 'agentNode',
      position: { x: 650, y: 200 },
      data: {
        label: 'Data Cleaner',
        role: '数据清洗专家',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '处理缺失值、异常值，标准化格式。',
        expectedOutput: '清洗后数据集'
      }
    },
    {
      id: 'analyst',
      type: 'agentNode',
      position: { x: 950, y: 200 },
      data: {
        label: 'Data Analyst',
        role: '数据分析师',
        icon: 'coder',
        baseUrl: '', apiKey: '',
        taskDescription: '执行 EDA，建立预测模型，提出建议。',
        expectedOutput: '分析报告'
      }
    },
    {
      id: 'reporter',
      type: 'agentNode',
      position: { x: 1250, y: 200 },
      data: {
        label: 'Report Generator',
        role: '可视化总监 / Manager',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '整合分析师成果，设计可视化呈现执行摘要。',
        expectedOutput: '最终 PPT / 报告'
      }
    }
  ],
  edges: [
    { id: 'e-tool-col', source: 'tool-fetch', target: 'collector', sourceHandle: 'source-output', targetHandle: 'target-input', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-col-cln', source: 'collector', target: 'cleaner', sourceHandle: 'source-output', targetHandle: 'target-input', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-cln-ana', source: 'cleaner', target: 'analyst', sourceHandle: 'source-output', targetHandle: 'target-input', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
    { id: 'e-ana-rep', source: 'analyst', target: 'reporter', sourceHandle: 'source-output', targetHandle: 'in-goal', animated: true, style: { stroke: '#8B5CF6', strokeWidth: 2 } },
  ]
};

// ─────────────────────────────────────────────────────────
// Template 4: Manager-Subagent Delegation
// ─────────────────────────────────────────────────────────
const agentTeamDelegation: TeamTemplate = {
  id: 'agent-team',
  name: '经典主从智能体协作',
  description: '需求→Manager分发→多Worker并行执行→汇总',
  icon: '🤖',
  category: 'agent',
  nodes: [
    {
      id: 'input-task',
      type: 'inputNode',
      position: { x: 50, y: 200 },
      data: { prompt: '分析三大竞品(A,B,C)的用户评价，并汇总成一份优劣势对比图。' }
    },
    {
      id: 'manager',
      type: 'agentNode',
      position: { x: 350, y: 200 },
      data: {
        label: 'Orchestrator',
        role: '主控 Manager',
        icon: 'manager',
        baseUrl: '', apiKey: '',
        taskDescription: '接收总任务，拆解分发给 Worker，最后汇总审核。',
        expectedOutput: '综合评估结果'
      }
    },
    {
      id: 'worker-a',
      type: 'agentNode',
      position: { x: 750, y: 0 },
      data: {
        label: 'Worker Alpha',
        role: '执行节点 A',
        icon: 'coder',
        taskDescription: '独立完成子任务 A。',
        expectedOutput: '子任务 A 结果'
      }
    },
    {
      id: 'worker-b',
      type: 'agentNode',
      position: { x: 750, y: 200 },
      data: {
        label: 'Worker Beta',
        role: '执行节点 B',
        icon: 'coder',
        taskDescription: '独立完成子任务 B。',
        expectedOutput: '子任务 B 结果'
      }
    },
    {
      id: 'worker-c',
      type: 'agentNode',
      position: { x: 750, y: 400 },
      data: {
        label: 'Worker Gamma',
        role: '执行节点 C',
        icon: 'coder',
        taskDescription: '独立完成子任务 C。',
        expectedOutput: '子任务 C 结果'
      }
    },
    {
      id: 'aggregator',
      type: 'agentNode',
      position: { x: 1150, y: 200 },
      data: {
        label: 'Aggregator',
        role: '汇总器 / Manager',
        icon: 'manager',
        taskDescription: '合并、去重各子任务结果，解决冲突。',
        expectedOutput: '统一汇总文档'
      }
    }
  ],
  edges: [
    { id: 'e-in-mgr', source: 'input-task', target: 'manager', sourceHandle: 'source-output', targetHandle: 'in-goal', animated: true, style: { stroke: '#9F7AEA', strokeWidth: 2 } },
    { id: 'e-mgr-wa', source: 'manager', target: 'worker-a', sourceHandle: 'out-tasks', targetHandle: 'target-input', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-mgr-wb', source: 'manager', target: 'worker-b', sourceHandle: 'out-tasks', targetHandle: 'target-input', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-mgr-wc', source: 'manager', target: 'worker-c', sourceHandle: 'out-tasks', targetHandle: 'target-input', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-wa-agg', source: 'worker-a', target: 'aggregator', sourceHandle: 'source-output', targetHandle: 'in-goal', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-wb-agg', source: 'worker-b', target: 'aggregator', sourceHandle: 'source-output', targetHandle: 'in-goal', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-wc-agg', source: 'worker-c', target: 'aggregator', sourceHandle: 'source-output', targetHandle: 'in-goal', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
  ]
};

// ─────────────────────────────────────────────────────────
// Template 5: Full-Stack Product Launch
// ─────────────────────────────────────────────────────────
const productLaunch: TeamTemplate = {
  id: 'product-launch',
  name: '全栈产品上线流水线',
  description: '输入→PO→UX+前端+后端+运维(并行)→评审→E2E',
  icon: '🚀',
  category: 'engineering',
  nodes: [
    {
      id: 'input-prd',
      type: 'inputNode',
      position: { x: 50, y: 200 },
      data: { prompt: '上线全新移动端电商购物车和支付链路。' }
    },
    {
      id: 'po',
      type: 'agentNode',
      position: { x: 350, y: 200 },
      data: {
        label: 'Product Owner',
        role: '产品 / Manager',
        icon: 'manager',
        taskDescription: '定义验收标准和 Sprint 规划。',
        expectedOutput: 'PRD 与 验收标准'
      }
    },
    {
      id: 'ux',
      type: 'agentNode',
      position: { x: 650, y: -50 },
      data: {
        label: 'UX Designer',
        role: '前端 / UI 设计',
        icon: 'coder',
        taskDescription: '创建线框图和组件规范。',
        expectedOutput: '设计规范文档'
      }
    },
    {
      id: 'fe',
      type: 'agentNode',
      position: { x: 650, y: 150 },
      data: {
        label: 'Frontend Dev',
        role: '前端工程师',
        icon: 'coder',
        taskDescription: '实现 UI 组件和客户端状态管理。',
        expectedOutput: '前端源代码'
      }
    },
    {
      id: 'be',
      type: 'agentNode',
      position: { x: 650, y: 350 },
      data: {
        label: 'Backend Dev',
        role: '后端开发工程师',
        icon: 'coder',
        taskDescription: '设计和实现 REST API、数据库。',
        expectedOutput: '后端源代码'
      }
    },
    {
      id: 'devops',
      type: 'agentNode',
      position: { x: 650, y: 550 },
      data: {
        label: 'DevOps',
        role: '运维 DevOps',
        icon: 'coder',
        taskDescription: '配置 CI/CD 流水线。',
        expectedOutput: 'Docker 和部署脚本'
      }
    },
    {
      id: 'reviewer',
      type: 'agentNode',
      position: { x: 950, y: 150 },
      data: {
        label: 'Code Reviewer',
        role: '代码评审 / Manager',
        icon: 'manager',
        taskDescription: '审查所有代码，检查漏洞。',
        expectedOutput: '代码评审报告'
      }
    },
    {
      id: 'e2e',
      type: 'agentNode',
      position: { x: 1250, y: 150 },
      data: {
        label: 'E2E Tester',
        role: '端到端测试 / QA',
        icon: 'coder',
        taskDescription: '编写 Playwright 脚本，执行验收测试。',
        expectedOutput: '测试结果报告'
      }
    }
  ],
  edges: [
    { id: 'e-in-po', source: 'input-prd', target: 'po', sourceHandle: 'source-output', targetHandle: 'in-goal', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-po-ux', source: 'po', target: 'ux', sourceHandle: 'out-tasks', targetHandle: 'in-specs', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-po-fe', source: 'po', target: 'fe', sourceHandle: 'out-tasks', targetHandle: 'in-specs', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-po-be', source: 'po', target: 'be', sourceHandle: 'out-tasks', targetHandle: 'target-input', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    { id: 'e-po-devops', source: 'po', target: 'devops', sourceHandle: 'out-tasks', targetHandle: 'in-codebase', animated: true, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    
    { id: 'e-ux-rev', source: 'ux', target: 'reviewer', sourceHandle: 'out-code', targetHandle: 'in-goal', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-fe-rev', source: 'fe', target: 'reviewer', sourceHandle: 'out-code', targetHandle: 'in-goal', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    
    { id: 'e-rev-e2e', source: 'reviewer', target: 'e2e', sourceHandle: 'out-approved', targetHandle: 'in-code', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
    { id: 'e-be-e2e', source: 'be', target: 'e2e', sourceHandle: 'source-output', targetHandle: 'in-code', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
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
