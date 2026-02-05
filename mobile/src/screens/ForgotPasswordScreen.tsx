/**
 * ForgotPasswordScreen - Password reset request with generic success message
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { authAPI } from '../services/api';

interface ForgotPasswordScreenProps {
    onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSubmit = async () => {
        if (!isEmailValid) return;

        setIsLoading(true);

        try {
            // Call password reset endpoint (will always return 200)
            await authAPI.requestPasswordReset(email);
        } catch (err) {
            // Silently ignore errors - always show success message
            console.log('Password reset request:', err);
        } finally {
            setIsLoading(false);
            setIsSubmitted(true);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <Text style={styles.backText}>← Back</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>🔐</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.heading}>Forgot password?</Text>
                    <Text style={styles.subheading}>
                        No worries, we'll send you reset instructions.
                    </Text>

                    {isSubmitted ? (
                        /* Success State */
                        <View style={styles.successContainer}>
                            <Text style={styles.successIcon}>✓</Text>
                            <Text style={styles.successTitle}>Check your email</Text>
                            <Text style={styles.successText}>
                                If an account exists for {email}, you'll receive a password reset link shortly.
                            </Text>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={onBack}
                            >
                                <Text style={styles.primaryButtonText}>Back to Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Form State */
                        <>
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

                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    (!isEmailValid || isLoading) && styles.primaryButtonDisabled
                                ]}
                                onPress={handleSubmit}
                                disabled={!isEmailValid || isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
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
    content: {
        flex: 1,
        padding: 24,
    },
    header: {
        marginBottom: 24,
    },
    backButton: {
        paddingVertical: 8,
    },
    backText: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    icon: {
        fontSize: 48,
    },
    heading: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000000',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subheading: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginBottom: 24,
    },
    input: {
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        color: '#000000',
    },
    primaryButton: {
        backgroundColor: '#000000',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    successContainer: {
        alignItems: 'center',
    },
    successIcon: {
        fontSize: 48,
        color: '#10B981',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 8,
    },
    successText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
});
