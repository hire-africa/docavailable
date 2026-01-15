# DocAvailable: Technical Appointments and Sessions Guide

This guide provides a deep-dive into the technical implementation of appointments and sessions within the DocAvailable ecosystem, covering database schemas, state transitions, and backend processes.

---

## 1. Database Schema & Definitions

### Essential Columns in `appointments` Table

| Column | Type | Description |
| :--- | :--- | :--- |
| `status` | `integer` | The primary state indicator (see Status Codes below). |
| `appointment_datetime_utc` | `datetime` | The **source of truth** for time matching, stored in UTC. |
| `user_timezone` | `string` | The timezone used at the time of booking (e.g., "Africa/Lilongwe"). |
| `appointment_type` | `string` | session type: `text`, `audio`, or `video`. |
| `actual_start_time` | `datetime` | Timestamp when the consultation was actually activated. |
| `actual_end_time` | `datetime` | Timestamp when the consultation was ended. |
| `earnings_awarded` | `decimal` | Tracks the amount paid to the doctor (prevents double payment). |
| `sessions_deducted` | `integer` | Tracks deductions from the patient plan (prevents double deduction). |
| `patient_joined` | `boolean` | Tracks if the patient entered the session. |
| `doctor_joined` | `boolean` | Tracks if the doctor entered the session. |

### Appointment Status Codes

| Code | Constant | Meaning |
| :---: | :--- | :--- |
| **0** | `STATUS_PENDING` | Initial state after patient books. |
| **1** | `STATUS_CONFIRMED` | Doctor has accepted the request. |
| **2** | `STATUS_CANCELLED` | Appointment was voided by either party. |
| **3** | `STATUS_COMPLETED` | Session ended and payment processed. |
| **4** | `STATUS_RESCHEDULE_PROPOSED` | Waiting for party to agree to a new time. |
| **7** | `STATUS_IN_PROGRESS` | **Active state**; consultation is currently happening. |

---

## 2. Technical Lifecycle & Transitions

### Phase A: Booking to Confirmation (0 → 1)
1.  **Creation**: A record is created via `AppointmentController@create_appointment`. The backend automatically calculates the `appointment_datetime_utc` using the `TimezoneService`.
2.  **Notification**: A high-priority push notification is dispatched to the doctor via a background job (`SendAppointmentNotification`).
3.  **Confirmation**: The doctor updates the status to `1`. This validates that the doctor is available at that time.

### Phase B: Confirmation to Activation (1 → 7)
The transition to **In Progress** is handled by the **Conversion Process**:

*   **Frontend Check**: The `useTextAppointmentConverter` hook (on the patient dashboard) polls every 60 seconds.
*   **Validation Logic**:
    *   System checks if `now() >= appointment_datetime_utc - 15 minutes`.
    *   System validates that the patient has an **active subscription**.
    *   System ensures the patient has sufficient **session balance** to cover this session + any other ongoing sessions.
*   **Activation**: When the user clicks "Join", the backend `startSession` method is called:
    *   `status` is updated to `7`.
    *   `actual_start_time` is recorded.
    *   If it's a text session, a `chat_room` is initialized.

### Phase C: Active to Completion (7 → 3)
When the consultation ends, the backend triggers the **End Process**:

1.  **Termination**: `AppointmentController@endSession` marks the status as `3`.
2.  **Payment Processing**: The `DoctorPaymentService@processAppointmentEnd` is invoked.
3.  **Deduction (Patient)**: 
    *   One session is decremented from `text_sessions_remaining`, `voice_calls_remaining`, or `video_calls_remaining`. 
    *   `sessions_deducted` is updated to `1` to prevent re-processing.
4.  **Earnings (Doctor)**:
    *   Credits are added to the `doctor_wallets` table.
    *   **Rate Calculation**: Doctors in **Malawi** are paid in **MWK (3500)**; International doctors are paid in **USD ($3.00)**.
    *   `earnings_awarded` is updated with the amount paid.

---

## 3. Special Handling: Instant (Normal) Sessions

Instant sessions (Talk Now) bypass the Appointment status flow and use the `text_sessions` or `call_sessions` tables directly.

*   **90-Second Deadline**: When a patient starts a session, the backend sets a `doctor_response_deadline`.
*   **Auto-Expiration**: If the doctor doesn't respond by this deadline, the backend `checkResponse` process (triggered by frontend polling) updates the session status to `Expired`. No credits are deducted from the patient in this case.
*   **Auto-Deduction**: For text sessions longer than 10 minutes, the `DoctorPaymentService@processAutoDeduction` automatically deducts additional sessions in 10-minute increments to ensure fair usage.

---

## 4. Navigation & Tooling for Developers

*   **Logic Verification**: Refer to `AppointmentController.php` for state validation and `DoctorPaymentService.php` for the financial logic.
*   **Timezone Debugging**: Use `TimezoneService.php` to verify how local times are normalized to UTC.
*   **Frontend Activation**: See `useTextAppointmentConverter.ts` to understand how scheduled appointments are "upgraded" to active sessions in real-time.
