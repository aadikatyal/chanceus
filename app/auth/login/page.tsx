import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LoginForm from "@/components/login-form"
import Header from "@/components/navigation/header"

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  console.log("🔍 DEBUG: Login page loaded with searchParams:", params)
  
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Check if user is already logged in
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is logged in, redirect to original URL or dashboard
  if (session) {
    const redirectUrl = params.redirect || "/dashboard"
    console.log("🔍 DEBUG: User already logged in, redirecting to:", redirectUrl)
    redirect(redirectUrl)
  }

  return (
    <div className="min-h-screen bg-gray-950 relative">
      <Header />
      
      {/* Subtle gradient overlay */}
      
      
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center relative z-10 px-4 py-12 sm:px-6 lg:px-8">
        <LoginForm redirectUrl={params.redirect} />
      </div>
    </div>
  )
}
