/**
 * Main App Component with Auth Navigation
 */
import React, { useState, useEffect } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import AuthStartScreen from './src/screens/AuthStartScreen';
import EmailAuthScreen from './src/screens/EmailAuthScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import FindAccountScreen from './src/screens/FindAccountScreen';
import PulserScreen from './src/screens/PulserScreen';
import DriverScreen from './src/screens/DriverScreen';
import AccountScreen from './src/screens/AccountScreen';
import { authAPI } from './src/services/api';
import { authEvents } from './src/utils/authEvents';

const Tab = createBottomTabNavigator();

// Auth screens enum
type AuthScreen = 'start' | 'email' | 'forgot' | 'find';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('start');

  useEffect(() => {
    checkAuth();

    // Listen for global logout events (e.g. from 401 interceptor)
    const unsubscribe = authEvents.subscribe(() => {
      setIsLoggedIn(false);
      setAuthScreen('start');
    });

    return unsubscribe;
  }, []);

  const checkAuth = async () => {
    const token = await authAPI.getToken();
    setIsLoggedIn(token !== null && token !== undefined);
    setIsLoading(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setAuthScreen('start');
  };

  const handleLogout = async () => {
    await authAPI.logout();
    setIsLoggedIn(false);
    setAuthScreen('start');
  };

  // Loading splash
  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="dark" />
        <View style={styles.splashIcon}>
          <Text style={styles.splashIconText}>P</Text>
        </View>
        <Text style={styles.splashTitle}>ParkPulse</Text>
        <ActivityIndicator size="small" color="#000" style={styles.splashLoader} />
      </View>
    );
  }

  // Auth flow (not logged in)
  if (!isLoggedIn) {
    return (
      <>
        <StatusBar style="dark" />
        {authScreen === 'start' && (
          <AuthStartScreen
            onLogin={handleLogin}
            onNavigateToEmail={() => setAuthScreen('email')}
            onNavigateToFindAccount={() => setAuthScreen('find')}
          />
        )}
        {authScreen === 'email' && (
          <EmailAuthScreen
            onLogin={handleLogin}
            onBack={() => setAuthScreen('start')}
            onNavigateToForgotPassword={() => setAuthScreen('forgot')}
          />
        )}
        {authScreen === 'forgot' && (
          <ForgotPasswordScreen
            onBack={() => setAuthScreen('email')}
          />
        )}
        {authScreen === 'find' && (
          <FindAccountScreen
            onBack={() => setAuthScreen('start')}
            onNavigateToEmail={() => setAuthScreen('email')}
          />
        )}
      </>
    );
  }

  // Main app (logged in)
  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#FFFFFF',
              shadowColor: 'transparent',
              elevation: 0,
            },
            headerTintColor: '#000',
            headerTitleStyle: {
              fontWeight: '600',
            },
            tabBarActiveTintColor: '#000000',
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#E5E7EB',
            },
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

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#000000',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  splashIconText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: 'bold',
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  splashLoader: {
    marginTop: 24,
  },
});
