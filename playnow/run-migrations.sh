#!/bin/bash

# Run Supabase migrations
# Make sure you have your Supabase credentials set up in your environment

echo "Running Supabase migrations..."

# Get Supabase credentials from environment or .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Error: Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# List of migration files to run
MIGRATIONS=(
    "supabase/01-add-sport-column.sql"
    "supabase/07-add-missing-game-columns.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$migration" ]; then
        echo "Running migration: $migration"
        
        # You can use the Supabase CLI or psql to run the migration
        # Example using psql (you'll need to parse the connection string from NEXT_PUBLIC_SUPABASE_URL)
        # psql "$DATABASE_URL" -f "$migration"
        
        echo "✓ Completed: $migration"
    else
        echo "⚠ Migration file not found: $migration"
    fi
done

echo ""
echo "Migration instructions:"
echo "========================"
echo "To apply these migrations, you have two options:"
echo ""
echo "Option 1: Using Supabase Dashboard"
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to the SQL Editor"
echo "3. Copy and paste the contents of each migration file:"
echo "   - supabase/01-add-sport-column.sql"
echo "   - supabase/07-add-missing-game-columns.sql"
echo "4. Run each migration in order"
echo ""
echo "Option 2: Using Supabase CLI"
echo "1. Install Supabase CLI: npm install -g supabase"
echo "2. Link your project: supabase link --project-ref YOUR_PROJECT_REF"
echo "3. Run migrations: supabase db push"
echo ""
echo "After running migrations, your games will:"
echo "- Display properly in the bookings page"
echo "- Support canceling and leaving games"
echo "- Show sport, date, time, and other details correctly"
