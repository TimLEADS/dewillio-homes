import type { Metadata } from "next";

/**
 * The activation screens an applicant waits on between paying and being
 * approved. They exist only for one signed-in person at one moment, so they are
 * kept out of search results the same way /admin and /dashboard are.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ActivateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
