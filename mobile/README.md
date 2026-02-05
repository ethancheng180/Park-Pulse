# ParkPulse Mobile App

Expo React Native app for iOS and Android.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```env
   API_BASE_URL=http://localhost:8000
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

3. **Update Google Maps API key in app.json**:
   Replace `AIzaSyDummy_Key_Replace_With_Real` with your actual key.

4. **Start Expo**:
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**:
   - iOS: Press `i` or scan QR code with Expo Go
   - Android: Press `a` or scan QR code with Expo Go
   - Web: Press `w`

## Features

### Three Tabs

1. **Driver** - Find parking
   - Enter destination
   - Set radius and max price
   - View matched spot on map
   - 3-4 minute countdown timer
   - Confirm found/gone

2. **Pulser** - Report spots
   - One-tap spot reporting
   - Auto-capture GPS location
   - Optional photo upload
   - View pending/paid reports

3. **Account** - Profile & history
   - Balance display
   - Reputation stars
   - Performance stats
   - Transaction history
   - Logout

## Permissions

The app requires:

- **Location** - For reporting and finding spots
- **Camera** - For optional spot photos
- **Photo Library** - For uploading images

## Test Credentials

Use these credentials from the backend seed script:

- Driver: `driver@test.com` / `password123`
- Pulser: `pulser@test.com` / `password123`
- Both: `both@test.com` / `password123`

## Building for Production

### iOS (TestFlight)

See `/docs/TESTFLIGHT.md` for detailed instructions.

```bash
# Build iOS binary
npx expo build:ios

# Upload to App Store Connect
```

### Android (Google Play)

```bash
# Build Android APK/AAB
npx expo build:android

# Upload to Google Play Console
```

## Troubleshooting

**Maps not showing**: 
- Verify Google Maps API key in `app.json` and `.env`
- Enable Google Maps SDK for iOS/Android in Google Cloud Console

**Location permission denied**:
- Check Info.plist descriptions in `app.json`
- Verify device settings allow location access

**Cannot connect to backend**:
- Ensure backend is running
- For iOS simulator: use `http://localhost:8000`
- For Android emulator: use `http://10.0.2.2:8000`
- For physical device: use your computer's IP address

## Dependencies

- `expo` - Expo SDK
- `react-navigation` - Navigation library
- `react-native-maps` - Google Maps
- `axios` - HTTP client
- `@stripe/stripe-react-native` - Stripe SDK
- `expo-location` - Location services
- `expo-image-picker` - Camera/photos

## Project Structure

```
mobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── PulserScreen.tsx
│   │   ├── DriverScreen.tsx
│   │   └── AccountScreen.tsx
│   ├── services/
│   │   ├── api.ts          # API client
│   │   └── location.ts     # Location service
│   └── types/
│       └── index.ts        # TypeScript types
├── App.tsx                 # Main app component
├── app.json                # Expo configuration
└── package.json            # Dependencies
```
