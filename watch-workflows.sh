if command -v inotifywait > /dev/null; then
    # Linux with inotify-tools
    while true; do
        inotifywait -r -e modify,create,delete ./workflows
        echo "Changes detected, registering workflows..."
        ./register-workflows.sh
    done
elif command -v fswatch > /dev/null; then
    # macOS with fswatch
    fswatch -o ./workflows | while read f; do
        echo "Changes detected, registering workflows..."
        ./register-workflows.sh
    done
else
    echo "Please install inotify-tools (Linux) or fswatch (macOS)"
    exit 1
fi