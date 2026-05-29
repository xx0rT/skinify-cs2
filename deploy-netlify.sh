#!/bin/bash

# Deploy to Netlify - Automated Deployment Script
# Usage: ./deploy-netlify.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Deploying to Netlify - skinify.gg     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if user is logged in to Netlify
echo -e "${BLUE}🔍 Checking Netlify authentication...${NC}"
if ! npx netlify status > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Not logged in to Netlify${NC}"
    echo ""
    echo -e "${BLUE}Opening browser for authentication...${NC}"
    npx netlify login
    echo ""
fi
echo -e "${GREEN}✅ Authenticated with Netlify${NC}"
echo ""

# Step 1: Clean previous build
echo -e "${BLUE}🧹 Step 1: Cleaning previous build...${NC}"
rm -rf dist
echo -e "${GREEN}✅ Clean complete${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}📦 Step 2: Installing dependencies...${NC}"
npm install --silent
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

# Step 5: Check if site is linked
echo -e "${BLUE}🔗 Step 5: Checking site link...${NC}"
if [ ! -d ".netlify" ]; then
    echo -e "${YELLOW}⚠️  No site linked. You'll need to select or create a site.${NC}"
    echo ""
    echo -e "${BLUE}Linking to Netlify site...${NC}"
    npx netlify link
    echo ""
fi
echo -e "${GREEN}✅ Site linked${NC}"
echo ""

# Step 6: Deploy to Netlify
echo -e "${BLUE}🚀 Step 6: Deploying to Netlify...${NC}"
echo ""
npx netlify deploy --prod --dir=dist

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Deployment Successful! 🎉          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 View your deployment:${NC}"
npx netlify open
echo ""
echo -e "${BLUE}🔍 Check site status:${NC}"
echo "   npx netlify status"
echo ""
echo -e "${BLUE}📋 View deployment logs:${NC}"
echo "   npx netlify deploy:list"
echo ""
echo -e "${GREEN}🌐 Your site is now live!${NC}"
echo ""
