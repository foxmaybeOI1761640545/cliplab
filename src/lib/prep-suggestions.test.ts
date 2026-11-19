import { describe, expect, it } from "vitest";
import { buildPrepSuggestions, type PrepSuggestionData } from "./prep-suggestions";

const baseData = (): PrepSuggestionData => ({
  animations: [{ id: "a1", name: "真实动画", is_demo: false }],
  episodes: [{ id: "e1", animation_id: "a1", season: null, episode_number: 1, title: null, is_demo: false, source_url: null }],
  clips: [{
    id: "c1",
    name: "友情片段",
    animation_id: "a1",
    episode_id: "e1",
    status: "可用",
    start_seconds: 60,
    end_seconds: 180,
    questions: "如果你是主角会怎么做？",
    discussion_goal: "理解互相帮助",
    summary: "友谊需要行动",
    is_demo: false,
  }],
  resources: [],
  lessonPlans: [],
  lessonItems: [],
  tasks: [],
});

describe("备课行动建议", () => {
  it("为没有真实资源的片段建议补充播放资源", () => {
    const suggestions = buildPrepSuggestions(baseData());
    expect(suggestions.some((item) =>
      item.clip_id === "c1" && item.task_type === "核实播放" && item.title.includes("补充真实播放资源"),
    )).toBe(true);
  });

  it("将播放与版权核实拆成两项独立行动", () => {
    const data = baseData();
    data.resources.push({
      id: "r1",
      animation_id: "a1",
      episode_id: "e1",
      clip_id: "c1",
      platform: "测试平台",
      url: "https://example.com/watch",
      play_status: "免费播放",
      copyright_status: "需进一步确认",
      is_demo: false,
    });
    const suggestions = buildPrepSuggestions(data);
    expect(suggestions.some((item) => item.task_type === "更换链接" && item.clip_id === "c1")).toBe(true);
    expect(suggestions.some((item) => item.task_type === "确认版权" && item.clip_id === "c1")).toBe(true);
  });

  it("不会为 DEMO 片段、资源或课堂方案生成真实备课建议", () => {
    const data = baseData();
    data.clips[0].is_demo = true;
    data.resources.push({
      id: "r-demo",
      animation_id: "a1",
      episode_id: "e1",
      clip_id: "c1",
      platform: "Demo",
      url: "https://example.com",
      play_status: "待核实",
      copyright_status: "待核实",
      is_demo: true,
    });
    data.lessonPlans.push({ id: "l-demo", title: "测试方案", is_demo: true });
    expect(buildPrepSuggestions(data)).toEqual([]);
  });

  it("已有未完成行动时标记为已跟进，避免重复创建", () => {
    const data = baseData();
    data.tasks.push({
      id: "t1",
      task_type: "核实播放",
      status: "进行中",
      animation_id: "a1",
      episode_id: "e1",
      clip_id: "c1",
      lesson_id: null,
      is_demo: false,
    });
    const suggestion = buildPrepSuggestions(data).find((item) => item.task_type === "核实播放");
    expect(suggestion?.alreadyTracked).toBe(true);
  });

  it("为缺少时间码、提问和空课堂方案生成对应行动", () => {
    const data = baseData();
    data.clips[0].start_seconds = null;
    data.clips[0].questions = null;
    data.lessonPlans.push({ id: "l1", title: "自制力主题课", is_demo: false });
    const suggestions = buildPrepSuggestions(data);
    expect(suggestions.some((item) => item.task_type === "补充时间码")).toBe(true);
    expect(suggestions.some((item) => item.task_type === "完善提问")).toBe(true);
    expect(suggestions.some((item) => item.task_type === "调整课堂流程" && item.lesson_id === "l1")).toBe(true);
  });
});
