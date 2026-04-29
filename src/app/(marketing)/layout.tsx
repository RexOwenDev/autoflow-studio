import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketingNav />
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:py-16">
        {children}
      </main>
      <MarketingFooter />
    </>
  );
}
