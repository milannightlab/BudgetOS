/**
 * Keeps Vozidlá chrome stable across overview → vehicle
 * so soft navigations don't remount the module shell.
 */
export default function TransportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
