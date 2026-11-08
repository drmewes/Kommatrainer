import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('schreibi_records', {
  owner: text('owner').notNull(), id: text('id').notNull(), kind: text('kind').notNull(),
  payload: text('payload').notNull(), updatedAt: integer('updated_at').notNull(),
}, table => [primaryKey({ columns: [table.owner, table.id] }), index('schreibi_owner_kind').on(table.owner, table.kind), index('schreibi_owner_updated').on(table.owner, table.updatedAt)]);
