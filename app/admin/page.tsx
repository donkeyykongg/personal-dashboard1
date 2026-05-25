import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Shield, Trash2, UserPlus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Personal Dashboard" };

function configuredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);

  const users = [...data.users].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });
  const envAdmins = configuredAdminEmails();
  const isAdmin =
    (user.email ? envAdmins.has(user.email.toLowerCase()) : false) ||
    users[0]?.id === user.id;

  if (!isAdmin) redirect("/dashboard");

  return { admin, currentUser: user, users };
}

async function createUserAction(formData: FormData) {
  "use server";

  const { admin } = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 6) return;

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

async function deleteUserAction(formData: FormData) {
  "use server";

  const { admin, currentUser } = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === currentUser.id) return;

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export default async function AdminPage() {
  const { currentUser, users } = await requireAdmin();

  return (
    <div className="dash-hub space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rowan-eyebrow">Admin</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">User access</h1>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          <Shield className="h-4 w-4" />
          {currentUser.email}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <form
          action={createUserAction}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm"
        >
          <div className="mb-4">
            <p className="rowan-eyebrow">Invite</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Add a user</h2>
          </div>
          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[#B8B6B0]">Email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="person@example.com"
                className="h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-emerald-400/60"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[#B8B6B0]">Temporary password</span>
              <input
                name="password"
                type="password"
                minLength={6}
                required
                className="h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-emerald-400/60"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--rowan-accent,#6be3a4)] px-4 text-sm font-bold text-[#06100b]"
            >
              <UserPlus className="h-4 w-4" />
              Create user
            </button>
          </div>
        </form>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="rowan-eyebrow">Users</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Accounts</h2>
            </div>
            <p className="font-mono text-xs text-[#B8B6B0]">{users.length} total</p>
          </div>

          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="grid gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-3 md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.email ?? "No email"}
                  </p>
                  <p className="font-mono text-[11px] text-[#76746E]">
                    Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : "unknown"}
                  </p>
                </div>
                {user.id === currentUser.id ? (
                  <span className="inline-flex h-9 items-center rounded-lg border border-emerald-500/20 px-3 text-xs font-semibold text-emerald-100">
                    Current admin
                  </span>
                ) : (
                  <form action={deleteUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-400/20 px-3 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-[#B8B6B0]">
        <p className="rowan-eyebrow mb-2">Supabase usage</p>
        <p>
          A new onboarded user starts with very little data: an auth record plus a few default
          rows. Day-to-day usage is mostly small database rows for tasks, habits, focus sessions,
          journal entries, and settings. Storage should only grow noticeably if you add file
          uploads or large pasted note content.
        </p>
      </section>
    </div>
  );
}
