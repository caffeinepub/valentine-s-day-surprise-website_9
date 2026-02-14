// URL helpers for managing saveId in the browser URL

export function getSaveIdFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('saveId');
}

export function setSaveIdInURL(saveId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('saveId', saveId);
  window.history.replaceState({}, '', url.toString());
}

export function buildShareableLink(saveId: string): string {
  const url = new URL(window.location.origin);
  url.searchParams.set('saveId', saveId);
  return url.toString();
}

export function removeSaveIdFromURL(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('saveId');
  window.history.replaceState({}, '', url.toString());
}
