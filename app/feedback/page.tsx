"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

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

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [themeId, setThemeId] = useState(
    searchParams.get("themeId") ?? ""
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [themes, setThemes] = useState<
    { id: string; name: string }[]
  >([]);

  const [page, setPage] = useState(1);
  const [filterVersion, setFilterVersion] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );

  // Add Feedback state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newChannel, setNewChannel] = useState("Support");
  const [newCustomerLabel, setNewCustomerLabel] = useState("");
  const [newSourceRef, setNewSourceRef] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // CSV Import state
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

      const queryString = params.toString();

      const response = await fetch(
        `/api/feedback?${queryString}`
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
      setError("Unable to load feedback");
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
    event: React.FormEvent<HTMLFormElement>
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
          data.error || "Failed to create feedback"
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
          : "Something went wrong"
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
          data.error || "Failed to import CSV"
        );
      }

      setCsvFile(null);
      setShowImportForm(false);

      setImportSuccess(
        `${data.imported} feedback record${
          data.imported === 1 ? "" : "s"
        } imported successfully.`
      );

      setPage(1);
      setFilterVersion((value) => value + 1);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Something went wrong while importing CSV"
      );
    } finally {
      setImporting(false);
    }
  };

  async function updateStatus(
    feedbackId: string,
    newStatus: "NEW" | "REVIEWED" | "ACTIONED"
  ) {
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
          data.error || "Failed to update feedback"
        );
      }

      setFeedback((currentFeedback) =>
        currentFeedback.map((item) =>
          item.id === feedbackId
            ? { ...item, status: newStatus }
            : item
        )
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update feedback"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const canManageFeedback =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "ANALYST";

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
              L
            </div>

            <div>
              <p className="text-base font-bold tracking-tight text-slate-950">
                LOOP
              </p>

              <p className="hidden text-[10px] uppercase tracking-widest text-slate-400 sm:block">
                Customer Intelligence
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <a
              href="/dashboard"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Dashboard
            </a>

            <a
              href="/feedback"
              className="rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white"
            >
              Feedback
            </a>

            <a
              href="/themes"
              className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 sm:block"
            >
              Themes
            </a>

            <div className="mx-2 hidden h-6 w-px bg-slate-200 sm:block" />

            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-900">
                {session?.user?.name}
              </p>

              <p className="text-[10px] text-slate-500">
                {session?.user?.role}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {session?.user?.name
                ?.charAt(0)
                .toUpperCase() ?? "U"}
            </div>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
        {/* Page heading */}
        <section className="mb-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Customer Feedback
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Feedback Inbox
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Review, filter, and manage customer feedback
                across your workspace.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Total Feedback
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950">
                {total}
              </p>
            </div>
          </div>
        </section>

        {/* Actions */}
        {canManageFeedback && (
          <section className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Feedback Management
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Add individual feedback or import multiple
                  records.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setShowAddForm((value) => !value);
                    setShowImportForm(false);
                    setCreateError("");
                    setImportError("");
                  }}
                  className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  {showAddForm
                    ? "Cancel"
                    : "+ Add Feedback"}
                </button>

                <button
                  onClick={() => {
                    setShowImportForm((value) => !value);
                    setShowAddForm(false);
                    setImportError("");
                    setCreateError("");
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  {showImportForm
                    ? "Cancel Import"
                    : "Import CSV"}
                </button>
              </div>
            </div>

            {createSuccess && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {createSuccess}
              </div>
            )}

            {importSuccess && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {importSuccess}
              </div>
            )}

            {/* Add Feedback Form */}
            {showAddForm && (
              <form
                onSubmit={createFeedback}
                className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-950">
                    Add Feedback
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Add a new customer feedback record to the
                    workspace.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Feedback
                    </label>

                    <textarea
                      value={newContent}
                      onChange={(event) =>
                        setNewContent(event.target.value)
                      }
                      required
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      placeholder="Enter customer feedback..."
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Channel
                    </label>

                    <select
                      value={newChannel}
                      onChange={(event) =>
                        setNewChannel(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      <option value="Support">Support</option>
                      <option value="App Store">App Store</option>
                      <option value="NPS">NPS</option>
                      <option value="Sales">Sales</option>
                      <option value="Community">Community</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Customer Label
                    </label>

                    <input
                      type="text"
                      value={newCustomerLabel}
                      onChange={(event) =>
                        setNewCustomerLabel(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Source Reference
                    </label>

                    <input
                      type="text"
                      value={newSourceRef}
                      onChange={(event) =>
                        setNewSourceRef(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      placeholder="Optional"
                    />
                  </div>

                  {createError && (
                    <p className="text-sm text-red-600 md:col-span-2">
                      {createError}
                    </p>
                  )}

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={creating}
                      className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creating
                        ? "Adding..."
                        : "Add Feedback"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* CSV Import Form */}
            {showImportForm && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-950">
                    Import Feedback from CSV
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Upload a CSV using the required columns:
                    <span className="font-medium text-slate-700">
                      {" "}
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
                      event.target.files?.[0] || null
                    );
                    setImportError("");
                    setImportSuccess("");
                  }}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                />

                {csvFile && (
                  <p className="mt-3 text-sm text-slate-500">
                    Selected file:{" "}
                    <span className="font-medium text-slate-700">
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
                  className="mt-4 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing
                    ? "Importing..."
                    : "Upload CSV"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Filters */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Filters
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Narrow feedback by customer, sentiment, theme,
                channel, or date.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="search"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Search
              </label>

              <input
                id="search"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search feedback..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="sentiment"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Sentiment
              </label>

              <select
                id="sentiment"
                value={sentiment}
                onChange={(event) =>
                  setSentiment(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">All sentiments</option>
                <option value="POS">Positive</option>
                <option value="NEU">Neutral</option>
                <option value="NEG">Negative</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Status
              </label>

              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">All statuses</option>
                <option value="NEW">New</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="ACTIONED">Actioned</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="channel"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Channel
              </label>

              <select
                id="channel"
                value={channel}
                onChange={(event) =>
                  setChannel(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">All channels</option>
                <option value="Support">Support</option>
                <option value="App Store">App Store</option>
                <option value="NPS">NPS</option>
                <option value="Sales">Sales</option>
                <option value="Community">Community</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="theme"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Theme
              </label>

              <select
                id="theme"
                value={themeId}
                onChange={(event) =>
                  setThemeId(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">All themes</option>

                {themes.map(
                  (theme: {
                    id: string;
                    name: string;
                  }) => (
                    <option
                      key={theme.id}
                      value={theme.id}
                    >
                      {theme.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="dateFrom"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Date From
              </label>

              <input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="dateTo"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Date To
              </label>

              <input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={handleFilter}
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Apply Filters
            </button>

            <button
              onClick={handleClearFilters}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Clear Filters
            </button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-700">
              Loading feedback...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Fetching the latest feedback records.
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Feedback Records
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {feedback.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {total}
                  </span>{" "}
                  records
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                Page {page} of {totalPages}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Feedback
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Channel
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Sentiment
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Themes
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      {/* Feedback */}
                      <td className="max-w-md px-6 py-5">
                        <p className="line-clamp-2 text-sm font-medium leading-5 text-slate-900">
                          {item.content}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                          {item.customerLabel && (
                            <span className="text-xs text-slate-500">
                              {item.customerLabel}
                            </span>
                          )}

                          {item.sourceRef && (
                            <>
                              <span className="text-slate-300">
                                •
                              </span>

                              <span className="text-xs text-slate-400">
                                {item.sourceRef}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="whitespace-nowrap px-6 py-5">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                          {item.channel}
                        </span>
                      </td>

                      {/* Sentiment */}
                      <td className="whitespace-nowrap px-6 py-5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getSentimentBadge(
                            item.sentiment
                          )}`}
                        >
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                          {getSentimentLabel(item.sentiment)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-6 py-5">
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
                                | "ACTIONED"
                            );
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${getStatusBadge(
                            item.status
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
                      </td>

                      {/* Themes */}
                      <td className="px-6 py-5">
                        <div className="flex max-w-xs flex-wrap gap-1.5">
                          {item.feedbackThemes.length > 0 ? (
                            item.feedbackThemes.map(
                              (itemTheme) => (
                                <span
                                  key={itemTheme.theme.id}
                                  className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                                >
                                  {itemTheme.theme.name}
                                </span>
                              )
                            )
                          ) : (
                            <span className="text-xs text-slate-400">
                              —
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-6 py-5 text-xs font-medium text-slate-500">
                        {new Date(
                          item.createdAt
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
                        className="px-6 py-16 text-center"
                      >
                        <div className="mx-auto max-w-sm">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            ≡
                          </div>

                          <p className="mt-4 text-sm font-semibold text-slate-900">
                            No feedback found
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Try adjusting your filters or add
                            new feedback to the workspace.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-slate-500">
                Page{" "}
                <span className="font-semibold text-slate-700">
                  {page}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {totalPages}
                </span>
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPage(
                      (currentPage) => currentPage - 1
                    )
                  }
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                <button
                  onClick={() =>
                    setPage(
                      (currentPage) => currentPage + 1
                    )
                  }
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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

function getSentimentBadge(
  sentiment: Feedback["sentiment"]
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
  sentiment: Feedback["sentiment"]
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
  status: Feedback["status"]
) {
  if (status === "NEW") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "REVIEWED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}