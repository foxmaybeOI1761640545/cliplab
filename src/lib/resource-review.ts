export type ResourceLinkState = "missing" | "placeholder" | "invalid" | "ready";

const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "example.invalid",
  "example.test",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
]);

export function inspectResourceUrl(value: string | null | undefined): ResourceLinkState {
  const raw = value?.trim();
  if (!raw) return "missing";

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "invalid";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "invalid";
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (PLACEHOLDER_HOSTS.has(host) || [...PLACEHOLDER_HOSTS].some((base) => host.endsWith("." + base))) {
    return "placeholder";
  }
  return "ready";
}

export function canOpenResourceUrl(value: string | null | undefined): boolean {
  return inspectResourceUrl(value) === "ready";
}

export function getResourcePlayLabel(resource: {
  url?: string | null;
  play_status?: string | null;
}): string {
  const linkState = inspectResourceUrl(resource.url);
  if (linkState === "missing") return "缺少链接";
  if (linkState === "placeholder") return "占位链接";
  if (linkState === "invalid") return "无效链接";
  return resource.play_status?.trim() || "待核实";
}

export function needsPlayVerification(resource: {
  url?: string | null;
  play_status?: string | null;
}): boolean {
  return inspectResourceUrl(resource.url) !== "ready" || !resource.play_status || resource.play_status === "待核实";
}

export function needsCopyrightVerification(resource: {
  copyright_status?: string | null;
}): boolean {
  return !resource.copyright_status ||
    resource.copyright_status === "待核实" ||
    resource.copyright_status === "需进一步确认";
}
