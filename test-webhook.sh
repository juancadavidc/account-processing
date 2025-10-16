#!/bin/bash

# Bancolombia Balances - SMS Webhook Test Script
# This script simulates incoming SMS messages to test the webhook endpoint E2E

# Configuration
WEBHOOK_URL="http://localhost:3000/api/webhook/sms"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-test-webhook-secret}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate unique webhook ID
generate_webhook_id() {
    echo "webhook_$(date +%s)_$RANDOM"
}

# Function to get current timestamp in ISO format
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Function to send webhook request
send_webhook() {
    local message="$1"
    local phone="${2:-+573001234567}"
    local webhook_id="${3:-$(generate_webhook_id)}"
    local timestamp="${4:-$(get_timestamp)}"
    
    echo -e "${BLUE}Sending webhook request...${NC}"
    echo -e "Message: ${YELLOW}$message${NC}"
    echo -e "Phone: $phone"
    echo -e "Webhook ID: $webhook_id"
    echo -e "Timestamp: $timestamp"
    echo ""
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $WEBHOOK_SECRET" \
        -d "{
            \"message\": \"$message\",
            \"timestamp\": \"$timestamp\",
            \"phone\": \"$phone\",
            \"webhookId\": \"$webhook_id\"
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
        500) echo -e "${RED}✗ SERVER ERROR${NC}" ;;
        *) echo -e "${RED}✗ UNKNOWN STATUS${NC}" ;;
    esac
    echo "----------------------------------------"
    echo ""
}

# Function to test valid SMS messages
test_valid_messages() {
    echo -e "${GREEN}=== Testing Valid SMS Messages ===${NC}"
    echo ""
    
    # Test case 1: Standard transfer message
    #send_webhook "Bancolombia: Recibiste una transferencia por \$190,000 de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06"
    
    # Test case 2: Different amount and sender
    #send_webhook "Bancolombia: Recibiste una transferencia por \$50,500 de JUAN PEREZ en tu cuenta **1234, el 05/09/2025 a las 14:30"
    
    # Test case 3: Large amount
    send_webhook "Bancolombia: Recibiste una transferencia por \$1,500,000 de EMPRESA ABC LTDA en tu cuenta **9876, el 06/09/2025 a las 09:15"
    
    # Test case 4: Small amount
    #send_webhook "Bancolombia: Recibiste una transferencia por \$25,000 de ANA RODRIGUEZ en tu cuenta **5555, el 06/09/2025 a las 16:45"
}

# Function to test invalid SMS messages
test_invalid_messages() {
    echo -e "${YELLOW}=== Testing Invalid SMS Messages ===${NC}"
    echo ""
    
    # Test case 1: Non-Bancolombia message
    send_webhook "Nequi: Recibiste \$100,000 de PEDRO LOPEZ"
    
    # Test case 2: Missing amount
    send_webhook "Bancolombia: Recibiste una transferencia de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06"
    
    # Test case 3: Invalid date format
    send_webhook "Bancolombia: Recibiste una transferencia por \$50,000 de JUAN PEREZ en tu cuenta **1234, el 32/13/2025 a las 25:70"
    
    # Test case 4: Completely unrelated message
    send_webhook "Hello, this is not a banking SMS message at all"
}

# Function to test authentication
test_authentication() {
    echo -e "${RED}=== Testing Authentication ===${NC}"
    echo ""
    
    echo -e "${BLUE}Testing without authorization header...${NC}"
    curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"message\": \"Bancolombia: Recibiste una transferencia por \$100,000 de TEST USER en tu cuenta **1234, el 06/09/2025 a las 10:00\",
            \"timestamp\": \"$(get_timestamp)\",
            \"phone\": \"+573001234567\",
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
            \"message\": \"Bancolombia: Recibiste una transferencia por \$100,000 de TEST USER en tu cuenta **1234, el 06/09/2025 a las 10:00\",
            \"timestamp\": \"$(get_timestamp)\",
            \"phone\": \"+573001234567\",
            \"webhookId\": \"$(generate_webhook_id)\"
        }" \
        "$WEBHOOK_URL" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq . 2>/dev/null
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Function to test duplicate detection
test_duplicate_detection() {
    echo -e "${BLUE}=== Testing Duplicate Detection ===${NC}"
    echo ""
    
    local webhook_id=$(generate_webhook_id)
    local message="Bancolombia: Recibiste una transferencia por \$75,000 de DUPLICATE TEST en tu cuenta **9999, el 06/09/2025 a las 12:00"
    
    echo -e "${BLUE}Sending first request...${NC}"
    send_webhook "$message" "+573001234567" "$webhook_id"
    
    echo -e "${BLUE}Sending duplicate request (same webhookId)...${NC}"
    send_webhook "$message" "+573001234567" "$webhook_id"
}

# Function to display help
show_help() {
    echo "Bancolombia Balances - SMS Webhook Test Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo "  -u, --url URL        Set webhook URL (default: $WEBHOOK_URL)"
    echo "  -s, --secret SECRET  Set webhook secret (default: from WEBHOOK_SECRET env var)"
    echo "  -v, --valid          Test only valid messages"
    echo "  -i, --invalid        Test only invalid messages"
    echo "  -a, --auth           Test only authentication"
    echo "  -d, --duplicate      Test only duplicate detection"
    echo "  -c, --custom MESSAGE Test custom SMS message"
    echo ""
    echo "Environment Variables:"
    echo "  WEBHOOK_SECRET       Webhook authentication secret"
    echo ""
    echo "Examples:"
    echo "  $0                   # Run all tests"
    echo "  $0 -v                # Test only valid messages"
    echo "  $0 -c \"Custom SMS\"   # Test custom message"
    echo "  WEBHOOK_SECRET=mysecret $0  # Use custom secret"
}

# Main execution
main() {
    # Check if jq is available for JSON formatting
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Warning: jq not found. JSON responses will not be formatted.${NC}"
        echo ""
    fi
    
    echo -e "${GREEN}Bancolombia Balances - SMS Webhook E2E Test${NC}"
    echo -e "${BLUE}Webhook URL: $WEBHOOK_URL${NC}"
    echo -e "${BLUE}Using Secret: ${WEBHOOK_SECRET:0:10}...${NC}"
    echo ""
    
    case "${1:-all}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--valid)
            test_valid_messages
            ;;
        -i|--invalid)
            test_invalid_messages
            ;;
        -a|--auth)
            test_authentication
            ;;
        -d|--duplicate)
            test_duplicate_detection
            ;;
        -c|--custom)
            if [ -z "$2" ]; then
                echo -e "${RED}Error: Custom message not provided${NC}"
                exit 1
            fi
            send_webhook "$2"
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
            test_valid_messages
            test_invalid_messages
            test_authentication
            test_duplicate_detection
            ;;
    esac
}

# Run main function with all arguments
main "$@"