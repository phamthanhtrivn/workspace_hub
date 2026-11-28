// The Office service fetches the source URL from Microsoft's servers, not the browser.
export function canUseOfficeViewer(source: string): boolean {
  try {
    const url = new URL(source);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (host.startsWith("[")) {
      return (
        host !== "[::]" &&
        host !== "[::1]" &&
        !/^\[(?:f[cd]|fe[89ab]|::ffff:)/.test(host)
      );
    }
    if (
      !host.includes(".") ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    )
      return false;
    const octets = host.split(".").map(Number);
    if (octets.length === 4 && octets.every(Number.isInteger)) {
      const [first, second] = octets;
      if (
        first === 0 ||
        first === 10 ||
        first === 127 ||
        first >= 224 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 100 && second >= 64 && second <= 127)
      )
        return false;
    }

    return true;
  } catch {
    return false;
  }
}
