"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { withAuth } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sports as availableSports } from "@/lib/mockData";
import type { SkillLevel } from "@/lib/types";

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  phone?: string | null;
  location?: string | null;
  city?: string | null;
  country_code?: string | null;
  suburb?: string | null;
  state?: string | null;
  sports_preferences?: string[] | null;
  skill_level?: string | null;
  sport_skill_levels?: Record<string, SkillLevel> | null;
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
  const [suggestions, setSuggestions] = useState<{ id?: string; label: string; city: string; countryCode: string; suburb: string; state: string; postalCode?: string; }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [sportSkills, setSportSkills] = useState<Record<string, SkillLevel>>({});

  const userEmail = useMemo(() => user?.email ?? "", [user]);

  // When the typed postcode matches a suggestion, auto-fill derived fields
  useEffect(() => {
    if (!location || suggestions.length === 0) return;
    const exact = suggestions.find(s => (s.postalCode || '').toLowerCase() === location.toLowerCase());
    if (exact) {
      setCity(exact.city);
      setCountryCode(exact.countryCode);
      setState(exact.state);
      setSuburb(exact.suburb || '');
    }
  }, [location, suggestions]);

  useEffect(() => {
    if (!user || !supabase) return;
    setEmail(userEmail);
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, display_name, phone, location, city, country_code, suburb, state, sports_preferences, sport_skill_levels")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          const row = data as ProfileRow;
          setDisplayName(row.display_name ?? "");
          setPhone(row.phone ?? "");
          const locRaw = row.location ?? "";
          const digits = locRaw.replace(/\D/g, "");
          setLocation(digits.length >= 3 ? digits : "");
          setCity(row.city ?? "");
          setCountryCode((row.country_code ?? "").toUpperCase());
          setSuburb(row.suburb ?? "");
          setState(row.state ?? "");
          setSelectedSports(Array.isArray(row.sports_preferences) ? row.sports_preferences : []);
          const lvl = row.sport_skill_levels && typeof row.sport_skill_levels === 'object' ? row.sport_skill_levels : {};
          setSportSkills(lvl as Record<string, SkillLevel>);
        }
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [user, supabase, userEmail]);

  // Prefill from pending profile captured at signup
  useEffect(() => {
    if (!initialLoading) {
      try {
        const raw = localStorage.getItem('pendingProfile');
        if (raw) {
          const p = JSON.parse(raw || '{}');
          if (p) {
            setDisplayName((v) => v || p.displayName || '');
            setPhone((v) => v || p.phone || '');
            setCountryCode((v) => v || (p.countryCode || '').toUpperCase());
            setLocation((v) => v || p.location || '');
            setCity((v) => v || p.city || '');
            setState((v) => v || p.state || '');
            setSuburb((v) => v || p.suburb || '');
            if (Array.isArray(p.selectedSports)) {
              setSelectedSports((cur) => cur.length ? cur : p.selectedSports);
            }
            if (p.sportSkills && typeof p.sportSkills === 'object') {
              setSportSkills((cur) => Object.keys(cur).length ? cur : p.sportSkills);
            }
          }
          localStorage.removeItem('pendingProfile');
        }
      } catch {}
    }
  }, [initialLoading]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !supabase) return;
    // Client-side required field checks
    if (!displayName.trim()) { setError('Name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!phone.trim()) { setError('Mobile is required'); return; }
    if (!countryCode.trim()) { setError('Country is required'); return; }
    if (!location || location.trim().length < 3) { setError('Please enter a valid postcode or location'); return; }
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
        sports_preferences: selectedSports,
        sport_skill_levels: sportSkills,
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="you@example.com"
                required
              />
              <p className="mt-1 text-xs text-[#6b7b8f]">Changing email may require confirmation via email.</p>
            </div>
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">Mobile</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="+1 555 555 5555"
                required
              />
            </div>
          </div>

          {/* Password first */}
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

          {/* Country and Postcode on the same line */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">Country</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                required
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
                onChange={async (e) => {
                  const v = e.target.value;
                  setLocation(v);
                  if (v.trim().length < 3) {
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setSuggestLoading(false);
                    return;
                  }
                  const isDigits = /^[0-9\s-]+$/.test(v.trim());
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  debounceTimerRef.current = setTimeout(async () => {
                    try {
                      if (suggestAbortRef.current) suggestAbortRef.current.abort();
                      suggestAbortRef.current = new AbortController();
                      setSuggestLoading(true);
                      const url = isDigits
                        ? `/api/geocode/suggest?type=postalCode&country=${encodeURIComponent(countryCode)}&q=${encodeURIComponent(v)}`
                        : `/api/geocode/suggest?country=${encodeURIComponent(countryCode)}&q=${encodeURIComponent(v)}`;
                      const res = await fetch(url, { signal: suggestAbortRef.current.signal });
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
                  if (location.trim().length >= 3) {
                    try {
                      setSuggestLoading(true);
                      const isDigits = /^[0-9\s-]+$/.test(location.trim());
                      const url = isDigits
                        ? `/api/geocode/suggest?type=postalCode&country=${encodeURIComponent(countryCode)}&q=${encodeURIComponent(location)}`
                        : `/api/geocode/suggest?country=${encodeURIComponent(countryCode)}&q=${encodeURIComponent(location)}`;
                      const res = await fetch(url);
                      const json = await res.json();
                      if (json?.suggestions && json.suggestions.length > 0) {
                        setSuggestions(json.suggestions);
                        setShowSuggestions(true);
                      }
                    } catch {}
                    finally { setSuggestLoading(false); }
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white placeholder-[#6b7b8f] focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="Suburb, postcode or city"
                required
              />
              {showSuggestions && (
                <div className="relative">
                  <div className="absolute z-10 w-full mt-1 bg-[#0f1f39] border border-white/10 rounded-md shadow-lg max-h-60 overflow-auto">
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
                                // Keep input showing the postal code if available, otherwise label
                                setLocation(loc.postalCode || s.label || '');
                                setCity(loc.city || '');
                                setCountryCode(loc.countryCode ? loc.countryCode.substring(0,2): countryCode);
                                setState(loc.state || '');
                                setSuburb(loc.suburb || '');
                                return;
                              }
                            }
                          } catch {}
                          // fallback
                          setLocation(s.postalCode || s.label || '');
                          setCity(s.city || '');
                          setCountryCode(s.countryCode || countryCode);
                          setState(s.state || '');
                          setSuburb(s.suburb || '');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/10 text-white border-b border-white/5 last:border-b-0"
                      >
                        <div className="font-medium">{s.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* City and State derived from Postcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">City</label>
              <input
                type="text"
                value={city}
                readOnly
                className="w-full rounded-md border border-white/10 bg-[#0b1426] px-3 py-2 text-[#9bb0c2] placeholder-[#6b7b8f] opacity-70 cursor-not-allowed"
                placeholder="e.g., Sydney"
              />
            </div>
            <div>
              <label className="block text-sm text-[#b8c5d6] mb-1">State</label>
              <input
                type="text"
                value={state}
                readOnly
                className="w-full rounded-md border border-white/10 bg-[#0b1426] px-3 py-2 text-[#9bb0c2] placeholder-[#6b7b8f] opacity-70 cursor-not-allowed"
                placeholder="e.g., NSW"
              />
            </div>
          </div>

          {/* Suburb - greyed out */}
          <div>
            <label className="block text-sm text-[#b8c5d6] mb-1">Suburb</label>
            <input
              type="text"
              value={suburb}
              readOnly
              className="w-full rounded-md border border-white/10 bg-[#0b1426] px-3 py-2 text-[#9bb0c2] placeholder-[#6b7b8f] opacity-70 cursor-not-allowed"
              placeholder="e.g., Parramatta"
            />
          </div>
          {/* Duplicate postcode block removed */}

          {/* Removed auto-normalize button; autocomplete will be used instead */}
        </section>

        <section className="space-y-4">
          {/* Sports & Skill */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h2 className="text-white font-semibold mb-3">Sports & Skill</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableSports.map((s) => {
                  const checked = selectedSports.includes(s.slug);
                  return (
                    <label key={s.slug} className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer ${checked ? 'border-[#00ff88] bg-[#00ff88]/10 text-white' : 'border-white/10 text-[#b8c5d6] hover:bg-white/5'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const isOn = e.target.checked;
                          setSelectedSports((prev) => {
                            if (isOn) return Array.from(new Set([...prev, s.slug]));
                            const next = prev.filter((x) => x !== s.slug);
                            const copy = { ...sportSkills };
                            delete copy[s.slug];
                            setSportSkills(copy);
                            return next;
                          });
                        }}
                        className="sr-only"
                      />
                      <span className="select-none">{s.name}</span>
                    </label>
                  );
                })}
              </div>

              {selectedSports.length > 0 && (
                <div className="space-y-2">
                  {selectedSports.map((slug) => (
                    <div key={slug} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="text-sm text-white/90">
                        {availableSports.find(x => x.slug === slug)?.name || slug}
                      </div>
                      <select
                        value={sportSkills[slug] || ''}
                        onChange={(e) => {
                          const val = e.target.value as SkillLevel;
                          setSportSkills((prev) => ({ ...prev, [slug]: val }));
                        }}
                        className="w-full rounded-md border border-white/10 bg-[#0f1f39] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      >
                        <option value="">Select skill level</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="pro">Pro</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
              {selectedSports.length > 0 && (
                <p className="text-xs text-[#6b7b8f]">Tip: Choose a level for each selected sport to improve match recommendations.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                try { (async () => { await (getSupabaseBrowserClient()?.auth.signOut()); })(); } catch {}
              }}
              className="px-4 py-2 rounded-lg border border-white/10 text-[#b8c5d6] hover:bg-white/10"
            >
              Sign out
            </button>
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


