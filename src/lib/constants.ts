export const STAGES = ["引出问题", "提出冲突", "推进解决", "展示结果", "课堂总结"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_HINTS: Record<Stage, string> = {
  引出问题: "用短片段或情境引出本课问题",
  提出冲突: "呈现矛盾、困境或不同选择",
  推进解决: "引导学生讨论解决办法",
  展示结果: "呈现角色的选择与结果",
  课堂总结: "回到主题，形成结论与迁移",
};

export const CLIP_STATUSES = ["构思中", "待剪辑", "待核实", "可用", "暂不使用"] as const;
export type ClipStatus = (typeof CLIP_STATUSES)[number];

export const PLAY_STATUSES = [
  "待核实",
  "免费播放",
  "免费播放但含广告",
  "需登录",
  "需付费",
  "地区受限",
  "链接失效",
  "其他",
] as const;
export type PlayStatus = (typeof PLAY_STATUSES)[number];

export const COPYRIGHT_STATUSES = ["待核实", "已确认可用于课堂", "需进一步确认", "不建议使用"] as const;
export type CopyrightStatus = (typeof COPYRIGHT_STATUSES)[number];

export const TASK_STATUSES = ["待处理", "进行中", "已完成", "暂缓"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["高", "中", "低"] as const;

export const TASK_TYPES = [
  "补充时间码",
  "剪辑片段",
  "核实播放",
  "确认版权",
  "更换链接",
  "完善提问",
  "调整课堂流程",
  "其他",
] as const;

export const PRESET_THEMES = ["友情", "自制力", "情绪管理", "合作"] as const;

export const GRADES = ["七年级", "八年级", "九年级", "六年级", "其他"] as const;
export const DEFAULT_GRADE = "七年级";
export const DEFAULT_LESSON_MINUTES = 40;
/** 片段建议时长上限（秒）：超过 5 分钟给出温和提醒 */
export const CLIP_SOFT_LIMIT_SECONDS = 5 * 60;
export const CLIP_SUGGESTED_MIN_SECONDS = 60;

export const DEMO_PREFIX = "【DEMO】";

export type Tone = "neutral" | "success" | "warning" | "info" | "danger" | "primary" | "warm";

export const PLAY_TONE: Record<string, Tone> = {
  待核实: "warning",
  免费播放: "success",
  免费播放但含广告: "success",
  需登录: "info",
  需付费: "warm",
  地区受限: "warm",
  链接失效: "danger",
  其他: "neutral",
};

export const COPYRIGHT_TONE: Record<string, Tone> = {
  待核实: "warning",
  已确认可用于课堂: "success",
  需进一步确认: "info",
  不建议使用: "danger",
};

export const CLIP_STATUS_TONE: Record<string, Tone> = {
  构思中: "neutral",
  待剪辑: "warm",
  待核实: "warning",
  可用: "success",
  暂不使用: "danger",
};

export const TASK_STATUS_TONE: Record<string, Tone> = {
  待处理: "warning",
  进行中: "info",
  已完成: "success",
  暂缓: "neutral",
};

export const PRIORITY_TONE: Record<string, Tone> = { 高: "danger", 中: "warm", 低: "neutral" };

/** 能打开播放的状态（仅说明能打开，不代表授权） */
export const PLAYABLE_STATUSES: readonly string[] = ["免费播放", "免费播放但含广告"];
