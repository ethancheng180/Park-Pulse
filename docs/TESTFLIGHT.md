# TestFlight Deployment Guide

How to build and deploy ParkPulse iOS app to TestFlight for beta testing.

## Prerequisites

- Apple Developer Account ($99/year)
- Xcode installed (macOS only)
- App Store Connect access
- Production Google Maps API key
- Production Stripe publishable key

## Step 1: Configure App

### 1.1 Update app.json

Ensure these fields are set correctly:

```json
{
  "expo": {
    "name": "ParkPulse",
    "slug": "parkpulse",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.parkpulse.app",
      "config": {
        "googleMapsApiKey": "YOUR_PRODUCTION_KEY"
      }
    }
  }
}
```

### 1.2 Update Environment Variables

Create production `.env`:

```env
API_BASE_URL=https://api.parkpulse.com  # Your production API
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY
GOOGLE_MAPS_API_KEY=YOUR_PRODUCTION_KEY
```

## Step 2: Build with EAS

### 2.1 Install EAS CLI

```bash
npm install -g eas-cli
```

### 2.2 Login to Expo

```bash
eas login
```

### 2.3 Configure Project

```bash
eas build:configure
```

### 2.4 Build for iOS

```bash
eas build --platform ios --profile production
```

This will:
1. Upload your project to Expo servers
2. Build the iOS app
3. Generate an `.ipa` file

Wait for build to complete (10-30 minutes).

### 2.5 Download Build

```bash
# Download from provided URL or
eas build:list
```

## Step 3: App Store Connect Setup

### 3.1 Create App

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+"
3. Select "New App"
4. Fill in:
   - **Platform**: iOS
   - **Name**: ParkPulse
   - **Primary Language**: English
   - **Bundle ID**: `com.parkpulse.app`
   -**SKU**: `parkpulse-ios`

### 3.2 Fill App Information

1. **Category**: Navigation
2. **Subcategory**: Parking
3. **Content Rights**: Upload required documents
4. **Age Rating**: 4+

### 3.3 Upload Screenshots

Required sizes (use iOS Simulator):
- 6.5" display (iPhone 14 Pro Max)
- 5.5" display (iPhone 8 Plus)

Capture screenshots of:
- Login screen
- Driver tab with map
- Pulser tab
- Account tab

## Step 4: Upload Build via Transporter

### 4.1 Download Transporter

1. Download from Mac App Store
2. Install and open

### 4.2 Upload IPA

1. Drag `.ipa` file to Transporter
2. Click "Deliver"
3. Wait for upload and processing (10-60 minutes)

## Step 5: Distribute to TestFlight

### 5.1 Configure TestFlight

1. In App Store Connect, go to your app
2. Click "TestFlight" tab
3. Build should appear after processing
4. Click on build number
5. Fill in:
   - **What to Test**: "Initial beta release"
   - **Export Compliance**: Answer questions

### 5.2 Add Internal Testers

1. Under "App Store Connect Users"
2. Click "+"
3. Add team members' emails
4. They'll receive email invitation

### 5.3 Add External Testers (Optional)

1. Create "External Testing" group
2. Submit for Beta App Review (1-2 days)
3. Once approved, add testers via email
4. Share public link for easy signup

## Step 6: Install TestFlight App

1. Testers download "TestFlight" app from App Store
2. Accept invitation email
3. Install ParkPulse from TestFlight
4. Test the app!

## Updating the App

### New Build

```bash
# Increment version in app.json
# "version": "1.0.1"

# Build new version
eas build --platform ios --profile production

# Upload via steps above
# Testers auto-receive updates
```

## Alternative: Expo Classic Build (Deprecated)

```bash
expo build:ios

# Follow similar upload process
```

## Production Deployment (App Store)

After successful TestFlight testing:

1. **App Store Connect** → App → "App Store" tab
2. Fill all required information:
   - Description
   - Keywords
   - Screenshots
   - Privacy Policy URL
   - Support URL
3. Select build from TestFlight
4. Submit for Review
5. Wait for approval (1-7 days)
6. App goes live!

## Troubleshooting

### Build Fails

- Check all API keys are valid
- Verify bundle ID matches App Store Connect
- Check `app.json` syntax
- Review build logs in Expo dashboard

### Provisioning Profile Error

```bash
# Clear credentials and re-generate
eas credentials
```

### Maps Not Working in TestFlight

- Verify production Google Maps API key
- Enable iOS Maps SDK in Google Cloud Console
- Check API key restrictions

### Stripe Not Working

- Ensure using production Stripe key (pk_live_...)
- Test in sandbox mode first
- Check webhook configuration

## Best Practices

1. **Version Management**: Use semantic versioning (1.0.0, 1.0.1, etc.)
2. **Testing**: Test thoroughly before each build
3. **Release Notes**: Provide clear "What to Test" notes
4. **Beta Group**: Start with small internal group, expand gradually
5. **Feedback**: Use TestFlight feedback feature for bug reports
6. **Crash Logs**: Monitor crash logs in App Store Connect

## Costs

- **Apple Developer**: $99/year
- **Expo EAS**: Free tier available, paid for more builds
- **TestFlight**: Free (included with Apple Developer)
- **App Store**: Free after developer membership

---

For Android deployment to Google Play Console, see `PLAYSTORE.md` (not included in MVP).
