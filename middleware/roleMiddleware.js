const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user || !user.role) {
        return res
          .status(403)
          .json({ message: "Access denied: No role found" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          message: `Access denied: Role '${user.role}' not authorized`,
        });
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ message: "Server error in role middleware" });
    }
  };
};

module.exports = { authorizeRoles };
