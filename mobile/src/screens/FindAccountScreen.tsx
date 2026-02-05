/**
 * FindAccountScreen - Account recovery by email/phone
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

interface FindAccountScreenProps {
    onBack: () => void;
    onNavigateToEmail: () => void;
}

export default function FindAccountScreen({
    onBack,
    onNavigateToEmail
}: FindAccountScreenProps) {
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<'found' | 'not_found' | null>(null);

    const isValid = identifier.length >= 5;

    const handleSubmit = async () => {
        if (!isValid) return;

        setIsLoading(true);

        try {
            const response = await authAPI.findAccount(identifier);
            setResult(response.found ? 'found' : 'not_found');
        } catch (err) {
            // Always show "not found" on error to prevent enumeration
            setResult('not_found');
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
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onBack} style={styles.backButton}>
                            <Text style={styles.backText}>← Back</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>🔍</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.heading}>Find your account</Text>
                    <Text style={styles.subheading}>
                        Enter your email or phone number to find your account.
                    </Text>

                    {result === null ? (
                        /* Search Form */
                        <>
                            <Text style={styles.inputLabel}>Email or Phone</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="you@example.com or (555) 123-4567"
                                    placeholderTextColor="#9CA3AF"
                                    value={identifier}
                                    onChangeText={setIdentifier}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    (!isValid || isLoading) && styles.primaryButtonDisabled
                                ]}
                                onPress={handleSubmit}
                                disabled={!isValid || isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Find Account</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : result === 'found' ? (
                        /* Found State */
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultIcon}>✓</Text>
                            <Text style={styles.resultTitle}>Account found!</Text>
                            <Text style={styles.resultText}>
                                We found an account associated with this information.
                            </Text>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={onNavigateToEmail}
                            >
                                <Text style={styles.primaryButtonText}>Continue to Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Not Found State */
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultIconError}>✗</Text>
                            <Text style={styles.resultTitle}>No account found</Text>
                            <Text style={styles.resultText}>
                                We couldn't find an account with this information.
                                Please check and try again, or create a new account.
                            </Text>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => setResult(null)}
                            >
                                <Text style={styles.primaryButtonText}>Try Again</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={onNavigateToEmail}
                            >
                                <Text style={styles.secondaryButtonText}>Create Account</Text>
                            </TouchableOpacity>
                        </View>
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
        marginBottom: 12,
    },
    primaryButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#000000',
        fontSize: 17,
        fontWeight: '600',
    },
    resultContainer: {
        alignItems: 'center',
    },
    resultIcon: {
        fontSize: 48,
        color: '#10B981',
        marginBottom: 16,
    },
    resultIconError: {
        fontSize: 48,
        color: '#EF4444',
        marginBottom: 16,
    },
    resultTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 8,
    },
    resultText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
});
