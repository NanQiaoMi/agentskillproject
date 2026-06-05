import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { dispatchAppNotification } from '../components/NotificationsPanel';

export type AppNotificationType = 'task' | 'agent' | 'system';

interface NotifyOptions {
  type: AppNotificationType;
  title: string;
  desc: string;
  desktop?: boolean;
  respectFocus?: boolean;
}

let hasRequestedDesktopPermission = false;

export const notifyAppAndDesktop = async ({
  type,
  title,
  desc,
  desktop = true,
  respectFocus = true,
}: NotifyOptions) => {
  dispatchAppNotification({ type, title, desc });

  if (!desktop) return;
  if (respectFocus && document.hasFocus()) return;

  try {
    let granted = await isPermissionGranted();

    if (!granted && !hasRequestedDesktopPermission) {
      hasRequestedDesktopPermission = true;
      const permission = await requestPermission();
      granted = permission === 'granted';
    }

    if (granted) {
      sendNotification({ title, body: desc });
    }
  } catch (err) {
    console.warn('Desktop notification failed:', err);
  }
};
