module.exports = {
  "all": true,
  "include": [
    "dist/*",
    "src/*"
  ],
  "exclude": [
    "dist/**/*.d.ts",
    "**/__test__/*.[jt]s",
  ],
  "reporter": [
    "text",
    "json"
  ]
}