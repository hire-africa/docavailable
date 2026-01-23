# 🔒 SSL Certificate Renewal Fix

## Problem

You renewed the SSL certificate 2 days ago, but the server is still serving a certificate for `usemaganyu.com` instead of `docavailable.org`.

## Diagnosis

The test shows:
- **Certificate being served:** `usemaganyu.com`
- **Domain being accessed:** `docavailable.org`
- **Error:** `ERR_TLS_CERT_ALTNAME_INVALID`

This means either:
1. The certificate file at `/etc/letsencrypt/live/docavailable.org/fullchain.pem` is for the wrong domain
2. Nginx is not using the correct certificate file
3. The certificate was renewed but nginx wasn't reloaded

## Solution Steps

### Step 1: Check Current Certificate

SSH into your server and run:
```bash
# Check what certificate is in the file
sudo openssl x509 -in /etc/letsencrypt/live/docavailable.org/fullchain.pem -noout -subject -issuer -dates

# Check what certificate is actually being served
echo | openssl s_client -servername docavailable.org -connect docavailable.org:443 2>/dev/null | openssl x509 -noout -subject
```

### Step 2: Reissue Certificate for docavailable.org

If the certificate is wrong, reissue it:
```bash
# Stop nginx temporarily (if needed)
sudo systemctl stop nginx

# Reissue certificate
sudo certbot certonly --standalone -d docavailable.org

# Or if using nginx plugin:
sudo certbot certonly --nginx -d docavailable.org
```

### Step 3: Verify Certificate Files

Check that the certificate is correct:
```bash
# Check certificate subject
sudo openssl x509 -in /etc/letsencrypt/live/docavailable.org/fullchain.pem -noout -subject

# Should show: subject=CN = docavailable.org
```

### Step 4: Verify Nginx Configuration

Check that nginx is using the correct certificate:
```bash
# Check nginx config
sudo nginx -t

# Check which config file is active
sudo ls -la /etc/nginx/sites-enabled/

# Verify the active config has:
# ssl_certificate /etc/letsencrypt/live/docavailable.org/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/docavailable.org/privkey.pem;
```

### Step 5: Reload Nginx

After fixing, reload nginx:
```bash
# Test configuration
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx

# Or restart if reload doesn't work
sudo systemctl restart nginx
```

### Step 6: Verify Fix

Run the test again:
```bash
node test-ssl-certificate.js
```

You should see:
- ✅ Certificate matches `docavailable.org`
- ✅ No `ERR_TLS_CERT_ALTNAME_INVALID` errors

## Quick Fix Script

If you have SSH access, you can run this diagnostic script on the server:

```bash
# Upload and run the diagnostic script
chmod +x scripts/check-ssl-certificate.sh
./scripts/check-ssl-certificate.sh
```

## Common Issues

### Issue 1: Certificate exists but nginx not using it
**Solution:** Check nginx config and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Issue 2: Certificate was renewed but for wrong domain
**Solution:** Reissue certificate:
```bash
sudo certbot certonly --nginx -d docavailable.org
sudo systemctl reload nginx
```

### Issue 3: Multiple nginx configs conflicting
**Solution:** Check which config is active:
```bash
sudo ls -la /etc/nginx/sites-enabled/
# Make sure only one config for docavailable.org is active
```

## After Fixing

1. ✅ Run `node test-ssl-certificate.js` - should pass
2. ✅ Rebuild preview build
3. ✅ Test WebRTC in preview build
4. ✅ Messages should send instantly (no 3-5 second delay)
5. ✅ Voice notes and images should work
6. ✅ Calls should have audio/video
