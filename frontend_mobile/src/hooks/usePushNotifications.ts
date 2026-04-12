import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import Constants from 'expo-constants';
import api from '../services/api';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Log device type for debugging
  console.log('[Push] Device.isDevice =', Device.isDevice);

  // Request permissions (works on both real device and simulator, though simulator won't get token)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Người dùng từ chối cấp quyền thông báo');
    return null;
  }

  // Get Expo Push Token — projectId is required in SDK 51+
  // For Expo Go, use the projectId from EAS config or fallback to slug
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    let tokenData: Notifications.ExpoPushToken;

    if (projectId) {
      tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    } else {
      // Expo Go without EAS: use device push token directly
      // This still gets a valid Expo token in many cases
      tokenData = await Notifications.getExpoPushTokenAsync();
    }

    console.log('[Push] ✅ Token:', tokenData.data);
    return tokenData.data;
  } catch (err: any) {
    console.warn('[Push] ❌ Lỗi lấy token:', err?.message);
    // Log the full error for debugging
    console.warn('[Push] Full error:', JSON.stringify(err));
    return null;
  }
}

export function usePushNotifications(navigationRef?: any) {
  const user = useSelector((state: any) => state.auth?.user);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    console.log('[Push] useEffect triggered, user:', user?._id ?? 'null');

    if (!user) {
      console.log('[Push] Chưa đăng nhập, bỏ qua đăng ký push');
      return;
    }

    let isMounted = true;

    const setup = async () => {
      console.log('[Push] Bắt đầu đăng ký...');
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token || !isMounted) return;

        await api.patch('/auth/fcm-token', { fcmToken: token });
        console.log('[Push] ✅ Đã lưu token vào server');
      } catch (err: any) {
        console.warn('[Push] ❌ Lỗi setup:', err?.message);
      }
    };

    setup();

    // Handle notification when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Push] 🔔 Nhận thông báo (foreground):', notification.request.content.title);
    });

    // Handle tap on notification (background/killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const incidentId = data?.incidentId as string | undefined;
      console.log('[Push] 👆 Nhấn vào thông báo, incidentId:', incidentId);

      if (incidentId && navigationRef?.current) {
        try {
          navigationRef.current.navigate('Tracking', { incidentId });
        } catch {
          // Rescue users don't have the Tracking screen
        }
      }
    });

    return () => {
      isMounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user?._id]);
}
