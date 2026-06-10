export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  status: string;
  creator: string;
  dependencies: string[];
  affected_files: string[];
  comments: Comment[];
  history: HistoryItem[];
  priority?: string;
  due_date?: string;
  tags?: string[];
}

export interface Comment {
  time: string;
  author: string;
  comment: string;
}

export interface HistoryItem {
  time: string;
  from: string;
  to: string;
  operator: string;
  message?: string;
}

export interface EnvStatus {
  git_installed: boolean;
  git_version: string;
  python_installed: boolean;
  python_version: string;
  uv_installed: boolean;
  uv_version: string;
  node_installed: boolean;
  node_version: string;
  npm_installed: boolean;
  npm_version: string;
  smithery_installed: boolean;
  claude_code_installed: boolean;
  venv_initialized: boolean;
  project_db_shared: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  comments: Comment[];
  updatedAt: string;
}

export interface AgentEvent {
  event: 'system' | 'agent_started' | 'agent_action' | 'agent_finished' | 'success' | 'error' | 'user_input' | 'ask_human' | 'agent_delegated';
  agent: string;
  message?: string;
  task?: string;
  tool?: string;
  file?: string;
  result?: string;
  node_id?: string;
}

export interface TeamSession {
  id: string;
  title: string;
  events: AgentEvent[];
  updatedAt: string;
}
