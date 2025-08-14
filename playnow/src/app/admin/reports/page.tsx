"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

type Report = {
  id: string;
  user_id: string;
  user_email: string | null;
  venue_id: string | null;
  venue_name?: string | null;
  page_url: string | null;
  category: string | null;
  message: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
};

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await api.reports.list({ status: statusFilter || undefined, limit: 200 });
    if (error) setError(error);
    else setReports((data?.reports as Report[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchReports();
  }, [user, statusFilter]);

  const grouped = useMemo(() => {
    return reports.reduce<Record<string, Report[]>>((acc, r) => {
      const k = r.status;
      acc[k] = acc[k] || [];
      acc[k].push(r);
      return acc;
    }, {});
  }, [reports]);

  const handleUpdate = async (id: string, newStatus: Report["status"]) => {
    const { error } = await api.reports.updateStatus(id, newStatus);
    if (error) {
      setError(error);
      return;
    }
    await fetchReports();
  };

  return (
    <div className="min-h-screen bg-[#0a1628] p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Issue Reports</h1>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-[#b8c5d6]">Filter status</label>
          <select
            className="bg-white/5 border border-white/10 rounded-md p-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <button className="px-3 py-2 bg-white/10 border border-white/10 rounded-md text-sm" onClick={fetchReports}>
            Refresh
          </button>
        </div>

        {error && <div className="mb-3 text-orange-300">{error}</div>}
        {loading ? (
          <div className="text-[#00d9ff]">Loading…</div>
        ) : (
          <div className="grid gap-6">
            {(["open","reviewing","resolved","dismissed"] as const).map(section => (
              <div key={section} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold capitalize">{section} ({grouped[section]?.length || 0})</h2>
                </div>
                <div className="divide-y divide-white/10">
                  {(grouped[section] || []).map(r => (
                    <div key={r.id} className="py-3 grid gap-2">
                      <div className="text-sm text-[#b8c5d6]">{new Date(r.created_at).toLocaleString()}</div>
                      <div className="text-sm">
                        <span className="text-[#7a8b9a] mr-2">From:</span>
                        {r.user_email || r.user_id}
                        {r.venue_id && (
                          <>
                            <span className="ml-3 text-[#7a8b9a]">Venue:</span>{' '}
                            <a className="text-[#00d9ff]" href={`/venues/${r.venue_id}`} target="_blank" rel="noopener noreferrer">
                              {r.venue_name || r.venue_id}
                            </a>
                          </>
                        )}
                      </div>
                      {r.category && <div className="text-sm">Category: <span className="text-[#b8c5d6]">{r.category}</span></div>}
                      {r.page_url && (() => {
                        try {
                          const u = new URL(r.page_url);
                          const label = `${u.hostname}${u.pathname}${u.search}`;
                          return (
                            <a className="text-[#00d9ff] text-sm" href={r.page_url} target="_blank" rel="noopener noreferrer">
                              {label}
                            </a>
                          );
                        } catch {
                          return (
                            <a className="text-[#00d9ff] text-sm" href={r.page_url} target="_blank" rel="noopener noreferrer">
                              {r.page_url}
                            </a>
                          );
                        }
                      })()}
                      <pre className="whitespace-pre-wrap break-words bg-black/20 p-3 rounded-md text-[13px]">{r.message}</pre>
                      <div className="flex gap-2 justify-end">
                        {section !== 'open' && (
                          <button className="px-3 py-1 text-sm bg-white/10 border border-white/10 rounded-md" onClick={() => handleUpdate(r.id, 'open')}>Open</button>
                        )}
                        {section !== 'reviewing' && (
                          <button className="px-3 py-1 text-sm bg-white/10 border border-white/10 rounded-md" onClick={() => handleUpdate(r.id, 'reviewing')}>Reviewing</button>
                        )}
                        {section !== 'resolved' && (
                          <button className="px-3 py-1 text-sm bg-[#00ff88] text-[#0a1628] rounded-md" onClick={() => handleUpdate(r.id, 'resolved')}>Resolved</button>
                        )}
                        {section !== 'dismissed' && (
                          <button className="px-3 py-1 text-sm bg-red-500/30 border border-red-500/40 rounded-md" onClick={() => handleUpdate(r.id, 'dismissed')}>Dismiss</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


