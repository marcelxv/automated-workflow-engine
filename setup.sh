echo "Setting up Orkes Conductor local environment..."

# Check if ORKES_ACCESS_KEY is set
if [ -z "$ORKES_ACCESS_KEY" ]; then
    echo "❌ ORKES_ACCESS_KEY is not set"
    echo "Please set it with: export ORKES_ACCESS_KEY=<your_access_key>"
    exit 1
fi

# Docker login
echo "Logging into Docker..."
echo $ORKES_ACCESS_KEY | docker login --username orkesdocker --password-stdin

if [ $? -ne 0 ]; then
    echo "❌ Docker login failed"
    exit 1
fi

# Create volumes
echo "Creating Docker volumes..."
docker volume create postgres
docker volume create redis

# Create necessary directories
echo "Creating local directories..."
mkdir -p config workflows

# Start the stack
echo "Starting Orkes Conductor..."
docker compose up -d

# Check status
echo "Checking service status..."
sleep 10
docker compose ps

echo "
✅ Setup complete!

Access points:
- Conductor UI: http://localhost:3000
- Conductor API: http://localhost:8080

To view logs:
  docker compose logs -f

To stop:
  docker compose down"