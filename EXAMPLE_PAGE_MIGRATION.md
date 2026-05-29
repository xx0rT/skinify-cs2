# Example: How to Migrate a Page to Use Navigation Components

## Step-by-Step Migration Example

Let's say you have a `MarketplacePage.tsx` that currently has all navigation embedded.

---

## BEFORE (Old Way)

```tsx
// MarketplacePage.tsx - OLD WAY (Everything embedded)
import { useState } from 'react';
import { motion } from 'framer-motion';

function MarketplacePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* TOP HEADER - Duplicate code */}
      <header className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700/50 z-[60] h-12">
        <div className="h-full flex items-center justify-between px-6">
          {/* Settings, Language, etc. */}
        </div>
      </header>

      {/* LEFT SIDEBAR - Duplicate code */}
      <div className="fixed left-0 top-12 h-full z-40 w-16 hover:w-64 bg-gray-800">
        {/* Sidebar items */}
      </div>

      {/* MAIN NAV - Duplicate code */}
      <header className="fixed top-12 left-16 right-0 bg-gray-800 z-30">
        {/* Navigation items */}
      </header>

      {/* ACTUAL PAGE CONTENT */}
      <div className="pt-[120px] pl-16">
        <div className="container mx-auto px-4 py-8">
          <h1>Marketplace</h1>
          {/* Your marketplace items */}
        </div>
      </div>
    </div>
  );
}
```

**Problems**:
- 🔴 Duplicate navigation code on every page
- 🔴 Hard to maintain (change navigation = update all pages)
- 🔴 Inconsistent across pages
- 🔴 Large file size

---

## AFTER (New Way)

```tsx
// MarketplacePage.tsx - NEW WAY (Using NavigationLayout)
import { useState } from 'react';
import { NavigationLayout } from '../components/Navigation';
import SearchModal from '../components/SearchModal';
import Footer from '../components/Footer';

function MarketplacePage() {
  const [showSearchModal, setShowSearchModal] = useState(false);

  return (
    <>
      <NavigationLayout onSearchOpen={() => setShowSearchModal(true)}>
        <div className="min-h-screen bg-gray-900 text-white">
          {/* JUST YOUR CONTENT */}
          <div className="container mx-auto px-4 py-8">
            <h1>Marketplace</h1>
            {/* Your marketplace items */}
          </div>

          <Footer />
        </div>
      </NavigationLayout>

      {/* Search Modal */}
      {showSearchModal && (
        <SearchModal onClose={() => setShowSearchModal(false)} />
      )}
    </>
  );
}

export default MarketplacePage;
```

**Benefits**:
- ✅ Clean, minimal code
- ✅ Reusable navigation
- ✅ Easy to maintain
- ✅ Consistent everywhere
- ✅ Smaller file size

---

## Another Example: Profile Page

### BEFORE
```tsx
function ProfilePage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 200+ lines of navigation code here */}

      <div className="pt-[120px] pl-16">
        {/* Profile tabs */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex space-x-4 mb-6">
            <button onClick={() => setActiveTab('overview')}>Overview</button>
            <button onClick={() => setActiveTab('inventory')}>Inventory</button>
            <button onClick={() => setActiveTab('listings')}>Listings</button>
          </div>

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'listings' && <ListingsTab />}
        </div>
      </div>
    </div>
  );
}
```

### AFTER
```tsx
import { NavigationLayout } from '../components/Navigation';

function ProfilePage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <NavigationLayout>
      <div className="min-h-screen bg-gray-900">
        {/* Just profile content */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex space-x-4 mb-6">
            <button onClick={() => setActiveTab('overview')}>Overview</button>
            <button onClick={() => setActiveTab('inventory')}>Inventory</button>
            <button onClick={() => setActiveTab('listings')}>Listings</button>
          </div>

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'listings' && <ListingsTab />}
        </div>
      </div>
    </NavigationLayout>
  );
}

export default ProfilePage;
```

