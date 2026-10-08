import { Archive, CalendarCheck, Search, SlidersHorizontal, Telescope, type LucideIcon } from "lucide-react";

export type NavItem = { href: "/" | "/ask" | "/whatif" | "/horizon" | "/vault"; label: string; Icon: LucideIcon };

export const NAV: NavItem[] = [
  { href: "/", label: "Today", Icon: CalendarCheck },
  { href: "/ask", label: "Why", Icon: Search },
  { href: "/whatif", label: "What if", Icon: SlidersHorizontal },
  { href: "/horizon", label: "Horizon", Icon: Telescope },
  { href: "/vault", label: "Vault", Icon: Archive },
];
