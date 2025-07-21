#!/bin/bash

echo "🔍 Checking Emma AI server status..."
echo ""

# Check if server is running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Server is running on port 3000"
    echo ""
    echo "🌐 URLs:"
    echo "   Main page: http://localhost:3000"
    echo "   Voice test: http://localhost:3000/test"
    echo ""
    
    # Try to fetch the main page
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo "✅ Main page is responding"
    else
        echo "⚠️  Main page not responding yet, try refreshing in a few seconds"
    fi
else
    echo "❌ Server is not running on port 3000"
    echo ""
    echo "To start the server, run:"
    echo "npm run dev"
fi