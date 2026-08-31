import "server-only";

import { cache } from "react";

import { sqlClient } from "@/db";
import { toIsoTimestamp } from "@/lib/timestamps";

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPreferences = {
  lockDeadlines: boolean;
  specialistLocks: boolean;
  pickResults: boolean;
  followedResults: boolean;
};

export const getNotificationCenter = cache(async (userId: string) => {
  const [rows, prefs] = await Promise.all([
    sqlClient<Array<{
      id: string; kind: string; title: string; body: string; href: string;
      read_at: Date | string | null; created_at: Date | string;
    }>>`
      select id, kind, title, body, href, read_at, created_at from notifications
      where user_id = ${userId} order by created_at desc limit 30`,
    sqlClient<Array<{
      lock_deadlines: boolean; specialist_locks: boolean; pick_results: boolean; followed_results: boolean;
    }>>`
      select lock_deadlines, specialist_locks, pick_results, followed_results
      from notification_preferences where user_id = ${userId}`,
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      href: row.href,
      readAt: row.read_at ? toIsoTimestamp(row.read_at) : null,
      createdAt: toIsoTimestamp(row.created_at),
    })),
    preferences: {
      lockDeadlines: prefs[0]?.lock_deadlines ?? true,
      specialistLocks: prefs[0]?.specialist_locks ?? true,
      pickResults: prefs[0]?.pick_results ?? true,
      followedResults: prefs[0]?.followed_results ?? true,
    },
  };
});

export const getNotificationInbox = cache(async (userId: string) => {
  const rows = await sqlClient<Array<{ id: string; kind: string; title: string; body: string; href: string; read_at: Date | string | null; created_at: Date | string }>>`
    select id, kind, title, body, href, read_at, created_at from notifications
    where user_id = ${userId} order by created_at desc limit 200`;
  return rows.map((row) => ({ id: row.id, kind: row.kind, title: row.title, body: row.body, href: row.href, readAt: row.read_at ? toIsoTimestamp(row.read_at) : null, createdAt: toIsoTimestamp(row.created_at) }));
});
