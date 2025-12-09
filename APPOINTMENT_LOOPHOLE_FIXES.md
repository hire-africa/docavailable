# Appointment & Session System Security Fixes

## Overview
This document details critical security fixes applied to the Appointment and Session systems to close loopholes that allowed for free sessions, infinite doctor payments, and unauthorized session starts.

## 1. Double Billing & Infinite Payment Loophole
### Problem
- **Issue**: The `DoctorPaymentService` methods `processAppointmentPayment` and `deductFromPatientSubscriptionForAppointment` were not idempotent.
- **Risk**: If the payment endpoint was called multiple times, the doctor would be paid multiple times.
- **Fix**: Added **Idempotency Checks**.
    - `processAppointmentPayment`: Now checks `if ($appointment->earnings_awarded > 0)` before processing.
    - `deductFromPatientSubscriptionForAppointment`: Now checks `if ($appointment->sessions_deducted > 0)` before processing.

## 2. Double Spending Loophole (Concurrent Sessions)
### Problem
- **Issue**: A user with 1 credit could start a Text Session and an Appointment simultaneously. Since the Appointment deducted at the *end*, both would start successfully, leading to a negative balance or a failed deduction at the end (free session).
- **Fix**: **Deduct at Start**.
    - `AppointmentController::startSession` now calls `DoctorPaymentService::deductFromPatientSubscriptionForAppointment` *immediately*.
    - If deduction fails (insufficient funds), the session is refused.
    - `processAppointmentEnd` automatically skips deduction (due to idempotency check) but processes the doctor payment.

## 3. "Pay-as-you-go" Failure Loophole
### Problem
- **Issue**: Text sessions deduct every 10 minutes. If a user ran out of credits mid-session, the auto-deduction would fail, but the session might continue.
- **Fix**: **Terminate on Failure**.
    - Updated `TextSessionController::processAutoDeduction`.
    - If the deduction fails (returns false), the session is immediately set to `ended` status.

## 4. Unauthorized Session Start Loophole
### Problem
- **Issue**: The `startSession` method had no validation.
- **Risk**: Early starts or starting without a subscription.
- **Fix**: Added **Strict Validation**.
    - **Time Window**: Sessions can only be started within 15 minutes of the scheduled time.
    - **Subscription Status**: Real-time check of subscription status and balance.

## Summary
These changes ensure that:
1.  **Strict Financial Integrity**: Credits are deducted immediately or securely reserved.
2.  **No Free Usage**: Sessions are terminated if funds run out.
3.  **Idempotency**: No double billing or double payments.
