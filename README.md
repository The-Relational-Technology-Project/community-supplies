# Community Supplies

A neighborhood sharing library where neighbors can lend and borrow supplies, tools, party gear, and more. Built for the Outer Sunset and Outer Richmond neighborhoods in San Francisco — and designed to be remixed for any community.

## Features

- **Supply catalog** — Browse and search items available to borrow, organized by category
- **Lending management** — List your own items, track what's lent out, set house rules
- **Book library** — A community book-sharing shelf
- **Community onboarding** — Vouched membership with join requests and steward review
- **Steward dashboard** — Admin tools for managing members, supplies, and requests
- **AI-powered illustrations** — Auto-generated hand-drawn style illustrations for listed items
- **Contact & messaging** — Reach out to lenders directly through the app

## Tech stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/) (auth, database, edge functions, storage)
- [Tanstack Query](https://tanstack.com/query) for data fetching

## Fork this for your neighborhood

The easiest way to create your own version of this site for your community:

1. **Go to [studio.relationaltechproject.org](https://studio.relationaltechproject.org/)**
2. **Remix the project** — Chat with Sidekick about remixing Community Supplies
3. **Customize** — Update the branding, neighborhood name, categories, and colors to match your community
4. **Build in Lovable or Other Tool** — Create the remixed site and set up your database
5. **Publish** — Deploy your community supplies site and share it with your neighbors

### Running locally

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment variables

You'll need to set up the following environment variables (see `.env` for the template):

- `VITE_SUPABASE_URL` — Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Your Supabase anonymous/public key

## License

This project is licensed under the [MIT License](LICENSE).

## About

Built by the [Relational Tech Project](https://relationaltechproject.org/) — exploring how technology can strengthen neighborhood connections.

## Builder

Josh Nesbit – co-founder of Relational Tech Project, building with neighbors in the Outer Sunset in SF.
Reach me by email: josh@relationaltechproject.org
