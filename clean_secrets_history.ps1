# Script to clean secrets from git history
Write-Host "🧹 Cleaning secrets from git history..."

# Set environment variable to suppress filter-branch warning
$env:FILTER_BRANCH_SQUELCH_WARNING = "1"

# Use git filter-branch to replace secrets in commit history
Write-Host "Replacing Google OAuth Client ID..."
git filter-branch --force --tree-filter "if (Test-Path '.do/app.yaml') { (Get-Content '.do/app.yaml') -replace '584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv\.apps\.googleusercontent\.com', '`${GOOGLE_CLIENT_ID}' | Set-Content '.do/app.yaml' }" -- 80b366a..HEAD

Write-Host "Replacing Google OAuth Client Secret..."
git filter-branch --force --tree-filter "if (Test-Path '.do/app.yaml') { (Get-Content '.do/app.yaml') -replace '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', '`${GOOGLE_CLIENT_SECRET}' | Set-Content '.do/app.yaml' }" -- 80b366a..HEAD

Write-Host "Replacing OpenAI API Key..."
git filter-branch --force --tree-filter "if (Test-Path '.do/app.yaml') { (Get-Content '.do/app.yaml') -replace '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', '`${OPENAI_API_KEY}' | Set-Content '.do/app.yaml' }" -- 80b366a..HEAD

Write-Host "Replacing secrets in backend/.env.example..."
git filter-branch --force --tree-filter "if (Test-Path 'backend/.env.example') { (Get-Content 'backend/.env.example') -replace '584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv\.apps\.googleusercontent\.com', 'your_google_client_id_here' | Set-Content 'backend/.env.example'; (Get-Content 'backend/.env.example') -replace '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', 'your_google_client_secret_here' | Set-Content 'backend/.env.example' }" -- 80b366a..HEAD

Write-Host "Replacing secrets in config/googleOAuth.ts..."
git filter-branch --force --tree-filter "if (Test-Path 'config/googleOAuth.ts') { (Get-Content 'config/googleOAuth.ts') -replace '584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv\.apps\.googleusercontent\.com', 'your_google_client_id_here' | Set-Content 'config/googleOAuth.ts'; (Get-Content 'config/googleOAuth.ts') -replace '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', 'your_google_client_secret_here' | Set-Content 'config/googleOAuth.ts' }" -- 80b366a..HEAD

Write-Host "✅ Secrets cleaned from git history!"
Write-Host "Now force pushing the cleaned history..."
git push origin main --force

Write-Host "🎉 Git history cleaned and pushed successfully!"

