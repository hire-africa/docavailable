# Comprehensive Session Deduction Test Script
$baseUrl = "https://docavailable-3vbdv.ondigitalocean.app/api"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SESSION DEDUCTION SYSTEM TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Login as Patient
Write-Host "[1/8] Authenticating Patient..." -ForegroundColor Yellow
$patientBody = '{"email":"zeemtoh99@gmail.com","password":"password123"}'
try {
    $patientResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method POST -Body $patientBody -ContentType "application/json"
    $patientToken = $patientResponse.token
    $patientId = $patientResponse.user.id
    Write-Host "      SUCCESS - Patient ID: $patientId" -ForegroundColor Green
} catch {
    Write-Host "      FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Login as Doctor
Write-Host "[2/8] Authenticating Doctor..." -ForegroundColor Yellow
$doctorBody = '{"email":"blacksleeky84@gmail.com","password":"000000009"}'
try {
    $doctorResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method POST -Body $doctorBody -ContentType "application/json"
    $doctorToken = $doctorResponse.token
    $doctorId = $doctorResponse.user.id
    Write-Host "      SUCCESS - Doctor ID: $doctorId" -ForegroundColor Green
} catch {
    Write-Host "      FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Get Initial Patient Subscription
Write-Host "[3/8] Checking Initial Patient Balance..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $patientToken"
        "Accept" = "application/json"
    }
    $subscription = Invoke-RestMethod -Uri "$baseUrl/subscription" -Method GET -Headers $headers
    $initialTextSessions = $subscription.text_sessions_remaining
    $initialVoiceCalls = $subscription.voice_calls_remaining
    $initialVideoCalls = $subscription.video_calls_remaining
    Write-Host "      Text Sessions: $initialTextSessions" -ForegroundColor Cyan
    Write-Host "      Voice Calls: $initialVoiceCalls" -ForegroundColor Cyan
    Write-Host "      Video Calls: $initialVideoCalls" -ForegroundColor Cyan
} catch {
    Write-Host "      FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $initialTextSessions = 0
    $initialVoiceCalls = 0
    $initialVideoCalls = 0
}

# Step 4: Get Initial Doctor Wallet
Write-Host "[4/8] Checking Initial Doctor Wallet..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $doctorToken"
        "Accept" = "application/json"
    }
    $wallet = Invoke-RestMethod -Uri "$baseUrl/wallet" -Method GET -Headers $headers
    $initialBalance = $wallet.balance
    $currency = $wallet.currency
    Write-Host "      Balance: $initialBalance $currency" -ForegroundColor Cyan
} catch {
    Write-Host "      FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $initialBalance = 0
    $currency = "USD"
}

# Step 5: Create Appointment
Write-Host "[5/8] Creating Test Appointment..." -ForegroundColor Yellow
$appointmentDate = (Get-Date).AddMinutes(5).ToString("yyyy-MM-dd")
$appointmentTime = (Get-Date).AddMinutes(5).ToString("HH:mm")
$appointmentBody = @{
    doctor_id = $doctorId
    appointment_date = $appointmentDate
    appointment_time = $appointmentTime
    appointment_type = "text"
    reason = "API Test - Session Deduction"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $patientToken"
        "Accept" = "application/json"
        "Content-Type" = "application/json"
    }
    $appointment = Invoke-RestMethod -Uri "$baseUrl/appointments" -Method POST -Body $appointmentBody -Headers $headers -ContentType "application/json"
    $appointmentId = $appointment.id
    Write-Host "      SUCCESS - Appointment ID: $appointmentId" -ForegroundColor Green
    Write-Host "      Scheduled: $appointmentDate $appointmentTime" -ForegroundColor Cyan
} catch {
    Write-Host "      FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "      Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# Step 6: Start Appointment Session
Write-Host "[6/8] Starting Appointment Session..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $patientToken"
        "Accept" = "application/json"
    }
    $startResponse = Invoke-RestMethod -Uri "$baseUrl/appointments/$appointmentId/start" -Method POST -Headers $headers
    Write-Host "      SUCCESS - Session Started" -ForegroundColor Green
    Write-Host "      Status: $($startResponse.data.status)" -ForegroundColor Cyan
} catch {
    Write-Host "      FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "      This is expected if time window validation is active" -ForegroundColor Yellow
}

# Step 7: End Appointment Session
Write-Host "[7/8] Ending Appointment Session..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $patientToken"
        "Accept" = "application/json"
    }
    $endResponse = Invoke-RestMethod -Uri "$baseUrl/appointments/$appointmentId/end" -Method POST -Headers $headers
    Write-Host "      SUCCESS - Session Ended" -ForegroundColor Green
} catch {
    Write-Host "      FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 8: Verify Final Balances
Write-Host "[8/8] Verifying Final Balances..." -ForegroundColor Yellow

# Check Patient Subscription
try {
    $headers = @{
        "Authorization" = "Bearer $patientToken"
        "Accept" = "application/json"
    }
    $finalSubscription = Invoke-RestMethod -Uri "$baseUrl/subscription" -Method GET -Headers $headers
    $finalTextSessions = $finalSubscription.text_sessions_remaining
    $textSessionsDeducted = $initialTextSessions - $finalTextSessions
    
    Write-Host "`n      PATIENT BALANCE:" -ForegroundColor Cyan
    Write-Host "      Before: $initialTextSessions sessions" -ForegroundColor White
    Write-Host "      After:  $finalTextSessions sessions" -ForegroundColor White
    Write-Host "      Deducted: $textSessionsDeducted sessions" -ForegroundColor $(if ($textSessionsDeducted -gt 0) { "Green" } else { "Red" })
} catch {
    Write-Host "      Failed to get final subscription" -ForegroundColor Red
}

# Check Doctor Wallet
try {
    $headers = @{
        "Authorization" = "Bearer $doctorToken"
        "Accept" = "application/json"
    }
    $finalWallet = Invoke-RestMethod -Uri "$baseUrl/wallet" -Method GET -Headers $headers
    $finalBalance = $finalWallet.balance
    $balanceIncrease = $finalBalance - $initialBalance
    
    Write-Host "`n      DOCTOR WALLET:" -ForegroundColor Cyan
    Write-Host "      Before: $initialBalance $currency" -ForegroundColor White
    Write-Host "      After:  $finalBalance $currency" -ForegroundColor White
    Write-Host "      Earned: $balanceIncrease $currency" -ForegroundColor $(if ($balanceIncrease -gt 0) { "Green" } else { "Red" })
} catch {
    Write-Host "      Failed to get final wallet" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
