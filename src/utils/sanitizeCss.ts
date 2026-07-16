/*
  sanitizeCss — defence against stored XSS through user shop `custom_css`.

  The public shop page injects the owner's CSS into a <style> tag via
  dangerouslySetInnerHTML. Without sanitisation a malicious owner could
  break out of the <style> element or smuggle script execution through
  legacy CSS vectors, running arbitrary JS in every visitor's browser.

  We neutralise:
    1. Any </style ...> variant (the tag-breakout vector). A regex on the
       literal "</style>" is bypassable ("</style foo>", "</style\n>"),
       so we strip anything that starts to close the tag.
    2. "<" and ">" entirely — real CSS never needs angle brackets, and
       removing them makes an element breakout impossible.
    3. javascript:/vbscript: URIs and the IE `expression()` / `-moz-binding`
       vectors, and @import (which can pull remote CSS that re-introduces
       the above or exfiltrates via background-image URL).
*/
export function sanitizeCss(raw: string | null | undefined): string {
  if (!raw) return '';
  return String(raw)
    // 1. any attempt to close the style element
    .replace(/<\s*\/\s*style/gi, '')
    // 2. angle brackets have no place in CSS — drop them so no tag can open
    .replace(/[<>]/g, '')
    // 3. script-ish URI schemes
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    // 4. legacy execution / binding vectors
    .replace(/expression\s*\(/gi, '')
    .replace(/-moz-binding/gi, '')
    .replace(/behavior\s*:/gi, '')
    // 5. remote CSS pulls
    .replace(/@import/gi, '');
}
