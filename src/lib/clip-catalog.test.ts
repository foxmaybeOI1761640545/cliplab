import { describe, expect, it } from "vitest";
import { filterAndSortClips, type ClipCatalogRecord } from "./clip-catalog";

const records: ClipCatalogRecord[] = [
  {
    id: "c1",
    name: "第一次合作",
    animation_id: "a1",
    episode_id: "e1",
    stage: "提出冲突",
    status: "可用",
    grade: "七年级",
    themes: ["合作", "友情"],
    start_seconds: 120,
    end_seconds: 300,
    play_minutes: null,
    updated_at: "2026-11-19T10:00:00.000Z",
    highlight_notes: "队员发生争执",
    questions: "为什么会产生分歧？",
    discussion_goal: "理解合作中的沟通",
    summary: "合作需要倾听",
    teaching_notes: null,
    animation_name: "星际小队",
    episode_label: "第1集·分歧",
    resource_play_statuses: ["免费播放"],
    resource_copyright_statuses: ["待核实"],
  },
  {
    id: "c2",
    name: "控制情绪",
    animation_id: "a2",
    episode_id: null,
    stage: "推进解决",
    status: "待剪辑",
    grade: "七年级",
    themes: ["情绪管理", "自制力"],
    start_seconds: 600,
    end_seconds: 960,
    play_minutes: 6,
    updated_at: "2026-11-18T10:00:00.000Z",
    highlight_notes: null,
    questions: "角色如何冷静下来？",
    discussion_goal: null,
    summary: null,
    teaching_notes: "注意引导学生联系生活",
    animation_name: "山海少年",
    episode_label: "未指定集数",
    resource_play_statuses: [],
    resource_copyright_statuses: [],
  },
  {
    id: "c3",
    name: "结尾总结",
    animation_id: "a1",
    episode_id: "e1",
    stage: null,
    status: "构思中",
    grade: "八年级",
    themes: ["合作"],
    start_seconds: null,
    end_seconds: null,
    play_minutes: null,
    updated_at: "2026-11-17T10:00:00.000Z",
    highlight_notes: null,
    questions: null,
    discussion_goal: null,
    summary: "团队共同完成目标",
    teaching_notes: null,
    animation_name: "星际小队",
    episode_label: "第1集·分歧",
    resource_play_statuses: ["需登录"],
    resource_copyright_statuses: ["需进一步确认"],
  },
];

describe("片段库筛选与排序", () => {
  it("支持关键词搜索动画、集数、提问和教学备注", () => {
    expect(filterAndSortClips(records, { query: "星际小队" }).map((x) => x.id)).toEqual(["c1", "c3"]);
    expect(filterAndSortClips(records, { query: "为什么会产生分歧" }).map((x) => x.id)).toEqual(["c1"]);
    expect(filterAndSortClips(records, { query: "联系生活" }).map((x) => x.id)).toEqual(["c2"]);
  });

  it("支持组合动画、集数、主题和阶段筛选", () => {
    expect(filterAndSortClips(records, {
      animationId: "a1",
      episodeId: "e1",
      theme: "合作",
      stage: "提出冲突",
    }).map((x) => x.id)).toEqual(["c1"]);
  });

  it("支持年级与片段状态筛选", () => {
    expect(filterAndSortClips(records, { grade: "七年级", status: "待剪辑" }).map((x) => x.id)).toEqual(["c2"]);
  });

  it("区分没有登记资源与具体播放状态", () => {
    expect(filterAndSortClips(records, { playStatus: "未登记" }).map((x) => x.id)).toEqual(["c2"]);
    expect(filterAndSortClips(records, { playStatus: "免费播放" }).map((x) => x.id)).toEqual(["c1"]);
  });

  it("支持版权状态筛选", () => {
    expect(filterAndSortClips(records, { copyrightStatus: "需进一步确认" }).map((x) => x.id)).toEqual(["c3"]);
    expect(filterAndSortClips(records, { copyrightStatus: "未登记" }).map((x) => x.id)).toEqual(["c2"]);
  });

  it("支持最近更新、名称和起始时间排序", () => {
    expect(filterAndSortClips(records, {}).map((x) => x.id)).toEqual(["c1", "c2", "c3"]);
    expect(filterAndSortClips(records, { sort: "name" }).map((x) => x.id)).toEqual(["c1", "c3", "c2"]);
    expect(filterAndSortClips(records, { sort: "start" }).map((x) => x.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("支持片段时长排序，缺失时长排在最后", () => {
    expect(filterAndSortClips(records, { sort: "duration-desc" }).map((x) => x.id)).toEqual(["c2", "c1", "c3"]);
    expect(filterAndSortClips(records, { sort: "duration-asc" }).map((x) => x.id)).toEqual(["c1", "c2", "c3"]);
  });
});
