import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ActionTask, Animation, Clip, Episode, LessonPlan, Resource } from "@/lib/db";
import { AnimationForm } from "./forms/animation-form";
import { EpisodeForm } from "./forms/episode-form";
import { ClipForm, type ClipDefaults } from "./forms/clip-form";
import { ResourceForm, type ResourceDefaults } from "./forms/resource-form";
import { LessonForm } from "./forms/lesson-form";
import { TaskForm, type TaskDefaults } from "./forms/task-form";

type FormState =
  | { kind: "animation"; record?: Animation }
  | { kind: "episode"; record?: Episode; defaults?: { animation_id?: string } }
  | { kind: "clip"; record?: Clip; defaults?: ClipDefaults }
  | { kind: "resource"; record?: Resource; defaults?: ResourceDefaults }
  | { kind: "lesson"; record?: LessonPlan }
  | { kind: "task"; record?: ActionTask; defaults?: TaskDefaults };

type Ctx = {
  openAnimation: (record?: Animation) => void;
  openEpisode: (record?: Episode, defaults?: { animation_id?: string }) => void;
  openClip: (record?: Clip, defaults?: ClipDefaults) => void;
  openResource: (record?: Resource, defaults?: ResourceDefaults) => void;
  openLesson: (record?: LessonPlan) => void;
  openTask: (record?: ActionTask, defaults?: TaskDefaults) => void;
};

const FormsCtx = createContext<Ctx | null>(null);

export function FormsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(FormState & { key: number }) | null>(null);
  const [open, setOpen] = useState(false);
  const show = useCallback((s: FormState) => {
    setState({ ...s, key: Date.now() });
    setOpen(true);
  }, []);
  const ctx: Ctx = {
    openAnimation: (record) => show({ kind: "animation", record }),
    openEpisode: (record, defaults) => show({ kind: "episode", record, defaults }),
    openClip: (record, defaults) => show({ kind: "clip", record, defaults }),
    openResource: (record, defaults) => show({ kind: "resource", record, defaults }),
    openLesson: (record) => show({ kind: "lesson", record }),
    openTask: (record, defaults) => show({ kind: "task", record, defaults }),
  };
  const common = { open, onOpenChange: setOpen };
  return (
    <FormsCtx.Provider value={ctx}>
      {children}
      {state?.kind === "animation" && <AnimationForm key={state.key} record={state.record} {...common} />}
      {state?.kind === "episode" && <EpisodeForm key={state.key} record={state.record} defaults={state.defaults} {...common} />}
      {state?.kind === "clip" && <ClipForm key={state.key} record={state.record} defaults={state.defaults} {...common} />}
      {state?.kind === "resource" && <ResourceForm key={state.key} record={state.record} defaults={state.defaults} {...common} />}
      {state?.kind === "lesson" && <LessonForm key={state.key} record={state.record} {...common} />}
      {state?.kind === "task" && <TaskForm key={state.key} record={state.record} defaults={state.defaults} {...common} />}
    </FormsCtx.Provider>
  );
}

export function useForms() {
  const c = useContext(FormsCtx);
  if (!c) throw new Error("useForms must be used inside FormsProvider");
  return c;
}
