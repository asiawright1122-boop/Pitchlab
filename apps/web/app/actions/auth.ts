"use server";

import { loginWithEmail } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email || !email.includes("@")) {
    throw new Error("请输入有效的邮箱地址");
  }

  await loginWithEmail(email);
  redirect("/dashboard");
}
