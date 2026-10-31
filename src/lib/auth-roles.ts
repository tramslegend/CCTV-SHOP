// Role definitions shared by the Better Auth server and client. Only the shop owner may use Better Auth's user
// management endpoints and the back office; customers have shop accounts only.
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

export const ac = createAccessControl(defaultStatements);

export const authRoles = {
  owner: ac.newRole({ ...adminAc.statements }),
  customer: ac.newRole({ ...userAc.statements }),
};
