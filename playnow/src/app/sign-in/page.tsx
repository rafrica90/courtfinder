"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg("Supabase client not initialized.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1628] px-4">
      <div className="w-full max-w-md bg-[#0d1b31] p-8 rounded-lg shadow-lg border border-white/10">
        <h1 className="text-2xl font-bold text-white mb-6">Sign In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-[#b8c5d6] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-[#b8c5d6] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
            />
          </div>
          {errorMsg && (
            <p className="text-sm text-red-500">{errorMsg}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-semibold disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p className="mt-4 text-sm text-center text-[#b8c5d6]">
            Don't have an account? {" "}
            <a href="/sign-up" className="text-[#00d9ff] hover:underline">
              Create one
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
