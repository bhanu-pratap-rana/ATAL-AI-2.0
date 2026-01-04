#!/bin/bash
# Script to systematically fix auth.user! non-null assertions
# Run from: apps/web/src/app/actions/

# Pattern 1: auth.error! -> auth.error
find . -name "*.ts" -type f -exec sed -i 's/auth\.error!/auth.error/g' {} \;

# Pattern 2: auth.user!.id -> auth.user.id  
find . -name "*.ts" -type f -exec sed -i 's/auth\.user!\.id/auth.user.id/g' {} \;

# Pattern 3: auth.user! -> auth.user
find . -name "*.ts" -type f -exec sed -i 's/auth\.user!/auth.user/g' {} \;

echo "✅ Fixed all auth.user! assertions"
echo "Run: npm run build to verify"

