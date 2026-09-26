# Database Migration Guide (Drizzle ORM)

This guide outlines the standard procedures for creating, running and managing database migrations in the Cognifast AI backend using Drizzle ORM.

## Available Scripts

The following npm scripts are configured in `backend/package.json` to manage the database schema:

- `npm run db:generate` - Generates SQL migration files based on changes made to your schema.
- `npm run db:migrate` - Applies pending migrations to your database (also runs automatically on `npm run dev` and `npm run start`).
- `npm run db:push` - Pushes your schema state directly to the database without generating migration files. **(For rapid development only)**
- `npm run db:studio` - Opens Drizzle Studio, a visual GUI for exploring and managing your local database data.

## Workflow: Adding or Modifying a Table

When you need to add a new table or alter existing fields, follow this standard workflow:

1. **Modify the Schema**
   Update or add your schema definitions in `backend/src/db/schema/index.ts` (or files imported by it).
2. **Generate the Migration**
   Run `npm run db:generate`. This compares your current schema configuration against previous snapshots and creates a new `.sql` file.
3. **Review the Migration**
   Always review the generated SQL file located in `backend/src/db/drizzle-migrations/` to ensure the resulting SQL matches your intended changes (e.g. checking for destructive operations like unintended `DROP TABLE` statements).
4. **Apply Locally**
   Run `npm run db:migrate` to apply the migration to your local database environment.
5. **Syncing via Push (Alternative Development Workflow)**
   If you are rapidly prototyping schemas in a local environment and do not want to accumulate temporary migration files, you can use `npm run db:push` to sync directly. *Note: Avoid using this method if you plan to commit the schema changes to a shared branch.*

## Rollback and Emergency Steps

If a migration fails or causes unexpected database states:

1. **Identify the Issue:** Check the console logs and the specific SQL file that failed inside `backend/src/db/drizzle-migrations/`.
2. **Revert Schema Files:** Revert the changes made in `backend/src/db/schema/` back to the last working state.
3. **Delete Bad Migration:** Delete the faulty `.sql` migration file and its associated snapshot from `backend/src/db/drizzle-migrations/`.
4. **Manual Database Reversion:** Drizzle does not currently feature built-in `down` migration rollbacks. You must manually apply reverse SQL operations (e.g. `DROP COLUMN`, `DROP TABLE`) via your database client or Drizzle Studio (`npm run db:studio`) to restore your database to the previous schema state.
5. **Regenerate:** Once the schema code and the physical database are back in lockstep sync, correct your errors and run `npm run db:generate` again.

## PR Review Checklist

When reviewing a Pull Request that includes database modifications, maintainers must verify the following:

- [ ] Schema changes in `backend/src/db/schema/` are cleanly written and typed.
- [ ] Corresponding `.sql` migration files are included inside `backend/src/db/drizzle-migrations/`.
- [ ] The generated SQL has been reviewed for destructive operations that might trigger data loss.
- [ ] No `npm run db:push` commands were used to completely bypass the migration pipeline for final PR branches.

## Production Deployment Best Practices

- **Never use `db:push` in production.** Production environments must strictly rely on `db:migrate` to guarantee a linear, predictable migration history.
- **Backup before migrating:** Ensure database backups are taken or automated via your database provider before deploying major structural migrations.
- **Non-breaking changes:** When modifying active tables, prioritize backward-compatible migrations (e.g. adding a nullable column first, migrating data then making it required) to achieve zero downtime.
