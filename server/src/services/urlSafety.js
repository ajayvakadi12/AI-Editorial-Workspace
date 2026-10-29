import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

/**
 * Checks whether an IP address is considered private, loopback, link-local, or cloud metadata.
 * @param {string} ipStr 
 * @returns {boolean} true if IP is restricted/unsafe
 */
export function isPrivateOrRestrictedIp(ipStr) {
  try {
    let addr = ipaddr.parse(ipStr);

    // If it's an IPv4-mapped IPv6 address (::ffff:192.0.2.1), convert to IPv4
    if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
      addr = addr.toIPv4Address();
    }

    const range = addr.range();

    // Restricted IPv4/IPv6 ranges
    const restrictedRanges = [
      'loopback',        // 127.0.0.0/8 or ::1
      'private',         // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7
      'linkLocal',       // 169.254.0.0/16 or fe80::/10 (includes AWS/GCP metadata)
      'uniqueLocal',     // fc00::/7
      'carrierGradeNat', // 100.64.0.0/10
      'broadcast',       // 255.255.255.255
      'unspecified',     // 0.0.0.0 or ::
      'reserved',
    ];

    if (restrictedRanges.includes(range)) {
      return true;
    }

    // Additional explicit checks for cloud metadata endpoints
    const octets = addr.toByteArray ? addr.toByteArray() : [];
    if (addr.kind() === 'ipv4') {
      const [o1, o2] = octets;
      if (o1 === 169 && o2 === 254) return true; // Link-local / metadata
      if (o1 === 127) return true;                // Loopback
      if (o1 === 10) return true;                 // 10.0.0.0/8
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12
      if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16
      if (o1 === 0) return true;                  // 0.0.0.0/8
    }

    return false;
  } catch {
    // If it fails to parse as valid IP, fail closed
    return true;
  }
}

/**
 * Validates a URL against SSRF rules:
 * - Must use http or https scheme
 * - No user/password credentials in URL
 * - Port must be 80, 443, or empty
 * - Host must not be empty or localhost
 * - Resolves hostname via DNS and verifies all resolved IPs are public
 * 
 * @param {string} urlString 
 * @returns {Promise<{ valid: boolean, error?: string, resolvedIps?: string[] }>}
 */
export async function validateUrlForSsrf(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, error: 'Malformed URL.' };
  }

  // 1. Protocol validation
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Invalid protocol '${parsed.protocol}'. Only http: and https: are allowed.` };
  }

  // 2. Credentials in URL
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with embedded credentials are not allowed.' };
  }

  // 3. Port restrictions
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { valid: false, error: `Port '${parsed.port}' is not allowed. Only standard web ports (80, 443) are supported.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 4. Localhost string check
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { valid: false, error: `Access to local/internal host '${hostname}' is blocked.` };
  }

  // 5. Check if hostname is directly an IP literal
  if (ipaddr.isValid(hostname)) {
    if (isPrivateOrRestrictedIp(hostname)) {
      return { valid: false, error: `Access to private/restricted IP literal '${hostname}' is blocked.` };
    }
    return { valid: true, resolvedIps: [hostname] };
  }

  // 6. Resolve DNS and check all resolved IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { valid: false, error: `Unable to resolve host '${hostname}'.` };
    }

    const resolvedIps = addresses.map((a) => a.address);

    for (const ip of resolvedIps) {
      if (isPrivateOrRestrictedIp(ip)) {
        return {
          valid: false,
          error: `Host '${hostname}' resolved to private/restricted IP address '${ip}'.`,
          resolvedIps,
        };
      }
    }

    return { valid: true, resolvedIps };
  } catch (err) {
    return { valid: false, error: `DNS lookup failed for host '${hostname}': ${err.message}` };
  }
}

