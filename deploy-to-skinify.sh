#!/bin/bash

# Deploy to skinify.gg - Cloudflare Pages Deployment Script
# Usage: ./deploy-to-skinify.sh

set -e

echo "🚀 Starting deployment to skinify.gg..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if CLOUDFLARE_API_TOKEN is set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}❌ Error: CLOUDFLARE_API_TOKEN environment variable is not set${NC}"
    echo ""
    echo "Please set your Cloudflare API token:"
    echo "  export CLOUDFLARE_API_TOKEN='your_token_here'"
    echo ""
    echo "Get your API token from:"
    echo "  https://dash.cloudflare.com/profile/api-tokens"
    echo ""
    exit 1
fi

# Step 1: Clean previous build
echo -e "${BLUE}📦 Step 1: Cleaning previous build...${NC}"
rm -rf dist
echo -e "${GREEN}✅ Clean complete${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}📦 Step 2: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Build the application
echo -e "${BLUE}🔨 Step 3: Building application...${NC}"
npm run build
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Step 4: Verify build output
echo -e "${BLUE}🔍 Step 4: Verifying build output...${NC}"
if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ Error: dist/index.html not found${NC}"
    echo "Build may have failed. Check the build output above."
    exit 1
fi
echo -e "${GREEN}✅ Build output verified${NC}"
echo ""

# Step 5: Deploy to Cloudflare Pages
echo -e "${BLUE}🚀 Step 5: Deploying to skinify.gg...${NC}"
npx wrangler pages deploy dist \
  --project-name=skinify \
  --branch=main \
  --commit-dirty=true

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Your site is now live at: https://skinify.gg"
echo ""
echo "📊 View deployment details:"
echo "   https://dash.cloudflare.com"
echo ""
echo "🔍 To monitor logs:"
echo "   npx wrangler pages deployment tail --project-name=skinify"
echo ""
