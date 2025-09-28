# Session Deduction Timer Implementation

## 🎯 **Overview**
Implemented a comprehensive 10-minute session deduction system for text sessions that automatically deducts from the patient's plan every 10 minutes from activation.

## ✅ **Features Implemented**

### **1. Real-Time Session Duration Tracking**
- **Session Start Time**: Captures the exact moment when a text session is activated
- **Elapsed Time Calculation**: Tracks session duration in minutes from activation point
- **Minute-by-Minute Updates**: Updates every minute to provide accurate timing

### **2. 10-Minute Deduction Logic**
- **Automatic Deductions**: Sessions are deducted every 10 minutes from activation
- **Deduction Calculation**: `Math.floor(elapsedMinutes / 10)` sessions deducted
- **Next Deduction Countdown**: Shows minutes remaining until next deduction
- **Visual Indicators**: Clear display of sessions used and remaining

### **3. User Interface Components**
- **Session Duration Display**: Shows current session time in minutes
- **Sessions Used Counter**: Displays number of sessions deducted
- **Sessions Remaining**: Shows available sessions in patient's plan
- **Next Deduction Timer**: Countdown to next automatic deduction
- **Warning System**: Alerts when sessions are running low

### **4. Backend Integration**
- **WebRTC Session Service**: Real-time deduction notifications
- **API Status Sync**: Periodic checks to ensure frontend-backend consistency
- **Auto-Deduction Processing**: Integrates with existing backend deduction system
- **Session Status Updates**: Fetches latest deduction information from backend

## 🔧 **Technical Implementation**

### **State Management**
```typescript
// Session duration and deduction tracking state
const [sessionDuration, setSessionDuration] = useState<number>(0);
const [nextDeductionIn, setNextDeductionIn] = useState<number>(0);
const [sessionsDeducted, setSessionsDeducted] = useState<number>(0);
const [remainingSessions, setRemainingSessions] = useState<number>(0);
const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
const [deductionTimer, setDeductionTimer] = useState<number | null>(null);
```

### **Timer Logic**
```typescript
// Calculate deductions and next deduction time
const deductions = Math.floor(elapsedMinutes / 10);
const nextDeductionMinute = Math.ceil(elapsedMinutes / 10) * 10;
const minutesUntilNextDeduction = Math.max(0, nextDeductionMinute - elapsedMinutes);
```

### **UI Components**
- **Session Duration Card**: Displays session metrics in a clean, organized layout
- **Color-Coded Indicators**: Green for remaining sessions, red for used sessions
- **Warning Alerts**: Red background when sessions are exhausted
- **Real-Time Updates**: Updates every minute without page refresh

## 📊 **Deduction Schedule**

| Time Elapsed | Sessions Deducted | Next Deduction In |
|--------------|-------------------|-------------------|
| 0-9 minutes  | 0                 | 10 minutes        |
| 10-19 minutes| 1                 | 20 minutes        |
| 20-29 minutes| 2                 | 30 minutes        |
| 30-39 minutes| 3                 | 40 minutes        |
| ...          | ...               | ...               |

## 🔄 **Integration Points**

### **Frontend Integration**
- **WebRTC Session Service**: Receives real-time deduction notifications
- **Session Status API**: Fetches current deduction information
- **Periodic Sync**: Checks backend every 2 minutes for accuracy
- **Session Activation**: Starts timer when session becomes active

### **Backend Integration**
- **Auto-Deduction Command**: Existing `ProcessAutoDeductions` command
- **Session Status Endpoint**: `/text-sessions/{id}/status`
- **WebRTC Signaling**: Real-time deduction notifications
- **Payment Service**: Handles actual session deductions

## 🎨 **User Experience**

### **Visual Feedback**
- **Clear Metrics**: Easy-to-read session information
- **Progress Indicators**: Visual countdown to next deduction
- **Status Warnings**: Alerts when sessions are running low
- **Real-Time Updates**: Live updates without page refresh

### **Information Display**
- **Session Duration**: Current time elapsed
- **Sessions Used**: Number of sessions deducted
- **Sessions Remaining**: Available sessions in plan
- **Next Deduction**: Countdown to next automatic deduction

## 🚀 **Benefits**

1. **Transparency**: Patients can see exactly how their sessions are being used
2. **Real-Time Updates**: Live tracking of session consumption
3. **Fair Billing**: Accurate 10-minute interval deductions
4. **User Awareness**: Clear visibility into remaining sessions
5. **Backend Sync**: Ensures frontend accuracy with backend data

## 🔧 **Configuration**

### **Timer Intervals**
- **Duration Updates**: Every 60 seconds (1 minute)
- **Backend Sync**: Every 120 seconds (2 minutes)
- **Deduction Intervals**: Every 600 seconds (10 minutes)

### **UI Updates**
- **Real-Time**: Updates every minute
- **WebRTC Events**: Immediate updates on deduction
- **API Sync**: Periodic backend synchronization

## 📝 **Usage Notes**

- **Session Activation**: Timer starts only when session is activated (not when created)
- **Deduction Timing**: Deductions occur at 10, 20, 30, 40... minute marks
- **Backend Priority**: Backend deductions take precedence over frontend calculations
- **Error Handling**: Graceful fallback if backend sync fails
- **Cleanup**: Timers are properly cleaned up on component unmount

## 🎯 **Result**

The implementation provides a complete 10-minute session deduction system that:
- ✅ Deducts sessions every 10 minutes from activation
- ✅ Shows real-time session duration and deduction countdown
- ✅ Integrates with existing backend auto-deduction system
- ✅ Provides clear visual feedback to users
- ✅ Maintains accuracy through periodic backend synchronization
- ✅ Handles edge cases and error scenarios gracefully

This ensures patients have full transparency into their session usage while maintaining accurate billing through the existing backend infrastructure.
