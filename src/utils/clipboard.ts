/**
 * Copy text to clipboard with fallback for environments where
 * the modern Clipboard API is unavailable (e.g., ChromeOS, non-secure contexts).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first (throws if not in secure context)
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy method
    }
  }
  // Fallback: use execCommand with a hidden textarea
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
