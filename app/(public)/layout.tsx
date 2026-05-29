// Public layout — no auth, no sidebar, no nav.
// Used for /interview/[token] client-facing discovery sessions.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
