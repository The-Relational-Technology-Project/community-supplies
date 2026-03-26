

## Fix Search: Connect Header to Browse

### Problem
The `CatalogHeader` has a search form that accepts an `onSearch` callback, but `Index.tsx` never passes `onSearch` to it. The search query typed in the header has no way to reach `BrowseSupplies`, which has its own independent `searchQuery` state.

### Fix

**`src/pages/Index.tsx`**
- Add a `searchQuery` state variable
- Pass `onSearch={setSearchQuery}` and `searchQuery={searchQuery}` to `CatalogHeader`
- Pass `searchQuery` as a prop to `BrowseSupplies`

**`src/components/BrowseSupplies.tsx`**
- Accept an optional `searchQuery` prop
- Initialize the local `searchQuery` state from the prop
- Sync when the prop changes (via `useEffect`)

This connects the header search bar to the browse view's filtering logic. Enter key already works (the form has `onSubmit`), it just had nowhere to send the query.

