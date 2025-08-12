"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { withAuth } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  phone?: string | null;
  location?: string | null;
  city?: string | null;
  country_code?: string | null;
  suburb?: string | null;
  state?: string | null;
};

function AccountPageInner() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [suggestions, setSuggestions] = useState<{ id?: string; label: string; city: string; countryCode: string; suburb: string; state: string; }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const userEmail = useMemo(() => user?.email ?? "", [user]);

  // When the typed location exactly matches a suggestion, auto-fill city/country
  useEffect(() => {
    if (!location || suggestions.length === 0) return;
    const exact = suggestions.find(s => s.label.toLowerCase() === location.toLowerCase());
    if (exact) {
      setCity(exact.city);
      setCountryCode(exact.countryCode);
      setState(exact.state);
      setSuburb(exact.suburb);
    }
  }, [location, suggestions]);

  useEffect(() => {
    if (!user || !supabase) return;
    setEmail(userEmail);
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, display_name, phone, location, city, country_code, suburb, state")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          const row = data as ProfileRow;
          setDisplayName(row.display_name ?? "");
          setPhone(row.phone ?? "");
          setLocation(row.location ?? "");
          setCity(row.city ?? "");
          setCountryCode((row.country_code ?? "").toUpperCase());
          setSuburb(row.suburb ?? "");
          setState(row.state ?? "");
        }
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [user, supabase, userEmail]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !supabase) return;
    // Require suburb for location accuracy
    if (!suburb || suburb.trim().length === 0) {
      setError("Please choose a suburb from suggestions");
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (email && email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw new Error(emailError.message);
        setMessage(
          "Email update requested. Please check your inbox to confirm the change."
        );
      }

      if (password || confirmPassword) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw new Error(pwError.message);
        setMessage("Password updated successfully.");
        setPassword("");
        setConfirmPassword("");
      }

      const upsertPayload: ProfileRow = {
        user_id: user.id,
        display_name: displayName || null,
        phone: phone || null,
        location: location || null,
        city: city || null,
        country_code: countryCode || null,
        suburb: suburb || null,
        state: state || null,
      };
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(upsertPayload, { onConflict: "user_id" });
      if (profileError) throw new Error(profileError.message);

      setMessage((prev) => (prev ? prev : "Profile updated."));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Account</h1>
      <p className="text-[#b8c5d6] mb-6">Manage your profile and security settings.</p>

      {message && (
        <div className="mb-4 rounded-md border border-[#00ff88]/30 bg-[#00ff88]/10 text-[#00ff88] px-3 py-2 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md border border-red-400/30 bg-red-400/10 text-red-300 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="space-y-4">
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
              placeholder="you@example.com"
            />
            <p className="mt-1 text-xs text-[#6b7b8f]">Changing email may require confirmation via email.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">Mobile</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="+1 555 555 5555"
              />
            </div>
            <div className="relative">
              <label className="block text-sm text-[#b8c5d6] mb-1">Enter your suburb</label>
              <input
                type="text"
                value={location}
                onChange={async (e) => {
                  const v = e.target.value;
                  setLocation(v);
                  if (v.trim().length < 2) {
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setSuggestLoading(false);
                    return;
                  }
                  // Debounce and cancel previous request
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  debounceTimerRef.current = setTimeout(async () => {
                    try {
                      if (suggestAbortRef.current) suggestAbortRef.current.abort();
                      suggestAbortRef.current = new AbortController();
                      setSuggestLoading(true);
                      const res = await fetch(`/api/geocode/suggest?q=${encodeURIComponent(v)}`,
                        { signal: suggestAbortRef.current.signal }
                      );
                      const json = await res.json();
                      if (json?.suggestions && json.suggestions.length > 0) {
                        setSuggestions(json.suggestions);
                        setShowSuggestions(true);
                      } else {
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }
                    } catch (err) {
                      setSuggestions([]);
                      setShowSuggestions(false);
                    } finally {
                      setSuggestLoading(false);
                    }
                  }, 250);
                }}
                onFocus={async () => {
                  // Re-fetch suggestions when focusing if there's text
                  if (location.trim().length >= 2) {
                    try {
                      setSuggestLoading(true);
                      const res = await fetch(`/api/geocode/suggest?q=${encodeURIComponent(location)}`);
                      const json = await res.json();
                      if (json?.suggestions && json.suggestions.length > 0) {
                        setSuggestions(json.suggestions);
                        setShowSuggestions(true);
                      } else {
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }
                    } catch {
                      // Silent fail
                    } finally {
                      setSuggestLoading(false);
                    }
                  }
                }}
                onBlur={() => {
                  // Delay hiding to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="w-full rounded-lg border border-[#00d9ff]/40 bg-[#0b1a31] px-4 py-3 text-white placeholder-[#7aa2b7] focus:outline-none focus:ring-2 focus:ring-[#00d9ff] shadow-sm"
                placeholder="Start typing your suburb…"
                autoComplete="off"
              />
              {showSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-[#0f1f39] border border-white/10 rounded-md shadow-lg max-h-60 overflow-auto">
                  {suggestLoading && (
                    <div className="px-3 py-2 text-sm text-[#b8c5d6]">Searching…</div>
                  )}
                  {!suggestLoading && suggestions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-[#b8c5d6]">No results</div>
                  )}
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
                              // Normalize AU heuristics: if label looks like
                              // "Suburb, City, STATE, Country" fill accordingly
                              const parts = (loc.label || '').split(',').map((p: string) => p.trim());
                              const inferredSuburb = parts.length >= 4 ? (parts[0] || loc.suburb || '') : (loc.suburb || '');
                              const inferredCity = parts.length >= 2 ? (parts[1] || loc.city || '') : (loc.city || parts[0] || '');
                              // search through tokens for an uppercase 2-3 letter code (NSW/VIC/QLD)
                              let inferredState = loc.state || '';
                              if (!inferredState) {
                                for (let i = 1; i < parts.length - 1; i++) {
                                  const token = parts[i].split(/[\s-]/)[0];
                                  if (token && token.length >= 2 && token.length <= 3 && token.toUpperCase() === token) {
                                    inferredState = token;
                                    break;
                                  }
                                }
                              }

                              setLocation(loc.label);
                              setCity(inferredCity);
                              setCountryCode(loc.countryCode ? loc.countryCode.substring(0, 2) : '');
                              setState(inferredState);
                              setSuburb(inferredSuburb);
                              return;
                            }
                          }
                        } catch (err) {
                          // Fallback to basic info if lookup fails
                          setLocation(s.label);
                          setCity(s.city || '');
                          setCountryCode(s.countryCode || '');
                          setState(s.state || '');
                          setSuburb(s.suburb || '');
                        }
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/10 text-white border-b border-white/5 last:border-b-0"
                    >
                      <div className="font-medium">{s.label}</div>
                      {s.city && <div className="text-xs text-[#6b7b8f]">{s.city}{s.countryCode ? `, ${s.countryCode}` : ''}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">City</label>
              <input
                type="text"
                value={city}
                readOnly
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="e.g., Sydney"
              />
            </div>
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">Country (ISO code)</label>
              <input
                type="text"
                value={countryCode}
                readOnly
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="AU"
                maxLength={2}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">Suburb</label>
              <input
                type="text"
                value={suburb}
                readOnly
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="e.g., Greystanes"
              />
            </div>
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">State (required)</label>
              <input
                type="text"
                value={state}
                readOnly
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="e.g., NSW"
              />
            </div>
          </div>

          {/* Removed auto-normalize button; autocomplete will be used instead */}
        </section>

        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#00d9ff] text-[#0a1628] hover:bg-[#00bfe0] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>
      </form>
      {/* Initial loading overlay */}
      {initialLoading && (
        <div className="fixed inset-0 bg-[#0a1628]/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-3 text-white">
            <svg className="animate-spin h-6 w-6 text-[#00d9ff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-sm">Loading your profile…</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(AccountPageInner);


