import { ActSheet } from "@/components/act/ActSheet";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** The constant shell: rail, top bar, content on chalk. Content is max 1120px with 16/32px gutters. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh phone:pl-16 rail:pl-[232px] max-phone:pb-14">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[8px] focus:bg-surface focus:px-3 focus:py-2 focus:t-ui focus:text-ink focus:outline-2 focus:outline-neel">
        Skip to content
      </a>
      <Sidebar />
      <TopBar />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
      <ActSheet />
    </div>
  );
}
