import type { Metadata, Viewport } from "next";
import { Anek_Latin } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/shell/Shell";
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
      <head>
        <script
          // Applies the composed dark theme when the OS asks for it, before first paint (DESIGN.md, Browser surfaces).
          dangerouslySetInnerHTML={{ __html: "if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')" }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <Shell>{children}</Shell>
        </TooltipProvider>
      </body>
    </html>
  );
}
