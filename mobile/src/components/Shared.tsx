import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    View,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

// --- BUTTONS ---

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: string;
    haptic?: boolean;
}

export const Button = ({ title, onPress, variant = 'primary', disabled, loading, style, textStyle, icon, haptic = true }: ButtonProps) => {

    const handlePress = () => {
        if (haptic) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
    };

    const getBackgroundColor = () => {
        if (disabled) return COLORS.text.tertiary;
        switch (variant) {
            case 'primary': return COLORS.primary;
            case 'secondary': return COLORS.secondary;
            case 'danger': return COLORS.error;
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            default: return COLORS.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return COLORS.background;
        switch (variant) {
            case 'primary': return COLORS.text.inverse;
            case 'secondary': return COLORS.text.inverse;
            case 'danger': return COLORS.text.inverse;
            case 'outline': return COLORS.primary;
            case 'ghost': return COLORS.secondary;
            default: return COLORS.text.inverse;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor() },
                variant === 'outline' && styles.buttonOutline,
                style,
            ]}
            onPress={handlePress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <View style={styles.buttonContent}>
                    {icon && <Text style={[styles.buttonIcon, { color: getTextColor() }]}>{icon}</Text>}
                    <Text style={[styles.buttonText, { color: getTextColor() }, textStyle]}>
                        {title}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

// --- CARDS ---

export const Card = ({ children, style, onPress }: { children: React.ReactNode, style?: ViewStyle, onPress?: () => void }) => {
    const Container = onPress ? TouchableOpacity : View;

    const handlePress = () => {
        if (onPress) {
            Haptics.selectionAsync();
            onPress();
        }
    };

    return (
        // @ts-ignore
        <Container style={[styles.card, style]} onPress={onPress ? handlePress : undefined} activeOpacity={0.9}>
            {children}
        </Container>
    );
};

// --- CHIPS ---

interface ChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    icon?: string;
}

export const FilterChip = ({ label, selected, onPress, icon }: ChipProps) => {
    const Container = Platform.OS === 'ios' ? BlurView : View;
    const blurProps = Platform.OS === 'ios' ? { intensity: selected ? 80 : 30, tint: 'default' } : {};

    return (
        <TouchableOpacity
            onPress={() => {
                if (onPress) {
                    Haptics.selectionAsync();
                    onPress();
                }
            }}
            activeOpacity={0.8}
            style={[styles.chipShadow]}
        >
            {/* @ts-ignore */}
            <Container
                style={[
                    styles.chip,
                    Platform.OS === 'android' && { backgroundColor: selected ? COLORS.primary : COLORS.card },
                    selected && Platform.OS === 'ios' && { backgroundColor: COLORS.primary } // Tint isn't enough for highlighted state
                ]}
                {...blurProps}
            >
                {icon && <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{icon} </Text>}
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {label}
                </Text>
            </Container>
        </TouchableOpacity>
    );
};

// --- SEARCH PILL ---

export const SearchPill = ({ placeholder, value, onPress, style }: { placeholder: string, value?: string, onPress: () => void, style?: ViewStyle }) => {
    const Container = Platform.OS === 'ios' ? BlurView : View;

    return (
        <TouchableOpacity
            style={[styles.searchPillShadow, style]}
            onPress={() => {
                Haptics.selectionAsync();
                onPress();
            }}
            activeOpacity={0.9}
        >
            {/* @ts-ignore */}
            <Container
                style={[styles.searchPill, Platform.OS === 'android' && { backgroundColor: COLORS.card }]}
                intensity={50}
                tint="systemMaterial"
            >
                <Text style={styles.searchIcon}>🔍</Text>
                <Text style={[styles.searchText, !value && styles.searchPlaceholder]} numberOfLines={1}>
                    {value || placeholder}
                </Text>
            </Container>
        </TouchableOpacity>
    )
};

// --- STYLES ---

const styles = StyleSheet.create({
    button: {
        height: 50,
        borderRadius: RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
    },
    buttonOutline: {
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        ...TYPOGRAPHY.h3,
        fontSize: 17,
    },
    buttonIcon: {
        fontSize: 18,
        marginRight: SPACING.s,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.m,
        padding: SPACING.l,
        ...SHADOWS.small,
        marginBottom: SPACING.m,
    },

    // Chip
    chipShadow: {
        ...SHADOWS.small,
        marginRight: SPACING.s,
        borderRadius: RADIUS.xl,
    },
    chip: {
        paddingHorizontal: SPACING.l,
        paddingVertical: 10,
        borderRadius: RADIUS.xl,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    chipText: {
        ...TYPOGRAPHY.body,
        fontSize: 15,
        fontWeight: '500',
    },
    chipTextSelected: {
        color: COLORS.text.inverse,
    },

    // Search
    searchPillShadow: {
        ...SHADOWS.medium,
        borderRadius: RADIUS.round,
    },
    searchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        borderRadius: RADIUS.round,
        paddingHorizontal: SPACING.l,
        overflow: 'hidden',
    },
    searchIcon: {
        fontSize: 18,
        marginRight: SPACING.m,
        opacity: 0.6,
    },
    searchText: {
        ...TYPOGRAPHY.body,
        fontSize: 17,
        flex: 1,
    },
    searchPlaceholder: {
        color: COLORS.text.secondary,
    },
});
