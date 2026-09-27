import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, Bookmark, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Nuevos", icon: Sparkles },
  { to: "/guardados", label: "Guardados", icon: Bookmark },
  { to: "/configuracion", label: "Configuración", icon: Settings2 },
] as const;

export function TabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed inset-x-0 z-40 flex justify-center px-6"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
    >
      <div className="glass flex w-full max-w-sm items-center justify-between rounded-full p-1.5">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-all duration-300 active:scale-95",
                active ? "bg-foreground/10 text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.7} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Screen({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="ambient min-h-screen">
      <main className="pb-safe mx-auto max-w-lg px-4 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        <header className="mb-5 flex items-end justify-between px-1">
          <div>
            {subtitle && <p className="text-[13px] font-medium text-muted-foreground">{subtitle}</p>}
            <h1 className="text-[34px] font-bold leading-tight tracking-tight">{title}</h1>
          </div>
          {action}
        </header>
        <div key={title} className="animate-rise">{children}</div>
      </main>
      <TabBar />
    </div>
  );
}
