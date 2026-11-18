
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- animations
CREATE TABLE public.animations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  aliases text,
  production_info text,
  synopsis text,
  theme_tags text[] NOT NULL DEFAULT '{}',
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.animations TO authenticated;
GRANT ALL ON public.animations TO service_role;
ALTER TABLE public.animations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own animations" ON public.animations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_animations_updated BEFORE UPDATE ON public.animations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- episodes
CREATE TABLE public.episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  animation_id uuid NOT NULL REFERENCES public.animations(id) ON DELETE CASCADE,
  season integer CHECK (season IS NULL OR season >= 0),
  episode_number integer CHECK (episode_number IS NULL OR episode_number >= 0),
  title text,
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  synopsis text,
  source_url text,
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.episodes(animation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episodes TO authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own episodes" ON public.episodes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_episodes_updated BEFORE UPDATE ON public.episodes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- clips
CREATE TABLE public.clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  animation_id uuid NOT NULL REFERENCES public.animations(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  stage text CHECK (stage IS NULL OR stage IN ('引出问题','提出冲突','推进解决','展示结果','课堂总结')),
  start_seconds integer CHECK (start_seconds IS NULL OR start_seconds >= 0),
  end_seconds integer CHECK (end_seconds IS NULL OR end_seconds >= 0),
  play_minutes numeric(6,2) CHECK (play_minutes IS NULL OR play_minutes >= 0),
  highlight_notes text,
  themes text[] NOT NULL DEFAULT '{}',
  grade text NOT NULL DEFAULT '七年级',
  est_class_minutes numeric(6,2) CHECK (est_class_minutes IS NULL OR est_class_minutes >= 0),
  questions text,
  discussion_goal text,
  summary text,
  teaching_notes text,
  status text NOT NULL DEFAULT '构思中' CHECK (status IN ('构思中','待剪辑','待核实','可用','暂不使用')),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_seconds IS NULL OR end_seconds IS NULL OR end_seconds > start_seconds)
);
CREATE INDEX ON public.clips(animation_id);
CREATE INDEX ON public.clips(episode_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clips TO authenticated;
GRANT ALL ON public.clips TO service_role;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clips" ON public.clips FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_clips_updated BEFORE UPDATE ON public.clips FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- resources
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  animation_id uuid REFERENCES public.animations(id) ON DELETE SET NULL,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  clip_id uuid REFERENCES public.clips(id) ON DELETE SET NULL,
  platform text,
  url text,
  play_status text NOT NULL DEFAULT '待核实' CHECK (play_status IN ('待核实','免费播放','免费播放但含广告','需登录','需付费','地区受限','链接失效','其他')),
  verified_at date,
  verifier text,
  play_notes text,
  copyright_status text NOT NULL DEFAULT '待核实' CHECK (copyright_status IN ('待核实','已确认可用于课堂','需进一步确认','不建议使用')),
  copyright_notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.resources(clip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own resources" ON public.resources FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_resources_updated BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- lesson plans
CREATE TABLE public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  theme text,
  grade text NOT NULL DEFAULT '七年级',
  total_minutes integer NOT NULL DEFAULT 40 CHECK (total_minutes > 0 AND total_minutes <= 600),
  objectives text,
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_plans TO authenticated;
GRANT ALL ON public.lesson_plans TO service_role;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lesson_plans" ON public.lesson_plans FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_lesson_plans_updated BEFORE UPDATE ON public.lesson_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lesson_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  lesson_id uuid NOT NULL REFERENCES public.lesson_plans(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('引出问题','提出冲突','推进解决','展示结果','课堂总结')),
  position integer NOT NULL DEFAULT 0,
  clip_id uuid REFERENCES public.clips(id) ON DELETE SET NULL,
  title text,
  themes text[] NOT NULL DEFAULT '{}',
  questions text,
  discussion text,
  summary text,
  minutes numeric(6,2) NOT NULL DEFAULT 0 CHECK (minutes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.lesson_items(lesson_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_items TO authenticated;
GRANT ALL ON public.lesson_items TO service_role;
ALTER TABLE public.lesson_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lesson_items" ON public.lesson_items FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_lesson_items_updated BEFORE UPDATE ON public.lesson_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- tasks
CREATE TABLE public.action_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  task_type text NOT NULL DEFAULT '其他',
  animation_id uuid REFERENCES public.animations(id) ON DELETE SET NULL,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  clip_id uuid REFERENCES public.clips(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lesson_plans(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT '中' CHECK (priority IN ('高','中','低')),
  status text NOT NULL DEFAULT '待处理' CHECK (status IN ('待处理','进行中','已完成','暂缓')),
  due_date date,
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_tasks TO authenticated;
GRANT ALL ON public.action_tasks TO service_role;
ALTER TABLE public.action_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own action_tasks" ON public.action_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_action_tasks_updated BEFORE UPDATE ON public.action_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
