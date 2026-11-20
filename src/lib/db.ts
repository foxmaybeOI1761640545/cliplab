import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Animation = Tables<"animations">;
export type Episode = Tables<"episodes">;
export type Clip = Tables<"clips">;
export type Resource = Tables<"resources">;
export type LessonPlan = Tables<"lesson_plans">;
export type LessonItem = Tables<"lesson_items">;
export type ActionTask = Tables<"action_tasks">;

export type TableName =
  | "animations"
  | "episodes"
  | "clips"
  | "resources"
  | "lesson_plans"
  | "lesson_items"
  | "action_tasks";

const STORE_NAMES: TableName[] = [
  "animations",
  "episodes",
  "clips",
  "resources",
  "lesson_plans",
  "lesson_items",
  "action_tasks",
];
const DATABASE_NAME = "cliplab-local";
const DATABASE_VERSION = 1;
const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

type BackupData = { [K in TableName]: Tables<K>[] };
type BackupFile = {
  format: "cliplab-local-backup";
  version: 1;
  exportedAt: string;
  data: BackupData;
};

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("当前环境不支持 IndexedDB，请使用较新的浏览器。"));
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of STORE_NAMES) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: "id" });
            store.createIndex("updated_at", "updated_at", { unique: false });
            if (name === "animations") store.createIndex("name", "name", { unique: true });
          }
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => {
        databasePromise = undefined;
        reject(request.error ?? new Error("无法打开本地数据库"));
      };
      request.onblocked = () => {
        databasePromise = undefined;
        reject(new Error("本地数据库正在被其他标签页占用，请关闭其他 ClipLab 标签页后重试。"));
      };
    });
  }
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("本地数据库操作失败"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("本地数据库事务已取消"));
    transaction.onerror = () => reject(transaction.error ?? new Error("本地数据库事务失败"));
  });
}

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function readTable<T extends TableName>(table: T): Promise<Tables<T>[]> {
  const db = await openDatabase();
  const transaction = db.transaction(table, "readonly");
  const done = transactionDone(transaction);
  const rows = await requestResult(transaction.objectStore(table).getAll()) as Tables<T>[];
  await done;
  return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function readAllTables(): Promise<BackupData> {
  const entries = await Promise.all(STORE_NAMES.map(async (name) => [name, await readTable(name)] as const));
  return Object.fromEntries(entries) as BackupData;
}

const tableQuery = <T extends TableName>(table: T) =>
  queryOptions({
    queryKey: ["db", table],
    queryFn: () => readTable(table),
    staleTime: 60_000,
  });

export const q = {
  animations: tableQuery("animations"),
  episodes: tableQuery("episodes"),
  clips: tableQuery("clips"),
  resources: tableQuery("resources"),
  lessonPlans: tableQuery("lesson_plans"),
  lessonItems: tableQuery("lesson_items"),
  tasks: tableQuery("action_tasks"),
};

export const allQueries = Object.values(q);

export function useAllData() {
  const animations = useSuspenseQuery(q.animations).data;
  const episodes = useSuspenseQuery(q.episodes).data;
  const clips = useSuspenseQuery(q.clips).data;
  const resources = useSuspenseQuery(q.resources).data;
  const lessonPlans = useSuspenseQuery(q.lessonPlans).data;
  const lessonItems = useSuspenseQuery(q.lessonItems).data;
  const tasks = useSuspenseQuery(q.tasks).data;

  return useMemo(() => {
    const animationById = new Map(animations.map((a) => [a.id, a]));
    const episodeById = new Map(episodes.map((e) => [e.id, e]));
    const clipById = new Map(clips.map((c) => [c.id, c]));
    const lessonById = new Map(lessonPlans.map((l) => [l.id, l]));
    const group = <T, K extends keyof T>(arr: T[], key: K) => {
      const m = new Map<string, T[]>();
      for (const x of arr) {
        const k = x[key] as unknown as string | null;
        if (!k) continue;
        const list = m.get(k) ?? [];
        list.push(x);
        m.set(k, list);
      }
      return m;
    };
    return {
      animations,
      episodes,
      clips,
      resources,
      lessonPlans,
      lessonItems,
      tasks,
      animationById,
      episodeById,
      clipById,
      lessonById,
      episodesByAnimation: group(episodes, "animation_id"),
      clipsByAnimation: group(clips, "animation_id"),
      clipsByEpisode: group(clips, "episode_id"),
      resourcesByClip: group(resources, "clip_id"),
      itemsByLesson: group(lessonItems, "lesson_id"),
      itemsByClip: group(lessonItems, "clip_id"),
    };
  }, [animations, episodes, clips, resources, lessonPlans, lessonItems, tasks]);
}
export type AllData = ReturnType<typeof useAllData>;

/* ---------- 本地数据写入 ---------- */

async function insertRows<T extends TableName>(table: T, rows: Tables<T>[]) {
  const db = await openDatabase();
  const transaction = db.transaction(table, "readwrite");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(table);
  await Promise.all(rows.map((row) => requestResult(store.add(row))));
  await done;
}

async function updateRow<T extends TableName>(table: T, id: string, values: TablesUpdate<T>) {
  const db = await openDatabase();
  const transaction = db.transaction(table, "readwrite");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(table);
  const current = await requestResult(store.get(id)) as Tables<T> | undefined;
  if (!current) {
    transaction.abort();
    throw new Error("这条记录已不存在，请刷新页面后重试");
  }
  const updated = {
    ...current,
    ...(values as Record<string, unknown>),
    id,
    user_id: LOCAL_USER_ID,
    updated_at: new Date().toISOString(),
  } as Tables<T>;
  await requestResult(store.put(updated));
  await done;
  return updated;
}

const REMOVE_AFFECTED_STORES: Record<TableName, TableName[]> = {
  animations: ["animations", "episodes", "clips", "resources", "lesson_items", "action_tasks"],
  episodes: ["episodes", "clips", "resources", "lesson_items", "action_tasks"],
  clips: ["clips", "resources", "lesson_items", "action_tasks"],
  resources: ["resources"],
  lesson_plans: ["lesson_plans", "lesson_items", "action_tasks"],
  lesson_items: ["lesson_items"],
  action_tasks: ["action_tasks"],
};

async function removeRows(table: TableName, ids: string | string[]): Promise<TableName[]> {
  const targets = new Set(Array.isArray(ids) ? ids : [ids]);
  if (targets.size === 0) return [];
  const db = await openDatabase();

  // Leaf records have no dependent rows, so delete them without reading other stores.
  if (table === "resources" || table === "lesson_items" || table === "action_tasks") {
    const transaction = db.transaction(table, "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(table);
    for (const id of targets) store.delete(id);
    await done;
    return [table];
  }

  const affectedStores = REMOVE_AFFECTED_STORES[table];
  const transaction = db.transaction(affectedStores, "readwrite");
  const done = transactionDone(transaction);
  const all = await Promise.all(affectedStores.map((name) => requestResult(transaction.objectStore(name).getAll())));
  const rows = Object.fromEntries(STORE_NAMES.map((name) => [name, []])) as Record<TableName, Record<string, unknown>[]>;
  affectedStores.forEach((name, index) => { rows[name] = all[index] as Record<string, unknown>[]; });
  const now = new Date().toISOString();
  const removeIds = (name: TableName, set: Set<string>) => {
    for (const id of set) transaction.objectStore(name).delete(id);
  };
  const patchRows = (name: TableName, predicate: (row: Record<string, unknown>) => boolean, patch: (row: Record<string, unknown>) => Record<string, unknown>) => {
    for (const row of rows[name]) {
      if (predicate(row)) transaction.objectStore(name).put({ ...row, ...patch(row), updated_at: now });
    }
  };

  switch (table) {
    case "animations": {
      const episodeIds = new Set(rows.episodes.filter((r) => targets.has(String(r.animation_id))).map((r) => String(r.id)));
      const clipIds = new Set(rows.clips.filter((r) => targets.has(String(r.animation_id))).map((r) => String(r.id)));
      removeIds("animations", targets);
      removeIds("episodes", episodeIds);
      removeIds("clips", clipIds);
      patchRows("resources", (r) => targets.has(String(r.animation_id)) || episodeIds.has(String(r.episode_id)) || clipIds.has(String(r.clip_id)), (r) => ({
        animation_id: targets.has(String(r.animation_id)) ? null : r.animation_id,
        episode_id: episodeIds.has(String(r.episode_id)) ? null : r.episode_id,
        clip_id: clipIds.has(String(r.clip_id)) ? null : r.clip_id,
      }));
      patchRows("lesson_items", (r) => clipIds.has(String(r.clip_id)), () => ({ clip_id: null }));
      patchRows("action_tasks", (r) => targets.has(String(r.animation_id)) || episodeIds.has(String(r.episode_id)) || clipIds.has(String(r.clip_id)), (r) => ({
        animation_id: targets.has(String(r.animation_id)) ? null : r.animation_id,
        episode_id: episodeIds.has(String(r.episode_id)) ? null : r.episode_id,
        clip_id: clipIds.has(String(r.clip_id)) ? null : r.clip_id,
      }));
      break;
    }
    case "episodes": {
      const clipIds = new Set(rows.clips.filter((r) => targets.has(String(r.episode_id))).map((r) => String(r.id)));
      removeIds("episodes", targets);
      removeIds("clips", clipIds);
      patchRows("resources", (r) => targets.has(String(r.episode_id)) || clipIds.has(String(r.clip_id)), (r) => ({
        episode_id: targets.has(String(r.episode_id)) ? null : r.episode_id,
        clip_id: clipIds.has(String(r.clip_id)) ? null : r.clip_id,
      }));
      patchRows("lesson_items", (r) => clipIds.has(String(r.clip_id)), () => ({ clip_id: null }));
      patchRows("action_tasks", (r) => targets.has(String(r.episode_id)) || clipIds.has(String(r.clip_id)), (r) => ({
        episode_id: targets.has(String(r.episode_id)) ? null : r.episode_id,
        clip_id: clipIds.has(String(r.clip_id)) ? null : r.clip_id,
      }));
      break;
    }
    case "clips":
      removeIds("clips", targets);
      patchRows("resources", (r) => targets.has(String(r.clip_id)), () => ({ clip_id: null }));
      patchRows("lesson_items", (r) => targets.has(String(r.clip_id)), () => ({ clip_id: null }));
      patchRows("action_tasks", (r) => targets.has(String(r.clip_id)), () => ({ clip_id: null }));
      break;
    case "lesson_plans": {
      const itemIds = new Set(rows.lesson_items.filter((r) => targets.has(String(r.lesson_id))).map((r) => String(r.id)));
      removeIds("lesson_plans", targets);
      removeIds("lesson_items", itemIds);
      patchRows("action_tasks", (r) => targets.has(String(r.lesson_id)), () => ({ lesson_id: null }));
      break;
    }
    default:
      removeIds(table, targets);
  }
  await done;
  return affectedStores;
}
/* eslint-disable @typescript-eslint/no-explicit-any */
export function useDb() {
  const qc = useQueryClient();
  const refresh = (table?: TableName) => qc.invalidateQueries({ queryKey: table ? ["db", table] : ["db"] });
  return {
    refresh,
    async insert<T extends TableName>(table: T, values: TablesInsert<T> | TablesInsert<T>[]) {
      const inputs = (Array.isArray(values) ? values : [values]) as TablesInsert<T>[];
      const now = new Date().toISOString();
      const rows = inputs.map((value) => {
        const item = value as Record<string, unknown>;
        return {
          ...item,
          id: typeof item.id === "string" ? item.id : makeId(),
          user_id: LOCAL_USER_ID,
          created_at: typeof item.created_at === "string" ? item.created_at : now,
          updated_at: now,
        } as Tables<T>;
      });
      try {
        await insertRows(table, rows);
      } catch (error) {
        throw new Error(friendlyError((error as Error).message));
      }
      await refresh(table);
      return rows;
    },
    async update<T extends TableName>(table: T, id: string, values: TablesUpdate<T>) {
      try {
        const row = await updateRow(table, id, values);
        await refresh(table);
        return row;
      } catch (error) {
        throw new Error(friendlyError((error as Error).message));
      }
    },
    async remove(table: TableName, ids: string | string[]) {
      try {
        const changedTables = await removeRows(table, ids);
      } catch (error) {
        throw new Error(friendlyError((error as Error).message));
      }
      await Promise.all(changedTables.map((name) => refresh(name)));
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ---------- 本地备份与恢复 ---------- */

export async function exportLocalBackup(): Promise<string> {
  const backup: BackupFile = {
    format: "cliplab-local-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: await readAllTables(),
  };
  return JSON.stringify(backup, null, 2);
}

export async function importLocalBackup(contents: string): Promise<Record<TableName, number>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("备份文件不是有效的 JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("备份文件格式不正确");
  const backup = parsed as Partial<BackupFile>;
  if (backup.format !== "cliplab-local-backup" || backup.version !== 1 || !backup.data) {
    throw new Error("无法识别该备份文件，请选择 ClipLab 导出的 JSON 备份");
  }

  const rows = {} as BackupData;
  for (const table of STORE_NAMES) {
    const source = (backup.data as Record<string, unknown>)[table];
    if (!Array.isArray(source)) throw new Error(`备份文件缺少「${table}」数据`);
    rows[table] = source.map((value) => {
      if (!value || typeof value !== "object" || typeof (value as Record<string, unknown>).id !== "string") {
        throw new Error(`「${table}」中存在无效记录`);
      }
      const item = value as Record<string, unknown>;
      const now = new Date().toISOString();
      return {
        ...item,
        user_id: LOCAL_USER_ID,
        created_at: typeof item.created_at === "string" ? item.created_at : now,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : now,
      } as unknown as Tables<typeof table>;
    }) as BackupData[typeof table];
  }

  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAMES, "readwrite");
  const done = transactionDone(transaction);
  for (const table of STORE_NAMES) {
    const store = transaction.objectStore(table);
    store.clear();
    for (const row of rows[table]) store.put(row);
  }
  await done;
  return Object.fromEntries(STORE_NAMES.map((table) => [table, rows[table].length])) as Record<TableName, number>;
}

/* ---------- 展示辅助 ---------- */

export function friendlyError(msg: string): string {
  if (/duplicate key|unique|ConstraintError/i.test(msg)) return "已存在同名动画作品，请勿重复保存";
  if (/violates check constraint|时间|数值/i.test(msg)) return "填写的数据不符合要求，请检查时间与数值";
  if (/foreign key/i.test(msg)) return "关联的记录不存在或已被删除";
  if (/IndexedDB|本地数据库|quota/i.test(msg)) return msg;
  return msg;
}

export function episodeLabel(ep: Pick<Episode, "season" | "episode_number" | "title"> | undefined | null) {
  if (!ep) return "未指定集数";
  const parts: string[] = [];
  if (ep.season != null) parts.push(`第${ep.season}季`);
  if (ep.episode_number != null) parts.push(`第${ep.episode_number}集`);
  const head = parts.join(" ");
  if (ep.title) return head ? `${head}·${ep.title}` : ep.title;
  return head || "未命名集数";
}

export type ResourceSummary = {
  count: number;
  play: string;
  copyright: string;
  latest?: Resource;
};

/** 片段的资源状态摘要：取最近核实（或最近编辑）的资源；无资源时为“未登记” */
export function summarizeResources(list: Resource[] | undefined): ResourceSummary {
  if (!list || list.length === 0) return { count: 0, play: "未登记", copyright: "未登记" };
  const sorted = [...list].sort((a, b) => {
    const av = a.verified_at ?? "";
    const bv = b.verified_at ?? "";
    if (av !== bv) return bv.localeCompare(av);
    return b.updated_at.localeCompare(a.updated_at);
  });
  const latest = sorted[0];
  return { count: list.length, play: latest.play_status, copyright: latest.copyright_status, latest };
}

export function clipSeconds(c: Pick<Clip, "start_seconds" | "end_seconds">): number | null {
  if (c.start_seconds == null || c.end_seconds == null) return null;
  return c.end_seconds > c.start_seconds ? c.end_seconds - c.start_seconds : null;
}

/** 课堂播放分钟数：优先使用手填值，否则用时间段换算 */
export function clipPlayMinutes(c: Clip): number | null {
  if (c.play_minutes != null) return Number(c.play_minutes);
  const s = clipSeconds(c);
  return s == null ? null : Math.round((s / 60) * 10) / 10;
}

export const normalize = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, "");

export const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
