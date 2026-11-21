# WorkspaceHub thesis interface samples

Open [index.html](index.html) to choose from the 20 English interface samples. The pages reuse the application's components and design tokens with sample data and local API/realtime adapters. Keep the `assets/` folder beside the HTML files.

The [Meeting Room](15-meeting-room.html) uses the current room component with its existing sample participants and controls. Live captions (CC) have been removed. Voice-message transcription and AI summaries of completed meeting recordings remain separate application features.

These pages are screenshot previews. Local navigation and selected controls work with sample state; they do not connect to production services or save changes to a database.

To refresh the pages after changing the application components, install the frontend dependencies, then run from the repository root:

```powershell
node docs/thesis/interfaces/source/build.cjs
```

`source/fixtures.js` contains the shared sample data, including the populated dashboard, calendar tasks and project examples. The builder generates `assets/system.css` and `assets/system-ui.js`; `assets/styles.css` supplies the original index layout.

The bundled Inter font is distributed with its [SIL Open Font License](assets/INTER-LICENSE.txt).

If the browser still shows an unstyled or outdated page after rebuilding, reload with Ctrl+F5.
