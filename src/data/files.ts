// Saving files from the browser: download, or write into a folder the user
// chose (File System Access API, Chrome/Edge on desktop). Nothing is ever
// uploaded anywhere; these files only go to the user's own disk.

// The parts of the File System Access API we use (not in TypeScript's
// standard types yet).
type PermissionMode = { mode: 'readwrite' }
interface FolderHandle extends FileSystemDirectoryHandle {
  queryPermission?: (d: PermissionMode) => Promise<PermissionState>
  requestPermission?: (d: PermissionMode) => Promise<PermissionState>
}
type PickerWindow = Window & {
  showDirectoryPicker?: (o: { id?: string; mode?: 'readwrite' }) => Promise<FileSystemDirectoryHandle>
}

/** Can this browser save into a folder the user picks? */
export function canPickFolder(): boolean {
  return typeof window !== 'undefined' && typeof (window as PickerWindow).showDirectoryPicker === 'function'
}

/** Ask the user for a folder. Throws an AbortError if they cancel. */
export async function pickFolder(): Promise<FileSystemDirectoryHandle> {
  return (window as PickerWindow).showDirectoryPicker!({ id: 'twelve-week-backups', mode: 'readwrite' })
}

/**
 * Browsers forget folder permission between visits. Check it, and ask again
 * if needed (this must happen during a click).
 */
export async function ensurePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const h = handle as FolderHandle
  if (!h.queryPermission || !h.requestPermission) return true
  if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true
  return (await h.requestPermission({ mode: 'readwrite' })) === 'granted'
}

export async function writeToFolder(folder: FileSystemDirectoryHandle, name: string, text: string): Promise<void> {
  const file = await folder.getFileHandle(name, { create: true })
  const writable = await file.createWritable()
  await writable.write(text)
  await writable.close()
}

/** Triggers a normal browser download of a text file. */
export function downloadFile(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** True for the error thrown when the user closes a file/folder picker. */
export const isCancel = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError'
