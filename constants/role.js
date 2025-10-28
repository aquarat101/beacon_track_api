const ROLES = {
  SUPER_ADMIN: "super_admin",
  SCHOOL_ADMIN: "school_admin",
  SCHOOL_STAFF: "school_staff",
};

const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: [ROLES.SCHOOL_ADMIN],
  [ROLES.SCHOOL_ADMIN]: [ROLES.SCHOOL_STAFF],
  [ROLES.SCHOOL_STAFF]: [],
};

module.exports = { ROLES, ROLE_HIERARCHY };
