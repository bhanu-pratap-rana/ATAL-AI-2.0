#!/bin/bash

# Fix Readonly Props Script
# Adds readonly modifier to component prop interfaces
# This fixes typescript:S6759 issues (110 total)

echo "🔍 Starting to fix readonly props in component interfaces..."
echo ""

# Counter for tracking changes
files_modified=0
props_fixed=0

# Find all .tsx and .ts files in apps/web/src
find apps/web/src -type f \( -name "*.tsx" -o -name "*.ts" \) | while read file; do
  # Check if file contains interface definition
  if grep -q "interface.*Props" "$file"; then
    # Add readonly to interface properties
    # This matches lines like "  property: type" within interface Props and adds "readonly "
    if sed -i.bak '/interface.*Props/,/^}/ s/^\(\s\+\)\([a-zA-Z_][a-zA-Z0-9_]*[?]\?\s*:\)/\1readonly \2/g' "$file"; then
      # Check if the file was actually modified (not just the backup created)
      if ! cmp -s "$file" "$file.bak" 2>/dev/null; then
        echo "✓ Modified: $file"
        ((files_modified++))

        # Count how many readonly keywords were added
        added=$(grep -c "readonly" "$file" 2>/dev/null || echo "0")
        if [ "$added" -gt 0 ]; then
          ((props_fixed += added))
        fi
      fi

      # Remove the backup file
      rm -f "$file.bak"
    fi
  fi
done

echo ""
echo "📊 Readonly Props Fix Summary:"
echo "  Files modified: $files_modified"
echo "  Props fixed: ~$props_fixed"
echo ""
echo "✅ Readonly props fix script completed!"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff"
echo "  2. Run TypeScript check: npx tsc --noEmit"
echo "  3. Run linting: npm run lint"
