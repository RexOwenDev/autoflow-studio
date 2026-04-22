import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUserOrganizations, requireSession } from "@/lib/auth/session";
import { getOrganizationBySlug } from "@/lib/db/orgs";

interface AppLayoutProps {
  children: React.ReactNode;
}

function initialsFor(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await requireSession();
  const orgs = await getCurrentUserOrganizations();

  // Active org is the one in the session (Phase 4+ will respect ?org= switcher param via cookie).
  const activeOrg =
    orgs.find((o) => o.id === session.activeOrganizationId) ??
    (await getOrganizationBySlug(orgs[0]?.slug ?? ""));

  // Should never happen — requireSession guarantees a session, the fixture seeds at least one org.
  if (!activeOrg) {
    throw new Error("[AppLayout] No active organization for authenticated user");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar
        activeOrg={{
          id: activeOrg.id,
          slug: activeOrg.slug,
          name: activeOrg.name,
          plan: activeOrg.plan,
        }}
        availableOrgs={orgs.map((o) => ({
          id: o.id,
          slug: o.slug,
          name: o.name,
          plan: o.plan,
        }))}
        user={{
          displayName: session.displayName,
          email: session.email,
          initials: initialsFor(session.displayName),
          planLabel: `${activeOrg.plan.charAt(0).toUpperCase()}${activeOrg.plan.slice(1)} plan`,
        }}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
