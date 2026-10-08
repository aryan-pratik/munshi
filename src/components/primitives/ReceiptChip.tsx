import { CalendarDays, CreditCard, FileText, Landmark, LifeBuoy, Mail, Megaphone, MessageCircle, ShoppingBag, Truck, type LucideIcon } from "lucide-react";
import type { SourceId } from "@/types";
import { cn } from "@/lib/utils";

export const SOURCE_ICON: Record<SourceId, LucideIcon> = {
  shopify: ShoppingBag,
  razorpay: CreditCard,
  "meta-ads": Megaphone,
  shiprocket: Truck,
  whatsapp: MessageCircle,
  gmail: Mail,
  "zoho-books": FileText,
  hdfc: Landmark,
  freshdesk: LifeBuoy,
  calendar: CalendarDays,
};

export const SOURCE_NAME: Record<SourceId, string> = {
  shopify: "Shopify",
  razorpay: "Razorpay",
  "meta-ads": "Meta Ads",
  shiprocket: "Shiprocket",
  whatsapp: "WhatsApp",
  gmail: "Gmail",
  "zoho-books": "Zoho Books",
  hdfc: "HDFC Bank",
  freshdesk: "Freshdesk",
  calendar: "Calendar",
};

type Variant = "default" | "critical" | "warn" | "good" | "unverified" | "selected";

const VARIANT: Record<Variant, string> = {
  default: "bg-wash text-ink-2",
  critical: "bg-debit-soft text-debit",
  warn: "bg-haldi-soft text-haldi-ink",
  good: "bg-credit-soft text-credit",
  unverified: "bg-transparent border border-dashed border-rule-strong text-ink-2",
  selected: "bg-neel-soft text-neel",
};

/** A 24px pill in the caption role. Evidence chips lead with a 12px source icon ("7 leads"). */
export function Chip({ children, variant = "default", source, className }: { children: React.ReactNode; variant?: Variant; source?: SourceId; className?: string }) {
  const Icon = source ? SOURCE_ICON[source] : null;
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 t-caption font-medium whitespace-nowrap", VARIANT[variant], className)}>
      {Icon ? <Icon className="size-3" aria-hidden strokeWidth={1.75} /> : null}
      {children}
    </span>
  );
}

export const ReceiptChip = Chip;
