/**
 * `Content-Disposition: inline` for a document served under its own label.
 *
 * A header value may only carry bytes up to 0xFF, and `new Response` throws on
 * anything else — before a byte is sent. Labels are typed by a landlord and
 * copied from recorded instruments, so they carry em dashes, curly quotes and
 * accents. On 2026-09-15 two governing documents on the pilot lease returned
 * HTTP 500 to every signer for exactly that reason.
 *
 * So the label goes out twice (RFC 6266 §4.3): an ASCII `filename` that any
 * client can read, and the exact name as UTF-8 in `filename*`, which every
 * current browser prefers.
 */
const disposition = (type: 'inline' | 'attachment', name: string): string => {
  const fallback = name
    .normalize('NFKD')
    .replace(/[\u2012-\u2015]/g, '-')
    // Combining marks left by NFKD, then anything outside printable ASCII.
    .replace(/[^\x20-\x7E]/g, '')
    // The three characters that could close the quoted string or the parameter.
    .replace(/["\\;]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // encodeURIComponent leaves ' ( ) * alone; RFC 5987 does not allow them.
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
};

export const inlineContentDisposition = (label: string): string => disposition('inline', `${label}.pdf`);

/** For a file the browser should save rather than show — the download-all zip. `name` carries its extension. */
export const attachmentContentDisposition = (name: string): string => disposition('attachment', name);
