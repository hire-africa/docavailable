# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Mobile app (React Native + Expo Router) in app/, TypeScript throughout, with a layered services/ and hooks/ architecture.
- Realtime WebRTC signaling server (Node.js + ws) in backend/ for audio and chat signaling; integrates with a separate HTTP API via axios.
- Optional Firebase Cloud Functions in functions/ (TypeScript), primarily for background/auxiliary tasks.
- Android native project in android/ for builds and release packaging.
- Note: README.md mentions a Laravel backend and contains Docker assets oriented to PHP/Laravel; in this repo snapshot, backend/ contains a Node-based signaling server. Treat the Laravel Dockerfile/compose as legacy or external unless the Laravel codebase is present.

Common commands (pwsh on Windows)
Frontend (Expo / React Native)
- Install deps
  ```bash path=null start=null
  npm install
  ```
- Start Metro (mobile) / web
  ```bash path=null start=null
  npm run start            # expo start
  npm run web              # expo start --web
  ```
- Android build and utilities
  ```bash path=null start=null
  npm run android                 # expo run:android (dev build via Expo)
  npm run build:android-debug     # gradle debug build
  npm run build:android           # gradle release build
  npm run build:apk               # assembleRelease (APK)
  npm run build:apk-debug         # assembleDebug (APK)
  npm run build:apk-bundle        # bundleRelease (AAB)
  npm run clean:android           # clean gradle
  ```
- Lint
  ```bash path=null start=null
  npm run lint
  ```
- Run a single diagnostic “test” script (no Jest configured)
  The repo uses targeted Node scripts for end-to-end checks instead of a test runner. Example:
  ```bash path=null start=null
  node scripts/development/test-api-health.js
  ```
  Explore scripts/development/ for other focused checks (e.g., test-backend-connection.js, test-chat-encryption.js, test-image-urls.js).

WebRTC signaling server (backend/)
- Start in dev (with nodemon) / prod
  ```bash path=null start=null
  npm run signaling:dev   # runs backend/ with nodemon
  npm run signaling:start # runs backend/ in normal mode
  ```
- Defaults and endpoints
  - Port: 8080 (override with WEBRTC_SIGNALING_PORT)
  - Audio WS: ws://localhost:{port}/audio-signaling/{appointmentId}
  - Chat WS:  ws://localhost:{port}/chat-signaling/{appointmentId}
  - Health:   http://localhost:{port}/health
- Environment required by signaling server
  ```bash path=null start=null
  $env:WEBRTC_SIGNALING_PORT=8080
  $env:API_BASE_URL="https://your.api.root"    # used for axios calls
  $env:API_AUTH_TOKEN="{{API_AUTH_TOKEN}}"     # bearer token for API; set via secret manager
  ```

Firebase functions (optional)
- Build / lint / emulate
  ```bash path=null start=null
  npm --prefix functions run build
  npm --prefix functions run lint
  npm --prefix functions run serve   # requires firebase CLI and a firebase.json
  ```

Environment configuration
- Mobile app expects API base URLs via .env variables (as referenced in README.md):
  ```bash path=null start=null
  # .env at repo root
  EXPO_PUBLIC_API_URL=http://localhost:8000/api
  API_BASE_URL=http://localhost:8000/api
  ```
- Signaling server requires API_BASE_URL and API_AUTH_TOKEN (see section above). Set them in your shell/session before starting.

High-level architecture
- Frontend (app/, components/, services/, hooks/)
  - Routing and screens: app/ uses Expo Router with nested routes (e.g., chat/[appointmentId].tsx, doctor-profile/[id].tsx, password-reset/[token].tsx). These map to domain flows like chat, appointments, onboarding, and account management.
  - Services layer (services/): encapsulates network and domain logic. Notable modules:
    - apiService.ts, configService.ts: base HTTP and configuration.
    - webrtcService.ts, webrtcChatService.ts, webrtcApiService.ts: realtime signaling and media flow.
    - encryptionService.ts, reactNativeEncryptionService.ts, encryptionApiService.ts: message encryption at rest/in-flight.
    - sessionService.ts, backgroundSessionTimer.ts, sessionTimerNotifier.ts, instantSessionMessageDetector.ts: long-running session lifecycle, deductions, timers.
    - paymentsService.ts, paymentService.ts, paychanguService.ts, walletApiService.ts: payments & wallet flows.
    - authService.ts, localStorageService.ts, notificationApiService.ts, appInitializer.ts: auth, persistence, notifications, bootstrap.
  - Hooks (hooks/): composable behavior and data orchestration
    - useDataFetching, usePolling, useTabBasedFetching: fetch and refresh strategies.
    - useEncryption, useInstantSessionDetector: client-side crypto and session activation.
    - useUserData, useHealthCheck, useCallSetup: auth/user state, health probing, call setup.
  - UI Components (components/): feature-specific composites (AudioCallModal, VideoCallModal, InstantSessionChatIntegration, PaymentModal) and shared primitives (ThemedView/Text, skeleton loaders, forms, pickers).
  - Configuration (config/): environment and provider configs for OpenAI/DeepSeek/OAuth; ensure values are provided via env or secure sources.
- Signaling server (backend/webrtc-signaling-server.js)
  - Dual WebSocket servers on a single HTTP server: /audio-signaling and /chat-signaling.
  - Tracks connections per appointmentId; brokers WebRTC offers/answers/ICE; forwards chat messages.
  - Integrates with external REST API for message persistence, session activation, deductions, and notifications (axios + API_AUTH_TOKEN).
  - Timers & state: manages 90s doctor response timers, periodic 10-minute deductions for instant sessions and calls, and call session lifecycle.
- Serverless (functions/)
  - TypeScript project (tsconfig targets lib/). Scripts provided for lint/build/emulation. Intended for auxiliary tasks (see functions/src/*).

Notes on Docker assets
- Dockerfile and root docker-compose.yml reference a PHP/Laravel backend. In this repository snapshot, the operational backend is the Node signaling server in backend/. Unless a Laravel codebase is present, prefer the Node-based commands above.

References from README.md (important parts)
- The README outlines a broader system with a Laravel backend and mobile app. For local mobile development here, prioritize:
  - npm install; npm run start for Expo.
  - Configure EXPO_PUBLIC_API_URL (and API_BASE_URL) to point to your actual HTTP API.
  - Start the signaling server as described if you need realtime calls/chat locally.
