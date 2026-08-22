export const MANDORA_ROLES = Object.freeze(["admin", "student"]);
export const LEGACY_CMS_ROLE = "employee";
export const AUTHENTICATED_ROLES = new Set([...MANDORA_ROLES, LEGACY_CMS_ROLE]);

export function isAuthenticatedRole(role) {
  return AUTHENTICATED_ROLES.has(
    String(role || "")
      .trim()
      .toLowerCase(),
  );
}
