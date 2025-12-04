export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="auth-mesh-gradient fixed inset-0 -z-10" />
      <div className="glass-card auth-fade-in w-full max-w-md p-8 flex flex-col gap-6">{children}</div>
    </div>
  )
}
