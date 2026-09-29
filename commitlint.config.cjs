module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-empty": [2, "never"],
    "scope-enum": [
      2,
      "always",
      [
        "site",
        "code",
        "content",
        "writing",
        "pages",
        "styles",
        "assets",
        "docs",
        "readme",
        "deps",
        "build",
        "ci",
        "deploy",
        "tooling",
      ],
    ],
  },
};
