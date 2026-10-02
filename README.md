This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Testing

Tests use [Jest](https://jestjs.io/) (via `next/jest`) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

```bash
npm test                 # everything
npm run test:unit        # __tests__/unit: lib helpers, validation, React components
npm run test:functional  # __tests__/functional: server actions + webhook handlers
npm run test:coverage    # with coverage report in ./coverage
```

- **Unit tests** (`__tests__/unit`) cover `lib/utils`, `lib/validator`, `lib/database` and the shared components. Component tests opt into jsdom with a `@jest-environment jsdom` docblock; Next.js navigation, Clerk and server actions are mocked.
- **Functional tests** (`__tests__/functional`) run the server actions in `lib/actions` against a real in-memory MongoDB ([mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server); the binary is downloaded on first run), and exercise the Clerk and Stripe webhook handlers with genuinely signed payloads.
- Shared helpers (in-memory DB, data factories, navigation mocks) live in `__tests__/helpers`.
- Tests marked `it.failing` document known bugs; they will start failing (prompting removal of `.failing`) once the bug is fixed.
