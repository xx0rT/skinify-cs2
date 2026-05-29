export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
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

export const checkNotificationPermission = (): boolean => {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
};

export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (!checkNotificationPermission()) {
    console.warn('Notification permission not granted');
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: '/image.png',
      badge: '/image.png',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
};

export const notifyItemSold = (itemName: string, price: number, currency: string = 'USD'): void => {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);

  showNotification('Item Sold!', {
    body: `${itemName} sold for ${formattedPrice}`,
    tag: 'item-sold',
    requireInteraction: false,
    silent: false,
  });

  const audio = new Audio('/ordersuccess.mp3');
  audio.volume = 0.5;
  audio.play().catch(err => console.error('Failed to play sound:', err));
};

export const notifyNewMessage = (senderName: string, preview: string): void => {
  showNotification(`New message from ${senderName}`, {
    body: preview,
    tag: 'new-message',
    requireInteraction: false,
  });

  const audio = new Audio('/messagerecived.mp3');
  audio.volume = 0.3;
  audio.play().catch(err => console.error('Failed to play sound:', err));
};

export const notifyOrderUpdate = (orderId: string, status: string): void => {
  showNotification('Order Update', {
    body: `Order #${orderId} status: ${status}`,
    tag: `order-${orderId}`,
    requireInteraction: false,
  });
};

export const notifyNewOrder = (itemName: string, price: number, buyerName: string, currency: string = 'USD'): void => {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);

  showNotification('New Order Received!', {
    body: `${buyerName} purchased ${itemName} for ${formattedPrice}`,
    tag: 'new-order',
    requireInteraction: true,
  });

  const audio = new Audio('/ordersuccess.mp3');
  audio.volume = 0.5;
  audio.play().catch(err => console.error('Failed to play sound:', err));
};
