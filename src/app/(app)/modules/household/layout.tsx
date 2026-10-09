/**
 * Keeps Nehnuteľnosti chrome stable across overview → property → service
 * so soft navigations don't remount the module shell.
 */
export default function HouseholdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
