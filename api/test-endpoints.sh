#!/bin/bash
# Okosfoci API Endpoint Testing Script
# This script tests all API endpoints and validates responses

set -e

BASE_URL="http://localhost:8081"
FAILED=0
PASSED=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================="
echo "Okosfoci API Endpoint Testing"
echo "============================================="
echo ""

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_field="$3"
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$BASE_URL$url")
    
    # Check if response contains expected field
    if echo "$response" | grep -q "\"$expected_field\""; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Response: $response"
        ((FAILED++))
    fi
}

# Helper function to test error case
test_error() {
    local name="$1"
    local url="$2"
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$BASE_URL$url")
    
    # Check if response contains error and is JSON (not HTML)
    if echo "$response" | grep -q '"ok":false' && echo "$response" | grep -q '"error"' && ! echo "$response" | grep -q '<!DOCTYPE'; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Response: $response"
        ((FAILED++))
    fi
}

echo "1. Testing Basic Endpoints"
echo "-------------------------------------------"
test_endpoint "GET /status" "/status" "ok"
test_endpoint "GET /windows" "/windows" "windows"
test_endpoint "GET /limits" "/limits" "limits"
test_endpoint "GET /tippek (default)" "/tippek" "tips"

echo ""
echo "2. Testing Parameter Validation"
echo "-------------------------------------------"
test_error "Invalid date format" "/tippek?date=invalid"
test_error "Invalid time window" "/tippek?timeWindow=invalid"
test_error "Invalid limit" "/tippek?limit=99"

echo ""
echo "3. Testing Valid Parameters"
echo "-------------------------------------------"
test_endpoint "Valid date parameter" "/tippek?date=2025-12-14" "tips"
test_endpoint "Valid time window" "/tippek?timeWindow=8-16" "tips"
test_endpoint "Valid limit" "/tippek?limit=3" "tips"
test_endpoint "All parameters" "/tippek?date=2025-12-14&timeWindow=all&limit=6" "tips"

echo ""
echo "4. Testing Error Handling"
echo "-------------------------------------------"
test_error "404 Not Found" "/nonexistent"
test_error "404 returns JSON, not HTML" "/random-endpoint"

echo ""
echo "5. Testing CORS"
echo "-------------------------------------------"
echo -n "CORS headers present... "
cors_header=$(curl -s -I "$BASE_URL/windows" | grep -i "access-control-allow-origin" | grep "*")
if [ -n "$cors_header" ]; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC}"
    ((FAILED++))
fi

echo ""
echo "6. Testing APK User Flow"
echo "-------------------------------------------"
echo -n "Step 1: Get windows... "
windows=$(curl -s "$BASE_URL/windows")
if echo "$windows" | grep -q '"windows"'; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC}"
    ((FAILED++))
fi

echo -n "Step 2: Get limits... "
limits=$(curl -s "$BASE_URL/limits")
if echo "$limits" | grep -q '"limits"'; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC}"
    ((FAILED++))
fi

echo -n "Step 3: Get tips with parameters... "
tips=$(curl -s "$BASE_URL/tippek?timeWindow=8-16&limit=6")
if echo "$tips" | grep -q '"tips"'; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC}"
    ((FAILED++))
fi

echo ""
echo "============================================="
echo "Test Results:"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "============================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
