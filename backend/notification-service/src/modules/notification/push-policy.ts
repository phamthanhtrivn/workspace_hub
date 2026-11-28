import { BadRequestException } from "@nestjs/common";
import { lookup } from "node:dns/promises";
import { Agent } from "node:https";
import { BlockList, isIP } from "node:net";

export const PUSH_POLICY = {
  timeout: 5000,
  subscriptions: 10,
  concurrency: 5,
} as const;
const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(network, prefix, "ipv4");
const publicV6 = new BlockList();
publicV6.addSubnet("2000::", 3, "ipv6");
for (const [network, prefix] of [
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
] as const)
  blocked.addSubnet(network, prefix, "ipv6");

export function assertPushEndpoint(endpoint: string): URL {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new BadRequestException("Invalid push endpoint");
  }
  const allowed = (process.env.WEB_PUSH_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (
    url.protocol !== "https:" ||
    (url.port && url.port !== "443") ||
    url.username ||
    url.password ||
    url.hash ||
    !allowed.includes(url.hostname.toLowerCase()) ||
    isIP(url.hostname.replace(/^\[|\]$/g, ""))
  )
    throw new BadRequestException("Push endpoint is not allowed");
  return url;
}

export async function pushAgent(endpoint: string): Promise<Agent> {
  const url = assertPushEndpoint(endpoint);
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(({ address, family }) =>
      family === 4
        ? blocked.check(address, "ipv4")
        : !publicV6.check(address, "ipv6") || blocked.check(address, "ipv6"),
    )
  )
    throw new BadRequestException(
      "Push endpoint must resolve to a public address",
    );
  const address = addresses[0];
  // Pin the validated resolution so DNS cannot change between validation and connect.
  return new Agent({
    autoSelectFamily: false,
    lookup: (_hostname, _options, callback) =>
      callback(null, address.address, address.family),
  });
}

let active = 0;
const waiting: Array<() => void> = [];
export async function withPushSlot<T>(send: () => Promise<T>): Promise<T> {
  if (active >= PUSH_POLICY.concurrency)
    await new Promise<void>((resolve) => waiting.push(resolve));
  else active++;
  try {
    return await send();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}
