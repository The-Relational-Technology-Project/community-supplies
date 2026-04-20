
## Add "Tech" category

**Icon:** `Laptop` from lucide-react (pending your confirmation — say the word if you'd prefer Cpu, Plug, or Cable instead).

**Single change:** Add one entry to the `categories` array in `src/data/categories.ts`:

```ts
{ id: "tech", name: "Tech", icon: Laptop }
```

Placed near the end of the list (before "Miscellaneous") so it sits with other specific categories.

**Why this is safe for existing communities:**
- Categories are a static frontend list, not per-community data
- Existing supplies store category as a string id — none reference `"tech"` today, so nothing changes for them
- No database migration, no edge function change, no per-community config
- All communities (current and future) immediately see the new category as an option when adding items, and as a filter in the sidebar

**Files to change:**
- `src/data/categories.ts` — add the Tech entry and import `Laptop` from lucide-react

**Verification:**
- Open the browse view → confirm "Tech" appears in the desktop sidebar and mobile category sheet
- Add a new item → confirm "Tech" appears in the category dropdown and AI category auto-detection still works (it picks from whatever is in the list)
- Confirm existing items in other categories are unaffected
