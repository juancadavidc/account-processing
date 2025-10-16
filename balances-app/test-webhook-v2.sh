#!/bin/bash

# V2 Webhook Test Script
# Tests the new V2 webhook endpoint with structured payloads and multi-user support

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
WEBHOOK_ENDPOINT="$BASE_URL/api/v2/webhook/transaction"
WEBHOOK_SECRET="test-webhook-secret"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Test counter
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Function to print test headers
print_test() {
    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "\n${BLUE}=== Test $TEST_COUNT: $1 ===${NC}"
}

# Function to print success
print_success() {
    PASS_COUNT=$((PASS_COUNT + 1))
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo -e "${RED}❌ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if server is running
check_server() {
    print_test "Server Connectivity"
    
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200\|404\|302"; then
        print_success "Server is running at $BASE_URL"
        return 0
    else
        print_error "Server is not running at $BASE_URL"
        print_info "Please start the development server with: npm run dev"
        exit 1
    fi
}

# Function to send webhook request
send_webhook() {
    local payload="$1"
    local description="$2"
    local expected_status="${3:-200}"
    
    echo "Sending payload: $payload"
    
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $WEBHOOK_SECRET" \
        -d "$payload" \
        "$WEBHOOK_ENDPOINT")
    
    local body=$(echo "$response" | head -n -1)
    local status_code=$(echo "$response" | tail -n 1)
    
    echo "Response status: $status_code"
    echo "Response body: $body"
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description - Status: $status_code"
        return 0
    else
        print_error "$description - Expected: $expected_status, Got: $status_code"
        return 1
    fi
}

# Test 1: Basic Bancolombia Transaction
test_bancolombia_transaction() {
    print_test "Bancolombia Transaction"
    
    local payload='{
        "source": "bancolombia",
        "timestamp": "'$TIMESTAMP'",
        "sourceFrom": "bancolombia@noreply.com",
        "sourceTo": "jdcadavid96@gmail.com",
        "event": "deposit",
        "message": "Bancolombia: Recibiste una transferencia por $250,000 de CARLOS MENDEZ en tu cuenta **7251, el 16/10/2025 a las 14:30",
        "amount": 250000,
        "currency": "COP",
        "webhookId": "test_bancolombia_'$(date +%s)'",
        "metadata": {
            "accountNumber": "7251",
            "senderName": "CARLOS MENDEZ"
        }
    }'
    
    send_webhook "$payload" "Bancolombia transaction"
}

# Test 2: Nequi Transaction
test_nequi_transaction() {
    print_test "Nequi Transaction"
    
    local payload='{
        "source": "nequi",
        "timestamp": "'$TIMESTAMP'",
        "sourceFrom": "nequi@noreply.com",
        "sourceTo": "user@business.com",
        "event": "deposit",
        "message": "Nequi: Recibiste $75,000 de ANA LOPEZ",
        "amount": 75000,
        "currency": "COP",
        "webhookId": "test_nequi_'$(date +%s)'",
        "metadata": {
            "senderName": "ANA LOPEZ"
        }
    }'
    
    send_webhook "$payload" "Nequi transaction"
}

# Test 3: Custom Business Transaction
test_custom_transaction() {
    print_test "Custom Business Transaction"
    
    local payload='{
        "source": "business-system",
        "timestamp": "'$TIMESTAMP'",
        "sourceFrom": "payments@business.com",
        "sourceTo": "test@example.com",
        "event": "deposit",
        "message": "Payment received from customer #12345",
        "amount": 500000,
        "currency": "COP",
        "webhookId": "test_business_'$(date +%s)'",
        "metadata": {
            "customerId": "12345",
            "invoiceId": "INV-2025-001",
            "paymentMethod": "bank_transfer"
        }
    }'
    
    send_webhook "$payload" "Custom business transaction"
}

# Test 4: Withdrawal Transaction
test_withdrawal_transaction() {
    print_test "Withdrawal Transaction"
    
    local payload='{
        "source": "atm-network",
        "timestamp": "'$TIMESTAMP'",
        "sourceFrom": "atm@bank.com",
        "sourceTo": "jdcadavid96@gmail.com",
        "event": "withdrawal",
        "message": "ATM Withdrawal: $100,000 from ATM #A1234",
        "amount": 100000,
        "currency": "COP",
        "webhookId": "test_withdrawal_'$(date +%s)'",
        "metadata": {
            "atmId": "A1234",
            "location": "Centro Comercial"
        }
    }'
    
    send_webhook "$payload" "Withdrawal transaction"
}

# Test 5: Duplicate Transaction (should be rejected)
test_duplicate_transaction() {
    print_test "Duplicate Transaction Detection"
    
    local webhook_id="duplicate_test_$(date +%s)"
    
    local payload='{
        "source": "test-system",
        "timestamp": "'$TIMESTAMP'",
        "sourceFrom": "test@test.com",
        "sourceTo": "duplicate-test@example.com",
        "event": "deposit",
        "message": "First transaction with duplicate ID",
        "amount": 10000,
        "currency": "COP",
        "webhookId": "'$webhook_id'",
        "metadata": {}
    }'
    
    # Send first transaction (should succeed)
    if send_webhook "$payload" "First transaction"; then
        # Send duplicate (should fail or return different status)
        local duplicate_payload='{
            "source": "test-system",
            "timestamp": "'$TIMESTAMP'",
            "sourceFrom": "test@test.com",
            "sourceTo": "duplicate-test@example.com",
            "event": "deposit",
            "message": "Duplicate transaction with same ID",
            "amount": 20000,
            "currency": "COP",
            "webhookId": "'$webhook_id'",
            "metadata": {}
        }'
        
        echo "Sending duplicate transaction..."
        send_webhook "$duplicate_payload" "Duplicate transaction (should be handled gracefully)" "200"
    fi
}

