## Summary

Users report that the ability to click a **+/image icon** to browse and select local images from disk is missing in the current version. In 5.x (Roo Code upstream), clicking the icon opened a native file picker dialog. Users now have to type image paths manually, which is a significant UX regression that is driving people to downgrade.

## Root Cause

In the [kilocode-legacy](https://github.com/Kilo-Org/kilocode-legacy) repo, the image select button (and surrounding toolbar section) has been **commented out** in [`webview-ui/src/components/chat/ChatTextArea.tsx`](https://github.com/Kilo-Org/kilocode-legacy/blob/15a1be7f97c9b2f19d50dd8077ee42486cfbf5bf/webview-ui/src/components/chat/ChatTextArea.tsx#L1979) with the note `kilocode_change: hidden on small containerWidth`:

```tsx
{
	/* kilocode_change: hidden on small containerWidth
    ...
    <StandardTooltip content={t("chat:addImages")}>
        <button
            onClick={!shouldDisableImages ? onSelectImages : undefined}
            ...>
            <Image className="w-4 h-4" />
        </button>
    </StandardTooltip>
    ...
*/
}
```

The underlying `onSelectImages` handler is fully functional — it posts a `selectImages` message to the extension host, which calls `vscode.window.showOpenDialog()`. The full backend implementation is in [`src/integrations/misc/process-images.ts`](https://github.com/Kilo-Org/kilocode-legacy/blob/15a1be7f97c9b2f19d50dd8077ee42486cfbf5bf/src/integrations/misc/process-images.ts) in kilocode-legacy. Only the UI button was removed.

## Expected Behavior (5.x / upstream)

- An image icon button is visible in the chat input toolbar
- Clicking it opens a native OS file picker filtered to image types (png, jpg, jpeg, webp)
- Selected images are attached to the message as base64 data URLs

## Steps to Reproduce

1. Open the Kilo Code chat panel
2. Look for an image/attach button in the chat input area
3. No such button exists — images can only be attached via drag-and-drop

## Proposed Fix

Re-enable the image button. If the concern is layout on small container widths, the button should be shown conditionally (e.g., only when `containerWidth` is above a threshold) rather than removed entirely. It could also be moved to a location that works at all widths.

## User Impact

Multiple users in the forums are asking how to go back to 5.x specifically because of this missing feature.
