module.exports = {
  "all": true,
  "include": [
    "dist/*",
    "src/*"
  ],
  "exclude": [
    "dist/**/*.d.ts",
    "**/__test__/*.[jt]s",
    "*/naming.[jt]s",
  ],
  "reporter": [
    "text",
    "json"
  ]
}