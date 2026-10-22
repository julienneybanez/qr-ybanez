# Secure Attendance — Setup and Acceptance Tests

This batch adds rotating QR, Student correction requests, and Teacher/Admin manual check-in.

## IMPORTANT: Database migration is mandatory

Run **only** `supabase/secure-attendance-migration.sql` in the existing project's Supabase SQL Editor **after** the previous attendance-redesign migration. Do not rerun `schema.sql` against an existing project; `schema.sql` is for fresh installations.

The app and migration must be deployed together. Old QR v1 screenshots intentionally stop working. Students must scan the newly generated v2 QR. On the server, direct Student attendance INSERT is revoked and the policy is removed, so **without this migration all new QR scans fail**.

No service-role key or new client secrets are required. Authentication is checked within security-definer RPCs.

## Manual acceptance test

1. Teacher creates an ongoing event, opens Live Event QR, and confirms QR rotates around 30 seconds and expires at 40 seconds (10-second grace).
2. Student scans a current QR and sees the accurate recorded time, Student ID, and Present/Late status.
3. Student retries the same event: duplicate rejection. Scan an expired QR or old v1 screenshot: rejection.
4. Student attempts a future or closed event: rejection.
5. Teacher tries a manual check-in on own ongoing event: search a real Student, enter reason, record. Check the list displays **Manual** and updates live.
6. Teacher attempts a student already checked in: duplicate rejection.
7. Teacher tries manual check-in for another teacher's event or a closed event: rejection.
8. Admin can manually check in for any event (including an exception for a closed event with a reason).
9. Student History → Report an Issue, and Student Events → Report Missing Attendance: submit, see My Requests, track Pending/Under Review/Approved/Rejected/Cancelled, and cancel a pending request.
10. Teacher sees requests only for own events and can mark Under Review, but cannot approve or change attendance.
11. Admin approves a request with a reason; status/record updates transactionally. Reject another with a reason. Student view and Teacher/Admin Attendance update.
12. Admin corrects/removes attendance with a mandatory reason, verifies that Audit/Reports record the action.
13. Try unauthorized RPC calls using Student/Teacher JWTs; ensure roles are enforced even if a client UI is bypassed.
14. Run `npx tsc --noEmit`, `npx expo start -c`, test at 320/360/390/430px, then build a preview APK.

## Database additions

- `event_qr_tokens`: hashed, expiring QR tokens (no direct client access)
- `attendance_correction_requests`: student submissions, workflow state, Admin resolution notes
- `attendance.recorded_via`: QR/manual/correction
- `attendance.recorded_by`: actor profile UUID
- `attendance.checkin_note`: administrative reason

**Server RPCs:** `issue_event_qr`, `verify_qr_check_in`, `search_checkin_students`, `manual_check_in`, `submit_attendance_request`, `mark_attendance_request_reviewing`, `resolve_attendance_request`, `cancel_attendance_request`, `correct_attendance_record`, and `remove_attendance_record`.

## Behavior notes

- Rotating QR reduces screenshot reuse; a QR shared while still valid can still be misused.
- Both QR and manual check-ins use the database server's time, not the phone clock.
- Teachers are limited to their own events; Admin can review all events.
- An approved missing-attendance request creates a **Correction** entry at approval time, not a fabricated past scan timestamp.
- The unique constraint `(student_id,event_id)` remains the final duplicate-prevention guarantee.
