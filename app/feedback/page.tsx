"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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

  const { data: session } = useSession();

  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");

  const [page, setPage] = useState(1);
  const [filterVersion, setFilterVersion] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  function handleFilter() {
    setPage(1);
    setFilterVersion((version) => version + 1);
  }

  function handleClearFilters() {
    setSearch("");
    setSentiment("");
    setStatus("");
    setChannel("");
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
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Feedback Inbox
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Review and manage customer feedback.
          </p>
        </div>

        {/* Feedback Actions */}
        {canManageFeedback && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-3">
              {/* Add Feedback Button */}
              <button
                onClick={() => {
                  setShowAddForm((value) => !value);
                  setShowImportForm(false);
                  setCreateError("");
                  setImportError("");
                }}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                {showAddForm
                  ? "Cancel"
                  : "+ Add Feedback"}
              </button>

              {/* Import CSV Button */}
              <button
                onClick={() => {
                  setShowImportForm((value) => !value);
                  setShowAddForm(false);
                  setImportError("");
                  setCreateError("");
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                {showImportForm
                  ? "Cancel Import"
                  : "Import CSV"}
              </button>
            </div>

            {/* Add Feedback Success */}
            {createSuccess && (
              <p className="mt-3 text-sm font-medium text-green-600">
                {createSuccess}
              </p>
            )}

            {/* CSV Import Success */}
            {importSuccess && (
              <p className="mt-3 text-sm font-medium text-green-600">
                {importSuccess}
              </p>
            )}

            {/* Add Feedback Form */}
            {showAddForm && (
              <form
                onSubmit={createFeedback}
                className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Add Feedback
                </h2>

                <div className="space-y-4">
                  {/* Feedback */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Feedback
                    </label>

                    <textarea
                      value={newContent}
                      onChange={(event) =>
                        setNewContent(event.target.value)
                      }
                      required
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
                      placeholder="Enter customer feedback..."
                    />
                  </div>

                  {/* Channel */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Channel
                    </label>

                    <select
                      value={newChannel}
                      onChange={(event) =>
                        setNewChannel(event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                    >
                      <option value="Support">
                        Support
                      </option>

                      <option value="App Store">
                        App Store
                      </option>

                      <option value="NPS">
                        NPS
                      </option>

                      <option value="Sales">
                        Sales
                      </option>

                      <option value="Community">
                        Community
                      </option>
                    </select>
                  </div>

                  {/* Customer Label */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
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
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Source Reference */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Source Reference
                    </label>

                    <input
                      type="text"
                      value={newSourceRef}
                      onChange={(event) =>
                        setNewSourceRef(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Error */}
                  {createError && (
                    <p className="text-sm text-red-600">
                      {createError}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creating
                      ? "Adding..."
                      : "Add Feedback"}
                  </button>
                </div>
              </form>
            )}

            {/* CSV Import Form */}
            {showImportForm && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-lg font-semibold text-gray-900">
                  Import Feedback from CSV
                </h2>

                <p className="mb-4 text-sm text-gray-600">
                  Select a CSV file using the required
                  columns:
                  {" "}
                  content, channel, customerLabel, sourceRef
                </p>

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
                  className="block w-full text-sm text-gray-900"
                />

                {csvFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected file: {csvFile.name}
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
                  className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing
                    ? "Importing..."
                    : "Upload CSV"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div>
              <label
                htmlFor="search"
                className="mb-1 block text-sm font-medium text-gray-700"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500"
              />
            </div>

            {/* Sentiment */}
            <div>
              <label
                htmlFor="sentiment"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Sentiment
              </label>

              <select
                id="sentiment"
                value={sentiment}
                onChange={(event) =>
                  setSentiment(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
              >
                <option value="">
                  All sentiments
                </option>

                <option value="POS">
                  Positive
                </option>

                <option value="NEU">
                  Neutral
                </option>

                <option value="NEG">
                  Negative
                </option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Status
              </label>

              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
              >
                <option value="">
                  All statuses
                </option>

                <option value="NEW">
                  New
                </option>

                <option value="REVIEWED">
                  Reviewed
                </option>

                <option value="ACTIONED">
                  Actioned
                </option>
              </select>
            </div>

            {/* Channel */}
            <div>
              <label
                htmlFor="channel"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Channel
              </label>

              <select
                id="channel"
                value={channel}
                onChange={(event) =>
                  setChannel(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
              >
                <option value="">
                  All channels
                </option>

                <option value="Support">
                  Support
                </option>

                <option value="App Store">
                  App Store
                </option>

                <option value="NPS">
                  NPS
                </option>

                <option value="Sales">
                  Sales
                </option>

                <option value="Community">
                  Community
                </option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleFilter}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Apply Filters
            </button>

            <button
              onClick={handleClearFilters}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
            Loading feedback...
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <p className="text-sm text-gray-600">
                Showing {feedback.length} of {total} feedback
                records
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Feedback
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Channel
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Sentiment
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Themes
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {feedback.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        window.location.href = `/feedback/${item.id}`;
                      }}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      {/* Feedback */}
                      <td className="max-w-md px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {item.content}
                        </p>

                        {item.customerLabel && (
                          <p className="mt-1 text-xs text-gray-500">
                            {item.customerLabel}
                          </p>
                        )}
                      </td>

                      {/* Channel */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {item.channel}
                      </td>

                      {/* Sentiment */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getSentimentBadge(
                            item.sentiment
                          )}`}
                        >
                          {item.sentiment ?? "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <select
                          value={item.status}
                          disabled={updatingId === item.id}
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
                          className={`rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium outline-none focus:border-gray-500 disabled:cursor-not-allowed disabled:opacity-50 ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          <option value="NEW">
                            New
                          </option>

                          <option value="REVIEWED">
                            Reviewed
                          </option>

                          <option value="ACTIONED">
                            Actioned
                          </option>
                        </select>
                      </td>

                      {/* Themes */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {item.feedbackThemes.map(
                            (itemTheme) => (
                              <span
                                key={itemTheme.theme.id}
                                className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                              >
                                {itemTheme.theme.name}
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(
                          item.createdAt
                        ).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}

                  {feedback.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-gray-500"
                      >
                        No feedback matches your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-6 py-4">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPage(
                      (currentPage) =>
                        currentPage - 1
                    )
                  }
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <button
                  onClick={() =>
                    setPage(
                      (currentPage) =>
                        currentPage + 1
                    )
                  }
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function getSentimentBadge(
  sentiment: Feedback["sentiment"]
) {
  if (sentiment === "POS") {
    return "bg-green-100 text-green-700";
  }

  if (sentiment === "NEG") {
    return "bg-red-100 text-red-700";
  }

  if (sentiment === "NEU") {
    return "bg-gray-100 text-gray-700";
  }

  return "bg-gray-100 text-gray-500";
}

function getStatusBadge(
  status: Feedback["status"]
) {
  if (status === "NEW") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "REVIEWED") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-green-100 text-green-700";
}