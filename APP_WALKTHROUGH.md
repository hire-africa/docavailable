# DocAvailable: Complete App Walkthrough

This document provides a detailed walkthrough of the DocAvailable application from both the **Patient** and **Doctor** perspectives, covering the core features and user journeys.

---

## 1. Patient Side Walkthrough

### 🚀 Onboarding & Authentication
- **Sign Up/Login**
  - Email / Google / Apple.
- **Profile Setup**
  - Basic identity fields.
- **Home/Dashboard**
  - Entry points into:
    - Finding doctors
    - Starting an instant session ("Talk Now")
    - Viewing scheduled appointments
    - Viewing active chat/call sessions

### 🔍 Finding a Doctor (Discover / Doctor Profile)
- **Browse & filter**
  - Search + specialization filters.
- **Doctor profile screen**
  - Provides:
    - "Talk Now" (instant session)
    - "Book Appointment" (scheduled)

### 📞 Consultation Flows (Verified)

#### A. "Talk Now" (Instant Session)

Instant sessions are created via `services/sessionCreationService.ts`:

- **Instant Text Session**
  1. **Patient chooses Text**
     - Example entry points:
       - `app/instant-sessions.tsx`
       - Doctor profile screens that open the session type modal.
  2. **Backend session is created**
     - `POST /api/text-sessions/start` with `{ doctor_id, reason? }`.
     - Response contains a numeric `session_id`.
  3. **Chat route id is derived**
     - Frontend computes `chatId = text_session_${session_id}` and navigates to:
       - `app/chat/[appointmentId].tsx` using `appointmentId = chatId`.
  4. **90-second window is NOT tied to opening the chat**
     - The doctor response countdown is started **after the patient sends the first message**.
     - Frontend explicitly persists the first message to the backend (`/api/chat/{appointmentId}/messages`) so the backend can set `doctor_response_deadline`.
     - The UI countdown is driven by server events / server-provided deadlines.
  5. **If the doctor doesn’t respond in time**
     - The backend marks the session expired (lazy expiration) and the UI reflects that.
     - The intention is **no deduction** when the session expires waiting for the doctor.
  6. **If the doctor responds**
     - Session becomes active.
     - Additional deductions can happen over time (auto-deduction logic for long-running text sessions exists).

- **Instant Audio/Video Call**
  1. **Patient chooses Audio or Video**
  2. **Backend call session is created**
     - `POST /api/call-sessions/start` with:
       - `call_type: voice|video`
       - `doctor_id`
       - `appointment_id: direct_session_*` (generated routing key)
       - `reason?`
  3. **Important: `direct_session_*` is a routing identifier**
     - It is **not** a scheduled appointment record.
     - It is used for WebSocket/WebRTC signaling and call session tracking.
  4. **Call UI connects via WebRTC signaling**
     - Frontend opens the call UI with the returned routing id.
  5. **Billing/deduction is not immediate on start**
     - The backend explicitly avoids deducting immediately for calls that never connect.
     - The end-call flow has special handling for non-connected calls (no billing).

#### B. Scheduled Appointments

Scheduled appointments create a row in `appointments` and then later become "callable/chat-ready" when the time window is reached.

- **Booking (patient)**
  1. **Patient selects date/time and type** (`text`/`audio`/`video`).
  2. **Backend appointment is created**
     - `AppointmentController@create_appointment` stores:
       - `appointment_datetime_utc` (source of truth)
       - `user_timezone`
       - `appointment_type`
       - status (starts at Pending)
  3. **Doctor receives a notification**

- **Before the appointment starts (Pending/Confirmed phase)**
  - Doctor can accept/decline or propose reschedule.
  - Patient can see appointment details.

- **When the scheduled time window arrives (activation/unlock phase)**
  - **Text appointments**
    - A backend activation job creates/ensures a `text_sessions` record linked to the appointment.
    - A chat room is created (named `text_session_{id}`), and participants are attached.
  - **Audio/Video appointments**
    - A backend activation job creates/ensures an appointment chat room (named `appointment_{appointmentId}`), so the chat UI can load.
    - The appointment is "unlocked" for calls using `appointments.call_unlocked_at`.
    - The backend enforces `call_unlocked_at` before allowing `POST /api/call-sessions/start` for scheduled calls.

- **Starting the scheduled consultation (patient)**
  - Patient opens the chat/appointment UI at the eligible time.
  - For scheduled audio/video, the app starts a call session via:
    - `createSession({ type: 'call', source: 'APPOINTMENT', appointmentId: <numeric>, callType })`
    - Backend validates:
      - appointment exists
      - call is unlocked (`call_unlocked_at`)
      - appointment_type matches call_type

- **Ending the scheduled consultation**
  - Ending logic is handled by backend controllers for session completion.
  - Call sessions have explicit "no billing if never connected" behavior.

