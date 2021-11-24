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
    "dist/cdn-https*.ts" // These files are a bit difficult to test without actual Azure connection. Let's handle that later, if needed.
  ],
  "reporter": [
    "text",
    "json"
  ]
}