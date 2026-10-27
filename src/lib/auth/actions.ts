"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Every failure gets the same flag: the login page shows one fixed message,
// so the URL can't be used to put arbitrary text on the page.
const LOGIN_FAILED = "/login?error=1"

export async function signIn(formData: FormData) {
  const username = (formData.get("username") as string | null)?.trim().toLowerCase()
  const password = formData.get("password") as string

  if (!username) {
    redirect(LOGIN_FAILED)
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (!profile) {
    redirect(LOGIN_FAILED)
  }

  const { data: userRes, error: userError } = await admin.auth.admin.getUserById(
    profile.id,
  )
  if (userError || !userRes.user?.email) {
    redirect(LOGIN_FAILED)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: userRes.user.email,
    password,
  })

  if (error) {
    redirect(LOGIN_FAILED)
  }
  redirect("/tasks")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
