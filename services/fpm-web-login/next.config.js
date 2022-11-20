module.exports = {
  poweredByHeader: false,
  webpack(cfg) {
    const originalEntry = cfg.entry;
    cfg.entry = async () => {
      const entries = await originalEntry();
      if (entries["main.js"]) {
        entries["main.js"].unshift("./utils/polyfills.js");
      }
      return entries;
    };
    return cfg;
  },
};
