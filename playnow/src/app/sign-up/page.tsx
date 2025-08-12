"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("AU");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic password validation
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }
    if (!displayName.trim()) { setErrorMsg("Name is required"); return; }
    if (!phone.trim()) { setErrorMsg("Mobile is required"); return; }
    if (!location.trim()) { setErrorMsg("Location is required"); return; }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Stash profile so `/account` can prefill after email confirmation
    try {
      localStorage.setItem('pendingProfile', JSON.stringify({
        displayName,
        phone,
        countryCode,
        location,
      }));
    } catch {}

    const { error } = await signUp(email, password);

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      // Show success message
      setSuccessMsg("Account created successfully! Check your email for confirmation.");
      // Redirect after a short delay
      setTimeout(() => router.push("/"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1628] px-4">
      <div className="w-full max-w-md bg-[#0d1b31] p-8 rounded-lg shadow-lg border border-white/10">
        <h1 className="text-2xl font-bold text-white mb-6">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Mobile</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Country</label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
            >
              <option value="AU">Australia</option>
              <option value="NZ">New Zealand</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
              placeholder="Suburb, postcode or city"
            />
          </div>
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
          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
          {successMsg && <p className="text-sm text-green-500">{successMsg}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00ff88] text-[#0a1628] rounded-lg hover:bg-[#00cc6a] transition-colors font-semibold disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-[#b8c5d6]">
          Already have an account? {" "}
          <Link href="/sign-in" className="text-[#00d9ff] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
