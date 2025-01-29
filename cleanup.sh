#!/bin/bash

# cleanup-workflows.sh
echo "🧹 Starting workflow cleanup process..."

# Colors for better logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to confirm action
confirm() {
    read -r -p "⚠️  $1 [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            true
            ;;
        *)
            false
            ;;
    esac
}

# Function to log API responses
log_api_response() {
    local response=$1
    local http_code=$2
    local operation=$3

    echo -e "${YELLOW}API Response for $operation:${NC}"
    echo "Status Code: $http_code"
    echo "Response Body:"
    echo "$response" | jq '.' || echo "$response"
    echo "----------------------------------------"
}

# Check if conductor is running
echo "Checking Conductor API availability..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/health)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}❌ Conductor API is not available.${NC}"
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

echo -e "${GREEN}✅ Conductor API is available${NC}"

# Get and display current workflows
echo -e "\n📋 Current workflows in Conductor:"
WORKFLOWS_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/api/metadata/workflow)
HTTP_CODE=$(echo "$WORKFLOWS_RESPONSE" | tail -n1)
WORKFLOWS_LIST=$(echo "$WORKFLOWS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}❌ Failed to fetch workflows${NC}"
    log_api_response "$WORKFLOWS_LIST" "$HTTP_CODE" "fetch workflows"
    exit 1
fi

if [ "$WORKFLOWS_LIST" == "[]" ] || [ -z "$WORKFLOWS_LIST" ]; then
    echo "No workflows found in Conductor"
    exit 0
fi

echo "$WORKFLOWS_LIST" | jq -r '.[] | "- \(.name) (version \(.version))"'
echo ""

if confirm "Unregister workflows from Conductor?"; then
    echo -e "\n🗑️  Unregistering workflows from Conductor..."
    
    while read -r workflow; do
        if [ ! -z "$workflow" ]; then
            NAME=$(echo "$workflow" | jq -r '.name')
            VERSION=$(echo "$workflow" | jq -r '.version')
            
            if [ "$NAME" != "null" ] && [ "$VERSION" != "null" ]; then
                echo -e "\n${YELLOW}Processing workflow: $NAME (version $VERSION)${NC}"
                
                echo "Attempting to unregister workflow..."
                UNREGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
                    -H "Content-Type: application/json" \
                    http://localhost:8080/api/metadata/workflow/$NAME/$VERSION/remove)
                
                HTTP_CODE=$(echo "$UNREGISTER_RESPONSE" | tail -n1)
                RESPONSE_BODY=$(echo "$UNREGISTER_RESPONSE" | sed '$d')
                
                # Log the response
                log_api_response "$RESPONSE_BODY" "$HTTP_CODE" "remove $NAME v$VERSION"

                if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "204" ]; then
                    echo -e "${GREEN}✅ Successfully removed $NAME v$VERSION${NC}"
                else
                    echo -e "${RED}❌ Failed to remove $NAME v$VERSION${NC}"
                    
                    # Try alternative method
                    echo "Attempting alternative removal method..."
                    ALT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
                        -H "Content-Type: application/json" \
                        http://localhost:8080/api/metadata/workflow/$NAME/$VERSION/deactivate)
                    
                    ALT_CODE=$(echo "$ALT_RESPONSE" | tail -n1)
                    ALT_BODY=$(echo "$ALT_RESPONSE" | sed '$d')
                    
                    log_api_response "$ALT_BODY" "$ALT_CODE" "deactivate $NAME v$VERSION"
                    
                    if [ "$ALT_CODE" == "200" ] || [ "$ALT_CODE" == "204" ]; then
                        echo -e "${GREEN}✅ Successfully deactivated $NAME v$VERSION${NC}"
                    else
                        echo -e "${RED}❌ Failed to deactivate $NAME v$VERSION${NC}"
                    fi
                fi
            fi
        fi
    done < <(echo "$WORKFLOWS_LIST" | jq -c '.[]')
fi

# Final verification
echo -e "\n📋 Verifying cleanup..."
FINAL_CHECK=$(curl -s http://localhost:8080/api/metadata/workflow)
if [ "$FINAL_CHECK" != "[]" ] && [ "$FINAL_CHECK" != "null" ] && [ ! -z "$FINAL_CHECK" ]; then
    echo -e "${YELLOW}⚠️  Remaining workflows:${NC}"
    echo "$FINAL_CHECK" | jq -r '.[] | "- \(.name) (version \(.version))"'
    echo -e "\n${YELLOW}Note: Some workflows might require manual removal through the UI.${NC}"
else
    echo -e "${GREEN}✅ All workflows have been unregistered${NC}"
fi

echo -e "\n✨ Workflow cleanup complete!"
echo "
To register workflows again:
./register-workflows.sh"