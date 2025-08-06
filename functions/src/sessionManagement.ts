import * as admin from 'firebase-admin';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// Main session management function - runs every 5 minutes
export const sessionAutoDeduct = onSchedule('every 5 minutes', async (event) => {
  const now = admin.firestore.Timestamp.now();

  // 1. Find all confirmed appointments that are not completed/cancelled/expired
  const snapshot = await admin.firestore().collection('appointments')
    .where('status', '==', 'confirmed')
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const scheduledTime = data.scheduledTime?.toDate ? data.scheduledTime.toDate() : new Date(data.scheduledTime);
    const patientJoined = data.patientJoined; // could be boolean or timestamp
    const actualStartTime = data.actualStartTime ? (data.actualStartTime.toDate ? data.actualStartTime.toDate() : new Date(data.actualStartTime)) : null;
    const actualEndTime = data.actualEndTime ? (data.actualEndTime.toDate ? data.actualEndTime.toDate() : new Date(data.actualEndTime)) : null;
    let sessionsDeducted = data.sessionsDeducted || 0;
    const patientId = data.patientId;
    const doctorId = data.doctorId;

    // 2. No-show logic: patient never joined within 10 minutes of scheduled time
    if (!patientJoined && (now.toDate().getTime() - scheduledTime.getTime() > 10 * 60 * 1000)) {
      // Deduct 1 session for no-show
      await admin.firestore().collection('users').doc(patientId).update({
        sessionCount: admin.firestore.FieldValue.increment(-1)
      });
      
      // Award doctor earnings for no-show
      await admin.firestore().collection('users').doc(doctorId).update({
        earnings: admin.firestore.FieldValue.increment(3000)
      });
      
      await doc.ref.update({
        status: 'completed',
        noShow: true,
        sessionsDeducted: 1,
        completedAt: now,
      });
      continue;
    }

    // 3. Session duration logic: if session started and ended, calculate duration
    if (actualStartTime && actualEndTime) {
      const durationMs = actualEndTime.getTime() - actualStartTime.getTime();
      const elapsedMinutes = Math.floor(durationMs / (60 * 1000));
      
      // Calculate auto-deductions (every 10 minutes)
      const autoDeductions = Math.floor(elapsedMinutes / 10);
      // Manual end always adds 1 session
      const manualDeduction = 1;
      const totalSessionsToDeduct = autoDeductions + manualDeduction;
      
      if (sessionsDeducted !== totalSessionsToDeduct) {
        // Deduct sessions for duration
        await admin.firestore().collection('users').doc(patientId).update({
          sessionCount: admin.firestore.FieldValue.increment(-totalSessionsToDeduct)
        });
        
        // Award doctor earnings
        await admin.firestore().collection('users').doc(doctorId).update({
          earnings: admin.firestore.FieldValue.increment(totalSessionsToDeduct * 3000)
        });
        
        await doc.ref.update({
          sessionsDeducted: totalSessionsToDeduct,
          status: 'completed',
          completedAt: now,
        });
      }
      continue;
    }

    // 4. Auto-deduction for active sessions (every 10 minutes)
    if (actualStartTime && !actualEndTime) {
      const elapsedMs = now.toDate().getTime() - actualStartTime.getTime();
      const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
      const autoDeductions = Math.floor(elapsedMinutes / 10);
      
      if (autoDeductions > (data.autoDeductions || 0)) {
        // Deduct sessions for auto-deduction
        await admin.firestore().collection('users').doc(patientId).update({
          sessionCount: admin.firestore.FieldValue.increment(-autoDeductions)
        });
        
        // Award doctor earnings
        await admin.firestore().collection('users').doc(doctorId).update({
          earnings: admin.firestore.FieldValue.increment(autoDeductions * 3000)
        });
        
        await doc.ref.update({
          autoDeductions: autoDeductions,
        });
      }
    }
  }
});

// Award doctor earnings when sessions are deducted (backup function)
export const awardDoctorEarnings = onDocumentUpdated('appointments/{appointmentId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  // Only act if sessionsDeducted increased
  if (
    typeof after.sessionsDeducted === 'number' &&
    after.sessionsDeducted > (before.sessionsDeducted || 0)
  ) {
    const doctorId = after.doctorId;
    const sessionsAwarded = after.sessionsDeducted - (before.sessionsDeducted || 0);
    const amount = sessionsAwarded * 3000;

    // Increment doctor's earnings
    await admin.firestore().collection('users').doc(doctorId).update({
      earnings: admin.firestore.FieldValue.increment(amount)
    });
  }
});