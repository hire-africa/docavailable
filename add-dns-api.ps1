# PowerShell script to add DNS record via DigitalOcean API
# Replace YOUR_API_TOKEN with your actual DigitalOcean API token

$API_TOKEN = "YOUR_API_TOKEN"
$DOMAIN = "docavailable-3vbdv.ondigitalocean.app"
$SUBDOMAIN = "webrtc"
$IP_ADDRESS = "46.101.123.123"

Write-Host "🌐 Adding DNS record for WebRTC subdomain..." -ForegroundColor Green

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $API_TOKEN"
}

$body = @{
    type = "A"
    name = $SUBDOMAIN
    data = $IP_ADDRESS
    ttl = 3600
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.digitalocean.com/v2/domains/$DOMAIN/records" -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ DNS record created successfully!" -ForegroundColor Green
    Write-Host "Record ID: $($response.domain_record.id)" -ForegroundColor Cyan
    Write-Host "Name: $($response.domain_record.name)" -ForegroundColor Cyan
    Write-Host "Type: $($response.domain_record.type)" -ForegroundColor Cyan
    Write-Host "Data: $($response.domain_record.data)" -ForegroundColor Cyan
    Write-Host "TTL: $($response.domain_record.ttl)" -ForegroundColor Cyan
    
    Write-Host "`n⏱️ DNS propagation usually takes 5-15 minutes" -ForegroundColor Yellow
    Write-Host "🧪 Test with: nslookup webrtc.docavailable-3vbdv.ondigitalocean.app" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error creating DNS record:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "💡 Check your API token" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "💡 Check your domain name" -ForegroundColor Yellow
    }
}

Write-Host "`n📋 Manual setup instructions:" -ForegroundColor Cyan
Write-Host "1. Go to: https://cloud.digitalocean.com" -ForegroundColor White
Write-Host "2. Click 'Networking' → 'Domains'" -ForegroundColor White
Write-Host "3. Find '$DOMAIN'" -ForegroundColor White
Write-Host "4. Click 'Add Record'" -ForegroundColor White
Write-Host "5. Set Type: A, Name: $SUBDOMAIN, Value: $IP_ADDRESS" -ForegroundColor White
