# How to Use the Global Confirmation Dialog

This guide explains how to use the global promise-based confirmation dialog.

---

## 1. Import and Call `useConfirm`

To trigger a confirmation dialog, use the `useConfirm` hook inside your components. It returns an async function that resolves to `true` (if confirmed) or `false` (if canceled).

```tsx
import { useConfirm } from "@/store/confirm-store";

export function MyComponent() {
  const confirm = useConfirm();

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: "Delete Item?",
      desc: "Are you sure you want to delete this item? This action cannot be undone.",
      destructive: true,
      confirmText: "Delete",
      cancelBtnText: "Cancel",
    });

    if (isConfirmed) {
      // Perform delete operation
    }
  };
}
```

---

## 2. Configuration Options (`ConfirmOptions`)

The `confirm` function accepts the following options:

| Option | Type | Description |
| ------ | ---- | ----------- |
| `title` | `React.ReactNode` | The title header of the dialog. |
| `desc` | `React.JSX.Element \| string` | The description/body text of the dialog. |
| `confirmText` | `React.ReactNode` | Custom text for the confirm button (default: `"Continue"`). |
| `cancelBtnText` | `string` | Custom text for the cancel button (default: `"Cancel"`). |
| `destructive` | `boolean` | If true, confirms in red (destructive style). |
| `disabled` | `boolean` | If true, disables both dialog buttons. |
| `isLoading` | `boolean` | If true, disables dialog buttons and displays a `<Spinner />` inside the confirm button. |
| `closeOnConfirm` | `boolean` | If false, keeps the dialog open after confirmation (default: `true`). |

---

## 3. Asynchronous Operation / Loading State Example

If you need to show a loading state in the dialog button while performing an async operation (e.g. logging out or deleting an item):

```tsx
import { useConfirm, useConfirmStore } from "@/store/confirm-store";

export function MyComponent() {
  const confirm = useConfirm();

  const handleAction = async () => {
    const isConfirmed = await confirm({
      title: "Perform action?",
      desc: "Are you sure? This will execute a long-running process.",
      closeOnConfirm: false, // Keep dialog open on confirm click
    });

    if (!isConfirmed) return;

    // Show loading spinner inside the confirm button
    useConfirmStore.getState().setIsLoading(true);

    try {
      await apiCall();
    } finally {
      // Close the confirmation dialog
      useConfirmStore.getState().close();
    }
  };
}
```
