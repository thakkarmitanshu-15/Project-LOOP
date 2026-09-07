"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/app/components/Navbar";

type FeedbackTheme = {
  confidence: number;
  theme: {
    id: string;
    name: string;
    color: string | null;
  };
};

type Feedback = {
  id: string;
  content: string;
  channel: string;
  sourceRef: string | null;
  customerLabel: string | null;
  sentiment: "POS" | "NEU" | "NEG" | null;
  sentimentScore: number | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: string;
  feedbackThemes: FeedbackTheme[];
};

type FeedbackResponse = {
  feedback: Feedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ThemeOption = {
  id: string;
  name: string;
};

export default function FeedbackPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const role = session?.user?.role;

  const canManageFeedback =
    role === "ADMIN" || role === "ANALYST";

  const roleLabel =
    role === "ADMIN"
      ? "Administrator"
      : role === "ANALYST"
        ? "Analyst"
        : "Viewer";

  const roleDescription =
    role === "ADMIN"
      ? "Full workspace access and feedback management."
      : role === "ANALYST"
        ? "Analyze feedback and manage customer workflows."
        : "Read-only access to customer intelligence.";

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [themeId, setThemeId] = useState(
    searchParams.get("themeId") ?? "",
  );

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [themes, setThemes] = useState<ThemeOption[]>([]);

  const [page, setPage] = useState(1);
  const [filterVersion, setFilterVersion] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [updatingId, setUpdatingId] = useState<string | null>(
    null,
  );

  // Add Feedback
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newChannel, setNewChannel] = useState("Support");
  const [newCustomerLabel, setNewCustomerLabel] = useState("");
  const [newSourceRef, setNewSourceRef] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // CSV Import
  const [showImportForm, setShowImportForm] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  async function loadFeedback() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", page.toString());
      params.set("limit", "20");

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (sentiment) {
        params.set("sentiment", sentiment);
      }

      if (status) {
        params.set("status", status);
      }

      if (channel) {
        params.set("channel", channel);
      }

      if (themeId) {
        params.set("themeId", themeId);
      }

      if (dateFrom) {
        params.set("dateFrom", dateFrom);
      }

      if (dateTo) {
        params.set("dateTo", dateTo);
      }

      const response = await fetch(
        `/api/feedback?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load feedback");
      }

      const data: FeedbackResponse = await response.json();

      setFeedback(data.feedback);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error(error);
      setError("Unable to load feedback.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeedback();
  }, [page, filterVersion]);

  useEffect(() => {
    async function loadThemes() {
      try {
        const response = await fetch("/api/themes");

        if (!response.ok) {
          throw new Error("Failed to load themes");
        }

        const data = await response.json();

        setThemes(data.themes ?? []);
      } catch (error) {
        console.error("Failed to load themes:", error);
      }
    }

    loadThemes();
  }, []);

  function handleFilter() {
    setPage(1);
    setFilterVersion((version) => version + 1);
  }

  function handleClearFilters() {
    setSearch("");
    setSentiment("");
    setStatus("");
    setChannel("");
    setThemeId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setFilterVersion((version) => version + 1);
  }

  const createFeedback = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setCreating(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newContent,
          channel: newChannel,
          customerLabel: newCustomerLabel || undefined,
          sourceRef: newSourceRef || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create feedback",
        );
      }

      setNewContent("");
      setNewChannel("Support");
      setNewCustomerLabel("");
      setNewSourceRef("");
      setShowAddForm(false);

      setCreateSuccess("Feedback added successfully.");

      setPage(1);
      setFilterVersion((value) => value + 1);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    } finally {
      setCreating(false);
    }
  };

  const importCsv = async () => {
    if (!csvFile) {
      setImportError("Please select a CSV file.");
      return;
    }

    setImporting(true);
    setImportError("");
    setImportSuccess("");

    try {
      const csvText = await csvFile.text();

      const response = await fetch("/api/feedback", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csv: csvText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to import CSV",
        );
      }

      setCsvFile(null);
      setShowImportForm(false);

      setImportSuccess(
        `${data.imported} feedback record${
          data.imported === 1 ? "" : "s"
        } imported successfully.`,
      );

      setPage(1);
      setFilterVersion((value) => value + 1);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Something went wrong while importing CSV",
      );
    } finally {
      setImporting(false);
    }
  };

  async function updateStatus(
    feedbackId: string,
    newStatus: "NEW" | "REVIEWED" | "ACTIONED",
  ) {
    if (!canManageFeedback) {
      return;
    }

    try {
      setUpdatingId(feedbackId);

      const response = await fetch("/api/feedback", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: feedbackId,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update feedback",
        );
      }

      setFeedback((currentFeedback) =>
        currentFeedback.map((item) =>
          item.id === feedbackId
            ? { ...item, status: newStatus }
            : item,
        ),
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update feedback",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const activeFilterCount = useMemo(() => {
    return [
      search,
      sentiment,
      status,
      channel,
      themeId,
      dateFrom,
      dateTo,
    ].filter(Boolean).length;
  }, [
    search,
    sentiment,
    status,
    channel,
    themeId,
    dateFrom,
    dateTo,
  ]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-6 lg:px-10 lg:py-9">
        {/* Page heading */}
        <section className="mb-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.10)]" />

                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Customer Feedback
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Feedback Inbox
                </h1>

                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    role === "ADMIN"
                      ? "border-violet-200 bg-violet-50 text-violet-700"
                      : role === "ANALYST"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {roleLabel}
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Review customer feedback, understand sentiment,
                explore themes, and manage workflow across your
                workspace.
              </p>

              <p className="mt-2 text-xs font-medium text-slate-400">
                {roleDescription}
              </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-r border-slate-200 px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Total
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  {total}
                </p>
              </div>

              <div className="px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Filters
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  {activeFilterCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Management */}
        {canManageFeedback && (
          <section className="mb-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    +
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      Feedback Management
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Add individual records or import feedback
                      in bulk.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm((value) => !value);
                      setShowImportForm(false);
                      setCreateError("");
                      setImportError("");
                    }}
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    {showAddForm
                      ? "Close Form"
                      : "+ Add Feedback"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowImportForm((value) => !value);
                      setShowAddForm(false);
                      setImportError("");
                      setCreateError("");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {showImportForm
                      ? "Close Import"
                      : "Import CSV"}
                  </button>
                </div>
              </div>

              {createSuccess && (
                <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 sm:px-6">
                  ✓ {createSuccess}
                </div>
              )}

              {importSuccess && (
                <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 sm:px-6">
                  ✓ {importSuccess}
                </div>
              )}

              {/* Add Form */}
              {showAddForm && (
                <form
                  onSubmit={createFeedback}
                  className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6"
                >
                  <div className="mb-5">
                    <h2 className="text-lg font-bold">
                      Add customer feedback
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Create a new feedback record for this
                      workspace.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Feedback
                      </label>

                      <textarea
                        value={newContent}
                        onChange={(event) =>
                          setNewContent(event.target.value)
                        }
                        required
                        rows={4}
                        placeholder="Enter the customer's feedback..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Channel
                      </label>

                      <select
                        value={newChannel}
                        onChange={(event) =>
                          setNewChannel(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      >
                        <option value="Support">
                          Support
                        </option>

                        <option value="App Store">
                          App Store
                        </option>

                        <option value="NPS">NPS</option>

                        <option value="Sales">Sales</option>

                        <option value="Community">
                          Community
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Customer Label
                      </label>

                      <input
                        type="text"
                        value={newCustomerLabel}
                        onChange={(event) =>
                          setNewCustomerLabel(
                            event.target.value,
                          )
                        }
                        placeholder="Optional"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Source Reference
                      </label>

                      <input
                        type="text"
                        value={newSourceRef}
                        onChange={(event) =>
                          setNewSourceRef(event.target.value)
                        }
                        placeholder="Optional"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {createError && (
                      <p className="text-sm font-medium text-red-600 md:col-span-2">
                        {createError}
                      </p>
                    )}

                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={creating}
                        className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {creating
                          ? "Adding..."
                          : "Add Feedback"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Import Form */}
              {showImportForm && (
                <div className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-lg font-bold">
                      Import feedback
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Upload a CSV with{" "}
                      <span className="font-semibold text-slate-700">
                        content, channel, customerLabel,
                        sourceRef
                      </span>
                    </p>
                  </div>

                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      setCsvFile(
                        event.target.files?.[0] ?? null,
                      );

                      setImportError("");
                      setImportSuccess("");
                    }}
                    className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700"
                  />

                  {csvFile && (
                    <p className="mt-3 text-xs text-slate-500">
                      Selected:{" "}
                      <span className="font-semibold text-slate-700">
                        {csvFile.name}
                      </span>
                    </p>
                  )}

                  {importError && (
                    <p className="mt-3 text-sm font-medium text-red-600">
                      {importError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={importCsv}
                    disabled={!csvFile || importing}
                    className="mt-4 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {importing
                      ? "Importing..."
                      : "Upload CSV"}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">
                    ⌕
                  </div>

                  <h2 className="text-sm font-bold">
                    Filter feedback
                  </h2>
                </div>

                <p className="mt-1 pl-10 text-xs text-slate-400">
                  Narrow results by sentiment, status, theme,
                  channel, or date.
                </p>
              </div>

              {activeFilterCount > 0 && (
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {activeFilterCount} active
                </span>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FilterInput
                id="search"
                label="Search"
                value={search}
                placeholder="Search feedback..."
                onChange={setSearch}
              />

              <FilterSelect
                id="sentiment"
                label="Sentiment"
                value={sentiment}
                onChange={setSentiment}
                options={[
                  ["", "All sentiments"],
                  ["POS", "Positive"],
                  ["NEU", "Neutral"],
                  ["NEG", "Negative"],
                ]}
              />

              <FilterSelect
                id="status"
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  ["", "All statuses"],
                  ["NEW", "New"],
                  ["REVIEWED", "Reviewed"],
                  ["ACTIONED", "Actioned"],
                ]}
              />

              <FilterSelect
                id="channel"
                label="Channel"
                value={channel}
                onChange={setChannel}
                options={[
                  ["", "All channels"],
                  ["Support", "Support"],
                  ["App Store", "App Store"],
                  ["NPS", "NPS"],
                  ["Sales", "Sales"],
                  ["Community", "Community"],
                ]}
              />

              <FilterSelect
                id="theme"
                label="Theme"
                value={themeId}
                onChange={setThemeId}
                options={[
                  ["", "All themes"],
                  ...themes.map((theme) => [
                    theme.id,
                    theme.name,
                  ]),
                ]}
              />

              <FilterInput
                id="dateFrom"
                label="Date From"
                type="date"
                value={dateFrom}
                onChange={setDateFrom}
              />

              <FilterInput
                id="dateTo"
                label="Date To"
                type="date"
                value={dateTo}
                onChange={setDateTo}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleFilter}
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Apply Filters
              </button>

              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <span>!</span>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse gap-4"
                >
                  <div className="h-10 flex-1 rounded-lg bg-slate-100" />
                  <div className="h-10 w-24 rounded-lg bg-slate-100" />
                  <div className="h-10 w-24 rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Feedback table */}
        {!loading && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <h2 className="text-sm font-bold">
                  Feedback Records
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Showing{" "}
                  <span className="font-semibold text-slate-600">
                    {feedback.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-600">
                    {total}
                  </span>{" "}
                  records
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!canManageFeedback && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Read only
                  </span>
                )}

                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Page {page} / {totalPages}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:px-6">
                      Feedback
                    </th>

                    <th className="px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Channel
                    </th>

                    <th className="px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Sentiment
                    </th>

                    <th className="px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Themes
                    </th>

                    <th className="px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {feedback.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        window.location.href = `/feedback/${item.id}`;
                      }}
                      className="group cursor-pointer transition hover:bg-slate-50/80"
                    >
                      <td className="max-w-lg px-5 py-5 sm:px-6">
                        <div className="flex gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 transition group-hover:bg-slate-950 group-hover:text-white">
                            {item.customerLabel
                              ?.charAt(0)
                              .toUpperCase() ?? "F"}
                          </div>

                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                              {item.content}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {item.customerLabel && (
                                <span className="text-[11px] font-medium text-slate-500">
                                  {item.customerLabel}
                                </span>
                              )}

                              {item.sourceRef && (
                                <>
                                  <span className="text-slate-300">
                                    •
                                  </span>

                                  <span className="text-[11px] text-slate-400">
                                    {item.sourceRef}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-5">
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                          {item.channel}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1.5 text-[10px] font-bold ${getSentimentBadge(
                            item.sentiment,
                          )}`}
                        >
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                          {getSentimentLabel(item.sentiment)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-5">
                        {canManageFeedback ? (
                          <select
                            value={item.status}
                            disabled={
                              updatingId === item.id
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                            onChange={(event) => {
                              event.stopPropagation();

                              updateStatus(
                                item.id,
                                event.target.value as
                                  | "NEW"
                                  | "REVIEWED"
                                  | "ACTIONED",
                              );
                            }}
                            className={`rounded-lg border px-3 py-2 text-[10px] font-bold outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${getStatusBadge(
                              item.status,
                            )}`}
                          >
                            <option value="NEW">New</option>

                            <option value="REVIEWED">
                              Reviewed
                            </option>

                            <option value="ACTIONED">
                              Actioned
                            </option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${getStatusBadge(
                              item.status,
                            )}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex max-w-xs flex-wrap gap-1.5">
                          {item.feedbackThemes.length > 0 ? (
                            item.feedbackThemes.map(
                              (itemTheme) => (
                                <span
                                  key={itemTheme.theme.id}
                                  className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                                >
                                  {itemTheme.theme.name}
                                </span>
                              ),
                            )
                          ) : (
                            <span className="text-xs text-slate-300">
                              —
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-5 text-[11px] font-medium text-slate-400">
                        {new Date(
                          item.createdAt,
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}

                  {feedback.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-20 text-center"
                      >
                        <div className="mx-auto max-w-sm">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
                            ≡
                          </div>

                          <p className="mt-4 text-sm font-bold text-slate-900">
                            No feedback found
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Try adjusting your filters or add
                            new feedback to the workspace.
                          </p>

                          {canManageFeedback && (
                            <button
                              type="button"
                              onClick={handleClearFilters}
                              className="mt-5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs font-medium text-slate-400">
                Page{" "}
                <span className="font-bold text-slate-700">
                  {page}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-700">
                  {totalPages}
                </span>
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      (currentPage) => currentPage - 1,
                    )
                  }
                  disabled={page === 1}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      (currentPage) => currentPage + 1,
                    )
                  }
                  disabled={page >= totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function FilterInput({
  id,
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function getSentimentBadge(
  sentiment: Feedback["sentiment"],
) {
  if (sentiment === "POS") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (sentiment === "NEG") {
    return "bg-red-50 text-red-700";
  }

  if (sentiment === "NEU") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-slate-100 text-slate-400";
}

function getSentimentLabel(
  sentiment: Feedback["sentiment"],
) {
  if (sentiment === "POS") {
    return "Positive";
  }

  if (sentiment === "NEG") {
    return "Negative";
  }

  if (sentiment === "NEU") {
    return "Neutral";
  }

  return "Unclassified";
}

function getStatusBadge(
  status: Feedback["status"],
) {
  if (status === "NEW") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "REVIEWED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getStatusLabel(status: Feedback["status"]) {
  if (status === "NEW") {
    return "New";
  }

  if (status === "REVIEWED") {
    return "Reviewed";
  }

  return "Actioned";
}