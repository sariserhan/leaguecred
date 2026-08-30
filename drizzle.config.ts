import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://leaguecred:leaguecred@localhost:54329/leaguecred",
  },
  strict: true,
  verbose: true,
});
