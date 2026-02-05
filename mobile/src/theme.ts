/**
 * Global Design System
 * "Apple Native" quality: standard iOS system colors, SF Pro typography.
 */

import { Platform } from 'react-native';

export const COLORS = {
    // Uber/Apple Neutrals
    primary: '#000000',
    secondary: '#276EF1', // Uber Blue
    success: '#34C759', // iOS Green
    error: '#FF3B30', // iOS Red
    warning: '#FFCC00', // iOS Yellow

    background: '#F2F2F7', // iOS Grouped Background
    card: '#FFFFFF',

    // Text
    text: {
        primary: '#000000',
        secondary: '#3C3C4399', // iOS Label Secondary (60% opaque)
        tertiary: '#3C3C434D', // iOS Label Tertiary (30% opaque)
        inverse: '#FFFFFF',
    },

    border: '#C6C6C8', // iOS Separator
    shadow: '#000000',
    overlay: 'rgba(0,0,0,0.4)', // Dimming view
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 12, // Standard iOS padding often 16, but 12 is good for tighter interactions
    l: 16,
    xl: 20,
    xxl: 32,
};

export const RADIUS = {
    s: 8,
    m: 12,
    l: 16, // iOS App Icon-ish
    xl: 24, // Pills
    round: 999,
};

export const SHADOWS = {
    small: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    medium: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    large: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
};

// SF Pro emulation (System font)
const SYSTEM_FONT = Platform.select({ ios: 'System', android: 'Roboto', default: 'System' });

export const TYPOGRAPHY = {
    h1: { fontFamily: SYSTEM_FONT, fontSize: 34, fontWeight: '700' as '700', color: COLORS.text.primary, letterSpacing: 0.37 }, // Large Title
    h2: { fontFamily: SYSTEM_FONT, fontSize: 22, fontWeight: '600' as '600', color: COLORS.text.primary, letterSpacing: 0.35 }, // Title 2
    h3: { fontFamily: SYSTEM_FONT, fontSize: 17, fontWeight: '600' as '600', color: COLORS.text.primary, letterSpacing: -0.41 }, // Headline
    body: { fontFamily: SYSTEM_FONT, fontSize: 17, fontWeight: '400' as '400', color: COLORS.text.primary, letterSpacing: -0.41 }, // Body
    caption: { fontFamily: SYSTEM_FONT, fontSize: 15, fontWeight: '400' as '400', color: COLORS.text.secondary, letterSpacing: -0.24 }, // Subhead
    small: { fontFamily: SYSTEM_FONT, fontSize: 13, fontWeight: '400' as '400', color: COLORS.text.tertiary, letterSpacing: -0.08 }, // Footnote
};
