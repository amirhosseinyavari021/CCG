#!/bin/bash

echo ""
echo "==============================="
echo "🔥 FULL CCG BACKEND DUMP"
echo "==============================="
echo ""

dump() {
  local file=$1
  if [ -f "$file" ]; then
    echo ""
    echo "--------------------------------------------"
    echo "📄 FILE: $file"
    echo "--------------------------------------------"
    cat "$file"
    echo ""
  fi
}

echo "🚀 Dumping Backend Files..."

# Core
dump "server.js"

# Routes
dump "server/routes/authRoutes.js"
dump "server/routes/googleAuthRoutes.js"
dump "server/routes/ccgRoutes.js"

# Auth Strategy
dump "server/auth/googleStrategy.js"

# Middleware
dump "server/middleware/auth.js"
dump "server/middleware/optionalAuth.js"
dump "server/middleware/usageLimit.js"

# Models
dump "server/models/User.js"
dump "server/models/RateLimit.js"

echo ""
echo "==============================="
echo "🔥 BACKEND DUMP COMPLETE"
echo "==============================="
