# QR-Ybanez — Digital School Event Passport

## Scope

The passport is student-only and uses the existing authenticated attendance records. No user can claim a stamp directly. Regular school events earn one stamp per event; signature collections earn one stamp per celebration edition, even if that celebration includes multiple event activities.

Signature editions:
- Christmas Party 2026 — Holiday
- CCS Week 2026 — Digital
- Foundation Day 2027 — Heritage
- Intramurals 2027 — Victory

## Required deployment order

1. Back up the current Supabase database separately from the GitHub code backup.
2. Run `supabase/passport-migration.sql` in the **existing** project's Supabase SQL editor, once, after the existing secure attendance migrations. Review the statements first. The repository includes the migration but **committing it does not apply it** to Supabase.
3. Confirm `stamp_collections` has four rows, `events.stamp_collection_id` exists, and RLS is enabled.
4. Build/reload the Expo application. Confirm Admin Events displays the four collections and that student Profile contains the passport shortcut.
5. In Admin Events, create or edit an event and assign a signature collection. The teacher form intentionally cannot change signature collection assignments.
6. Test one eligible student QR check-in, a duplicate scan, the student's stamp page, and the unlock animation.

When the migration is absent, scanning itself still uses the original secure check-in function. Passport screens display the Supabase error; regular event creation is designed not to require the new column until assigned a collection.

## Stamp rules

- Eligible statuses: `present` and `late`. `excused` does not award participation.
- Only the authenticated student's attendance is queried. The database RLS must still be enforced.
- Duplicate attendance for an event does not create another stamp.
- Several eligible events assigned to one signature edition produce only one collectible.
- Existing eligible attendance becomes a stamp retroactively when its event is associated with a collection.
- Removing an invalid attendance record removes the derived stamp; a correction from `present`/`late` to `excused` removes eligibility.
- Hidden signature collections do not appear in student passports; events assigned to them do **not** turn into regular stamps.
- The animation is optional UI: a passport query failure must never reverse or delay a successful QR attendance record.
- The first qualifying check-in for a signature edition triggers the unlock effect; subsequent qualifying activities do not trigger it again.

## Validation checklist

- [ ] Student role sees Passport on Home and Profile; Teacher and Admin do not.
- [ ] Passport shows four signature stamps with corrected years and exact title **Foundation Day**.
- [ ] Locked/earned states, stamp details, and ordinary-event stamps display correctly.
- [ ] Teacher creates and edits an ordinary event without changing a signature association.
- [ ] Admin can assign and clear a collection; unauthorized direct changes are rejected by database trigger.
- [ ] Admin can publish/hide a collection, and student view respects that status.
- [ ] QR check-in stays fast; newly earned stamp appears after attendance confirmation, not before.
- [ ] Duplicate scan does not produce another unlock modal.
- [ ] Second activity in one signature collection does not produce another unlock modal.
- [ ] Approved manual check-in and corrections update the passport when revisited.
- [ ] Attendance removed or reclassified to Excused no longer earns the stamp.
- [ ] Empty state, loading, server error, and pull-to-refresh function on Android and iOS.
- [ ] Check 320px and 360px small-device layouts, offline errors, and accessibility labels.
- [ ] Run `npx tsc --noEmit` after installing dependencies and test on a physical Expo device.

## Files

- `supabase/passport-migration.sql`: incremental migration
- `supabase/schema.sql`: updated canonical fresh-install schema
- `lib/passport.ts`: data acquisition, eligibility, signature deduplication
- `constants/stampThemes.ts`: SVG/RN-ready palette and template metadata
- `components/passport/`: stamp presentation and unlock modal
- `app/passport.tsx`: student Passport route
- `app/(tabs)/scan.tsx`: optional post-check-in unlock
- `app/(tabs)/admin-events.tsx`: signature assignment and publication controls

## Operational note

The supplied SQL is additive, but always test on a staging database first. This feature does not generate or upload per-event stamp images. Signature stamp appearance is driven by four reusable theme templates. Custom school seal artwork can be introduced later without changing the collection database model.
