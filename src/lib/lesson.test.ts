import { describe, expect, it } from "vitest";
import { describeLessonTime, summarizeLesson } from "./lesson";

describe("课堂用时汇总", () => {
  it("按五个阶段汇总用时", () => {
    const summary = summarizeLesson([
      { stage: "引出问题", minutes: 3 },
      { stage: "引出问题", minutes: 2.5 },
      { stage: "提出冲突", minutes: 8 },
      { stage: "推进解决", minutes: 12 },
      { stage: "展示结果", minutes: 7 },
      { stage: "课堂总结", minutes: 7.5 },
    ], 40);
    expect(summary.byStage).toEqual({
      引出问题: 5.5,
      提出冲突: 8,
      推进解决: 12,
      展示结果: 7,
      课堂总结: 7.5,
    });
    expect(summary.used).toBe(40);
    expect(summary.remaining).toBe(0);
    expect(summary.state).toBe("exact");
    expect(summary.percent).toBe(100);
  });

  it("区分剩余时间和超时", () => {
    const under = summarizeLesson([{ stage: "引出问题", minutes: 5 }], 40);
    expect(under.remaining).toBe(35);
    expect(under.state).toBe("under");
    expect(describeLessonTime(under)).toBe("剩余 35 分钟");

    const over = summarizeLesson([{ stage: "课堂总结", minutes: 45.5 }], 40);
    expect(over.remaining).toBe(-5.5);
    expect(over.state).toBe("over");
    expect(describeLessonTime(over)).toBe("已超时 5.5 分钟");
  });

  it("忽略未知阶段并安全处理空值", () => {
    const summary = summarizeLesson([
      { stage: "未知阶段", minutes: 20 },
      { stage: "引出问题", minutes: null },
      { stage: "提出冲突", minutes: "4.5" },
    ], 40);
    expect(summary.used).toBe(4.5);
    expect(summary.byStage["引出问题"]).toBe(0);
    expect(summary.byStage["提出冲突"]).toBe(4.5);
  });
});
