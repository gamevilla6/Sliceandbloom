---
name: Google Play connector access
description: Verify the publishing endpoint separately from OAuth authorization.
---

Do not equate successful Google OAuth with a working Android publishing route.
Check the connector's current API base URL against Google's official Android
Publisher documentation before requesting repeated authorizations.

**Why:** This project's Google Play connector setup notes reported
`https://play.googleapis.com` as its base URL and warned that Android Publisher
paths return HTML 404 responses there. Google's documented service endpoint is
`https://androidpublisher.googleapis.com`. Authorization alone cannot repair an
incorrect destination. This was reported by the setup metadata, not verified
through an authenticated request.

**How to apply:** Reinspect the current connector configuration; do not assume
the reported problem persists after configuration changes. Fix or verify the
destination before promising uploads. A 404 at the wrong host is not evidence
that the user needs to reauthorize. Keep all private signing and OAuth
credentials out of chat, source control, and memory.
