import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../context/AppContext';

export const useAgentCmd = () => {
  const { projectPath } = useAppContext();

  const runCmd = async (args: string[]): Promise<string> => {
    return await invoke("run_agentflow_cmd", {
      projectPath,
      args
    });
  };

  const checkEnv = async (): Promise<any> => {
    return await invoke("check_environment", { projectPath });
  };

  return { runCmd, checkEnv };
};
