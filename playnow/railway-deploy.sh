#!/bin/bash

# Railway Deployment Script
# This script helps prepare and deploy your app to Railway

echo "🚀 Railway Deployment Preparation Script"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

# Check for required environment variables in .env.local (for reference)
echo -e "\n${GREEN}📋 Checking environment setup...${NC}"

required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
)

echo -e "${YELLOW}Make sure you have set these in Railway dashboard:${NC}"
for var in "${required_vars[@]}"; do
    echo "  ✓ $var"
done

# Build the project locally to check for errors
echo -e "\n${GREEN}🔨 Building project to check for errors...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Please fix errors before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Run linting
echo -e "\n${GREEN}🔍 Running linter...${NC}"
npm run lint

# Git operations
echo -e "\n${GREEN}📦 Preparing git repository...${NC}"

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}You have uncommitted changes:${NC}"
    git status -s
    echo -e "${YELLOW}Committing all changes...${NC}"
    git add .
    git commit -m "Security updates for Railway deployment"
fi

# Push to remote
echo -e "\n${GREEN}📤 Pushing to remote repository...${NC}"
git push origin main

echo -e "\n${GREEN}🎉 Preparation complete!${NC}"
echo "========================================"
echo -e "${GREEN}Next steps:${NC}"
echo "1. Go to Railway dashboard: https://railway.app"
echo "2. Set the following environment variables:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - ALLOWED_ORIGINS=https://\${{RAILWAY_PUBLIC_DOMAIN}}"
echo "   - ALLOWED_REDIRECT_DOMAINS=\${{RAILWAY_PUBLIC_DOMAIN}}"
echo "   - ALLOWED_IMAGE_DOMAINS=images.unsplash.com,cdn.pixabay.com,*.supabase.co"
echo "   - NODE_ENV=production"
echo ""
echo "3. Deploy from Railway dashboard or run:"
echo "   railway up"
echo ""
echo -e "${YELLOW}⚠️  Important Security Notes:${NC}"
echo "- Never commit .env.local or .env files"
echo "- Keep SUPABASE_SERVICE_ROLE_KEY secret"
echo "- Update ALLOWED_ORIGINS with your production domain"
echo "- Enable RLS policies in Supabase"
echo ""
echo -e "${GREEN}📚 For detailed instructions, see:${NC}"
echo "   - SECURITY_IMPLEMENTATION_COMPLETE.md"
echo "   - RAILWAY_DEPLOYMENT_SECURITY.md"
echo "   - ENV_EXAMPLE.md"
