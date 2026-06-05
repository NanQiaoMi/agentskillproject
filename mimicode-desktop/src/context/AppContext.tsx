import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { EnvStatus, Task } from '../types';
import { notifyAppAndDesktop } from '../utils/notifications';

interface AppContextType {
  projectPath: string;
  setProjectPath: (path: string) => void;
  envStatus: EnvStatus | null;
  setEnvStatus: (status: EnvStatus | null) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
  viewState: 'list' | 'detail';
  setViewState: (state: 'list' | 'detail') => void;
  chatInputText: string;
  setChatInputText: (text: string) => void;
  showSearchModal: boolean;
  setShowSearchModal: React.Dispatch<React.SetStateAction<boolean>>;
  fetchTasks: (isBackgroundPolling?: boolean) => Promise<void>;
  handleSelectDirectory: () => Promise<void>;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: number) => void;
  language: string;
  setLanguage: (lang: string) => void;
  showNewTaskModal: boolean;
  setShowNewTaskModal: React.Dispatch<React.SetStateAction<boolean>>;
  showWizard: boolean;
  setShowWizard: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projectPath, setProjectPath] = useState(() => localStorage.getItem('mimicode_project_path') || 'D:\\agentcode');
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState('Chat');
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');
  const [chatInputText, setChatInputText] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('mimi-language') || '简体中文';
    } catch {
      return '简体中文';
    }
  });

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchTasks = async (isBackgroundPolling: boolean = false) => {
    try {
      const res: string = await invoke('run_agentflow_cmd', {
        projectPath,
        args: ['json-list'],
      });
      const jsonStart = res.indexOf('[');
      if (jsonStart !== -1) {
        const jsonStr = res.substring(jsonStart);
        const parsed: Task[] = JSON.parse(jsonStr);

        if (isBackgroundPolling && tasksRef.current.length > 0) {
          parsed.forEach(currentTask => {
            const prevTask = tasksRef.current.find(t => t.id === currentTask.id);
            if (prevTask && prevTask.status !== currentTask.status && currentTask.status === 'done') {
              void notifyAppAndDesktop({
                type: 'task',
                title: '后台任务完成',
                desc: `检测到任务 "${currentTask.title}" 已由智能体更新为“已完成”。`,
                desktop: true,
                respectFocus: true,
              });
            }
          });
        }

        tasksRef.current = parsed;
        setTasks(parsed);
      } else {
        tasksRef.current = [];
        setTasks([]);
      }
    } catch (err) {
      if (!isBackgroundPolling) {
        console.error(err);
        addToast('MIMIcode 无法加载任务列表：' + String(err), 'error');
      }
      tasksRef.current = [];
      setTasks([]);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const selected: string = await invoke('select_directory');
      if (selected) {
        await invoke('initialize_project', { projectPath: selected });
        setProjectPath(selected);
        localStorage.setItem('mimicode_project_path', selected);
      }
    } catch (err) {
      if (err !== 'Operation cancelled by user') {
        addToast('选择目录失败：' + err, 'error');
      }
    }
  };

  useEffect(() => {
    const handleLangChange = (e: any) => {
      setLanguage(e.detail);
    };
    window.addEventListener('mimi-language-changed', handleLangChange);
    return () => window.removeEventListener('mimi-language-changed', handleLangChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('mimi-language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('mimicode_project_path', projectPath);
  }, [projectPath]);

  return (
    <AppContext.Provider value={{
      projectPath, setProjectPath,
      envStatus, setEnvStatus,
      tasks, setTasks,
      selectedTaskId, setSelectedTaskId,
      activeNav, setActiveNav,
      viewState, setViewState,
      chatInputText, setChatInputText,
      showSearchModal, setShowSearchModal,
      fetchTasks, handleSelectDirectory,
      toasts, addToast, removeToast,
      language, setLanguage,
      showNewTaskModal, setShowNewTaskModal,
      showWizard, setShowWizard,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
