import React, { useEffect, useState } from 'react';
import { Icons } from './Icons';

export interface AppNotification {
  id: string;
  type: 'task' | 'agent' | 'system';
  title: string;
  desc: string;
  time: string;
  read: boolean;
  icon?: React.ReactNode;
}

interface NotificationsPanelProps {
  onClose: () => void;
  isOpen: boolean;
}

type NotificationTab = '全部' | '任务' | '智能体' | '系统';

const tabs: NotificationTab[] = ['全部', '任务', '智能体', '系统'];

export const dispatchAppNotification = (notif: Omit<AppNotification, 'id' | 'read' | 'time'>) => {
  const event = new CustomEvent('app-notification', { detail: notif });
  window.dispatchEvent(event);
};

import { formatRelativeTime } from '../utils/chatUtils';

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose, isOpen }) => {
  const [activeTab, setActiveTab] = useState<NotificationTab>('全部');
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('mimi-notifications');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
    return [];
  });

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<AppNotification, 'id' | 'read' | 'time'>>;
      const notifData = customEvent.detail;

      let icon = notifData.icon;
      if (!icon) {
        if (notifData.type === 'task') icon = <Icons.CheckCircle2 style={{ color: '#10B981' }} />;
        else if (notifData.type === 'agent') icon = <Icons.MessageSquare style={{ color: '#F59E0B' }} />;
        else icon = <Icons.Zap style={{ color: '#3B82F6' }} />;
      }

      const newNotif: AppNotification = {
        ...notifData,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        time: new Date().toISOString(),
        read: false,
        icon,
      };

      setNotifications(prev => [newNotif, ...prev]);
    };

    window.addEventListener('app-notification', handleNotification);
    return () => window.removeEventListener('app-notification', handleNotification);
  }, []);

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    window.dispatchEvent(new CustomEvent('app-notification-unread', { detail: unreadCount }));

    const toSave = notifications.map(n => {
      const { icon, ...rest } = n;
      return rest;
    });
    localStorage.setItem('mimi-notifications', JSON.stringify(toSave.slice(0, 100)));
  }, [notifications]);

  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
    }
  }, [isOpen, shouldRender]);

  // Force re-render every minute so that relative times like "昨天 16:17" are correctly updated if the app stays open.
  useEffect(() => {
    if (!shouldRender) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [shouldRender]);

  const handleAnimationEnd = () => {
    if (isClosing) {
      setIsClosing(false);
      setShouldRender(false);
    }
  };

  if (!shouldRender) return null;

  const renderIcon = (notif: AppNotification) => {
    if (React.isValidElement(notif.icon)) return notif.icon;
    if (notif.type === 'task') return <Icons.CheckCircle2 style={{ color: '#10B981' }} />;
    if (notif.type === 'agent') return <Icons.MessageSquare style={{ color: '#F59E0B' }} />;
    return <Icons.Zap style={{ color: '#3B82F6' }} />;
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === '全部') return true;
    if (activeTab === '任务') return n.type === 'task';
    if (activeTab === '智能体') return n.type === 'agent';
    if (activeTab === '系统') return n.type === 'system';
    return true;
  });

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <>
      <div
        className="modal-overlay"
        style={{ 
          backgroundColor: 'transparent', zIndex: 998, 
          transition: 'opacity 0.3s ease',
          opacity: isClosing ? 0 : 1 
        }}
        onClick={onClose}
      />
      <div
        className={`notifications-panel ${isClosing ? 'slide-out-right' : 'slide-in-right'}`}
        onAnimationEnd={handleAnimationEnd}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          bottom: '20px',
          width: '360px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>通知</h2>
            <button onClick={onClose} className="btn-icon-ghost"><Icons.X style={{ width: '16px', height: '16px' }} /></button>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {tabs.map(tab => (
              <div
                key={tab}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: activeTab === tab ? 'var(--color-primary-orange)' : 'var(--color-text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--color-primary-orange)' : '2px solid transparent',
                  paddingBottom: '6px',
                  marginBottom: '-21px',
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredNotifications.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              暂无通知
            </div>
          ) : (
            filteredNotifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  gap: '12px',
                  backgroundColor: notif.read ? 'transparent' : 'var(--bg-main)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                className="hover:bg-[var(--bg-main)]"
              >
                <div style={{ position: 'relative', marginTop: '2px' }}>
                  {renderIcon(notif)}
                  {!notif.read && (
                    <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary-orange)' }} />
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-main)' }}>{notif.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{formatRelativeTime(notif.time)}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotifications(prev => prev.filter(n => n.id !== notif.id));
                        }}
                        className="btn-icon-ghost"
                        style={{ border: 'none', background: 'transparent', padding: '2px', color: 'var(--color-text-muted)' }}
                        title="删除通知"
                      >
                        <Icons.Trash2 style={{ width: '12px', height: '12px' }} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>{notif.desc}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center', gap: '32px', backgroundColor: 'var(--bg-main)' }}>
          <button
            onClick={markAllAsRead}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            className="hover:text-[var(--color-primary-orange)] transition-colors"
          >
            全部标为已读
          </button>
          <button
            onClick={() => setNotifications([])}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            className="hover:text-[#EF4444] transition-colors"
          >
            清空所有通知
          </button>
        </div>
      </div>
    </>
  );
};
