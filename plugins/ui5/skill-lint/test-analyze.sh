#!/bin/bash

# Quick build and test script
cd /Users/i326076/SAPDevelop/plugins-claude/plugins/ui5/skill-lint

echo "🔨 Building..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ Build successful"

echo ""
echo "🧪 Running tests..."
npm test 2>&1 | tail -10

echo ""
echo "🔍 Testing analyze command..."
node bin/skill-lint.js analyze ../skills/ui5-best-practices 2>&1 | head -50

echo ""
echo "✅ All checks complete!"
