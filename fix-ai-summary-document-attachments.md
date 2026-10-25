# Fix AI summary for files selected from My Documents

Confirmed: BT_Buoi1.pdf uses documents/<ownerId>/<UUID>_name.pdf; the first implementation allowed only chat-media/<chatId>/... .

- [ ] Keep chat/DB media checks; recognize the existing Documents storage format without signing it in Communication.
- [ ] Resolve the exact registered file version through the authenticated Document bridge; require current owner/explicit share rights and deny archived/private/public-link-only sources.
- [ ] Recheck Document access during extraction/generation; add regression tests for both storage paths and revoked access.
- [ ] Build, activate safely and verify using synthetic Documents-backed PDF data, preserving user data.
