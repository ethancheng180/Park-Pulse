/**
 * EmailAuthScreen - Email login/signup with password visibility toggle
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { authAPI } from '../services/api';

interface EmailAuthScreenProps {
    onLogin: () => void;
    onBack: () => void;
    onNavigateToForgotPassword: () => void;
}

export default function EmailAuthScreen({
    onLogin,
    onBack,
    onNavigateToForgotPassword
}: EmailAuthScreenProps) {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'driver' | 'pulser' | 'both'>('both');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Validation
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPasswordValid = password.length >= 6;
    const doPasswordsMatch = password === confirmPassword;

    const isFormValid = isLoginMode
        ? (isEmailValid && isPasswordValid)
        : (isEmailValid && isPasswordValid && doPasswordsMatch);

    const handleSubmit = async () => {
        if (!isFormValid) return;

        setError(null);
        setIsLoading(true);

        try {
            if (isLoginMode) {
                await authAPI.login(email, password);
            } else {
                await authAPI.register(email, password, role);
            }
            onLogin();
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Authentication failed. Please try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <Text style={styles.backText}>← Back</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Title */}
                    <Text style={styles.heading}>
                        {isLoginMode ? 'Welcome back' : 'Create your account'}
                    </Text>
                    <Text style={styles.subheading}>
                        {isLoginMode
                            ? 'Sign in to continue to ParkPulse'
                            : 'Join ParkPulse to find or report parking spots'}
                    </Text>

                    {/* Error Message */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Email Input */}
                    <Text style={styles.inputLabel}>Email</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor="#9CA3AF"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Password Input */}
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, styles.passwordInput]}
                            placeholder="Enter your password"
                            placeholderTextColor="#9CA3AF"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Text style={styles.eyeIcon}>{showPassword ? '👁' : '👁‍🗨'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Confirm Password (Register only) */}
                    {!isLoginMode && (
                        <>
                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    placeholder="Confirm your password"
                                    placeholderTextColor="#9CA3AF"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁' : '👁‍🗨'}</Text>
                                </TouchableOpacity>
                            </View>
                            {confirmPassword && !doPasswordsMatch && (
                                <Text style={styles.fieldError}>Passwords do not match</Text>
                            )}

                            {/* Role Selector */}
                            <Text style={styles.inputLabel}>I want to be a:</Text>
                            <View style={styles.roleContainer}>
                                {(['driver', 'pulser', 'both'] as const).map((r) => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[
                                            styles.roleButton,
                                            role === r && styles.roleButtonActive
                                        ]}
                                        onPress={() => setRole(r)}
                                    >
                                        <Text style={[
                                            styles.roleText,
                                            role === r && styles.roleTextActive
                                        ]}>
                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Forgot Password (Login only) */}
                    {isLoginMode && (
                        <TouchableOpacity
                            style={styles.forgotButton}
                            onPress={onNavigateToForgotPassword}
                        >
                            <Text style={styles.forgotText}>Forgot password?</Text>
                        </TouchableOpacity>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            (!isFormValid || isLoading) && styles.primaryButtonDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={!isFormValid || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                {isLoginMode ? 'Sign In' : 'Create Account'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Toggle Mode */}
                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => {
                            setIsLoginMode(!isLoginMode);
                            setError(null);
                        }}
                    >
                        <Text style={styles.toggleText}>
                            {isLoginMode
                                ? "Don't have an account? "
                                : "Already have an account? "}
                            <Text style={styles.toggleTextBold}>
                                {isLoginMode ? 'Sign Up' : 'Sign In'}
                            </Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Test Credentials */}
                    {isLoginMode && (
                        <View style={styles.testCredentials}>
                            <Text style={styles.testTitle}>Test Credentials:</Text>
                            <Text style={styles.testText}>driver@test.com / password123</Text>
                            <Text style={styles.testText}>pulser@test.com / password123</Text>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
    },
    header: {
        marginBottom: 16,
    },
    backButton: {
        paddingVertical: 8,
    },
    backText: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
    },
    heading: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subheading: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 24,
    },
    errorContainer: {
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        color: '#000000',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
    eyeIcon: {
        fontSize: 20,
    },
    fieldError: {
        color: '#DC2626',
        fontSize: 12,
        marginTop: -12,
        marginBottom: 16,
        marginLeft: 4,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    roleButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    roleButtonActive: {
        backgroundColor: '#000000',
    },
    roleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    roleTextActive: {
        color: '#FFFFFF',
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginBottom: 24,
        marginTop: -8,
    },
    forgotText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '500',
    },
    primaryButton: {
        backgroundColor: '#000000',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    toggleButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    toggleText: {
        fontSize: 14,
        color: '#6B7280',
    },
    toggleTextBold: {
        color: '#000000',
        fontWeight: '600',
    },
    testCredentials: {
        marginTop: 32,
        padding: 16,
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
    },
    testTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#92400E',
        marginBottom: 4,
    },
    testText: {
        fontSize: 11,
        color: '#92400E',
    },
});