### 💳 Payments & Subscriptions
*   **Subscription Plans**: Patients buy "Session Bundles" (e.g., 5 Text Sessions, 2 Video Calls).
*   **Payment Gateway**: Integration with Paychangu for secure transactions.
*   **Wallet**: Tracks remaining sessions and transaction history.

---

## 2. Doctor Side Walkthrough

### 🩺 Professional Setup
- **Verification**
  - Doctors submit credentials.
  - Account status/approval gates access to patient-facing discovery.

### 🟢 Availability: Working Hours & Online Toggle (Verified)

The doctor availability system is stored in `doctor_availabilities` (model `DoctorAvailability`). It contains:

- `is_online` (boolean)
- `working_hours` (JSON / array)
- `max_patients_per_day` (integer)

#### A. Working Hours Page (Doctor)

Primary UI:
- `components/WorkingHours.tsx` (rendered inside `app/doctor-dashboard.tsx` in the “working-hours” tab)

Data flow:
1. **Load current settings**
   - On mount and on screen focus, the component calls:
     - `authService.getDoctorAvailability(doctorId)` → `GET /api/doctors/{doctorId}/availability`
   - Backend endpoint:
     - `DoctorController@getAvailability($id)`
   - If the doctor has no record yet, backend returns a default structure (all days disabled, default slot 09:00–17:00).

2. **Edit working hours**
   - Each day has:
     - `enabled: boolean`
     - `slots: [{ start: "HH:MM", end: "HH:MM" }, ...]`
   - UI allows:
     - enabling/disabling a day
     - adding/removing slots
     - editing slot start/end times

3. **Save settings**
   - “Save All Settings” calls:
     - `authService.updateDoctorAvailability(doctorId, payload)` → `PUT /api/doctors/{doctorId}/availability`
   - Backend endpoint:
     - `DoctorController@updateAvailability(Request $request, $id)`
   - The payload includes:
     - `is_online`
     - `working_hours`
     - `max_patients_per_day`

#### B. Online Toggle (Doctor)

There are two related UI paths in the codebase:

1. **Online status inside Working Hours page**
   - In `components/WorkingHours.tsx`, the toggle changes `availability.isOnline`.
   - When toggling **ON**, the UI shows a confirmation modal (“Important Notice”).
   - It also shows an “on duty” local notification via `onDutyNotificationService`.
   - Important: the toggle alone updates local component state; the backend state is persisted when the doctor taps **Save All Settings**.

2. **OnlineStatusToggle component (alternate UI)**
   - `components/OnlineStatusToggle.tsx` calls:
     - `POST /api/text-sessions/toggle-online`
   - This is a separate implementation path that toggles online status immediately.
   - If you want “one source of truth” for the app behavior, the Working Hours flow + `DoctorController@updateAvailability` is the one that directly affects patient-facing doctor availability responses used by booking and discovery.

#### C. How This Affects the Patient Side

1. **Discover / Doctor listing**
   - Patient UI can filter doctors by online status.
   - In `app/patient-dashboard.tsx`, the “online only” filter uses `doctor.is_online`.

2. **Booking availability (scheduled appointments)**
   - When a patient opens booking flow (e.g. `app/(tabs)/doctor-details/BookAppointmentFlow.tsx`), the app fetches:
     - `GET /api/doctors/{doctorId}/availability`
   - The booking UI uses `working_hours` to decide which days/times can be selected.

3. **What “Online” means vs “Working hours”**
   - **Online toggle**: used for “instant availability” signals on the patient side (and the online-only filter).
   - **Working hours**: used to gate what time slots patients can book for scheduled appointments.

### 📅 Managing Appointments
*   **Requests**: Doctors receive push notifications for new booking requests.
*   **Actions**: Can "Accept", "Decline", or "Propose Reschedule".
*   **In-Progress**: Access to active sessions and patient medical history during the call.

### 💬 Communication Tools
*   **Consultation Hub**: A central place to view all upcoming, active, and past sessions.
*   **Chat/Call Interface**: High-quality WebRTC audio/video and real-time text chat with media sharing (images/documents).

### 💰 Earnings & Withdrawals
*   **Auto-Earnings**: Credits are automatically added to the doctor's wallet upon session completion.
*   **Withdrawal Requests**: Doctors can request to cash out their earnings once they reach a minimum threshold.

---

## 3. Core App Logic (The "Glue")

| Feature | Description |
| :--- | :--- |
| **Websocket Signaling** | Manages real-time events (incoming calls, message receipts, typing indicators). |
| **Push Notifications** | FCM (Firebase) keeps both parties updated on status changes and reminders. |
| **Session Deduction** | Backend automatically deducts sessions from patient plans only when a session is successfully established. |
| **WebRTC** | Peer-to-peer connection for low-latency audio and video consultations. |

---

*Last Updated: March 2, 2026*
