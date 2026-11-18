import { createContext, useContext, useState, type ReactNode } from "react";
import { ConfirmDialog } from "./confirm-dialog";

type Opts = { title: string; description: ReactNode; confirmLabel?: string; onConfirm: () => Promise<void> | void };
const Ctx = createContext<((o: Opts) => void) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Opts | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider
      value={(o) => {
        setOpts(o);
        setOpen(true);
      }}
    >
      {children}
      {opts && (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={opts.title}
          description={opts.description}
          confirmLabel={opts.confirmLabel}
          onConfirm={opts.onConfirm}
        />
      )}
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfirm must be used inside ConfirmProvider");
  return c;
}
