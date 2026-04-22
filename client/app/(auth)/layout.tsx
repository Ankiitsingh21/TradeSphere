export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-3 py-8 sm:px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.14),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(20,184,166,0.08),transparent_35%)]" />
      <div className="relative w-full">{children}</div>
    </div>
  );
}
