import { randomUUID } from 'node:crypto';

import { asc, eq } from 'drizzle-orm';
import type { AnalyzeMenuResult, Dish } from '@as-your-dish/shared';

import { db } from '../db/client.js';
import { dishes, menus } from '../db/schema.js';

export interface CachedMenu {
  menuId: string;
  result: AnalyzeMenuResult;
  createdAt: Date;
}

export interface SaveAnalysisArgs {
  imageHash: string;
  userId: string | null;
  result: AnalyzeMenuResult;
}

export const menusService = {
  async findByImageHash(hash: string): Promise<CachedMenu | null> {
    const menuRows = await db
      .select()
      .from(menus)
      .where(eq(menus.imageHash, hash))
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
      createdAt: menu.createdAt,
      result: {
        language_detected: menu.languageDetected ?? '',
        dishes: dishRows.map((r) => r.payload as Dish),
        warnings: menu.warnings ?? [],
      },
    };
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
    });
    return { menuId };
  },
};
