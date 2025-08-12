"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

type Suggestion = { id?: string; label: string; city: string; countryCode: string; suburb: string; state: string; postalCode?: string };

const COUNTRY_TO_DIAL: Record<string, string> = { AU: "+61", NZ: "+64", US: "+1", GB: "+44", CA: "+1" };

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, user } = useAuth();

  const [step, setStep] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("AU");
  const [phone, setPhone] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [suburb, setSuburb] = useState("");
  const suggestAbortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  function normalizePhone(raw: string, cc: string): string {
    const dial = COUNTRY_TO_DIAL[cc] || "+";
    let digits = raw.replace(/[^0-9]/g, "");
    // Remove leading country digits if provided without +
    if (digits.startsWith(dial.replace("+", ""))) {
      digits = digits.substring(dial.replace("+", "").length);
    }
    // Remove leading zeros
    while (digits.startsWith("0")) digits = digits.substring(1);
    // Ensure 9 digits after country code
    if (digits.length > 9) digits = digits.substring(digits.length - 9);
    return `${dial}${digits}`;
  }

  // Keep phone composed of non-editable country dial code + 10 digits
  useEffect(() => {
    const dial = COUNTRY_TO_DIAL[countryCode] || "+";
    setPhone(`${dial}${phoneDigits}`);
  }, [countryCode, phoneDigits]);

  function validPhone(raw: string, cc: string): boolean {
    const dial = COUNTRY_TO_DIAL[cc] || "+";
    const match = new RegExp(`^\\${dial}\\d{9}$`);
    return match.test(raw);
  }

  const canNext = useMemo(() => {
    if (step === 0) return displayName.trim().length >= 2;
    if (step === 1) return !!countryCode;
    if (step === 2) return validPhone(phone, countryCode);
    if (step === 3) return location.trim().length >= 3; // selection recommended but not forced
    if (step === 4) return /@/.test(email);
    if (step === 5) return password.length >= 8 && !/(password|123456|qwerty)/i.test(password) && !email || password.toLowerCase().indexOf(email.split("@")[0]?.toLowerCase()) === -1;
    return false;
  }, [step, displayName, countryCode, phone, location, email, password]);

  async function handleCreate() {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      localStorage.setItem(
        "pendingProfile",
        JSON.stringify({ displayName, phone, countryCode, location, city, state: stateValue, suburb })
      );
    } catch {}
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) setErrorMsg(error.message);
    else {
      setSuccessMsg("Account created! Check your email to confirm.");
      setTimeout(() => router.push("/"), 1500);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (loading) return;
    if (!canNext) return;
    if (step < 5) {
      setStep((s) => Math.min(5, s + 1));
    } else {
      void handleCreate();
    }
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Name</label>
            <input
              type="text"
              value={displayName}
              autoFocus
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
              placeholder="Your name"
            />
          </div>
        );
      case 1:
        return (
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
        );
      case 2:
        return (
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Mobile</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-white/10 bg-[#0a1628] text-white select-none">
                {COUNTRY_TO_DIAL[countryCode] || "+"}
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\\d*"
                value={phoneDigits}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 9);
                  setPhoneDigits(digits);
                }}
                className="w-full px-3 py-2 rounded-r-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
                placeholder="9 digits"
              />
            </div>
            {!validPhone(phone, countryCode) && (
              <p className="mt-1 text-xs text-[#b8c5d6]">Enter exactly 9 digits after the country code</p>
            )}
          </div>
        );
      case 3:
        return (
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={async (e) => {
                const v = e.target.value;
                setLocation(v);
                if (v.trim().length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = setTimeout(async () => {
                  try {
                    if (suggestAbortRef.current) suggestAbortRef.current.abort();
                    suggestAbortRef.current = new AbortController();
                    setSuggestLoading(true);
                    const res = await fetch(`/api/geocode/suggest?country=${encodeURIComponent(countryCode)}&q=${encodeURIComponent(v)}`, { signal: suggestAbortRef.current.signal });
                    const json = await res.json();
                    if (json?.suggestions && json.suggestions.length > 0) { setSuggestions(json.suggestions); setShowSuggestions(true); }
                    else { setSuggestions([]); setShowSuggestions(false); }
                  } catch { setSuggestions([]); setShowSuggestions(false); }
                  finally { setSuggestLoading(false); }
                }, 250);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={async () => {
                if (location.trim().length >= 3) {
                  try {
                    setSuggestLoading(true);
                    const res = await fetch(`/api/geocode/suggest?country=${encodeURIComponent(countryCode)}&q=${encodeURIComponent(location)}`);
                    const json = await res.json();
                    if (json?.suggestions && json.suggestions.length > 0) { setSuggestions(json.suggestions); setShowSuggestions(true); }
                  } catch {}
                  finally { setSuggestLoading(false); }
                }
              }}
              className="w-full px-3 py-2 rounded-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
              placeholder="Suburb, postcode or city"
            />
            {showSuggestions && (
              <div className="relative">
                <div className="absolute z-10 w-full mt-1 bg-[#0a1628] border border-white/10 rounded-md shadow-lg max-h-60 overflow-auto">
                  {suggestLoading && (<div className="px-3 py-2 text-sm text-[#b8c5d6]">Searching…</div>)}
                  {!suggestLoading && suggestions.length === 0 && (<div className="px-3 py-2 text-sm text-[#b8c5d6]">No results</div>)}
                  {!suggestLoading && suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={async () => {
                        setShowSuggestions(false);
                        try {
                          if (s.id) {
                            const res = await fetch(`/api/geocode/suggest?id=${encodeURIComponent(s.id)}`);
                            const json = await res.json();
                            if (json.location) {
                              const loc = json.location;
                              setLocation(loc.postalCode || s.label || "");
                              setCity(loc.city || "");
                              setStateValue(loc.state || "");
                              setSuburb(loc.suburb || "");
                              return;
                            }
                          }
                        } catch {}
                        setLocation(s.postalCode || s.label || "");
                        setCity(s.city || "");
                        setStateValue(s.state || "");
                        setSuburb(s.suburb || "");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 text-white border-b border-white/5 last:border-b-0"
                    >
                      <div className="font-medium">{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(city || stateValue || suburb) && (
              <p className="mt-2 text-xs text-[#9bb0c2]">Detected: {suburb ? `${suburb}, `: ""}{city} {stateValue && `(${stateValue})`}</p>
            )}
          </div>
        );
      case 4:
        return (
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
              placeholder="you@example.com"
            />
          </div>
        );
      case 5:
        return (
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#0a1628] text-white border border-white/10 focus:outline-none focus:border-[#00d9ff]"
              placeholder="Minimum 8 characters"
            />
            <p className="mt-1 text-xs text-[#b8c5d6]">Use a long unique passphrase (NIST). No arbitrary character rules; minimum 8 characters.</p>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1628] px-4" onKeyDown={handleKeyDown}>
      <div className="fixed inset-0 bg-black/60" />
      <div className="relative w-full max-w-md bg-[#0d1b31] p-6 sm:p-8 rounded-lg shadow-xl border border-white/10">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-sm text-[#b8c5d6] mb-4">Step {step + 1} of 6</p>

        {renderStep()}

        {errorMsg && <p className="mt-3 text-sm text-red-400">{errorMsg}</p>}
        {successMsg && <p className="mt-3 text-sm text-green-400">{successMsg}</p>}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || loading}
            className="px-4 py-2 rounded-lg border border-white/10 text-[#b8c5d6] hover:bg-white/10 disabled:opacity-50"
          >
            Back
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              disabled={!canNext || loading}
              className="px-4 py-2 rounded-lg bg-[#00d9ff] text-[#0a1628] hover:bg-[#00bfe0] disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canNext || loading}
              className="px-4 py-2 rounded-lg bg-[#00ff88] text-[#0a1628] hover:bg-[#00cc6a] disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          )}
        </div>

        <p className="mt-4 text-sm text-center text-[#b8c5d6]">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[#00d9ff] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
