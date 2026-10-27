import toast from 'react-hot-toast';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** First valid id inside a route param (pasted links sometimes carry extra text after the id) */
export const extractId = (raw?: string): string | null => {
  if (!raw) return null;
  const match = decodeURIComponent(raw).match(UUID_RE);
  return match ? match[0].toLowerCase() : null;
};

/** Clean, permanent link for a product or combo — no tracking parameters, always the site origin */
export const itemLink = (kind: 'product' | 'combo', id: string) => `${window.location.origin}/${kind}/${id}`;

/**
 * Share a product/combo link. Phones get the native share sheet (title + link only, so "Copy"
 * in the sheet copies just the link); computers copy the link straight to the clipboard.
 */
export async function shareItem(kind: 'product' | 'combo', id: string, title: string) {
  const url = itemLink(kind, id);
  const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches;
  try {
    if (isTouchDevice && navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success('Link copied');
  } catch (err: any) {
    if (err?.name === 'AbortError') return; // user closed the share sheet
    window.prompt('Copy this link:', url);
  }
}
