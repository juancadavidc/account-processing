#!/bin/bash

# Bancolombia Balances - V2 SMS Webhook Test Script
# This script tests the new V2 structured webhook endpoint

# Configuration
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3000/api/v2/webhook/transaction}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-test-webhook-secret}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to generate unique webhook ID
generate_webhook_id() {
    echo "v2_webhook_$(date +%s)_$RANDOM"
}

# Function to get current timestamp in ISO format
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Function to send V2 webhook request
send_v2_webhook() {
    local source="$1"
    local source_from="$2"
    local source_to="$3"
    local event="$4"
    local message="$5"
    local amount="$6"
    local currency="${7:-COP}"
    local webhook_id="${8:-$(generate_webhook_id)}"
    local timestamp="${9:-$(get_timestamp)}"
    local account_number="${10:-}"
    local sender_name="${11:-}"
    
    echo -e "${BLUE}Sending V2 webhook request...${NC}"
    echo -e "Source: ${YELLOW}$source${NC}"
    echo -e "From: $source_from → To: $source_to"
    echo -e "Event: $event | Amount: $amount $currency"
    echo -e "Webhook ID: $webhook_id"
    echo -e "Message: ${YELLOW}$message${NC}"
    echo ""
    
    # Build metadata object
    local metadata=""
    if [[ -n "$account_number" || -n "$sender_name" ]]; then
        metadata=",\"metadata\":{"
        local metadata_parts=()
        [[ -n "$account_number" ]] && metadata_parts+=("\"accountNumber\":\"$account_number\"")
        [[ -n "$sender_name" ]] && metadata_parts+=("\"senderName\":\"$sender_name\"")
        metadata+=$(IFS=,; echo "${metadata_parts[*]}")
        metadata+="}"
    fi
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $WEBHOOK_SECRET" \
        -d "{
            \"source\": \"$source\",
            \"timestamp\": \"$timestamp\",
            \"sourceFrom\": \"$source_from\",
            \"sourceTo\": \"$source_to\",
            \"event\": \"$event\",
            \"message\": \"$message\",
            \"amount\": $amount,
            \"currency\": \"$currency\",
            \"webhookId\": \"$webhook_id\"$metadata
        }" \
        "$WEBHOOK_URL")
    
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    local status_code=$(echo "$response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    echo -e "${BLUE}Response (HTTP $status_code):${NC}"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    echo ""
    
    # Color code the result
    case $status_code in
        200) echo -e "${GREEN}✓ SUCCESS${NC}" ;;
        400) echo -e "${YELLOW}⚠ BAD REQUEST${NC}" ;;
        401) echo -e "${RED}✗ UNAUTHORIZED${NC}" ;;
        404) echo -e "${YELLOW}⚠ NO USERS FOR SOURCE${NC}" ;;
        500) echo -e "${RED}✗ SERVER ERROR${NC}" ;;
        *) echo -e "${RED}✗ UNKNOWN STATUS${NC}" ;;
    esac
    echo "----------------------------------------"
    echo ""
}

# Function to test valid V2 transactions
test_v2_valid_transactions() {
    echo -e "${GREEN}=== Testing Valid V2 Transactions ===${NC}"
    echo ""
    
    # Test case 1: Bancolombia email deposit
    send_v2_webhook \
        "bancolombia" \
        "bancolombia@noreply.com" \
        "jdcadavid96@gmail.com" \
        "deposit" \
        "Bancolombia: Recibiste una transferencia por \$190,000 de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06" \
        190000 \
        "COP" \
        "" \
        "" \
        "7251" \
        "MARIA CUBAQUE"
    
    # Test case 2: Nequi SMS deposit
    send_v2_webhook \
        "nequi" \
        "+573001234567" \
        "+573009876543" \
        "deposit" \
        "Nequi: Recibiste \$50,000 de JUAN PEREZ" \
        50000 \
        "COP" \
        "" \
        "" \
        "" \
        "JUAN PEREZ"
    
    # Test case 3: Large amount transfer
    send_v2_webhook \
        "bancolombia" \
        "bancolombia@noreply.com" \
        "test@example.com" \
        "transfer" \
        "Bancolombia: Transferiste \$1,500,000 a EMPRESA ABC LTDA desde tu cuenta **9876" \
        1500000 \
        "COP" \
        "" \
        "" \
        "9876" \
        "EMPRESA ABC LTDA"
        
    # Test case 4: Daviplata transaction
    send_v2_webhook \
        "daviplata" \
        "daviplata@notification.com" \
        "user@business.com" \
        "deposit" \
        "Daviplata: Recibiste \$75,000 por pago de servicios" \
        75000 \
        "COP"
}

# Function to test invalid V2 transactions
test_v2_invalid_transactions() {
    echo -e "${YELLOW}=== Testing Invalid V2 Transactions ===${NC}"
    echo ""
    
    # Test case 1: Missing required fields
    echo -e "${BLUE}Testing missing amount field...${NC}"
    curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $WEBHOOK_SECRET" \
        -d "{
            \"source\": \"bancolombia\",
            \"timestamp\": \"$(get_timestamp)\",
            \"sourceFrom\": \"bancolombia@noreply.com\",
            \"sourceTo\": \"test@example.com\",
            \"event\": \"deposit\",
            \"message\": \"Test message without amount\",
            \"webhookId\": \"$(generate_webhook_id)\"
        }" \
        "$WEBHOOK_URL" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq . 2>/dev/null
    echo ""
    
    # Test case 2: Invalid event type
    send_v2_webhook \
        "bancolombia" \
        "bancolombia@noreply.com" \
        "test@example.com" \
        "invalid_event" \
        "Test message with invalid event" \
        100000
    
    # Test case 3: Invalid amount (negative)
    send_v2_webhook \
        "bancolombia" \
        "bancolombia@noreply.com" \
        "test@example.com" \
        "deposit" \
        "Test message with negative amount" \
        -50000
    
    # Test case 4: Invalid source format
    send_v2_webhook \
        "INVALID SOURCE!" \
        "bancolombia@noreply.com" \
        "test@example.com" \
        "deposit" \
        "Test message with invalid source name" \
        100000
}

