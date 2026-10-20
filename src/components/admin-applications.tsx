"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listApplicationsAction,
  updateApplicationStatusAction,
  exportApplicationsCsvAction,
  getApplicationByIdAction,
} from "@/lib/actions";
import { Search, Download, ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react";

const statuses = ["", "draft", "pending", "shortlisted", "approved", "rejected"];
const paymentStatuses = ["", "unpaid", "paid", "refunded"];

export function AdminApplicationsClient() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Record<string, unknown>[]; total: number; limit: number }>({
    rows: [],
    total: 0,
    limit: 20,
  });
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await listApplicationsAction({ search, status, paymentStatus, state, page, limit: 20 });
    setLoading(false);
    if (res.success && res.data && typeof res.data === "object") {
      setData(res.data as { rows: Record<string, unknown>[]; total: number; limit: number });
    }
  }, [search, status, paymentStatus, state, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    const res = await exportApplicationsCsvAction({ search, status, paymentStatus, state });
    if (res.success && typeof res.data === "string") {
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nlqi-applications-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    const res = await updateApplicationStatusAction({ id, status: newStatus });
    if (res.success) fetchData();
  };

  const openDetail = async (id: number) => {
    setDetailId(id);
    const res = await getApplicationByIdAction(id);
    if (res.success && res.data) setDetail(res.data as Record<string, unknown>);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 w-4 h-4 text-nlqi-charcoal/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, number..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-nlqi-green/20 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-4 py-2.5 rounded-xl border border-nlqi-green/20 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none">
          {statuses.map((s) => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All Statuses"}</option>
          ))}
        </select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="px-4 py-2.5 rounded-xl border border-nlqi-green/20 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none">
          {paymentStatuses.map((s) => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All Payments"}</option>
          ))}
        </select>
        <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="px-4 py-2.5 rounded-xl border border-nlqi-green/20 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
        <button onClick={handleExport} className="inline-flex items-center gap-2 px-5 py-2.5 bg-nlqi-gold text-nlqi-green font-semibold rounded-xl hover:bg-nlqi-gold-light transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {loading && <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-nlqi-gold" /></div>}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {data.rows.map((row) => (
          <div key={row.id as number} className="bg-white rounded-2xl p-6 shadow-sm border border-nlqi-gold/10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-nlqi-charcoal/50 uppercase tracking-wider">Application</p>
                <p className="font-bold text-nlqi-green">{row.applicationNumber as string}</p>
              </div>
              <button onClick={() => openDetail(row.id as number)} className="p-2 rounded-full bg-nlqi-cream hover:bg-nlqi-gold/20 text-nlqi-green">
                <Eye className="w-4 h-4" />
              </button>
            </div>
            <p className="font-medium text-nlqi-charcoal">{row.firstName as string} {row.lastName as string}</p>
            <p className="text-sm text-nlqi-charcoal/60 mb-4">{row.email as string}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-nlqi-green/10 text-nlqi-green capitalize">{row.status as string}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${row.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {row.paymentStatus as string}
              </span>
            </div>
            <select
              value={row.status as string}
              onChange={(e) => updateStatus(row.id as number, e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-nlqi-green/20 text-sm focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none"
            >
              {statuses.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s!.charAt(0).toUpperCase() + s!.slice(1)}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {data.rows.length === 0 && !loading && (
        <div className="text-center py-16 text-nlqi-charcoal/60">No applications found.</div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-full border border-nlqi-green/20 disabled:opacity-40">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-nlqi-charcoal">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-full border border-nlqi-green/20 disabled:opacity-40">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setDetailId(null); setDetail(null); }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold text-nlqi-green mb-4">Application Details</h2>
            {detail ? (
              <div className="space-y-3 text-sm">
                <p><strong>Number:</strong> {String(detail.applicationNumber)}</p>
                <p><strong>Name:</strong> {String(detail.title || "")} {String(detail.firstName)} {String(detail.lastName)}</p>
                <p><strong>Email:</strong> {String(detail.email)}</p>
                <p><strong>Phone:</strong> {String(detail.phone)}</p>
                <p><strong>State:</strong> {String(detail.stateOfOrigin)}</p>
                <p><strong>Education:</strong> {String(detail.educationLevel)} - {String(detail.institution)}</p>
                <p><strong>Why participate:</strong> {String(detail.whyParticipate)}</p>
                <p><strong>Advocacy:</strong> {String(detail.advocacyInterest)}</p>
                <div className="pt-4 flex gap-4">
                  {Boolean(detail.headshotPath) && <img src={`/api/uploads/${detail.headshotPath as string}`} alt="Headshot" className="w-24 h-24 object-cover rounded-lg" />}
                  {Boolean(detail.fullBodyPath) && <img src={`/api/uploads/${detail.fullBodyPath as string}`} alt="Full body" className="w-24 h-24 object-cover rounded-lg" />}
                </div>
              </div>
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-nlqi-gold" />
            )}
            <button onClick={() => { setDetailId(null); setDetail(null); }} className="mt-6 px-6 py-2 bg-nlqi-green text-white rounded-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
