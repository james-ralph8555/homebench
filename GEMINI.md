# Gemini Code Assistant Documentation

## Project Overview

This is a Next.js project that provides a privacy-by-design in-browser SQL workbench powered by DuckDB-WASM. It allows users to analyze data locally without sending it to a server. The application is a statically exported Next.js site, which means it can be hosted on any static hosting service.

The project uses a component-based architecture with React and TypeScript. The UI is built with a combination of custom components and UI libraries like Radix UI and AG Grid. The application state is managed within the `TabbedWorkbench` component using React hooks.

The core functionality is provided by the DuckDB-WASM library, which allows running a full-featured SQL database in the browser. The application uses a custom webpack configuration to optimize for production builds, including code splitting to separate large dependencies like DuckDB and UI libraries into their own chunks.

## Building and Running

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/yourusername/homebench.git
cd homebench
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Development Conventions

### Project Structure

```
homebench/
├── app/                # Next.js App Router (see app/README.md)
├── components/         # React components (see components/README.md)
├── contexts/           # React context providers
├── lib/                # Engine + persistence (see lib/README.md)
├── .docs_for_ai/       # AI assistant documentation
└── README.md           # Project overview
```

### Testing

This repo uses Vitest with a `jsdom` environment to unit test browser-facing utilities in `lib/` with minimal mocking.

- Tests are colocated with sources (e.g., `lib/*.test.ts`).
- `test/setup.ts` loads `fake-indexeddb/auto` and adds small polyfills (e.g., `URL.createObjectURL`).
- Coverage reports are generated with the `v8` provider into `coverage/`.

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler check
npm test             # Run unit tests (Vitest)
npm run test:watch   # Watch mode for tests
```
