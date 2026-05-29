import { getSupabaseCredentials } from './supabaseHelpers';

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const subscribeToPushNotifications = async (
  userSteamId: string
): Promise<PushSubscription | null> => {
  try {
    const registration = await navigator.serviceWorker.ready;

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Already subscribed to push notifications');
      await sendSubscriptionToServer(userSteamId, existingSubscription);
      return existingSubscription;
    }

    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!publicVapidKey) {
      console.warn('VAPID public key not configured, using basic notifications');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });

    console.log('Push subscription created:', subscription);

    await sendSubscriptionToServer(userSteamId, subscription);

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
};

const sendSubscriptionToServer = async (
  userSteamId: string,
  subscription: PushSubscription
): Promise<void> => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

    const response = await fetch(`${supabaseUrl}/functions/v1/register-push-subscription`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_steam_id: userSteamId,
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register push subscription');
    }

    console.log('Push subscription registered on server');
  } catch (error) {
    console.error('Failed to send subscription to server:', error);
  }
};

export const unsubscribeFromPushNotifications = async (
  userSteamId: string
): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      await fetch(`${supabaseUrl}/functions/v1/unregister-push-subscription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_steam_id: userSteamId }),
      });

      console.log('Unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
};

export const checkPushSubscription = async (): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription !== null;
  } catch (error) {
    console.error('Failed to check push subscription:', error);
    return false;
  }
};

export const initializeWebPush = async (userSteamId: string): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Web Push not supported in this browser');
      return false;
    }

    await registerServiceWorker();

    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      console.log('Notification permission denied');
      return false;
    }

    const subscription = await subscribeToPushNotifications(userSteamId);

    return subscription !== null;
  } catch (error) {
    console.error('Failed to initialize web push:', error);
    return false;
  }
};
