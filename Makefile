.PHONY: up down logs test lint typecheck dev
up:        ; docker compose up --build -d
down:      ; docker compose down
logs:      ; docker compose logs -f web worker
dev:       ; npm run dev
test:      ; npm run test:coverage
lint:      ; npm run lint
typecheck: ; npm run typecheck
