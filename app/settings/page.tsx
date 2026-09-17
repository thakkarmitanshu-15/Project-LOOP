"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";

type Role = "ADMIN" | "ANALYST" | "VIEWER";

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const roleStyles: Record<Role, string> = {
  ADMIN: "bg-slate-900 text-white",
  ANALYST: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  VIEWER: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
};

export default function WorkspaceSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [showAddMember, setShowAddMember] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ANALYST" as "ANALYST" | "VIEWER",
  });

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (session.user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }

    async function loadMembers() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/workspace/members");

        if (!response.ok) {
          if (response.status === 403) {
            router.replace("/dashboard");
            return;
          }

          throw new Error("Failed to load workspace members");
        }

        const data = await response.json();
        setMembers(data.users ?? []);
      } catch (err) {
        console.error(err);
        setError("Unable to load workspace members.");
      } finally {
        setLoading(false);
      }
    }

    loadMembers();
  }, [session, status, router]);

  async function updateRole(
    memberId: string,
    role: "ANALYST" | "VIEWER",
  ) {
    if (!session || session.user.role !== "ADMIN") return;

    const previousMembers = [...members];

    setUpdatingId(memberId);
    setError("");
    setSuccessMessage("");

    setMembers((current) =>
      current.map((member) =>
        member.id === memberId
          ? {
              ...member,
              role,
            }
          : member,
      ),
    );

    try {
      const response = await fetch(
        `/api/workspace/members/${memberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setMembers((current) =>
        current.map((member) =>
          member.id === memberId ? data.user : member,
        ),
      );

      setSuccessMessage("Member role updated successfully.");
    } catch (err) {
      console.error(err);

      setMembers(previousMembers);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update member role.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || session.user.role !== "ADMIN") return;

    setAddingMember(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/workspace/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(memberForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create workspace member",
        );
      }

      if (data.user) {
        setMembers((current) => [...current, data.user]);
      }

      setMemberForm({
        name: "",
        email: "",
        password: "",
        role: "ANALYST",
      });

      setShowAddMember(false);
      setSuccessMessage(
        "Workspace member added successfully.",
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to add workspace member.",
      );
    } finally {
      setAddingMember(false);
    }
  }

  if (
    status === "loading" ||
    !session ||
    session.user.role !== "ADMIN"
  ) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
      </div>
    );
  }

  const adminCount = members.filter(
    (member) => member.role === "ADMIN",
  ).length;

  const analystCount = members.filter(
    (member) => member.role === "ANALYST",
  ).length;

  const viewerCount = members.filter(
    (member) => member.role === "VIEWER",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">
        {/* Header */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Administration
            </span>
          </div>

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Workspace Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Manage workspace members and control their access level.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddMember((current) => !current);
                setError("");
                setSuccessMessage("");
              }}
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            >
              {showAddMember ? "Cancel" : "Add Member"}
            </button>
          </div>
        </section>

        {/* Summary cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Members
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {members.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Administrators
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {adminCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Analysts
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {analystCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Viewers
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {viewerCount}
            </p>
          </div>
        </section>

        {/* Add member form */}
        {showAddMember && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-base font-bold text-slate-950">
                Add Workspace Member
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Create an Analyst or Viewer inside this workspace.
              </p>
            </div>

            <form
              onSubmit={addMember}
              className="grid gap-5 p-6 md:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="member-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full Name
                </label>

                <input
                  id="member-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={memberForm.name}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter member name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="member-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email Address
                </label>

                <input
                  id="member-email"
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="member@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="member-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Temporary Password
                </label>

                <input
                  id="member-password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={100}
                  value={memberForm.password}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="member-role"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Access Level
                </label>

                <select
                  id="member-role"
                  value={memberForm.role}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      role: event.target.value as
                        | "ANALYST"
                        | "VIEWER",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ANALYST">Analyst</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div className="md:col-span-2 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  disabled={addingMember}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingMember}
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingMember
                    ? "Adding Member..."
                    : "Create Member"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Success */}
        {successMessage && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800">
              {successMessage}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {error}
                </p>

                <p className="mt-1 text-xs text-red-600">
                  Please try again or check your connection.
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.location.reload()}
                disabled={
                  loading ||
                  updatingId !== null ||
                  addingMember
                }
                className="w-fit rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Retrying..." : "Try again"}
              </button>
            </div>
          </div>
        )}

        {/* Members */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-base font-bold text-slate-950">
              Workspace Members
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Change access levels for members of this workspace.
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

              <p className="mt-4 text-sm text-slate-500">
                Loading workspace members...
              </p>
            </div>
          ) : members.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-500">
                No workspace members found.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {members.map((member) => {
                const isCurrentUser =
                  member.id === session.user.id;

                const isUpdating =
                  updatingId === member.id;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                        {member.name?.charAt(0).toUpperCase() ??
                          "U"}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">
                            {member.name}
                          </p>

                          {isCurrentUser && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              You
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isCurrentUser ? (
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${roleStyles[member.role]}`}
                        >
                          {roleLabels[member.role]}
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          disabled={isUpdating}
                          onChange={(event) =>
                            updateRole(
                              member.id,
                              event.target.value as
                                | "ANALYST"
                                | "VIEWER",
                            )
                          }
                          className="min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="ANALYST">
                            Analyst
                          </option>

                          <option value="VIEWER">
                            Viewer
                          </option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}