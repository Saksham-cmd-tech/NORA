# NORA Release Signing & Play Store Bundle Guide

This document contains the signing credentials, certificate fingerprints, and instructions for uploading **NORA (Notification Organized Rail Assistant)** to the **Google Play Console**.

---

## 🔑 Production Keystore Details

The production release keystore is stored and tracked in your repository:

- **Keystore File:** `android/app/nora-release-key.keystore`
- **Key Alias:** `nora-release-key`
- **Keystore Password:** `norawallet2026`
- **Key Password:** `norawallet2026`
- **Keystore Type:** `PKCS12`
- **Algorithm:** `2048-bit RSA`, `SHA256withRSA`
- **Validity:** Valid until **February 26, 2054**

### Certificate Fingerprints:
- **SHA-1:** `8B:29:46:C3:8F:F9:70:9D:DA:C1:75:A4:6A:5C:37:74:6B:6B:95:42`
- **SHA-256:** `57:40:CF:FF:E2:66:97:7D:DE:41:30:88:1F:C9:D0:0D:2C:4C:4F:1B:9E:AC:61:FA:23:AA:B4:09:8E:F7:95:E9`

*(These SHA-256 and SHA-1 fingerprints are useful if you link Google Play App Signing, Firebase, or other API consoles).*

---

## 📦 Output Build Artifacts

Both production builds have been generated and signed with this keystore:

1. **Android App Bundle (`.aab`) — For Google Play Console:**
   - **Path:** `release_builds/app-release.aab`
   - **Original Build Path:** `android/app/build/outputs/bundle/release/app-release.aab`
   - **Size:** ~46 MB
   - **Package Name:** `dev.saksham.nora`
   - **Version Code:** `6`
   - **Version Name:** `1.2.1`

2. **Standalone Release APK (`.apk`) — For Direct Installation/Testing:**
   - **Path:** `release_builds/app-release.apk`
   - **Original Build Path:** `android/app/build/outputs/apk/release/app-release.apk`
   - **Size:** ~65 MB

---

## 🚀 How to Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console).
2. Select your app: **NORA** (or create a new app with package `dev.saksham.nora`).
3. In the left navigation, go to **Release** → **Production** (or **Testing** → **Closed testing**).
4. Click **Create new release**.
5. Under **App bundles**, drag & drop `release_builds/app-release.aab`.
6. Enter release notes (e.g. `Initial release of NORA - Offline Personal Train Ticket Wallet v1.2.0`).
7. Save and review the release.

---

## 🛠 How to Rebuild Anytime

To regenerate the signed `.aab` or `.apk` in the future:

```bash
cd android

# Build Google Play App Bundle (.aab)
JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew bundleRelease

# Build Standalone APK (.apk)
JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew assembleRelease
```
