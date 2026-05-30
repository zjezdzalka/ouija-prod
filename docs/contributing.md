# Contributing

ouija is open-source and contributions are welcome — whether that's bug fixes, new features, documentation improvements, or test coverage.

---

## Before you start

1. Check the [GitHub Issues](https://github.com/internuntiae/ouija/issues) to see if your idea or bug is already tracked.
2. For significant changes, open an issue first to discuss the approach before writing code.

---

## Development setup

Follow the [Development guide](development.md) to get the app running locally.

---

## Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Make sure all tests pass: `npm run test:api`
5. Make sure formatting is clean: `npm run format:check`
6. Commit with a clear message
7. Push and open a Pull Request against `main`

---

## Code style

- TypeScript everywhere — no plain JS files in `apps/`
- SCSS modules for frontend styling — no inline styles, no global CSS (except `main-layout.scss`)
- Layered backend architecture — no direct database calls from controllers or routers, always go through the service layer
- Repositories handle data access only — no business logic in repositories
- Error handling: throw descriptive `Error` messages from services; controllers convert them to HTTP responses

Prettier and ESLint are configured and enforced via Husky pre-commit hooks. Run `npm run format` and `npm run lint:fix` before pushing.

---

## Pull request checklist

- [ ] Tests pass (`npm run test:api`)
- [ ] No new lint errors (`npm run lint`)
- [ ] Code is formatted (`npm run format:check`)
- [ ] New behaviour is tested where applicable
- [ ] Environment variables are documented in [docs/environment.md](environment.md) if added
- [ ] Swagger annotations updated if API endpoints changed

---

## Adding a new API endpoint

1. Add the route in `apps/api/src/routers/`
2. Add a controller function in `apps/api/src/controllers/`
3. Add business logic in `apps/api/src/services/`
4. Add data access in `apps/api/src/repositories/`
5. Add Swagger JSDoc annotations (see existing endpoints in `src/swagger.ts` for examples)
6. Add tests in `apps/api/tests/`

---

## Reporting bugs

Use the GitHub Issues tracker. Please include:
- Steps to reproduce
- Expected behaviour
- Actual behaviour
- Environment (OS, Docker version, browser if relevant)

---

## License

By contributing you agree that your contributions will be licensed under the [MIT License](../LICENSE).
