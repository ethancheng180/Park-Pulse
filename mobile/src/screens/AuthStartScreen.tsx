/**
 * AuthStartScreen - Uber-style "Get started" screen
 */
import React, { useState, useEffect } from 'react';
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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { authAPI } from '../services/api';

WebBrowser.maybeCompleteAuthSession();

interface AuthStartScreenProps {
    onLogin: () => void;
    onNavigateToEmail: () => void;
    onNavigateToFindAccount: () => void;
}

export default function AuthStartScreen({
    onLogin,
    onNavigateToEmail,
    onNavigateToFindAccount
}: AuthStartScreenProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Google Sign-In Hook - use Expo proxy for redirect
    const [request, response, promptAsync] = Google.useAuthRequest({
        iosClientId: '269097179137-4t52f5j5c68fndoisnddhs5a3nedc2sp.apps.googleusercontent.com',
        androidClientId: '269097179137-4t52f5j5c68fndoisnddhs5a3nedc2sp.apps.googleusercontent.com',
        webClientId: '269097179137-4t52f5j5c68fndoisnddhs5a3nedc2sp.apps.googleusercontent.com',
    });

    useEffect(() => {
        if (response?.type === 'success') {
            // Get the id_token from authentication response
            const idToken = response.authentication?.idToken;
            if (idToken) {
                handleGoogleSignInSuccess(idToken);
            }
        }
    }, [response]);

    const handleGoogleSignInSuccess = async (idToken: string) => {
        setIsLoading(true);
        try {
            await authAPI.loginWithGoogle(idToken);
            onLogin();
        } catch (error: any) {
            console.error('Google login error:', error);
            Alert.alert('Login Failed', error.response?.data?.detail || 'Could not sign in with Google');
        } finally {
            setIsLoading(false);
        }
    };

    // Phone validation - basic US format
    const isPhoneValid = phoneNumber.replace(/\D/g, '').length >= 10;

    const handlePhoneContinue = () => {
        // MVP: Phone auth not implemented, redirect to email
        Alert.alert(
            'Phone Auth Coming Soon',
            'Please use email authentication for now.',
            [{ text: 'Continue with Email', onPress: onNavigateToEmail }]
        );
    };

    const handleSocialAuth = (provider: string) => {
        if (provider === 'Google') {
            promptAsync();
            return;
        }

        Alert.alert(
            'Coming Soon',
            `${provider} sign-in will be available in a future update.`,
            [{ text: 'OK' }]
        );
    };

    const formatPhoneNumber = (text: string) => {
        // Remove all non-digits
        const cleaned = text.replace(/\D/g, '');
        // Format as (XXX) XXX-XXXX
        let formatted = '';
        if (cleaned.length > 0) {
            formatted = '(' + cleaned.substring(0, 3);
        }
        if (cleaned.length > 3) {
            formatted += ') ' + cleaned.substring(3, 6);
        }
        if (cleaned.length > 6) {
            formatted += '-' + cleaned.substring(6, 10);
        }
        return formatted;
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
                    {/* App Icon */}
                    <View style={styles.iconContainer}>
                        <View style={styles.appIcon}>
                            <Text style={styles.appIconText}>P</Text>
                        </View>
                    </View>

                    {/* Heading */}
                    <Text style={styles.heading}>Get started with ParkPulse</Text>

                    {/* Phone Number Section */}
                    <Text style={styles.inputLabel}>Mobile number</Text>
                    <View style={styles.phoneInputRow}>
                        {/* Country Selector */}
                        <TouchableOpacity style={styles.countrySelector}>
                            <Text style={styles.flag}>🇺🇸</Text>
                            <Text style={styles.chevron}>▼</Text>
                        </TouchableOpacity>

                        {/* Phone Input */}
                        <View style={styles.phoneInputContainer}>
                            <Text style={styles.countryCode}>+1</Text>
                            <TextInput
                                style={styles.phoneInput}
                                placeholder="(201) 555-0123"
                                placeholderTextColor="#9CA3AF"
                                value={phoneNumber}
                                onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                                keyboardType="phone-pad"
                                maxLength={14}
                            />
                        </View>
                    </View>

                    {/* Primary CTA */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            !isPhoneValid && styles.primaryButtonDisabled
                        ]}
                        onPress={handlePhoneContinue}
                        disabled={!isPhoneValid || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Continue</Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Social Auth Buttons */}
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => handleSocialAuth('Apple')}
                    >
                        <Text style={styles.socialIcon}></Text>
                        <Text style={styles.secondaryButtonText}>Continue with Apple</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => handleSocialAuth('Google')}
                    >
                        <Text style={styles.socialIcon}>G</Text>
                        <Text style={styles.secondaryButtonText}>Continue with Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onNavigateToEmail}
                    >
                        <Text style={styles.socialIcon}>✉</Text>
                        <Text style={styles.secondaryButtonText}>Continue with Email</Text>
                    </TouchableOpacity>

                    {/* Second Divider */}
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Find Account */}
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onNavigateToFindAccount}
                    >
                        <Text style={styles.socialIcon}>🔍</Text>
                        <Text style={styles.secondaryButtonText}>Find my account</Text>
                    </TouchableOpacity>

                    {/* Footer Disclaimer */}
                    <Text style={styles.disclaimer}>
                        By continuing, you agree to receive calls, WhatsApp, or SMS messages,
                        including by autodialer, from ParkPulse and its affiliates.
                        Text "STOP" to opt out.
                    </Text>
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
        paddingTop: 40,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    appIcon: {
        width: 64,
        height: 64,
        backgroundColor: '#000000',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appIconText: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: 'bold',
    },
    heading: {
        fontSize: 26,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 32,
        color: '#000000',
        letterSpacing: -0.5,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#000000',
        marginBottom: 8,
    },
    phoneInputRow: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
    },
    countrySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 4,
    },
    flag: {
        fontSize: 20,
    },
    chevron: {
        fontSize: 10,
        color: '#6B7280',
    },
    phoneInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    countryCode: {
        fontSize: 16,
        color: '#000000',
        marginRight: 4,
    },
    phoneInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 16,
        color: '#000000',
    },
    primaryButton: {
        backgroundColor: '#000000',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 24,
    },
    primaryButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        marginHorizontal: 16,
        color: '#9CA3AF',
        fontSize: 14,
    },
    secondaryButton: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    socialIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    secondaryButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '500',
    },
    disclaimer: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'left',
        lineHeight: 18,
        marginTop: 24,
    },
});
