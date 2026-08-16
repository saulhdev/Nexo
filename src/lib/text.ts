/**
 * Utility to strip HTML tags and decode basic entities for plain text previews
 */
export function stripHtml(html?: string | null): string {
  if (!html) return ''
  // Replace block tags with spaces to keep separation
  const formatted = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, ' ')
    .replace(/<br\s*[\/]?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return formatted
}
