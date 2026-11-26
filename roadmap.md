# Saved image thumbnails
- [x] Serve saved thumbnails in library cards and the public drawing gallery without image transformations.
- [x] Generate thumbnails for new single/bulk photo uploads and drawings.
- [x] Verify all public gallery drawings on desktop and phones with zero transformation requests; photo compression and six regression tests pass.
- [ ] Finish converting 153 remaining existing image references: hosted conversion hits Supabase CPU/memory limits. Missing thumbnails safely use ordinary originals, without transformation charges.
- [ ] Verify signed-in add/edit and full-photo details end-to-end: user-managed Supabase does not provide a test sign-in session; detail photo loading is unchanged.