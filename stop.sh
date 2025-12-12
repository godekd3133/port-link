#!/bin/bash

echo "🛑 PortLink 종료..."

# Kill servers
lsof -ti :3001 | xargs kill -9 2>/dev/null && echo "✅ Backend 종료 (3001)"
lsof -ti :5173 | xargs kill -9 2>/dev/null && echo "✅ Frontend Dev 종료 (5173)"
lsof -ti :4173 | xargs kill -9 2>/dev/null && echo "✅ Frontend Prod 종료 (4173)"

# Optional: Stop DB services (uncomment if needed)
# brew services stop postgresql@14 2>/dev/null
# brew services stop redis 2>/dev/null

echo "🎉 완료!"
