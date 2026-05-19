"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const Ctx = createContext<{ collapsed: boolean; toggle: () => void }>({
  collapsed: false,
  toggle: () => {},
});

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("sb-collapsed");
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sb-collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ collapsed, toggle }}>{children}</Ctx.Provider>;
}

export function useSidebarState() {
  return useContext(Ctx);
}
