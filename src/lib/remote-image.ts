// Downloads an image from a web address, for the admin's spreadsheet import. Server-only.
//
// Only public http(s) addresses are fetched: the host must resolve to public IP addresses (never localhost, private
// networks or cloud metadata endpoints), redirects are followed by hand so every hop is checked the same way, and the
// download is capped at the upload size limit and a timeout. The bytes must be a real JPEG, PNG, WebP, AVIF or GIF.
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { type ImageType, MAX_UPLOAD_BYTES, sniffImageType, UploadError } from "@/lib/storage";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 20_000;

/**
 * Addresses that aren't the public internet. BlockList matches IPv4-mapped IPv6 addresses (::ffff:10.0.0.1) against
 * the IPv4 rules, so there's no ::ffff:0:0/96 rule: it would also match every plain IPv4 address.
 */
const privateRanges = new BlockList();
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
  privateRanges.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 127],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  privateRanges.addSubnet(network, prefix, "ipv6");

async function assertPublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || /\.(localhost|local|internal|home|lan)$/.test(host)) throw new UploadError("it isn't a public web address");
  const family = isIP(host);
  let addresses: { address: string; family: number }[];
  try {
    addresses = family ? [{ address: host, family }] : await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UploadError(`the website ${host} couldn't be found`);
  }
  if (!addresses.length || addresses.some((a) => privateRanges.check(a.address, a.family === 6 ? "ipv6" : "ipv4")))
    throw new UploadError("it isn't a public web address");
}

/** Reads a response body, refusing anything over `limit` bytes. */
async function readCapped(response: Response, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new UploadError("the image is larger than 8 MB");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export interface DownloadedImage {
  bytes: Uint8Array<ArrayBuffer>;
  type: ImageType;
}

/** Downloads one image. Throws UploadError with a short reason ("the server answered 404", …). */
export async function downloadImage(address: string): Promise<DownloadedImage> {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw new UploadError("it isn't a web address");
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new UploadError("only http and https addresses can be downloaded");
    if (url.username || url.password) throw new UploadError("addresses with a user name or password aren't downloaded");
    if (url.port && url.port !== "80" && url.port !== "443") throw new UploadError("only the standard web ports (80 and 443) are allowed");
    await assertPublicHost(url.hostname);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8" },
      });
    } catch (error) {
      throw new UploadError(error instanceof Error && error.name === "TimeoutError" ? "the download timed out" : "the website couldn't be reached");
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new UploadError(`the server answered ${response.status} without a new address`);
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new UploadError(`the server answered ${response.status}`);
    }
    if (Number(response.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES) {
      await response.body?.cancel();
      throw new UploadError("the image is larger than 8 MB");
    }
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      bytes = await readCapped(response, MAX_UPLOAD_BYTES);
    } catch (error) {
      if (error instanceof UploadError) throw error;
      throw new UploadError(error instanceof Error && error.name === "TimeoutError" ? "the download timed out" : "the download was interrupted");
    }
    const type = sniffImageType(bytes);
    if (!type) throw new UploadError("it isn't a JPEG, PNG, WebP, AVIF or GIF image");
    return { bytes, type };
  }
  throw new UploadError("it redirected too many times");
}
