import { useState, type ReactNode } from "react";
import { X, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRESET_THEMES } from "@/lib/constants";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  required,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormGroup({ title, children, description }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border bg-muted/40 p-3 sm:p-4">
      <legend className="px-1 text-sm font-semibold text-primary">{title}</legend>
      {description && <p className="-mt-1 text-xs text-muted-foreground">{description}</p>}
      {children}
    </fieldset>
  );
}

export const NONE = "__none__";

export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "请选择",
  noneLabel,
  id,
  className,
  ariaLabel,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  options: readonly (string | { value: string; label: string })[];
  placeholder?: string;
  noneLabel?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <Select
      value={value ?? (noneLabel ? NONE : undefined)}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full bg-card", className)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
        {opts.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ThemeInput({
  value,
  onChange,
  suggestions = [],
  id,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const all = Array.from(new Set([...PRESET_THEMES, ...suggestions])).filter(Boolean);
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="主题选择">
        {all.map((t) => {
          const on = value.includes(t);
          return (
            <button
              type="button"
              key={t}
              onClick={() => toggle(t)}
              aria-pressed={on}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary-soft",
              )}
            >
              {t}
            </button>
          );
        })}
        {value
          .filter((t) => !all.includes(t))
          .map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground">
              {t}
              <button type="button" aria-label={`移除主题 ${t}`} onClick={() => toggle(t)}>
                <X className="size-3" />
              </button>
            </span>
          ))}
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="自定义主题，回车添加"
          className="h-8 bg-card text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs hover:bg-accent"
        >
          <Plus className="size-3" />
          添加
        </button>
      </div>
    </div>
  );
}
