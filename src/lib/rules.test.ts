import { describe, expect, it } from "vitest";
import { clipDuration, formatTimecode, parseTimecode } from "./time";
import { summarizeLesson } from "./lesson";
import { parseCSV, toCSV } from "./csv";
import { deriveSuggestions } from "./suggestions";
import { summarizeResources, type Resource } from "./db";

describe("时间码解析", () => {
  it("支持 mm:ss", () => expect(parseTimecode("03:20")).toEqual({ ok: true, seconds: 200 }));
  it("支持 hh:mm:ss", () => expect(parseTimecode("1:02:03")).toEqual({ ok: true, seconds: 3723 }));
  it("空值视为暂未知", () => expect(parseTimecode("")).toEqual({ ok: true, seconds: null }));
  it("拒绝秒数 ≥ 60", () => expect(parseTimecode("01:75").ok).toBe(false));
  it("拒绝纯数字", () => expect(parseTimecode("90").ok).toBe(false));
  it("格式化", () => {
    expect(formatTimecode(200)).toBe("03:20");
    expect(formatTimecode(3723)).toBe("1:02:03");
  });
});

describe("片段时长", () => {
  it("结束减开始", () => expect(clipDuration(200, 365).seconds).toBe(165));
  it("结束必须晚于开始", () => expect(clipDuration(300, 300).error).toBeTruthy());
  it("缺少时间时为空", () => expect(clipDuration(null, 100).seconds).toBeNull());
});

describe("40 分钟课堂用时", () => {
  it("低于 40 分钟显示剩余", () => {
    const s = summarizeLesson(
      [
        { stage: "引出问题", minutes: 5 },
        { stage: "推进解决", minutes: 12.5 },
      ],
      40,
    );
    expect(s.used).toBe(17.5);
    expect(s.remaining).toBe(22.5);
    expect(s.state).toBe("under");
    expect(s.byStage["推进解决"]).toBe(12.5);
  });
  it("超过 40 分钟标记超时", () => {
    const s = summarizeLesson(
      [
        { stage: "引出问题", minutes: 20 },
        { stage: "课堂总结", minutes: 25 },
      ],
      40,
    );
    expect(s.state).toBe("over");
    expect(s.remaining).toBe(-5);
  });
  it("刚好 40 分钟", () => expect(summarizeLesson([{ stage: "提出冲突", minutes: 40 }], 40).state).toBe("exact"));
  it("可修改总课时", () => expect(summarizeLesson([{ stage: "提出冲突", minutes: 40 }], 45).remaining).toBe(5));
});

describe("CSV", () => {
  it("往返转换含逗号、引号与换行", () => {
    const csv = toCSV(["a", "b"], [["x,1", 'he said "hi"\nok']]);
    expect(parseCSV(csv)).toEqual([["a", "b"], ["x,1", 'he said "hi"\nok']]);
  });
});

describe("资源状态", () => {
  it("无资源时为未登记，而不是可用", () => {
    expect(summarizeResources([]).play).toBe("未登记");
  });
  it("待核实资源不会被当作可用", () => {
    const r = { play_status: "待核实", copyright_status: "待核实", verified_at: null, updated_at: "2026-01-01" } as unknown as Resource;
    expect(summarizeResources([r]).play).toBe("待核实");
  });
});

describe("行动建议", () => {
  const clip = { id: "c1", name: "片段A", animation_id: "a1", episode_id: null, start_seconds: null, end_seconds: null, status: "构思中" };
  it("缺少时间码时建议补充", () => {
    const s = deriveSuggestions({ clips: [clip], resources: [], lessons: [], items: [], tasks: [] });
    expect(s.some((x) => x.taskType === "补充时间码" && x.clip_id === "c1")).toBe(true);
  });
  it("已有未完成同类任务时不重复建议", () => {
    const s = deriveSuggestions({
      clips: [clip],
      resources: [],
      lessons: [],
      items: [],
      tasks: [{ task_type: "补充时间码", status: "进行中", clip_id: "c1", lesson_id: null, title: "x" }],
    });
    expect(s.some((x) => x.taskType === "补充时间码")).toBe(false);
  });
  it("课堂超时建议调整", () => {
    const s = deriveSuggestions({
      clips: [],
      resources: [],
      lessons: [{ id: "l1", title: "课", total_minutes: 40 }],
      items: [{ lesson_id: "l1", stage: "引出问题", minutes: 45 }],
      tasks: [],
    });
    expect(s[0].taskType).toBe("调整课堂流程");
  });
});
