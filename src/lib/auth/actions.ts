"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const INVALID_CREDENTIALS = "Invalid username or password."

export async function signIn(formData: FormData) {
  const username = (formData.get("username") as string).trim()
  const password = formData.get("password") as string

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (!profile) {
    redirect(`/login?error=${encodeURIComponent(INVALID_CREDENTIALS)}`)
  }

  const { data: userRes, error: userError } = await admin.auth.admin.getUserById(
    profile.id,
  )
  if (userError || !userRes.user?.email) {
    redirect(`/login?error=${encodeURIComponent(INVALID_CREDENTIALS)}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: userRes.user.email,
    password,
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(INVALID_CREDENTIALS)}`)
  }
  redirect("/tasks")
}

export async function signUp(formData: FormData) {
  const username = (formData.get("username") as string).trim()
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!username) {
    redirect(`/register?error=${encodeURIComponent("Username is required.")}`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error || !data.user) {
    redirect(
      `/register?error=${encodeURIComponent(error?.message ?? "Could not create account.")}`,
    )
  }

  const admin = createAdminClient()
  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: data.user.id, username })

  if (profileError) {
    // Keep registration all-or-nothing: don't leave an orphaned auth user
    // behind if the username turned out to be taken.
    await admin.auth.admin.deleteUser(data.user.id)
    const message =
      profileError.code === "23505"
        ? "That username is already taken."
        : "Could not create account."
    redirect(`/register?error=${encodeURIComponent(message)}`)
  }

  redirect("/login?registered=1")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
