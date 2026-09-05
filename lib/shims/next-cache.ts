export function revalidatePath(path: string, type?: 'page' | 'layout'): void {
  // Client-side shim for revalidatePath
}

export function revalidateTag(tag: string): void {
  // Client-side shim for revalidateTag
}

export function unstable_cache<T extends (...args: any[]) => Promise<any>>(
  cb: T,
  keyParts?: string[],
  options?: { revalidate?: number | false; tags?: string[] }
): T {
  return cb;
}
