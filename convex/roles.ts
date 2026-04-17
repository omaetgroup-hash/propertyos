export function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveUserRole(email?: string | null) {
  if (!email) return "staff" as const;
  return getAdminEmails().includes(email.trim().toLowerCase()) ? "admin" : "staff";
}
