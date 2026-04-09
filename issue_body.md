## Summary

Users report that the ability to click an image icon to browse and select local images from disk is missing in the new version. This feature exists and works in [kilocode-legacy](https://github.com/Kilo-Org/kilocode-legacy) and should be brought into the rewrite.

## How It Works in kilocode-legacy

The feature is implemented end-to-end across three layers:

### 1. Backend — file picker + base64 encoding

[`src/integrations/misc/process-images.ts`](https://github.com/Kilo-Org/kilocode-legacy/blob/15a1be7f97c9b2f19d50dd8077ee42486cfbf5bf/src/integrations/misc/process-images.ts)

A `selectImages()` function opens a native OS file picker via `vscode.window.showOpenDialog()`, filtered to `png`, `jpg`, `jpeg`, `webp`. Each selected file is read from disk and returned as a base64 data URL.

### 2. Message handler — wires webview message to backend

[`src/core/webview/webviewMessageHandler.ts`](https://github.com/Kilo-Org/kilocode-legacy/blob/15a1be7f97c9b2f19d50dd8077ee42486cfbf5bf/src/core/webview/webviewMessageHandler.ts#L764)

When the webview posts `{ type: "selectImages" }`, the handler calls `selectImages()` and posts back `{ type: "selectedImages", images }` with the resulting data URLs.

### 3. Webview — button, state, and response handling

**[`webview-ui/src/components/chat/ChatView.tsx`](https://github.com/Kilo-Org/kilocode-legacy/blob/15a1be7f97c9b2f19d50dd8077ee42486cfbf5bf/webview-ui/src/components/chat/ChatView.tsx#L918)**

- `selectedImages` state holds the current list of attached image data URLs
- `selectImages` callback posts `{ type: "selectImages" }` to the extension
- Incoming `selectedImages` messages append the returned images to state (up to `MAX_IMAGES_PER_MESSAGE`)
- Both `selectedImages` and `onSelectImages` are passed as props to `ChatTextArea`

**[`webview-ui/src/components/chat/ChatTextArea.tsx`](https://github.com/Kilo-Org/kilocode-legacy/blob/15a1be7f97c9b2f19d50dd8077ee42486cfbf5bf/webview-ui/src/components/chat/ChatTextArea.tsx#L1979)**

An image icon button in the chat input toolbar calls `onSelectImages()` when clicked. The button is disabled (with visual feedback) when the current model does not support images or the per-message image limit is reached.

## Expected User Experience

- An image icon button is visible in the chat input toolbar
- Clicking it opens a native OS file picker filtered to image types
- Selected images appear as thumbnails below the text input
- Images are sent along with the message as base64 data URLs