---

## Special Case: Page Without Navigation

Some pages (like login) don't need navigation:

```tsx
import { NavigationLayout } from '../components/Navigation';

function LoginPage() {
  return (
    <NavigationLayout showNavigation={false}>
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg">
          <h1>Login</h1>
          {/* Login form */}
        </div>
      </div>
    </NavigationLayout>
  );
}
```

---

## Migration Checklist for Each Page

For each page file:

1. ✅ Import `NavigationLayout`
   ```tsx
   import { NavigationLayout } from '../components/Navigation';
   ```

2. ✅ Remove old navigation code
   - Delete TopHeader JSX
   - Delete MainNav JSX
   - Delete LeftSidebar JSX

3. ✅ Wrap content in NavigationLayout
   ```tsx
   <NavigationLayout>
     {/* Your content */}
   </NavigationLayout>
   ```

4. ✅ Add search modal support if needed
   ```tsx
   const [showSearchModal, setShowSearchModal] = useState(false);

   <NavigationLayout onSearchOpen={() => setShowSearchModal(true)}>
   ```

5. ✅ Keep the padding classes
   ```tsx
   <div className="pt-[120px] pl-16"> {/* Important! */}
   ```

6. ✅ Test the page
   - Check navigation works
   - Check all buttons functional
   - Check responsive behavior

---

## Pages to Migrate

Priority order:

### High Priority (User-facing)
1. ✅ `MarketplacePage.tsx`
2. ✅ `ProfilePage.tsx`
3. ✅ `CartPage.tsx`
4. ✅ `ItemDetailPage.tsx`
5. ✅ `WeaponCategoryPage.tsx`

### Medium Priority
6. `ReferralPage.tsx`
7. `VipPage.tsx`
8. `BonusesPage.tsx`
9. `RewardsPage.tsx`

### Low Priority (Informational)
10. `AboutPage.tsx`
11. `FAQPage.tsx`
12. `ContactPage.tsx`
13. `TermsPage.tsx`
14. `PrivacyPage.tsx`

### Keep As-Is
- `LandingPage.tsx` - Keep until all others migrated
- Mobile pages - Different layout

---

## Testing After Migration

For each migrated page, test:

- ✅ Top header visible and functional
- ✅ Main navigation working
- ✅ Sidebar expands on hover
- ✅ Cart count badge updates
- ✅ User profile dropdown works
- ✅ All navigation links work
- ✅ Search button opens modal
- ✅ Content not hidden behind navigation
- ✅ Responsive on mobile
- ✅ Animations smooth

---

## Common Issues & Solutions

### Issue: Content hidden behind navigation

**Cause**: Missing padding
```tsx
// WRONG - No padding
<div className="container">

// RIGHT - With padding
<div className="pt-[120px] pl-16">
```

### Issue: Navigation appears twice

**Cause**: Page still has old navigation code
```tsx
// Remove these from your page:
<TopHeader /> ❌
<MainNav /> ❌
<LeftSidebar /> ❌

// Use only:
<NavigationLayout> ✅
```

### Issue: Search doesn't work

**Cause**: Missing callback
```tsx
// WRONG
<NavigationLayout>

// RIGHT
<NavigationLayout onSearchOpen={() => setShowSearchModal(true)}>
```

---

## Time Estimate

Per page:
- Simple page: 2-5 minutes
- Complex page: 10-15 minutes
- Testing: 5 minutes

Total for all pages: ~2-3 hours

---

## Benefits Summary

**Before**:
- 3328 lines in LandingPage.tsx
- Navigation duplicated on 20+ pages
- Hard to maintain
- Inconsistent

**After**:
- ~50 lines per page
- Navigation in one place
- Easy to maintain
- Consistent everywhere

**Savings**: ~6000+ lines of duplicate code removed! 🎉

---

**Ready to migrate?** Start with `MarketplacePage.tsx` and follow this guide!
