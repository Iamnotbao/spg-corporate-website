export const PERMISSIONS = [
  "posts.read",
  "posts.create",
  "posts.update",
  "posts.delete",
  "posts.import",
  "jobs.read",
  "jobs.create",
  "jobs.update",
  "jobs.delete",
  "jobs.import",
  "applications.read",
  "applications.download",
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "categories.read",
  "categories.create",
  "categories.update",
  "categories.delete",
  "communications.read",
  "communications.update",
  "languages.read",
  "languages.create",
  "languages.update",
  "languages.delete",
  "chat.read",
  "chat.reply",
  "chat.settings",
  "settings.read",
  "settings.update",
];

export const EMPLOYEE_DEFAULT_PERMISSIONS = [
  "posts.read",
  "posts.create",
  "posts.update",
  "posts.import",
  "jobs.read",
  "jobs.create",
  "jobs.update",
  "jobs.import",
];

const PERMISSION_SET = new Set(PERMISSIONS);

export function normalizePermissions(value, role = "employee") {
  if (role === "admin") return ["*"];
  if (!Array.isArray(value)) return [...EMPLOYEE_DEFAULT_PERMISSIONS];
  return [...new Set(value.map(String).filter((permission) => PERMISSION_SET.has(permission)))];
}

export function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return user?.role === "admin" || permissions.includes("*") || permissions.includes(permission);
}
