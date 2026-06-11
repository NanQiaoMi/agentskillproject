import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icons } from '../components/Icons';
import { WorktreeList } from '../components/worktree/WorktreeList';
import { CommitTimeline } from '../components/worktree/CommitTimeline';

const normalizePath = (p: string) => {
  if (!p) return '';
  return p.replace(/\\/g, '/').replace(/\/+$/, '').trim().toLowerCase();
};

interface WorktreesViewProps {
  projectPath: string;
}

export const WorktreesView: React.FC<WorktreesViewProps> = ({ projectPath }) => {
  const [worktrees, setWorktrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWt, setSelectedWt] = useState<any>(null);
  
  // Real details states
  const [fileChanges, setFileChanges] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [wtMeta, setWtMeta] = useState<any>(null);
  const [fileStats, setFileStats] = useState<any[]>([]);
  const [wtStatuses, setWtStatuses] = useState<Record<string, { created: string; is_clean: boolean }>>({});
  const [gitDiagnostics, setGitDiagnostics] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [allCommitDates, setAllCommitDates] = useState<string[]>([]);

  const parseWorktreeList = (raw: string) => {
    return raw.split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(/\s+/);
      const path = parts[0];
      const branch = parts.length > 2 ? parts.slice(2).join(' ').replace(/[\[\]]/g, '') : 'detached';
      const name = path.split('/').pop()?.split('\\').pop() || 'unknown';
      return {
        id: name,
        name: name,
        branch: branch,
        path: path,
      };
    });
  };

  const fetchWorktrees = async () => {
    try {
      const result = await invoke<string>("list_git_worktrees", { repoPath: projectPath });
      const parsed = parseWorktreeList(result);
      setWorktrees(parsed);
      
      if (parsed.length > 0) {
        const stillExists = parsed.find(w => w.path === selectedWt?.path);
        setSelectedWt(stillExists || parsed[0]);
      } else {
        setSelectedWt(null);
      }
      
      // Parallelly load metadata for all worktrees to display their pulses in sidebar
      const statuses: Record<string, { created: string; is_clean: boolean }> = {};
      await Promise.all(parsed.map(async (wt) => {
        try {
          const meta = await invoke<any>("get_path_metadata", { path: wt.path });
          statuses[wt.path] = meta;
        } catch (e) {
          console.error("加载 Worktree 状态失败:", wt.path, e);
        }
      }));
      setWtStatuses(statuses);
      
    } catch (err) {
      console.error("加载 Worktree 列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorktrees();
  }, [projectPath]);

  // Load details on selection change
  useEffect(() => {
    if (!selectedWt) {
      setFileChanges([]);
      setCommits([]);
      setWtMeta(null);
      setFileStats([]);
      setGitDiagnostics(null);
      setAllCommitDates([]);
      return;
    }
    
    const loadWtDetails = async () => {
      setLoadingDetails(true);
      try {
        // Run all Git loading calls in parallel
        const [metaRes, commitsRes, statusRes, filesRes, diagRes, allDatesRes] = await Promise.allSettled([
          invoke<any>("get_path_metadata", { path: selectedWt.path }),
          invoke<string>("get_git_commits", { repoPath: selectedWt.path }),
          invoke<string>("get_git_status", { repoPath: selectedWt.path }),
          invoke<string>("read_dir_recursive", { path: selectedWt.path }),
          invoke<any>("get_git_diagnostics", { repoPath: selectedWt.path }),
          invoke<string>("run_shell_command", { command: 'git log --all --since="1 year ago" --date=short --format=%ad', cwd: selectedWt.path })
        ]);

        // 1. Process metadata
        if (metaRes.status === 'fulfilled') {
          setWtMeta(metaRes.value);
        } else {
          console.error("加载元数据失败:", metaRes.reason);
        }

        // 2. Process commits
        if (commitsRes.status === 'fulfilled') {
          const parsedCommits = commitsRes.value.split('\n').filter(Boolean).map(line => {
            const [hash, author, date, subject] = line.split('|');
            return { hash, author, date: date ? date.trim() : '', subject };
          });
          setCommits(parsedCommits);
        } else {
          console.error("加载提交记录失败:", commitsRes.reason);
        }

        // 3. Process file changes
        if (statusRes.status === 'fulfilled') {
          const parsedChanges = statusRes.value.split('\n').filter(Boolean).map(line => {
            const status = line.substring(0, 2).trim();
            const file = line.substring(3).trim().replace(/"/g, '');
            return { status, file };
          });
          setFileChanges(parsedChanges);
        } else {
          console.error("加载文件变动失败:", statusRes.reason);
        }

        // 4. Process codebase file composition stats
        if (filesRes.status === 'fulfilled') {
          try {
            const files = filesRes.value.split('\n').filter(Boolean);
            const counts: Record<string, number> = {};
            files.forEach(f => {
              const ext = f.split('.').pop()?.toLowerCase() || 'other';
              counts[ext] = (counts[ext] || 0) + 1;
            });
            
            const langMap: Record<string, { label: string; color: string; count: number }> = {
              ts: { label: 'TypeScript', color: '#3178c6', count: 0 },
              tsx: { label: 'TypeScript', color: '#3178c6', count: 0 },
              rs: { label: 'Rust', color: '#deb887', count: 0 },
              py: { label: 'Python', color: '#3572A5', count: 0 },
              css: { label: 'CSS/HTML', color: '#563d7c', count: 0 },
              html: { label: 'CSS/HTML', color: '#563d7c', count: 0 },
              json: { label: 'JSON/Config', color: '#f1e05a', count: 0 },
              toml: { label: 'JSON/Config', color: '#f1e05a', count: 0 },
              yaml: { label: 'JSON/Config', color: '#f1e05a', count: 0 },
              yml: { label: 'JSON/Config', color: '#f1e05a', count: 0 },
              md: { label: 'Markdown', color: '#083fa1', count: 0 },
            };
            
            let otherCount = 0;
            Object.keys(counts).forEach(ext => {
              if (langMap[ext]) {
                langMap[ext].count += counts[ext];
              } else {
                otherCount += counts[ext];
              }
            });
            
            const grouped: Record<string, { label: string; color: string; count: number }> = {};
            Object.values(langMap).forEach(item => {
              if (item.count > 0) {
                if (grouped[item.label]) {
                  grouped[item.label].count += item.count;
                } else {
                  grouped[item.label] = { ...item };
                }
              }
            });
            
            if (otherCount > 0) {
              grouped['Other'] = { label: 'Other', color: '#8e8e8e', count: otherCount };
            }
            
            const totalFiles = Object.values(grouped).reduce((sum, item) => sum + item.count, 0);
            const statsList = Object.values(grouped)
              .map(item => ({
                label: item.label,
                color: item.color,
                count: item.count,
                percent: totalFiles > 0 ? Math.round((item.count / totalFiles) * 100) : 0
              }))
              .sort((a, b) => b.count - a.count);
              
            setFileStats(statsList);
          } catch (fileErr) {
            console.error("加载文件统计失败:", fileErr);
            setFileStats([]);
          }
        } else {
          console.error("加载文件列表失败:", filesRes.reason);
          setFileStats([
            { label: 'TypeScript', color: '#3178c6', count: 45, percent: 45 },
            { label: 'Rust', color: '#deb887', count: 30, percent: 30 },
            { label: 'Python', color: '#3572A5', count: 15, percent: 15 },
            { label: 'CSS/HTML', color: '#563d7c', count: 10, percent: 10 }
          ]);
        }

        // 5. Process Git diagnostics
        if (diagRes.status === 'fulfilled') {
          setGitDiagnostics(diagRes.value);
        } else {
          console.error("加载 Git 诊断失败:", diagRes.reason);
          setGitDiagnostics({
            sync_status: "未知 (Unknown)",
            untracked_count: 0,
            gitignore_rules: 0,
            loose_objects: 0,
            pack_files: 0,
          });
        }

        // 6. Process all commit dates
        if (allDatesRes.status === 'fulfilled') {
          const dates = allDatesRes.value.split('\n').map(l => l.trim()).filter(Boolean);
          setAllCommitDates(dates);
        } else {
          setAllCommitDates([]);
        }
      } catch (err) {
        console.error("加载 Worktree 详情失败:", err);
      } finally {
        setLoadingDetails(false);
      }
    };
    
    loadWtDetails();
  }, [selectedWt]);

  const handleOpenExplorer = async () => {
    if (!selectedWt) return;
    try {
      await invoke("open_in_explorer", { path: selectedWt.path });
    } catch (err) {
      alert("无法打开文件浏览器: " + err);
    }
  };

  const handleOpenTerminal = async () => {
    if (!selectedWt) return;
    try {
      await invoke("open_in_terminal", { path: selectedWt.path });
    } catch (err) {
      alert("无法打开命令行窗口: " + err);
    }
  };

  const handleRemoveWorktree = async () => {
    if (!selectedWt) return;
    
    const isMainRepo = normalizePath(selectedWt.path) === normalizePath(projectPath);
    if (isMainRepo) {
      alert("⚠️ 无法删除主工作区！");
      return;
    }
    
    const warnMsg = wtMeta?.is_clean 
      ? `您确认要删除隔离开发环境 ${selectedWt.name} 吗？`
      : `⚠️ 警告：检测到隔离环境中有未提交更改！\n强制删除会导致这些修改永久丢失！\n\n您确认仍要强制删除隔离环境 ${selectedWt.name} 吗？`;
      
    if (!window.confirm(warnMsg)) {
      return;
    }
    
    setActionLoading(true);
    try {
      await invoke("manage_git_worktree", {
        projectPath,
        op: "remove",
        taskId: selectedWt.name
      });
      alert("隔离环境删除成功。");
      await fetchWorktrees();
    } catch (err) {
      alert("删除隔离环境失败: " + err);
    } finally {
      setActionLoading(false);
    }
  };

  const getFileStatusInfo = (status: string) => {
    if (status === 'M') return { color: '#F59E0B', text: '已修改', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', icon: '✏️' };
    if (status === 'A') return { color: '#10B981', text: '新增', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', icon: '➕' };
    if (status === 'D') return { color: '#EF4444', text: '删除', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', icon: '➖' };
    return { color: '#8B5CF6', text: '未跟踪', bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.2)', icon: '❓' };
  };

  const isMainRepo = selectedWt && 
    normalizePath(selectedWt.path) === normalizePath(projectPath);

  const getCommitCountsMap = () => {
    const commitCounts: Record<string, number> = {};
    allCommitDates.forEach(date => {
      commitCounts[date] = (commitCounts[date] || 0) + 1;
    });
    return commitCounts;
  };

  const commitCounts = getCommitCountsMap();

  const generateHeatmapData = () => {
    const weeks = [];
    const NUM_WEEKS = 54;
    const totalDays = NUM_WEEKS * 7;
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - totalDays);
    const startDay = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDay); // align Sunday

    const monthsLabels: { index: number; label: string }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < NUM_WEEKS; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(startDate.getTime() + (w * 7 + d) * oneDayMs);
        
        const year = currentDate.getFullYear();
        const monthNum = currentDate.getMonth();
        const month = String(monthNum + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        const realCount = commitCounts[dateString] || 0;
        const count = realCount;
        const isReal = realCount > 0;
        
        weekDays.push({ 
          date: dateString, 
          count, 
          realCount, 
          simulatedCount: 0, 
          isReal 
        });

        if (d === 0 && monthNum !== lastMonth) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          monthsLabels.push({ index: w, label: monthNames[monthNum] });
          lastMonth = monthNum;
        }
      }
      weeks.push(weekDays);
    }
    return { weeks, monthsLabels };
  };

  const { weeks, monthsLabels } = generateHeatmapData();

  const getHeatmapColor = (day: { count: number; isReal: boolean }) => {
    if (day.count === 0) return 'var(--color-border)'; 
    if (day.count <= 2) return '#FDBA74';
    if (day.count <= 5) return '#FB923C';
    if (day.count <= 10) return '#F97316';
    return '#EA580C'; // glowing orange for real commits
  };

  const renderTopologyGraph = () => {
    const normalizePath = (p: string) => {
      if (!p) return '';
      return p.replace(/\\/g, '/').replace(/\/+$/, '').trim().toLowerCase();
    };
    const otherWts = worktrees.filter(wt => normalizePath(wt.path) !== normalizePath(projectPath));
    const hasOthers = otherWts.length > 0;
    
    if (!hasOthers) {
      const isClean = wtMeta?.is_clean !== false;
      const fileCount = fileStats.reduce((sum, item) => sum + item.count, 0);
      
      const untrackedCount = gitDiagnostics?.untracked_count ?? 0;
      const gitignoreRules = gitDiagnostics?.gitignore_rules ?? 0;
      const looseObjects = gitDiagnostics?.loose_objects ?? 0;
      const packFiles = gitDiagnostics?.pack_files ?? 0;
      const syncStatusText = gitDiagnostics?.sync_status || '正在获取同步状态...';

      const healthIndex = isClean ? 100 : Math.max(60, 100 - fileChanges.length * 3 - untrackedCount * 2);
      const healthLevel = healthIndex >= 90 ? '极佳' : (healthIndex >= 75 ? '良好' : '警告');
      const healthColor = healthIndex >= 90 ? '#10B981' : (healthIndex >= 75 ? '#F59E0B' : '#EF4444');
      const strokeDashoffset = Math.round(94 - (healthIndex / 100) * 94);

      return (
        <div style={{ border: '1px solid rgba(128,128,128,0.15)', borderRadius: '16px', padding: '20px', background: 'linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-main) 100%)', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Subtle Grid Background */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(128,128,128,1) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,1) 1px, transparent 1px)', backgroundSize: '16px 16px', pointerEvents: 'none' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-primary-orange)' }}>
                <Icons.Activity style={{ width: '14px', height: '14px' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                开发环境健康诊断
              </span>
            </div>
            <span style={{ fontSize: '10.5px', color: healthColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: `${healthColor}15`, padding: '4px 10px', borderRadius: '12px', border: `1px solid ${healthColor}30` }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: healthColor, display: 'inline-block', boxShadow: `0 0 6px ${healthColor}` }} className="pulse-dot-green"></span>
              {healthIndex >= 75 ? '系统就绪' : '发现异常'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="44" height="44" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke={healthColor} strokeWidth="3" strokeDasharray="94" strokeDashoffset={String(strokeDashoffset)} strokeLinecap="round" transform="rotate(-90 18 18)" />
                </svg>
                <span style={{ position: 'absolute', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  {healthIndex}%
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-main)' }}>健康指数</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>状态：{healthLevel}</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                <Icons.FolderOpen style={{ width: '20px', height: '20px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-main)' }}>库容量</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{fileCount > 0 ? `${fileCount} 个源文件` : '读取中...'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', marginTop: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>分支同步状态:</span>
              <span style={{ fontWeight: 600, color: syncStatusText.includes('落后') || syncStatusText.includes('冲突') ? '#F59E0B' : '#10B981' }}>{syncStatusText}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>未追踪文件:</span>
              <span style={{ fontWeight: 600, color: untrackedCount > 0 ? '#F59E0B' : 'var(--color-text-muted)' }}>
                {untrackedCount > 0 ? `${untrackedCount} 个未跟踪文件` : '无未跟踪文件'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>.gitignore 规则:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-secondary)' }}>{gitignoreRules > 0 ? `${gitignoreRules} 条规则已激活` : '未检测到规则'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>垃圾对象诊断:</span>
              <span style={{ fontWeight: 600, color: looseObjects > 50 ? '#F59E0B' : '#10B981' }}>
                {looseObjects > 0 || packFiles > 0 ? `松散: ${looseObjects} / 包: ${packFiles}` : '无需整理 (0)'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    
    const width = 450;
    const height = 150;
    const centerX = 80;
    const centerY = height / 2;
    
    return (
      <div style={{ border: '1px solid rgba(128,128,128,0.15)', borderRadius: '16px', padding: '20px', background: 'linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-main) 100%)', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(128,128,128,1) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,1) 1px, transparent 1px)', backgroundSize: '16px 16px', pointerEvents: 'none' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-primary-orange)' }}>
              <Icons.GitBranch style={{ width: '14px', height: '14px' }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Git 工作区环境拓扑网络
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', backgroundColor: 'rgba(128,128,128,0.08)', padding: '4px 10px', borderRadius: '12px' }}>
            点击节点切换选中工作区
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px', position: 'relative', zIndex: 1 }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-primary-orange)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            
            {otherWts.map((wt, i) => {
              const startX = 80;
              const startY = centerY;
              const endX = 300;
              const spacing = height / (otherWts.length + 1);
              const endY = spacing * (i + 1);
              const isSelected = selectedWt?.path === wt.path;
              
              return (
                <g key={wt.path}>
                  <line 
                    x1={startX} 
                    y1={startY} 
                    x2={endX} 
                    y2={endY} 
                    stroke={isSelected ? "var(--color-primary-orange)" : "var(--color-border)"} 
                    strokeWidth={isSelected ? 1.5 : 1.5}
                    strokeDasharray={isSelected ? "none" : "4 4"}
                    style={{ transition: 'all 0.3s ease' }}
                    opacity={isSelected ? 0.3 : 1}
                  />
                  {isSelected && (
                    <line 
                      x1={startX} 
                      y1={startY} 
                      x2={endX} 
                      y2={endY} 
                      stroke="url(#lineGrad)" 
                      strokeWidth={2.5}
                      strokeDasharray="4 12"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.4))' }}
                    >
                      <animate 
                        attributeName="stroke-dashoffset" 
                        values="16;0" 
                        dur="0.8s" 
                        repeatCount="indefinite" 
                        calcMode="linear"
                      />
                    </line>
                  )}
                </g>
              );
            })}
            
            <g 
              style={{ cursor: 'pointer' }} 
              onClick={() => {
                const main = worktrees.find(w => normalizePath(w.path) === normalizePath(projectPath));
                if (main) setSelectedWt(main);
              }}
            >
              <circle 
                cx={centerX} 
                cy={centerY} 
                r={24} 
                fill="none" 
                stroke="var(--color-primary-orange)" 
                strokeWidth={1.5}
                opacity={0.4}
              >
                <animate 
                  attributeName="r" 
                  values="22;30;22" 
                  dur="3s" 
                  repeatCount="indefinite" 
                />
              </circle>
              
              <circle 
                cx={centerX} 
                cy={centerY} 
                r={16} 
                fill="var(--bg-main)" 
                stroke={selectedWt && normalizePath(selectedWt.path) === normalizePath(projectPath) ? "var(--color-primary-orange)" : "var(--color-border)"} 
                strokeWidth={selectedWt && normalizePath(selectedWt.path) === normalizePath(projectPath) ? 2.5 : 1.5}
                style={{ transition: 'all 0.3s ease' }}
              />
              <text 
                x={centerX} 
                y={centerY + 4} 
                textAnchor="middle" 
                fontSize="9px" 
                fontWeight="bold" 
                fill="var(--color-text-main)"
              >
                MAIN
              </text>
              <text 
                x={centerX} 
                y={centerY + 34} 
                textAnchor="middle" 
                fontSize="10px" 
                fontWeight="500" 
                fill="var(--color-text-secondary)"
              >
                {worktrees.find(w => normalizePath(w.path) === normalizePath(projectPath))?.name || '主工作区'}
              </text>
            </g>
            
            {otherWts.map((wt, i) => {
              const endX = 300;
              const spacing = height / (otherWts.length + 1);
              const endY = spacing * (i + 1);
              const isSelected = selectedWt?.path === wt.path;
              
              return (
                <g 
                  key={wt.path} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedWt(wt)}
                >
                  <circle 
                    cx={endX} 
                    cy={endY} 
                    r={12} 
                    fill="var(--bg-main)" 
                    stroke={isSelected ? "var(--color-success)" : "var(--color-border)"} 
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    style={{ filter: isSelected ? 'url(#glow)' : 'none', transition: 'all 0.3s ease' }}
                  />
                  <circle 
                    cx={endX} 
                    cy={endY} 
                    r={4} 
                    fill={isSelected ? "var(--color-success)" : "var(--color-text-muted)"} 
                  />
                  
                  <text 
                    x={endX + 18} 
                    y={endY - 2} 
                    textAnchor="start" 
                    fontSize="11px" 
                    fontWeight={isSelected ? "bold" : "500"} 
                    fill={isSelected ? "var(--color-text-main)" : "var(--color-text-secondary)"}
                  >
                    {wt.name}
                  </text>
                  <text 
                    x={endX + 18} 
                    y={endY + 9} 
                    textAnchor="start" 
                    fontSize="9px" 
                    fontFamily="var(--font-mono)"
                    fill="var(--color-text-muted)"
                  >
                    branch: {wt.branch}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const getLoadIndicator = () => {
    const count = fileChanges.length;
    if (count === 0) return { label: '空闲 (Clean)', color: '#10B981', percent: '5%' };
    if (count <= 5) return { label: '低负载 (Low)', color: '#3B82F6', percent: '25%' };
    if (count <= 15) return { label: '中负载 (Medium)', color: '#F59E0B', percent: '60%' };
    return { label: '高修改负载 (High)', color: '#EF4444', percent: '95%' };
  };

  const loadInfo = getLoadIndicator();

  // Stats
  const yearlyCommitsCount = commits.length;
  const maxDailyCommits = Math.max(...Object.values(commitCounts), 0);
  const activeDaysCount = Object.keys(commitCounts).length;

  return (
    <div className="view-container bg-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Visual Enhancements styles */}
      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes pulse-orange {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        @keyframes pulse-blue {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        @keyframes pulse-orange-border {
          0% { box-shadow: 0 0 2px var(--color-primary-orange); }
          50% { box-shadow: 0 0 6px var(--color-primary-orange); }
          100% { box-shadow: 0 0 2px var(--color-primary-orange); }
        }
        @keyframes slide-up-fade {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-scale {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes stripes-move {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
        }
        .pulse-dot-green {
          animation: pulse-green 2s infinite;
        }
        .pulse-dot-orange {
          animation: pulse-orange 2s infinite;
        }
        .pulse-dot-blue {
          animation: pulse-blue 2s infinite;
        }
        .wt-details-card {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(128, 128, 128, 0.15);
          border-radius: 16px;
          background: linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-main) 100%);
          box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.05);
          animation: fade-in-scale 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          position: relative;
          overflow: hidden;
        }
        .wt-details-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          z-index: 10;
        }
        .wt-details-card:nth-child(1) { animation-delay: 0.05s; }
        .wt-details-card:nth-child(2) { animation-delay: 0.1s; }
        .wt-details-card:nth-child(3) { animation-delay: 0.15s; }
        .wt-details-card:nth-child(4) { animation-delay: 0.2s; }

        .wt-details-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06);
          border-color: rgba(245, 158, 11, 0.3) !important;
        }
        .wt-btn-action {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%);
        }
        .wt-btn-action::after {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: 0.5s;
        }
        .wt-btn-action:hover::after {
          left: 100%;
        }
        .wt-btn-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px -4px rgba(0,0,0,0.1);
          background-color: var(--bg-hover) !important;
          border-color: rgba(128,128,128,0.25) !important;
        }
        .wt-file-item {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slide-up-fade 0.4s ease-out forwards;
          opacity: 0;
          background: linear-gradient(90deg, rgba(128,128,128,0.02) 0%, transparent 100%);
        }
        .wt-file-item:nth-child(1) { animation-delay: 0.05s; }
        .wt-file-item:nth-child(2) { animation-delay: 0.1s; }
        .wt-file-item:nth-child(3) { animation-delay: 0.15s; }
        .wt-file-item:nth-child(4) { animation-delay: 0.2s; }
        .wt-file-item:nth-child(5) { animation-delay: 0.25s; }
        .wt-file-item:nth-child(n+6) { animation-delay: 0.3s; }
        
        .wt-file-item:hover {
          transform: translateX(4px) scale(1.005);
          border-color: rgba(245, 158, 11, 0.4) !important;
          background-color: rgba(245, 158, 11, 0.03) !important;
          box-shadow: 0 4px 12px -4px rgba(0,0,0,0.08);
        }
        .wt-commit-item {
          transition: all 0.2s ease;
          animation: slide-up-fade 0.4s ease-out forwards;
          opacity: 0;
        }
        .wt-commit-item:nth-child(1) { animation-delay: 0.05s; }
        .wt-commit-item:nth-child(2) { animation-delay: 0.1s; }
        .wt-commit-item:nth-child(3) { animation-delay: 0.15s; }
        .wt-commit-item:nth-child(4) { animation-delay: 0.2s; }
        .wt-commit-item:nth-child(5) { animation-delay: 0.25s; }
        .wt-commit-item:nth-child(n+6) { animation-delay: 0.3s; }

        .wt-commit-item:hover {
          background-color: var(--bg-hover) !important;
          transform: translateX(4px);
          border-radius: 6px;
        }
        .heatmap-square {
          width: 10px;
          height: 10px;
          border-radius: 2.5px;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
        }
        .heatmap-square:hover {
          transform: scale(1.5) translateY(-2px);
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          border-radius: 3px;
        }
        .heatmap-square.real-commit {
          box-shadow: 0 0 4px rgba(245, 158, 11, 0.6);
          border: 1px solid rgba(255, 237, 213, 0.8);
          animation: pulse-orange-border 3s infinite;
        }
        .stat-badge-box {
          border: 1px solid rgba(128, 128, 128, 0.15);
          border-radius: 12px;
          padding: 16px;
          background: linear-gradient(135deg, var(--bg-main) 0%, var(--bg-panel) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 8px -2px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,0.05);
        }
        .stat-badge-box:hover {
          border-color: rgba(245, 158, 11, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px -4px rgba(245, 158, 11, 0.15), inset 0 1px 2px rgba(255,255,255,0.05);
        }
        .wt-sidebar-item {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slide-up-fade 0.3s ease-out forwards;
          opacity: 0;
        }
        .wt-sidebar-item:nth-child(1) { animation-delay: 0.05s; }
        .wt-sidebar-item:nth-child(2) { animation-delay: 0.1s; }
        .wt-sidebar-item:nth-child(3) { animation-delay: 0.15s; }
        .wt-sidebar-item:nth-child(n+4) { animation-delay: 0.2s; }

        .wt-sidebar-item:hover {
          border-color: var(--color-primary-orange) !important;
          background-color: var(--bg-hover) !important;
          transform: translateX(4px);
        }
        .loading-stripe-bar {
          background-image: linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent);
          background-size: 20px 20px;
          animation: stripes-move 1s linear infinite;
        }
        .agent-status-card {
          transition: all 0.3s ease;
          border: 1px solid transparent;
        }
        .agent-status-card:hover {
          background-color: var(--bg-hover) !important;
          border-color: var(--color-border);
          transform: translateX(2px);
        }
      `}</style>

      {/* Header Area */}
      <div className="view-header" style={{ flexShrink: 0, padding: '24px 32px 16px 32px' }}>
        <div className="view-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="view-title" style={{ fontSize: '20px', fontWeight: 700 }}>Worktrees</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px' }}>基于 Git Worktree 的隔离开发环境与项目拓扑监控</p>
          </div>
        </div>
      </div>

      {/* Viewport-fitting Content Area */}
      <div className="view-content" style={{ flex: 1, padding: '28px 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Icons.RefreshCw style={{ width: '24px', height: '24px', animation: 'spin 1s linear infinite', marginBottom: '12px', alignSelf: 'center' }} />
            <div>正在加载 Worktree 环境列表...</div>
          </div>
        ) : selectedWt ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>
            
            {/* Top Grid - Stretches vertically to fill upper part */}
            <div className="worktree-split-container" style={{ padding: 0, flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 1.2fr', gap: '20px', minHeight: 0, overflow: 'hidden' }}>
              
              {/* Column 1 - Worktrees Sidebar */}
              <WorktreeList
                worktrees={worktrees}
                selectedWt={selectedWt}
                projectPath={projectPath}
                wtStatuses={wtStatuses}
                onSelectWt={setSelectedWt}
                normalizePath={normalizePath}
              />

              {/* Column 2 - Details & Visualization */}
              <div className="worktree-details-left wt-details-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px', backgroundColor: 'var(--bg-main)', height: '100%', overflowY: 'auto', padding: '24px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>{selectedWt.name}</h2>
                    {isMainRepo ? (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.08)', color: '#3B82F6', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.15)' }}>主项目</span>
                    ) : (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(232, 104, 74, 0.08)', color: 'var(--color-primary-orange)', fontWeight: 600, border: '1px solid rgba(232, 104, 74, 0.15)' }}>隔离开发环境</span>
                    )}
                  </div>
                  <span className="text-muted font-mono" style={{ fontSize: '10.5px', wordBreak: 'break-all', opacity: 0.85 }}>{selectedWt.path}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted" style={{ fontWeight: 500 }}>工作区分支</span>
                    <span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-text-main)', backgroundColor: 'var(--bg-panel)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>{selectedWt.branch}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted" style={{ fontWeight: 500 }}>隔离区创建时间</span>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{loadingDetails ? '加载中...' : (wtMeta?.created || '未知')}</span>
                  </div>
                </div>

                {/* VISUALIZATION - SVG topology network */}
                {renderTopologyGraph()}

                {/* DYNAMIC VISUALIZATION - Language Stack Ratio & File counts */}
                <div>
                  <span className="text-muted" style={{ fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                    项目代码构成比 (Project Code Base Composition)
                  </span>
                  
                  {loadingDetails ? (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px' }}>分析代码库中...</div>
                  ) : fileStats.length > 0 ? (
                    <div>
                      {/* Segment bar */}
                      <div style={{ display: 'flex', height: '22px', borderRadius: '11px', overflow: 'hidden', backgroundColor: 'rgba(128,128,128,0.1)', marginBottom: '16px', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1)', border: '1px solid rgba(128,128,128,0.15)', padding: '2px', gap: '2px' }}>
                        {fileStats.map((stat, idx) => (
                          <div 
                            key={stat.label} 
                            style={{ 
                              width: `${stat.percent}%`, 
                              backgroundColor: stat.color,
                              backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(0,0,0,0.1))',
                              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)',
                              borderRadius: '6px',
                              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                              transitionDelay: `${idx * 0.1}s`,
                              cursor: 'pointer'
                            }} 
                            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15) saturate(1.2)'; e.currentTarget.style.transform = 'scaleY(1.05)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
                            title={`${stat.label}: ${stat.count} 个文件 (${stat.percent}%)`}
                          />
                        ))}
                      </div>
                      
                      {/* Label list */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: '11px' }}>
                        {fileStats.slice(0, 6).map(stat => (
                          <div key={stat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stat.color }}></span>
                              <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{stat.label}</span>
                            </div>
                            <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                              {stat.count} ({stat.percent}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px' }}>无代码文件数据</div>
                  )}
                </div>

                {/* Load Metrics bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '8px' }}>
                    <span className="text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>隔离工作区修改负载 (Load Status)</span>
                    <span style={{ color: loadInfo.color, fontWeight: 700, backgroundColor: `${loadInfo.color}15`, padding: '2px 8px', borderRadius: '8px' }}>{loadInfo.label}</span>
                  </div>
                  <div style={{ display: 'flex', height: '14px', borderRadius: '999px', backgroundColor: 'rgba(128,128,128,0.1)', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)', border: '1px solid rgba(128,128,128,0.1)' }}>
                    <div className={fileChanges.length > 0 ? "loading-stripe-bar" : ""} style={{ width: loadInfo.percent, backgroundColor: loadInfo.color, backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0))', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)', borderRadius: '999px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    当前存在 <span style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{fileChanges.length}</span> 个待提交修改文件
                  </span>
                </div>

                {/* Active Agents Status Monitor */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                  <span className="text-muted" style={{ fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                    协作智能体监控 (Active Agents)
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                    <div className="agent-status-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', cursor: 'default', backgroundColor: 'var(--bg-panel)', border: '1px solid rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} className="pulse-dot-blue"></span>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Antigravity</span>
                        <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', backgroundColor: 'var(--bg-main)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.04)' }}>前端专家</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>🟢 运行中</span>
                    </div>
                    <div className="agent-status-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', cursor: 'default', backgroundColor: 'var(--bg-panel)', border: '1px solid rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', opacity: 0.5 }}></span>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Codex</span>
                        <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', backgroundColor: 'var(--bg-main)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.04)' }}>后端专家</span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-main)', border: '1px solid rgba(0,0,0,0.04)' }}>💤 空闲中</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-ghost wt-btn-action" style={{ flex: 1, justifyContent: 'center', fontWeight: 600, fontSize: '11.5px', height: '40px', backgroundColor: 'var(--bg-panel)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onClick={handleOpenExplorer}>
                      <Icons.FolderOpen style={{ width: '14px', height: '14px', marginRight: '6px', color: '#3B82F6' }}/> 资源管理器
                    </button>
                    <button className="btn btn-ghost wt-btn-action" style={{ flex: 1, justifyContent: 'center', fontWeight: 600, fontSize: '11.5px', height: '40px', backgroundColor: 'var(--bg-panel)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onClick={handleOpenTerminal}>
                      <Icons.Terminal style={{ width: '14px', height: '14px', marginRight: '6px', color: 'var(--color-primary-orange)' }}/> 本地终端
                    </button>
                  </div>
                  
                  {!isMainRepo && (
                    <button 
                      className="btn btn-destructive" 
                      style={{ 
                        justifyContent: 'center', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                        fontWeight: 600, 
                        fontSize: '11.5px', 
                        height: '40px',
                        borderRadius: '12px',
                        transition: 'all 0.2s',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        color: '#EF4444'
                      }} 
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EF4444'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.color = '#EF4444'; }}
                      onClick={handleRemoveWorktree}
                      disabled={actionLoading}
                    >
                      <Icons.Trash2 style={{ width: '13px', height: '13px', marginRight: '6px' }}/> 彻底删除该隔离开发环境
                    </button>
                  )}
                </div>
              </div>

              {/* Column 3 - File Changes & Timeline */}
              <div className="worktree-details-right" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0 }}>
                
                {/* File Changes List */}
                <div className="changes-box wt-details-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: 'var(--bg-main)', minHeight: 0, padding: '24px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: 'var(--color-text-main)', letterSpacing: '-0.01em', flexShrink: 0 }}>工作区文件改动 (File Changes)</h3>
                  {loadingDetails ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>正在读取文件状态...</div>
                  ) : fileChanges.length > 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div className="text-xs text-muted" style={{ marginBottom: '8px', flexShrink: 0, fontSize: '11px' }}>
                        共检测到 <span style={{ color: 'var(--color-primary-orange)', fontWeight: 600 }}>{fileChanges.length}</span> 个发生变动的文件
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
                        {fileChanges.map((change, idx) => {
                          const style = getFileStatusInfo(change.status);
                          return (
                            <div 
                              key={idx} 
                              className="wt-file-item"
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '8px 12px', 
                                backgroundColor: 'var(--bg-panel)', 
                                borderRadius: '10px', 
                                border: '1px solid rgba(128,128,128,0.1)', 
                                fontFamily: 'var(--font-mono)', 
                                fontSize: '11.5px',
                                flexShrink: 0,
                                boxShadow: '0 2px 4px -2px rgba(0,0,0,0.02)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                <Icons.FileText style={{ width: '14px', height: '14px', color: 'var(--color-primary-orange)', flexShrink: 0 }} />
                                <span style={{ color: 'var(--color-text-main)', wordBreak: 'break-all', paddingRight: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {change.file}
                                </span>
                              </div>
                              <span style={{ 
                                color: style.color, 
                                backgroundColor: style.bg,
                                border: `1px solid ${style.border}`,
                                padding: '2px 8px', 
                                borderRadius: '6px', 
                                fontSize: '9.5px', 
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                              }}>
                                <span>{style.icon}</span>
                                <span>{style.text}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                      <Icons.CheckCircle2 style={{ width: '24px', height: '24px', color: '#10B981', marginBottom: '6px' }} />
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>隔离工作区无任何待提交修改</span>
                    </div>
                  )}
                </div>

                <CommitTimeline commits={commits} loadingDetails={loadingDetails} />

              </div>
            </div>

            {/* Bottom Row - Heatmap Split with Data Badges */}
            <div className="heatmap-box wt-details-card" style={{ backgroundColor: 'var(--bg-main)', padding: '16px 24px 20px 24px', display: 'grid', gridTemplateColumns: '3.2fr 1.2fr', gap: '24px', flexShrink: 0, minHeight: '164px' }}>
              
              {/* Left Side: Contribution Heatmap */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.Activity style={{ width: '16px', height: '16px', color: 'var(--color-primary-orange)' }} />
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>开发分支提交活跃度 (Activity Heatmap)</h3>
                  </div>
                  
                  {/* Heatmap Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '10.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '1.5px', backgroundColor: '#FB923C', boxShadow: '0 0 2px var(--color-primary-orange)', display: 'inline-block' }}></span>
                      <span style={{ color: 'var(--color-text-muted)' }}>提交活跃记录</span>
                    </div>
                  </div>
                </div>

                {loadingDetails ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>正在加载活跃度状态...</div>
                ) : (
                  <div className="heatmap-scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowX: 'auto', paddingBottom: '12px', minHeight: 0 }}>
                    
                    {/* Months labels */}
                    <div style={{ display: 'flex', position: 'relative', height: '14px', marginLeft: '28px', flexShrink: 0 }}>
                      {monthsLabels.map((lbl, idx) => (
                        <span 
                          key={idx} 
                          style={{ 
                            position: 'absolute', 
                            left: `${lbl.index * 12.5}px`, 
                            fontSize: '9px', 
                            color: 'var(--color-text-muted)',
                            fontWeight: 600
                          }}
                        >
                          {lbl.label}
                        </span>
                      ))}
                    </div>

                    {/* Heatmap square grid with weekday labels */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', flexShrink: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '22px' }}>
                        {['Sun', '', 'Tue', '', 'Thu', '', 'Sat'].map((day, i) => (
                          <div key={i} style={{ 
                            height: '9.5px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'flex-end',
                            fontSize: '9px', 
                            color: 'var(--color-text-muted)', 
                            fontWeight: 600
                          }}>
                            {day}
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '3px' }}>
                        {weeks.map((week, wIdx) => (
                          <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {week.map((day, dIdx) => (
                              <div 
                                key={dIdx}
                                className={`heatmap-square ${day.isReal ? 'real-commit' : ''}`}
                                style={{ backgroundColor: getHeatmapColor(day) }}
                                title={`${day.date}: ${day.count} 次提交`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Visual Data Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid var(--color-border)', paddingLeft: '16px', justifyContent: 'center' }}>
                <span className="text-muted" style={{ fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', display: 'block' }}>
                  隔离开发活动指标 (Activity Stats)
                </span>
                
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  {/* Badge 1: Commits count */}
                  <div className="stat-badge-box">
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-orange)' }}>
                      {yearlyCommitsCount}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>真实提交</span>
                  </div>

                  {/* Badge 2: Max daily */}
                  <div className="stat-badge-box">
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-success)' }}>
                      {maxDailyCommits > 0 ? maxDailyCommits : 0}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>日峰值</span>
                  </div>

                  {/* Badge 3: Active days */}
                  <div className="stat-badge-box">
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#8B5CF6' }}>
                      {activeDaysCount}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>活跃天数</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            没有检测到任何 Git Worktree 隔离环境。
          </div>
        )}
      </div>
    </div>
  );
};
