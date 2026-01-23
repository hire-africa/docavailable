#!/usr/bin/env node

/**
 * SSL Certificate Verification Tool for DocAvailable WebRTC Services
 * Tests SSL certificate validity for wss:// endpoints
 */

const https = require('https');
const tls = require('tls');
const { URL } = require('url');

const ENDPOINTS = [
  {
    name: 'Call Signaling',
    url: 'https://docavailable.org/call-signaling',
    wss: 'wss://docavailable.org/call-signaling'
  },
  {
    name: 'Chat Signaling',
    url: 'https://docavailable.org/chat-signaling',
    wss: 'wss://docavailable.org/chat-signaling'
  },
  {
    name: 'Health Check',
    url: 'https://docavailable.org/webrtc-health',
    wss: null
  }
];

/**
 * Test SSL certificate for HTTPS endpoint
 */
function testSSLCertificate(urlString) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      rejectUnauthorized: true, // Enforce certificate validation
      agent: false
    };

    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate(true);
      
      resolve({
        success: true,
        statusCode: res.statusCode,
        certificate: {
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          fingerprint: cert.fingerprint,
          serialNumber: cert.serialNumber
        },
        connection: {
          authorized: res.socket.authorized,
          authorizationError: res.socket.authorizationError,
          protocol: res.socket.getProtocol(),
          cipher: res.socket.getCipher()
        }
      });
    });

    req.on('error', (error) => {
      reject({
        success: false,
        error: error.message,
        code: error.code,
        details: error.toString()
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject({
        success: false,
        error: 'Connection timeout',
        code: 'ETIMEDOUT'
      });
    });

    req.end();
  });
}

/**
 * Test SSL certificate using TLS socket directly
 */
function testTLSCertificate(hostname, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: hostname,
      port: port,
      servername: hostname, // CRITICAL: Use SNI (Server Name Indication) to match hostname
      rejectUnauthorized: true
    }, () => {
      const cert = socket.getPeerCertificate(true);
      const cipher = socket.getCipher();
      
      resolve({
        success: true,
        authorized: socket.authorized,
        certificate: {
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          fingerprint: cert.fingerprint,
          serialNumber: cert.serialNumber,
          subjectaltname: cert.subjectaltname
        },
        connection: {
          protocol: socket.getProtocol(),
          cipher: cipher.name,
          version: cipher.version
        }
      });
      
      socket.end();
    });

    socket.on('error', (error) => {
      reject({
        success: false,
        error: error.message,
        code: error.code,
        details: error.toString()
      });
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      reject({
        success: false,
        error: 'Connection timeout',
        code: 'ETIMEDOUT'
      });
    });
  });
}

/**
 * Check if certificate is expired or expiring soon
 */
function checkCertificateExpiry(validTo) {
  const expiryDate = new Date(validTo);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
  
  return {
    expired: expiryDate < now,
    expiresInDays: daysUntilExpiry,
    expiresIn: expiryDate.toISOString(),
    isExpiringSoon: daysUntilExpiry < 30
  };
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🔒 SSL Certificate Verification Tool\n');
  console.log('=' .repeat(60));
  
  for (const endpoint of ENDPOINTS) {
    console.log(`\n📋 Testing: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url || endpoint.wss}`);
    console.log('-'.repeat(60));
    
    try {
      // Test HTTPS endpoint if available
      if (endpoint.url) {
        console.log('🔍 Testing HTTPS endpoint...');
        const httpsResult = await testSSLCertificate(endpoint.url);
        
        if (httpsResult.success) {
          console.log('✅ HTTPS Connection: SUCCESS');
          console.log(`   Status Code: ${httpsResult.statusCode}`);
          console.log(`   Authorized: ${httpsResult.connection.authorized}`);
          console.log(`   Protocol: ${httpsResult.connection.protocol}`);
          console.log(`   Cipher: ${httpsResult.connection.cipher.name}`);
          
          console.log('\n📜 Certificate Details:');
          console.log(`   Subject: ${JSON.stringify(httpsResult.certificate.subject)}`);
          console.log(`   Issuer: ${JSON.stringify(httpsResult.certificate.issuer)}`);
          console.log(`   Valid From: ${httpsResult.certificate.validFrom}`);
          console.log(`   Valid To: ${httpsResult.certificate.validTo}`);
          console.log(`   Fingerprint: ${httpsResult.certificate.fingerprint}`);
          
          const expiry = checkCertificateExpiry(httpsResult.certificate.validTo);
          if (expiry.expired) {
            console.log(`   ⚠️  CERTIFICATE EXPIRED! Expired on: ${expiry.expiresIn}`);
          } else if (expiry.isExpiringSoon) {
            console.log(`   ⚠️  CERTIFICATE EXPIRING SOON! Expires in ${expiry.expiresInDays} days`);
          } else {
            console.log(`   ✅ Certificate valid for ${expiry.expiresInDays} more days`);
          }
          
          if (!httpsResult.connection.authorized) {
            console.log(`   ❌ Authorization Error: ${httpsResult.connection.authorizationError}`);
          }
        }
      }
      
      // Test TLS connection directly (with SNI)
      const url = new URL(endpoint.url || endpoint.wss);
      console.log(`\n🔍 Testing TLS connection to ${url.hostname}:${url.port || 443} (with SNI)...`);
      try {
        const tlsResult = await testTLSCertificate(url.hostname, url.port || 443);
        
        if (tlsResult.success) {
          console.log('✅ TLS Connection: SUCCESS');
          console.log(`   Authorized: ${tlsResult.authorized}`);
          console.log(`   Protocol: ${tlsResult.connection.protocol}`);
          console.log(`   Cipher: ${tlsResult.connection.cipher}`);
          
          if (!tlsResult.authorized) {
            console.log('   ❌ TLS connection not authorized - certificate validation failed');
          }
        }
      } catch (tlsError) {
        console.log('❌ TLS Connection Failed');
        console.log(`   Error: ${tlsError.error || tlsError.message}`);
        console.log(`   Code: ${tlsError.code || 'UNKNOWN'}`);
        
        if (tlsError.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
          console.log('   ⚠️  CRITICAL: CERTIFICATE HOSTNAME MISMATCH!');
          console.log('   ⚠️  The certificate is for a different domain than the one being accessed.');
          console.log('   ⚠️  This will cause SSL validation failures in React Native.');
          console.log('   ⚠️  SOLUTION: Update the certificate to include the correct domain or use the correct domain.');
        }
      }
      
    } catch (error) {
      console.log('❌ Connection Failed');
      console.log(`   Error: ${error.error || error.message}`);
      console.log(`   Code: ${error.code || 'UNKNOWN'}`);
      
      if (error.code === 'CERT_HAS_EXPIRED') {
        console.log('   ⚠️  CERTIFICATE HAS EXPIRED!');
      } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        console.log('   ⚠️  UNABLE TO VERIFY CERTIFICATE - Missing intermediate certificates');
      } else if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
        console.log('   ⚠️  SELF-SIGNED CERTIFICATE DETECTED');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  CONNECTION REFUSED - Server may be down');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('   ⚠️  CONNECTION TIMEOUT - Server may be unreachable');
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ SSL Certificate Verification Complete\n');
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
