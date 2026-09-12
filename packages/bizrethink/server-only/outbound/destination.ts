import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { domainToASCII } from 'node:url';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

import { withOutboundDeadline } from './deadline';

export type OutboundAddress = { address: string; family: number };
export type OutboundLookup = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<OutboundAddress[] | OutboundAddress>;
export type OutboundDestination = { hostname: string; address: string; family: 4 | 6 };

export const invalidOutboundDestination = () =>
  new AppError(AppErrorCode.INVALID_REQUEST, {
    message: 'The outbound destination is not permitted or could not be resolved.',
  });

// Conservative Internet-only policy. Use Node's IP parser/CIDR matching rather
// than string prefixes (which miss mapped IPv4 and much of fe80::/10).
// Special-purpose registries checked 2026-09-12:
// https://www.iana.org/assignments/iana-ipv4-special-registry/
// https://www.iana.org/assignments/iana-ipv6-special-registry/
const nonPublicV4 = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  nonPublicV4.addSubnet(address, prefix, 'ipv4');
}
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
const specialV6 = new BlockList();
for (const [address, prefix] of [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
] as const) {
  specialV6.addSubnet(address, prefix, 'ipv6');
}

export const isPublicOutboundAddress = (address: string): boolean => {
  if (address.includes('%')) {
    return false;
  }
  const family = isIP(address);
  if (family === 4) {
    return !nonPublicV4.check(address, 'ipv4');
  }
  // Also excludes IPv4-mapped/compatible, NAT64, local, multicast and reserved
  // forms. A caller can use an ordinary public IPv4 address instead of a tunnel.
  return family === 6 && globalV6.check(address, 'ipv6') && !specialV6.check(address, 'ipv6');
};

export const normalizeOutboundHostname = (input: string): string => {
  const trimmed = input.trim().toLowerCase().replace(/\.+$/, '');
  const bare = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed;
  if (!bare || bare.includes('%')) {
    throw invalidOutboundDestination();
  }
  if (isIP(bare)) {
    return bare;
  }
  // domainToASCII uses URL parsing and silently truncates at '/', '?', '#'
  // and backslash. A hostname field/exception must not turn a URL into a grant.
  if (/[/\\?#@:[\]\s]/.test(bare)) {
    throw invalidOutboundDestination();
  }
  const hostname = domainToASCII(bare);
  if (
    !hostname ||
    hostname.length > 253 ||
    !hostname.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  ) {
    throw invalidOutboundDestination();
  }
  return hostname;
};

export const resolveOutboundDestination = async (
  input: string,
  options: { allowPrivate?: boolean; lookup?: OutboundLookup } = {},
): Promise<OutboundDestination> => {
  const hostname = normalizeOutboundHostname(input);
  const literalFamily = isIP(hostname);
  let addresses: OutboundAddress[];
  try {
    if (literalFamily) {
      addresses = [{ address: hostname, family: literalFamily }];
    } else {
      const result = await withOutboundDeadline(
        () => (options.lookup ?? lookup)(hostname, { all: true, verbatim: true }),
        2_000,
      );
      addresses = Array.isArray(result) ? result : [result];
    }
    if (
      addresses.length === 0 ||
      addresses.some(
        ({ address, family }) =>
          !address ||
          address.includes('%') ||
          (family !== 4 && family !== 6) ||
          isIP(address) !== family ||
          (!options.allowPrivate && !isPublicOutboundAddress(address)),
      )
    ) {
      throw invalidOutboundDestination();
    }
  } catch {
    throw invalidOutboundDestination();
  }
  const first = addresses[0];
  // The entire answer was checked above. Pin one address for this attempt;
  // retries go back through the same policy and do not use a cached connection.
  return { hostname, address: first.address, family: first.family === 4 ? 4 : 6 };
};
