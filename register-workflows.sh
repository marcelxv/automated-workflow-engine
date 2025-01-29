#!/bin/bash

# register-workflows.sh
echo "Registering workflows from local directory..."

# Wait for Conductor to be ready
until curl -s http://localhost:8080/health > /dev/null; do
    echo "Waiting for Conductor to be ready..."
    sleep 5
done

# Find all workflow files (excluding schema and payload files)
find ./workflows -type f -name "*.json" ! -name "*_schema.json" ! -name "*_payload.json" | while read workflow_file; do
    echo "Processing $workflow_file..."
    
    # Register workflow
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d @"$workflow_file" \
        http://localhost:8080/api/metadata/workflow)
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Successfully registered workflow from $workflow_file"
    else
        echo "❌ Failed to register workflow from $workflow_file"
        echo "Response: $response"
    fi
    
    # Add a small delay between registrations
    sleep 1
done

echo "Workflow registration complete!"