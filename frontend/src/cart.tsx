import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Cart = { sel: string[]; toggle: (id: string) => void; clear: () => void };
const Ctx = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [sel, setSel] = useState<string[]>([]);
  const toggle = useCallback((id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])), []);
  const clear = useCallback(() => setSel([]), []);
  const value = useMemo(() => ({ sel, toggle, clear }), [sel, toggle, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart doit être utilisé dans CartProvider');
  return c;
}
