# Modules and build order
M1 menus (first) | M2 attendance | M3 calendar | M4 analysis (needs M2) | M5 forecasting (needs M3, M4)
M6 planning (needs M1, M5) | M7 actuals (needs M1) | M8 waste (needs M7) | M9 reporting (needs M5, M8)
Role x permission matrix: see `src/core/rbac/policy.ts` (MATRIX). Tests in `src/tests/rbac.test.ts`.