# Test 6: Invalid Authentication
test_invalid_auth() {
    print_test "Invalid Authentication"
    
    local payload='{
        "source": "test",
        "timestamp": "'$TIMESTAMP'",
        "sourceFrom": "test@test.com",
        "sourceTo": "test@example.com",
        "event": "deposit",
        "message": "Should fail auth",
        "amount": 1000,
        "currency": "COP",
        "webhookId": "auth_test_'$(date +%s)'",
        "metadata": {}
    }'
    
    echo "Sending payload with invalid auth: $payload"
    
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer invalid-secret" \
        -d "$payload" \
        "$WEBHOOK_ENDPOINT")
    
    local status_code=$(echo "$response" | tail -n 1)
    
    if [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
        print_success "Invalid auth correctly rejected - Status: $status_code"
    else
        print_error "Invalid auth should return 401/403, got: $status_code"
    fi
}

# Test 7: Missing Required Fields
test_missing_fields() {
    print_test "Missing Required Fields"
    
    local payload='{
        "source": "test",
        "timestamp": "'$TIMESTAMP'",
        "event": "deposit",
        "amount": 1000,
        "currency": "COP"
    }'
    
    echo "Sending payload with missing fields: $payload"
    
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $WEBHOOK_SECRET" \
        -d "$payload" \
        "$WEBHOOK_ENDPOINT")
    
    local status_code=$(echo "$response" | tail -n 1)
    
    if [ "$status_code" = "400" ]; then
        print_success "Missing fields correctly rejected - Status: $status_code"
    else
        print_error "Missing fields should return 400, got: $status_code"
    fi
}

# Test 8: Large Amount Transaction
test_large_amount() {
    print_test "Large Amount Transaction"
    
    local payload='{
        "source": "high-value-system",
        "timestamp": "'$TIMESTAMP'",
        "sourceFrom": "corporate@bank.com",
        "sourceTo": "user@business.com",
        "event": "deposit",
        "message": "Large corporate payment received",
        "amount": 50000000,
        "currency": "COP",
        "webhookId": "large_amount_'$(date +%s)'",
        "metadata": {
            "type": "corporate_payment",
            "reference": "CORP-2025-10-16-001"
        }
    }'
    
    send_webhook "$payload" "Large amount transaction"
}

# Function to run all tests
run_all_tests() {
    echo -e "${BLUE}🚀 Starting V2 Webhook Test Suite${NC}"
    echo -e "${BLUE}Endpoint: $WEBHOOK_ENDPOINT${NC}"
    echo -e "${BLUE}Timestamp: $TIMESTAMP${NC}\n"
    
    # Check server first
    check_server
    
    # Run all tests
    test_bancolombia_transaction
    test_nequi_transaction
    test_custom_transaction
    test_withdrawal_transaction
    test_duplicate_transaction
    test_invalid_auth
    test_missing_fields
    test_large_amount
    
    # Print summary
    echo -e "\n${BLUE}=== Test Summary ===${NC}"
    echo -e "Total Tests: $TEST_COUNT"
    echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
    echo -e "${RED}Failed: $FAIL_COUNT${NC}"
    
    if [ $FAIL_COUNT -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed. Check the output above.${NC}"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "V2 Webhook Test Script"
    echo "Usage: $0 [test_name|all]"
    echo ""
    echo "Available tests:"
    echo "  bancolombia     - Test Bancolombia transaction"
    echo "  nequi          - Test Nequi transaction"
    echo "  custom         - Test custom business transaction"
    echo "  withdrawal     - Test withdrawal transaction"
    echo "  duplicate      - Test duplicate detection"
    echo "  auth           - Test invalid authentication"
    echo "  missing        - Test missing required fields"
    echo "  large          - Test large amount transaction"
    echo "  all            - Run all tests (default)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 all               # Run all tests"
    echo "  $0 bancolombia       # Run only Bancolombia test"
    echo "  $0 duplicate         # Run only duplicate detection test"
}

# Main execution
case "${1:-all}" in
    "bancolombia")
        check_server
        test_bancolombia_transaction
        ;;
    "nequi")
        check_server
        test_nequi_transaction
        ;;
    "custom")
        check_server
        test_custom_transaction
        ;;
    "withdrawal")
        check_server
        test_withdrawal_transaction
        ;;
    "duplicate")
        check_server
        test_duplicate_transaction
        ;;
    "auth")
        check_server
        test_invalid_auth
        ;;
    "missing")
        check_server
        test_missing_fields
        ;;
    "large")
        check_server
        test_large_amount
        ;;
    "all")
        run_all_tests
        ;;
    "-h"|"--help"|"help")
        show_usage
        ;;
    *)
        echo "Unknown test: $1"
        show_usage
        exit 1
        ;;
esac