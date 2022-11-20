module.exports = {
  poweredByHeader: false,
  exportPathMap() {
    return {
      "/": { page: "/" },
      "/pricing": { page: "/pricing" },
      "/about": { page: "/about" },
      "/tos": { page: "/tos" },
      "/wall-of-love": { page: "/wall-of-love" },
    };
  },
};
