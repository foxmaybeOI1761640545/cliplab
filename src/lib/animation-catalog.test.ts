import { describe, expect, it } from "vitest";
import { filterAndSortAnimations, findDuplicateAnimation, type AnimationCatalogRecord } from "./animation-catalog";

const records: AnimationCatalogRecord[] = [
  {
    id: "a1",
    name: "星际小队",
    aliases: "星际冒险队、Star Team",
    production_info: "国产动画 · 2024",
    synopsis: "讲述团队合作与友情",
    notes: null,
    theme_tags: ["友情", "合作"],
    updated_at: "2026-11-18T10:00:00.000Z",
  },
  {
    id: "a2",
    name: "山海少年",
    aliases: null,
    production_info: "国产动画",
    synopsis: "关于自制力与成长",
    notes: "第二季资料待补",
    theme_tags: ["自制力"],
    updated_at: "2026-11-19T10:00:00.000Z",
  },
];

describe("动画作品列表筛选与排序", () => {
  it("支持按名称、别名和简介搜索", () => {
    expect(filterAndSortAnimations(records, { query: "Star Team" }).map((x) => x.id)).toEqual(["a1"]);
    expect(filterAndSortAnimations(records, { query: "成长" }).map((x) => x.id)).toEqual(["a2"]);
  });

  it("搜索时忽略大小写、全半角和空格差异", () => {
    expect(filterAndSortAnimations(records, { query: "star team" }).map((x) => x.id)).toEqual(["a1"]);
    expect(filterAndSortAnimations(records, { query: "国产动画" })).toHaveLength(2);
  });

  it("支持主题筛选", () => {
    expect(filterAndSortAnimations(records, { theme: "友情" }).map((x) => x.id)).toEqual(["a1"]);
  });

  it("默认按最近更新排序", () => {
    expect(filterAndSortAnimations(records, {}).map((x) => x.id)).toEqual(["a2", "a1"]);
  });

  it("支持名称排序和集数排序", () => {
    expect(filterAndSortAnimations(records, { sort: "name" }).map((x) => x.id)).toEqual(["a2", "a1"]);
    expect(filterAndSortAnimations(records, { sort: "episodes" }, new Map([["a1", 2], ["a2", 8]])).map((x) => x.id)).toEqual(["a2", "a1"]);
  });

  it("名称与别名交叉重复时阻止新增，但允许编辑自身", () => {
    expect(findDuplicateAnimation(records, { name: "星际冒险队" })?.id).toBe("a1");
    expect(findDuplicateAnimation(records, { name: "新名称", aliases: "山海少年" })?.id).toBe("a2");
    expect(findDuplicateAnimation(records, { name: "星际小队", aliases: "星际冒险队", excludeId: "a1" })).toBeUndefined();
    expect(findDuplicateAnimation(records, { name: "全新作品", aliases: "新别名" })).toBeUndefined();
  });
});
