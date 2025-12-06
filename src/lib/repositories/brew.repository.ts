import { eq, desc, and } from 'drizzle-orm';
import type { DrizzleDB } from '../db';
import { brewSessions, roastBatches, greenCoffees } from '../schema';

export class BrewRepository {
  constructor(private db: DrizzleDB) {}

  async getBrewSessions(userId: string, limit = 50) {
    return await this.db
      .select({
        id: brewSessions.id,
        brewMethod: brewSessions.brewMethod,
        coffeeAmount: brewSessions.coffeeAmount,
        waterAmount: brewSessions.waterAmount,
        grindSetting: brewSessions.grindSetting,
        waterTemp: brewSessions.waterTemp,
        brewTime: brewSessions.brewTime,
        rating: brewSessions.rating,
        extractionQuality: brewSessions.extractionQuality,
        tasteNotes: brewSessions.tasteNotes,
        notes: brewSessions.notes,
        brewedAt: brewSessions.brewedAt,
        roastBatch: {
          id: roastBatches.id,
          name: roastBatches.name,
          roastLevel: roastBatches.roastLevel,
          roastDate: roastBatches.roastDate,
          batchNumber: roastBatches.batchNumber
        },
        greenCoffee: {
          name: greenCoffees.name,
          origin: greenCoffees.origin
        }
      })
      .from(brewSessions)
      .innerJoin(roastBatches, eq(brewSessions.roastBatchId, roastBatches.id))
      .innerJoin(greenCoffees, eq(roastBatches.greenCoffeeId, greenCoffees.id))
      .where(eq(brewSessions.userId, userId))
      .orderBy(desc(brewSessions.brewedAt))
      .limit(limit);
  }

  async createBrewSession(session: typeof brewSessions.$inferInsert) {
    return await this.db
      .insert(brewSessions)
      .values(session)
      .returning();
  }

  async getBrewSessionById(userId: string, sessionId: string) {
    return await this.db
      .select()
      .from(brewSessions)
      .where(and(
        eq(brewSessions.userId, userId),
        eq(brewSessions.id, sessionId)
      ))
      .limit(1);
  }

  async getBrewingAnalytics(userId: string, daysPast = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysPast);

    return await this.db
      .select({
        brewMethod: brewSessions.brewMethod,
        avgRating: sql<number>`AVG(${brewSessions.rating})`,
        totalBrews: sql<number>`COUNT(*)`,
        totalCoffeeUsed: sql<number>`SUM(${brewSessions.coffeeAmount})`,
        avgCoffeeAmount: sql<number>`AVG(${brewSessions.coffeeAmount})`,
        avgWaterTemp: sql<number>`AVG(${brewSessions.waterTemp})`
      })
      .from(brewSessions)
      .where(and(
        eq(brewSessions.userId, userId),
        sql`${brewSessions.brewedAt} >= ${startDate}`
      ))
      .groupBy(brewSessions.brewMethod);
  }
}