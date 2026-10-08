import type { Metadata, Viewport } from "next";
import { Anek_Latin } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Anek Latin: both subsets so the rupee sign renders in the family (DESIGN.md, Typography).
const anek = Anek_Latin({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Munshi",
  description: "A chief of staff for a small business.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F7FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1220" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${anek.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
