#!/bin/bash

BASE_URL="http://172.20.10.11:8000/api"
APPOINTMENT_ID=11

echo "🧪 Testing Chat API Endpoints (Simple)..."
echo "========================================="
echo ""

# Test 1: Health check
echo "1. Testing health check..."
curl -s "$BASE_URL/health" | jq '.'
echo ""

# Test 2: Login as patient
echo "2. Logging in as patient..."
PATIENT_LOGIN=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usher@gmail.com",
    "password": "password123"
  }')

echo "Patient login response:"
echo "$PATIENT_LOGIN" | jq '.'
echo ""

# Extract patient token
PATIENT_TOKEN=$(echo "$PATIENT_LOGIN" | jq -r '.data.token')
echo "Patient token: $PATIENT_TOKEN"
echo ""

# Test 3: Get messages
echo "3. Testing get messages endpoint..."
curl -s -X GET "$BASE_URL/chat/$APPOINTMENT_ID/messages" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# Test 4: Send message
echo "4. Testing send message endpoint..."
curl -s -X POST "$BASE_URL/chat/$APPOINTMENT_ID/messages" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! This is a test message from curl."
  }' | jq '.'
echo ""

# Test 5: Get messages again
echo "5. Getting messages again..."
curl -s -X GET "$BASE_URL/chat/$APPOINTMENT_ID/messages" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# Test 6: Local storage endpoint
echo "6. Testing local storage endpoint..."
curl -s -X GET "$BASE_URL/chat/$APPOINTMENT_ID/local-storage" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# Test 7: Chat info endpoint
echo "7. Testing chat info endpoint..."
curl -s -X GET "$BASE_URL/chat/$APPOINTMENT_ID/info" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

echo "🎉 Chat API Endpoints Test Completed!" 