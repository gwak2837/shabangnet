export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex w-full max-w-md flex-col gap-8 rounded-xl bg-card p-8 shadow-lg border border-border">
        {children}
      </div>
    </div>
  )
}
