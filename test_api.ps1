# API Testing Script
$baseUrl = "https://docavailable-3vbdv.ondigitalocean.app/api"

Write-Host "=== Testing Session Deduction System ===" -ForegroundColor Cyan
Write-Host ""

# Login as Patient
Write-Host "1. Logging in as Patient..." -ForegroundColor Yellow
$patientBody = '{"email":"zeemtoh99@gmail.com","password":"password123"}'

try {
    $patientResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method POST -Body $patientBody -ContentType "application/json"
    $patientToken = $patientResponse.token
    Write-Host "   Patient logged in successfully" -ForegroundColor Green
    Write-Host "   Patient ID: $($patientResponse.user.id)" -ForegroundColor Cyan
} catch {
    Write-Host "   Patient login failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Login as Doctor
Write-Host "2. Logging in as Doctor..." -ForegroundColor Yellow
$doctorBody = '{"email":"blacksleeky84@gmail.com","password":"000000009"}'

try {
    $doctorResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method POST -Body $doctorBody -ContentType "application/json"
    $doctorToken = $doctorResponse.token
    Write-Host "   Doctor logged in successfully" -ForegroundColor Green
    Write-Host "   Doctor ID: $($doctorResponse.user.id)" -ForegroundColor Cyan
} catch {
    Write-Host "   Doctor login failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Get Patient Subscription
Write-Host "3. Checking Patient Subscription..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $patientToken"
        "Accept" = "application/json"
    }
    $subscription = Invoke-RestMethod -Uri "$baseUrl/subscription" -Method GET -Headers $headers
    Write-Host "   Subscription found" -ForegroundColor Green
    Write-Host "   Text Sessions: $($subscription.text_sessions_remaining)" -ForegroundColor Cyan
    Write-Host "   Voice Calls: $($subscription.voice_calls_remaining)" -ForegroundColor Cyan
    Write-Host "   Video Calls: $($subscription.video_calls_remaining)" -ForegroundColor Cyan
} catch {
    Write-Host "   Failed to get subscription" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Get Doctor Wallet
Write-Host "4. Checking Doctor Wallet..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $doctorToken"
        "Accept" = "application/json"
    }
    $wallet = Invoke-RestMethod -Uri "$baseUrl/wallet" -Method GET -Headers $headers
    Write-Host "   Wallet found" -ForegroundColor Green
    Write-Host "   Balance: $($wallet.balance)" -ForegroundColor Cyan
} catch {
    Write-Host "   Failed to get wallet" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Initial State Retrieved ===" -ForegroundColor Cyan
