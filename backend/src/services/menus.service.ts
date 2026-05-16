import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type {
  AnalyzeMenuResult,
  Dish,
  TargetLanguage,
} from '@as-your-dish/shared';

import { db } from '../db/client.js';
import { dishes, menuHistory, menus } from '../db/schema.js';

export interface CachedMenu {
  menuId: string;
  userId: string | null;
  result: AnalyzeMenuResult;
  targetLanguage: TargetLanguage;
  createdAt: Date;
}

export interface MenuHistoryItem {
  menuId: string;
  createdAt: Date;
  languageDetected: string;
  dishesCount: number;
  previewDishes: string[];
}

export interface ExampleMenuListItem extends MenuHistoryItem {
  slug: string;
  coverImagePath: string;
}

export interface SaveAnalysisArgs {
  imageHash: string;
  userId: string | null;
  result: AnalyzeMenuResult;
}

export interface UpsertExampleMenuArgs {
  slug: string;
  imageHash: string;
  result: AnalyzeMenuResult;
}

function targetLanguageFromImageHash(imageHash: string): TargetLanguage {
  if (imageHash.startsWith('en:')) return 'en';
  if (imageHash.startsWith('ko:')) return 'ko';
  return 'zh';
}

export const menusService = {
  async findByImageHash(hash: string): Promise<CachedMenu | null> {
    const menuRows = await db
      .select()
      .from(menus)
      .where(and(eq(menus.imageHash, hash), eq(menus.kind, 'user')))
      .limit(1);
    const menu = menuRows[0];
    if (!menu) return null;

    const dishRows = await db
      .select()
      .from(dishes)
      .where(eq(dishes.menuId, menu.id))
      .orderBy(asc(dishes.position));

    return {
      menuId: menu.id,
      userId: menu.userId,
      createdAt: menu.createdAt,
      targetLanguage: targetLanguageFromImageHash(menu.imageHash),
      result: {
        language_detected: menu.languageDetected ?? '',
        dishes: dishRows.map((r) => r.payload as Dish),
        warnings: menu.warnings ?? [],
      },
    };
  },

  async findExampleBySlug(slug: string): Promise<CachedMenu | null> {
    const menuRows = await db
      .select()
      .from(menus)
      .where(and(eq(menus.slug, slug), eq(menus.kind, 'example')))
      .limit(1);
    const menu = menuRows[0];
    if (!menu) return null;

    const dishRows = await db
      .select()
      .from(dishes)
      .where(eq(dishes.menuId, menu.id))
      .orderBy(asc(dishes.position));

    return {
      menuId: menu.id,
      userId: menu.userId,
      createdAt: menu.createdAt,
      targetLanguage: targetLanguageFromImageHash(menu.imageHash),
      result: {
        language_detected: menu.languageDetected ?? '',
        dishes: dishRows.map((r) => r.payload as Dish),
        warnings: menu.warnings ?? [],
      },
    };
  },

  async listExampleMenus(): Promise<ExampleMenuListItem[]> {
    const allRows = await db
      .select()
      .from(menus)
      .where(eq(menus.kind, 'example'))
      .orderBy(asc(menus.slug));
    // WHY: example menus are seeded once per (slug, language). The default
    // (zh) variant uses the bare imageHash; en/ko variants prefix it with
    // `<lang>:`. The picker should list each cuisine exactly once, so we
    // drop the language-prefixed rows here and let the frontend rewrite the
    // slug (`-en` / `-ko`) when fetching detail.
    const menuRows = allRows.filter(
      (menu) =>
        !menu.imageHash.startsWith('en:') &&
        !menu.imageHash.startsWith('ko:'),
    );
    if (menuRows.length === 0) return [];

    return await Promise.all(
      menuRows.map(async (menu) => {
        const dishRows = await db
          .select()
          .from(dishes)
          .where(eq(dishes.menuId, menu.id))
          .orderBy(asc(dishes.position));
        const slug = menu.slug ?? menu.id;
        return {
          menuId: menu.id,
          slug,
          createdAt: menu.createdAt,
          languageDetected: menu.languageDetected ?? '',
          dishesCount: dishRows.length,
          previewDishes: dishRows
            .slice(0, 3)
            .map((row) => (row.payload as Dish).translated_name),
          coverImagePath: `/api/examples/${slug}.jpg`,
        };
      }),
    );
  },

  async recordHistory(menuId: string, userId: string): Promise<void> {
    await db
      .insert(menuHistory)
      .values({ menuId, userId, createdAt: new Date() })
      .onConflictDoUpdate({
        target: [menuHistory.userId, menuHistory.menuId],
        set: { createdAt: new Date() },
      });
  },

  async listHistory(
    userId: string,
    args: { limit: number; offset: number },
  ): Promise<MenuHistoryItem[]> {
    const historyRows = await db
      .select()
      .from(menuHistory)
      .where(eq(menuHistory.userId, userId))
      .orderBy(desc(menuHistory.createdAt))
      .limit(args.limit)
      .offset(args.offset);

    const menuIds = historyRows.map((row) => row.menuId);
    if (menuIds.length === 0) return [];

    const menuRows = await db
      .select()
      .from(menus)
      .where(inArray(menus.id, menuIds));
    const menusById = new Map(menuRows.map((menu) => [menu.id, menu]));

    return (
      await Promise.all(
        historyRows.map(async (history) => {
          const menu = menusById.get(history.menuId);
          if (!menu) return null;
          const dishRows = await db
            .select()
            .from(dishes)
            .where(eq(dishes.menuId, history.menuId))
            .orderBy(asc(dishes.position));
          return {
            menuId: history.menuId,
            createdAt: history.createdAt,
            languageDetected: menu.languageDetected ?? '',
            dishesCount: dishRows.length,
            previewDishes: dishRows
              .slice(0, 3)
              .map((row) => (row.payload as Dish).translated_name),
          };
        }),
      )
    ).filter((item): item is MenuHistoryItem => item !== null);
  },

  async findByIdForUser(menuId: string, userId: string): Promise<CachedMenu | null> {
    const historyRows = await db
      .select()
      .from(menuHistory)
      .where(and(eq(menuHistory.menuId, menuId), eq(menuHistory.userId, userId)))
      .limit(1);
    if (!historyRows[0]) return null;

    const menuRows = await db
      .select()
      .from(menus)
      .where(eq(menus.id, menuId))
      .limit(1);
    const menu = menuRows[0];
    if (!menu) return null;

    const dishRows = await db
      .select()
      .from(dishes)
      .where(eq(dishes.menuId, menu.id))
      .orderBy(asc(dishes.position));

    return {
      menuId: menu.id,
      userId: menu.userId,
      createdAt: historyRows[0].createdAt,
      targetLanguage: targetLanguageFromImageHash(menu.imageHash),
      result: {
        language_detected: menu.languageDetected ?? '',
        dishes: dishRows.map((r) => r.payload as Dish),
        warnings: menu.warnings ?? [],
      },
    };
  },

  async clearHistory(userId: string): Promise<number> {
    const historyRows = await db
      .select()
      .from(menuHistory)
      .where(eq(menuHistory.userId, userId));
    if (historyRows.length === 0) return 0;

    await db.delete(menuHistory).where(eq(menuHistory.userId, userId));
    return historyRows.length;
  },

  // WHY: menus + dishes write together or not at all. A half-saved menu
  // (header in `menus` but missing rows in `dishes`) would corrupt cache
  // hits — the next identical upload would return an incomplete result
  // and skip the LLM call that could have rebuilt it.
  async saveAnalysisResult(args: SaveAnalysisArgs): Promise<{ menuId: string }> {
    const menuId = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(menus).values({
        id: menuId,
        userId: args.userId,
        imageHash: args.imageHash,
        languageDetected: args.result.language_detected,
        warnings: args.result.warnings,
      });
      if (args.result.dishes.length > 0) {
        await tx.insert(dishes).values(
          args.result.dishes.map((d, i) => ({
            id: randomUUID(),
            menuId,
            position: i,
            confidence: d.confidence,
            payload: d,
          })),
        );
      }
      if (args.userId) {
        await tx.insert(menuHistory).values({
          userId: args.userId,
          menuId,
        });
      }
    });
    return { menuId };
  },

  async upsertExampleMenu(
    args: UpsertExampleMenuArgs,
  ): Promise<{ menuId: string }> {
    const existingRows = await db
      .select()
      .from(menus)
      .where(and(eq(menus.slug, args.slug), eq(menus.kind, 'example')))
      .limit(1);
    const existing = existingRows[0];
    const menuId = existing?.id ?? randomUUID();

    await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(menus)
          .set({
            imageHash: args.imageHash,
            languageDetected: args.result.language_detected,
            warnings: args.result.warnings,
          })
          .where(eq(menus.id, menuId));
        await tx.delete(dishes).where(eq(dishes.menuId, menuId));
      } else {
        await tx.insert(menus).values({
          id: menuId,
          userId: null,
          imageHash: args.imageHash,
          kind: 'example',
          slug: args.slug,
          languageDetected: args.result.language_detected,
          warnings: args.result.warnings,
        });
      }

      if (args.result.dishes.length > 0) {
        await tx.insert(dishes).values(
          args.result.dishes.map((d, i) => ({
            id: randomUUID(),
            menuId,
            position: i,
            confidence: d.confidence,
            payload: d,
          })),
        );
      }
    });

    return { menuId };
  },
};
