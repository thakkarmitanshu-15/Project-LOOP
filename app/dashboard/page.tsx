import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome to LOOP
        </h1>
        <LogoutButton />
        <p className="mt-2 text-gray-600">
          You are logged in as {session.user.name}.
        </p>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">
            Workspace:{" "}
            <span className="font-medium text-gray-900">
              {session.user.workspaceId}
            </span>
          </p>

          <p className="mt-2 text-sm text-gray-600">
            Role:{" "}
            <span className="font-medium text-gray-900">
              {session.user.role}
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}