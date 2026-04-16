const DEFAULT_ADMIN_EMAIL = "tom@omaetgroup.co.nz,omaetgroup@gmail.com";

export function getAdminEmails() {
  return `${process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL}`
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveUserRole(email?: string | null) {
  if (!email) return "staff" as const;
  return getAdminEmails().includes(email.trim().toLowerCase()) ? "admin" : "staff";
}
