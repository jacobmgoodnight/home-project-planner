# iPhone preview with a free Apple Account

Home Project Planner now has an optional Capacitor iOS integration. The existing GitHub Pages website is unchanged. This source has **not** been compiled or physically tested on an iPhone yet; it is **not** a TestFlight build.

## Requirements and direct installation
- A Mac with compatible Xcode, Node.js 22+, your Apple Account and an iPhone.
- In Xcode > Settings > Accounts, sign in with your Apple Account. Without paid developer membership this is a free **Personal Team**.
- Apple free Personal Team provisioning expires after 7 days. You must periodically rebuild and reinstall from Xcode.

Clone or pull the GitHub repository, open Terminal in that folder, and run these commands:

    npm install
    npm run check
    npm run ios:add
    npm run ios:open

The first ios:add generates the iOS project locally on the Mac and syncs the compiled website assets and native plugins. Run it only once. For future updates use npm run ios:sync followed by npm run ios:open. The generated ios/ directory is not yet in this repo; the actual native project must be generated and validated in Xcode first.

In Xcode, select target App > Signing & Capabilities, choose the free Personal Team, and enable Automatically manage signing. Choose a unique bundle identifier if Xcode reports a conflict. Connect the iPhone, enable Developer Mode and trust the Mac if prompted, then select the iPhone target and press Run.

## Your existing household data
The native app's WebView has independent local IndexedDB storage. **Do not assume the web app's projects will automatically appear.** First export a private JSON backup from the web app and import it in iOS, or sign into your optional Supabase household sync and carefully confirm which cloud copy to download. Never overwrite your shared cloud household with an empty device.

## Native reminder behavior
Open Today > Reminders and select Enable device notifications. After permission, the app schedules up to 48 local maintenance / equipment warranty notices within the coming 90 days at 9 AM local device time. The dates come from records you entered. Equipment warranties generate a warning 7 days before expiry. No dated task = no notification. Overdue maintenance is scheduled for the next morning when you open the app.

Pending notices may fire while the app is closed, but the app must be opened to **refresh** the schedule after editing/completing maintenance, household sync, time zone changes or as the 90-day horizon advances. Disabling reminders cancels only Home Project Planner's scheduled notifications. This is not remote push or continuous background sync. Browser/PWA notifications remain foreground-only.

## Real-device acceptance checklist
- [ ] Build and install with the free Personal Team, then reopen the app.
- [ ] Import an existing backup or carefully verify authenticated household sync.
- [ ] Test camera/photo inputs, PDFs, backups, external links, and sharing.
- [ ] Grant and deny notifications; verify a test due-date alert arrives while app is closed.
- [ ] Edit and complete an item; reopen and confirm stale pending alerts are cancelled.
- [ ] Verify notification timing over a daylight-saving/time zone change and note that future dates only refresh while app is opened.
- [ ] Verify Supabase sign-in/redirects with the native WebView origin; do not loosen database security to fix a login issue.

Do not commit personal records, signing keys or provisioning profiles. TestFlight requires the paid Apple Developer Program; the free Apple Account only supports direct Xcode installation. Reference: https://developer.apple.com/help/account/basics/about-your-developer-account and https://capacitorjs.com/docs/ios .
