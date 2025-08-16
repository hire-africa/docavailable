$headers = @{
    'Content-Type' = 'application/json'
}

$body = @{
    first_name = 'Test'
    last_name = 'User'
    email = 'test999@example.com'
    password = 'password123'
    password_confirmation = 'password123'
    user_type = 'patient'
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "https://docavailable-5.onrender.com/api/register" -Method POST -Headers $headers -Body $body
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
} 