/**
 * Main App Component with Tab Navigation
 */
import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import PulserScreen from './src/screens/PulserScreen';
import DriverScreen from './src/screens/DriverScreen';
import AccountScreen from './src/screens/AccountScreen';
import { authAPI } from './src/services/api';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await authAPI.getToken();
    setIsLoggedIn(token !== null && token !== undefined);
    setIsLoading(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (isLoading) {
    return null; // Could add a splash screen here
  }

  if (!isLoggedIn) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
          }}
        >
          <Tab.Screen
            name="Driver"
            component={DriverScreen}
            options={{
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🚗</Text>,
              headerTitle: 'Find Parking',
            }}
          />
          <Tab.Screen
            name="Pulser"
            component={PulserScreen}
            options={{
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📍</Text>,
              headerTitle: 'Report Spots',
            }}
          />
          <Tab.Screen
            name="Account"
            options={{
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👤</Text>,
              headerTitle: 'My Account',
            }}
          >
            {() => <AccountScreen onLogout={handleLogout} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
