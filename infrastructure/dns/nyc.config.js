module.exports = {
  "all": true,
  "include": [
    "dist/*",
    "src/*"
  ],
  "exclude": [
    "dist/**/*.d.ts",
    "**/__test__/*.[jt]s",
    "dist/index.js", // For index.ts, it is enough that it passes compiler
  ],
  "reporter": [
    "text",
    "json"
  ]
}