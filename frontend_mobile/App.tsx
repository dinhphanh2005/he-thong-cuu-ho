import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { store } from './src/store/store';
import { setUser } from './src/store/authSlice';
import { authAPI } from './src/services/api';
import { connectSocket } from './src/services/socket';
import { COLORS } from './src/constants';

import Login from './screens/auth/Login';
import Register from './screens/auth/Register';
import ForgotPassword from './screens/auth/ForgotPassword';

import CitizenHome from './screens/citizen/Home';
import CitizenHistory from './screens/citizen/History';
import CitizenSOS from './screens/citizen/SOS';
import NotificationScreen from './screens/citizen/Notification';
import AccountScreen from './screens/citizen/Account';
import ReportIncident from './screens/citizen/Report';

import RescueHome from './screens/rescue/Home';
import RescueHistory from './screens/rescue/History';
import RescueChat from './screens/rescue/Chat';
import RescueAccount from './screens/rescue/Account';
import ChangePassword from './screens/rescue/ChangePassword';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CitizenTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          height: 65 + Math.max(insets.bottom, 10), 
          paddingBottom: Math.max(insets.bottom, 15), 
          paddingTop: 10,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            'Trang chủ': focused ? 'home' : 'home-outline',
            'Lịch sử': focused ? 'time' : 'time-outline',
            'Thông báo': focused ? 'notifications' : 'notifications-outline',
          };
          return <Ionicons name={(icons[route.name] || 'circle') as any} size={size + 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Trang chủ" component={CitizenHome} />
      <Tab.Screen name="Lịch sử" component={CitizenHistory} />
      <Tab.Screen name="Thông báo" component={NotificationScreen} />
    </Tab.Navigator>
  );
}

function RescueTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          height: 65 + Math.max(insets.bottom, 10), 
          paddingBottom: Math.max(insets.bottom, 15), 
          paddingTop: 10,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            'Trang chủ': focused ? 'map' : 'map-outline',
            'Lịch sử': focused ? 'time' : 'time-outline',
            'Tin nhắn': focused ? 'chatbubbles' : 'chatbubbles-outline',
          };
          return <Ionicons name={(icons[route.name] || 'circle') as any} size={size + 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Trang chủ" component={RescueHome} />
      <Tab.Screen name="Lịch sử" component={RescueHistory} />
      <Tab.Screen name="Tin nhắn" component={RescueChat} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const dispatch = useDispatch();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const [token, role] = await AsyncStorage.multiGet(['access_token', 'user_role']);
        const accessToken = token[1];
        const userRole = role[1];

        if (accessToken && userRole) {
          const { data } = await authAPI.getMe();
          dispatch(setUser(data.data));
          await connectSocket();

          if (userRole === 'CITIZEN') setInitialRoute('CitizenTabs');
          else if (userRole === 'RESCUE') setInitialRoute('RescueTabs');
          else setInitialRoute('Login');
        } else {
          setInitialRoute('Login');
        }
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_role']);
        setInitialRoute('Login');
      }
    };

    checkAuth();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator id={undefined} initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="CitizenTabs" component={CitizenTabs} />
      <Stack.Screen name="SOS" component={CitizenSOS} />
      <Stack.Screen name="ReportIncident" component={ReportIncident} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="RescueTabs" component={RescueTabs} />
      <Stack.Screen name="RescueAccount" component={RescueAccount} options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}