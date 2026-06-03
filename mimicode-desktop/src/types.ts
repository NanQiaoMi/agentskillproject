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
  venv_initialized: boolean;
  project_db_shared: boolean;
}
