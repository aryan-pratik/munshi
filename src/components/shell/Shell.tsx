import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** The constant shell: rail, top bar, content on chalk. Content is max 1120px with 16/32px gutters. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh phone:pl-16 rail:pl-[232px] max-phone:pb-14">
      <Sidebar />
      <TopBar />
      <main id="main" className="mx-auto w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
