import { describe, expect, it } from "vitest";
import {
  canOpenResourceUrl,
  getResourcePlayLabel,
  inspectResourceUrl,
  needsCopyrightVerification,
  needsPlayVerification,
} from "./resource-review";

describe("资源链接核实", () => {
  it("区分缺少、无效、占位和真实 HTTP(S) 链接", () => {
    expect(inspectResourceUrl("")).toBe("missing");
    expect(inspectResourceUrl("not-a-url")).toBe("invalid");
    expect(inspectResourceUrl("ftp://video.example.org/file")).toBe("invalid");
    expect(inspectResourceUrl("https://example.com/watch/1")).toBe("placeholder");
    expect(inspectResourceUrl("https://cdn.example.net/video")).toBe("placeholder");
    expect(inspectResourceUrl("https://www.example.edu/watch/1")).toBe("ready");
  });

  it("占位链接即使被标成免费播放也不能作为已核实资源", () => {
    const resource = { url: "https://example.com/watch", play_status: "免费播放" };
    expect(getResourcePlayLabel(resource)).toBe("占位链接");
    expect(canOpenResourceUrl(resource.url)).toBe(false);
    expect(needsPlayVerification(resource)).toBe(true);
  });

  it("真实链接按手工记录的播放状态展示", () => {
    const resource = { url: "https://video.example.edu/watch/1", play_status: "免费播放但含广告" };
    expect(getResourcePlayLabel(resource)).toBe("免费播放但含广告");
    expect(canOpenResourceUrl(resource.url)).toBe(true);
    expect(needsPlayVerification(resource)).toBe(false);
  });

  it("播放核实与版权核实相互独立", () => {
    expect(needsCopyrightVerification({ copyright_status: "待核实" })).toBe(true);
    expect(needsCopyrightVerification({ copyright_status: "需进一步确认" })).toBe(true);
    expect(needsCopyrightVerification({ copyright_status: "已确认可用于课堂" })).toBe(false);
    expect(needsPlayVerification({ url: "https://video.example.edu/watch/1", play_status: "免费播放" })).toBe(false);
    expect(needsCopyrightVerification({ copyright_status: "不建议使用" })).toBe(false);
  });
});
