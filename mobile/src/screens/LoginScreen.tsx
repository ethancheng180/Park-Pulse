/**
 * Login Screen Component
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

interface LoginScreenProps {
    onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [role, setRole] = useState<'driver' | 'pulser' | 'both'>('both');
    const [loading, setLoading] = useState(false);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (isRegister) {
                await authAPI.register(email, password, role);
            } else {
                await authAPI.login(email, password);
            }
            onLogin();
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.response?.data?.detail || 'Authentication failed'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setLoading(true);
        try {
            // Demo mode - bypasses network for testing
            await AsyncStorage.setItem('token', 'demo_token_12345');
            Alert.alert('Demo Mode', 'Logged in offline. Some features may not work.');
            onLogin();
        } catch (error) {
            Alert.alert('Error', 'Failed to enter demo mode');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.inner}>
                <Text style={styles.title}>ParkPulse</Text>
                <Text style={styles.subtitle}>Two-Sided Parking Marketplace</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                {isRegister && (
                    <View style={styles.roleContainer}>
                        <Text style={styles.roleLabel}>I want to be a:</Text>
                        <View style={styles.roleButtons}>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'driver' && styles.roleButtonActive]}
                                onPress={() => setRole('driver')}
                            >
                                <Text style={[styles.roleText, role === 'driver' && styles.roleTextActive]}>
                                    Driver
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'pulser' && styles.roleButtonActive]}
                                onPress={() => setRole('pulser')}
                            >
                                <Text style={[styles.roleText, role === 'pulser' && styles.roleTextActive]}>
                                    Pulser
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'both' && styles.roleButtonActive]}
                                onPress={() => setRole('both')}
                            >
                                <Text style={[styles.roleText, role === 'both' && styles.roleTextActive]}>
                                    Both
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleAuth}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
                    <Text style={styles.switchText}>
                        {isRegister
                            ? 'Already have an account? Login'
                            : "Don't have an account? Register"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.demoButton, loading && styles.buttonDisabled]}
                    onPress={handleDemoLogin}
                    disabled={loading}
                >
                    <Text style={styles.demoButtonText}>🚀 Demo Mode (No Login)</Text>
                </TouchableOpacity>


                <View style={styles.testCredentials}>
                    <Text style={styles.testTitle}>Test Credentials:</Text>
                    <Text style={styles.testText}>Driver: driver@test.com / password123</Text>
                    <Text style={styles.testText}>Pulser: pulser@test.com / password123</Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 40,
        color: '#666',
    },
    input: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    roleContainer: {
        marginBottom: 20,
    },
    roleLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
    },
    roleButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    roleButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#ddd',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    roleButtonActive: {
        borderColor: '#007AFF',
        backgroundColor: '#007AFF',
    },
    roleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    roleTextActive: {
        color: '#fff',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchText: {
        textAlign: 'center',
        color: '#007AFF',
        fontSize: 14,
        marginTop: 10,
    },
    testCredentials: {
        marginTop: 40,
        padding: 15,
        backgroundColor: '#fff3cd',
        borderRadius: 8,
    },
    testTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#856404',
    },
    testText: {
        fontSize: 11,
        color: '#856404',
    },
    demoButton: {
        backgroundColor: '#FF9500',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 10,
    },
    demoButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