# Function to test V2 authentication
test_v2_authentication() {
    echo -e "${RED}=== Testing V2 Authentication ===${NC}"
    echo ""
    
    echo -e "${BLUE}Testing without authorization header...${NC}"
    curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"source\": \"bancolombia\",
            \"timestamp\": \"$(get_timestamp)\",
            \"sourceFrom\": \"bancolombia@noreply.com\",
            \"sourceTo\": \"test@example.com\",
            \"event\": \"deposit\",
            \"message\": \"Test message\",
            \"amount\": 100000,
            \"webhookId\": \"$(generate_webhook_id)\"
        }" \
        "$WEBHOOK_URL" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq . 2>/dev/null
    echo ""
    
    echo -e "${BLUE}Testing with invalid token...${NC}"
    curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer invalid-token" \
        -d "{
            \"source\": \"bancolombia\",
            \"timestamp\": \"$(get_timestamp)\",
            \"sourceFrom\": \"bancolombia@noreply.com\",
            \"sourceTo\": \"test@example.com\",
            \"event\": \"deposit\",
            \"message\": \"Test message\",
            \"amount\": 100000,
            \"webhookId\": \"$(generate_webhook_id)\"
        }" \
        "$WEBHOOK_URL" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq . 2>/dev/null
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Function to test V2 duplicate detection
test_v2_duplicate_detection() {
    echo -e "${PURPLE}=== Testing V2 Duplicate Detection ===${NC}"
    echo ""
    
    local webhook_id=$(generate_webhook_id)
    
    echo -e "${BLUE}Sending first request...${NC}"
    send_v2_webhook \
        "bancolombia" \
        "bancolombia@noreply.com" \
        "duplicate-test@example.com" \
        "deposit" \
        "Bancolombia: Test duplicate detection \$75,000" \
        75000 \
        "COP" \
        "$webhook_id"
    
    echo -e "${BLUE}Sending duplicate request (same webhookId)...${NC}"
    send_v2_webhook \
        "bancolombia" \
        "bancolombia@noreply.com" \
        "duplicate-test@example.com" \
        "deposit" \
        "Bancolombia: Test duplicate detection \$75,000" \
        75000 \
        "COP" \
        "$webhook_id"
}

# Function to test V2 health endpoint
test_v2_health() {
    echo -e "${PURPLE}=== Testing V2 Health Endpoint ===${NC}"
    echo ""
    
    echo -e "${BLUE}Testing GET health check...${NC}"
    curl -s "$WEBHOOK_URL" | jq . 2>/dev/null || curl -s "$WEBHOOK_URL"
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Function to display help
show_help() {
    echo "Bancolombia Balances - V2 SMS Webhook Test Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo "  -u, --url URL        Set webhook URL (default: $WEBHOOK_URL)"
    echo "  -s, --secret SECRET  Set webhook secret (default: from WEBHOOK_SECRET env var)"
    echo "  -v, --valid          Test only valid V2 transactions"
    echo "  -i, --invalid        Test only invalid V2 transactions"
    echo "  -a, --auth           Test only authentication"
    echo "  -d, --duplicate      Test only duplicate detection"
    echo "  --health             Test only health endpoint"
    echo ""
    echo "Environment Variables:"
    echo "  WEBHOOK_SECRET       Webhook authentication secret"
    echo "  WEBHOOK_URL          V2 webhook endpoint URL"
    echo ""
    echo "Examples:"
    echo "  $0                   # Run all tests"
    echo "  $0 -v                # Test only valid V2 transactions"
    echo "  $0 --health          # Test health endpoint"
    echo "  WEBHOOK_SECRET=mysecret $0  # Use custom secret"
}

# Main execution
main() {
    # Check if jq is available for JSON formatting
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Warning: jq not found. JSON responses will not be formatted.${NC}"
        echo ""
    fi
    
    echo -e "${GREEN}Bancolombia Balances - V2 Webhook Test${NC}"
    echo -e "${BLUE}Webhook URL: $WEBHOOK_URL${NC}"
    echo -e "${BLUE}Using Secret: ${WEBHOOK_SECRET:0:10}...${NC}"
    echo ""
    
    case "${1:-all}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--valid)
            test_v2_valid_transactions
            ;;
        -i|--invalid)
            test_v2_invalid_transactions
            ;;
        -a|--auth)
            test_v2_authentication
            ;;
        -d|--duplicate)
            test_v2_duplicate_detection
            ;;
        --health)
            test_v2_health
            ;;
        -u|--url)
            WEBHOOK_URL="$2"
            shift 2
            main "$@"
            ;;
        -s|--secret)
            WEBHOOK_SECRET="$2"
            shift 2
            main "$@"
            ;;
        all|*)
            test_v2_health
            test_v2_valid_transactions
            test_v2_invalid_transactions
            test_v2_authentication
            test_v2_duplicate_detection
            ;;
    esac
}

# Run main function with all arguments
main "$@"