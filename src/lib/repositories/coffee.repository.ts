import { eq, and, desc, sql } from 'drizzle-orm';
import type { DrizzleDB } from '../db';
import { greenCoffees, roastBatches, greenInventory, roastedInventory, inventoryTransactions } from '../schema';

export class CoffeeRepository {
  constructor(private db: DrizzleDB) {}

  // Green Coffee Operations
  async getGreenCoffees(userId: string) {
    return await this.db
      .select({
        id: greenCoffees.id,
        name: greenCoffees.name,
        origin: greenCoffees.origin,
        farm: greenCoffees.farm,
        variety: greenCoffees.variety,
        process: greenCoffees.process,
        purchaseDate: greenCoffees.purchaseDate,
        supplier: greenCoffees.supplier,
        costPerKg: greenCoffees.costPerKg,
        notes: greenCoffees.notes,
        currentAmount: greenInventory.currentAmount,
        createdAt: greenCoffees.createdAt
      })
      .from(greenCoffees)
      .leftJoin(greenInventory, eq(greenCoffees.id, greenInventory.greenCoffeeId))
      .where(eq(greenCoffees.userId, userId))
      .orderBy(desc(greenCoffees.createdAt));
  }

  async createGreenCoffee(coffee: typeof greenCoffees.$inferInsert) {
    return await this.db.transaction(async (tx) => {
      // Insert green coffee
      const [newCoffee] = await tx
        .insert(greenCoffees)
        .values(coffee)
        .returning();

      // Initialize inventory record
      await tx
        .insert(greenInventory)
        .values({
          userId: coffee.userId,
          greenCoffeeId: newCoffee.id,
          currentAmount: '0'
        });

      return newCoffee;
    });
  }

  async updateGreenCoffeeInventory(
    userId: string,
    greenCoffeeId: string,
    amountChange: string,
    transactionType: 'purchase' | 'roast' | 'consumption' | 'adjustment' | 'waste',
    reason?: string,
    notes?: string
  ) {
    return await this.db.transaction(async (tx) => {
      // Log the transaction
      await tx.insert(inventoryTransactions).values({
        userId,
        greenCoffeeId,
        transactionType,
        amountChange,
        reason,
        notes
      });

      // Update inventory snapshot
      await tx
        .update(greenInventory)
        .set({
          currentAmount: sql`${greenInventory.currentAmount} + ${amountChange}`,
          lastUpdatedAt: new Date()
        })
        .where(and(
          eq(greenInventory.userId, userId),
          eq(greenInventory.greenCoffeeId, greenCoffeeId)
        ));
    });
  }

  // Roast Batch Operations
  async getRoastBatches(userId: string) {
    return await this.db
      .select({
        id: roastBatches.id,
        batchNumber: roastBatches.batchNumber,
        name: roastBatches.name,
        roastDate: roastBatches.roastDate,
        roastLevel: roastBatches.roastLevel,
        greenWeight: roastBatches.greenWeight,
        roastedWeight: roastBatches.roastedWeight,
        notes: roastBatches.notes,
        currentAmount: roastedInventory.currentAmount,
        greenCoffee: {
          id: greenCoffees.id,
          name: greenCoffees.name,
          origin: greenCoffees.origin
        },
        createdAt: roastBatches.createdAt
      })
      .from(roastBatches)
      .leftJoin(greenCoffees, eq(roastBatches.greenCoffeeId, greenCoffees.id))
      .leftJoin(roastedInventory, eq(roastBatches.id, roastedInventory.roastBatchId))
      .where(eq(roastBatches.userId, userId))
      .orderBy(desc(roastBatches.roastDate));
  }

  async createRoastBatch(batch: typeof roastBatches.$inferInsert) {
    return await this.db.transaction(async (tx) => {
      // Insert roast batch
      const [newBatch] = await tx
        .insert(roastBatches)
        .values(batch)
        .returning();

      // Initialize roasted inventory
      await tx
        .insert(roastedInventory)
        .values({
          userId: batch.userId,
          roastBatchId: newBatch.id,
          currentAmount: batch.roastedWeight
        });

      // Deduct green coffee inventory
      await this.updateGreenCoffeeInventory(
        batch.userId,
        batch.greenCoffeeId,
        `-${batch.greenWeight}`,
        'roast',
        'Used for roasting',
        `Roast batch ${batch.batchNumber}: ${batch.name}`
      );

      return newBatch;
    });
  }

  async updateRoastedCoffeeInventory(
    userId: string,
    roastBatchId: string,
    amountChange: string,
    transactionType: 'consumption' | 'adjustment' | 'waste',
    reason?: string,
    notes?: string
  ) {
    return await this.db.transaction(async (tx) => {
      // Log the transaction
      await tx.insert(inventoryTransactions).values({
        userId,
        roastBatchId,
        transactionType,
        amountChange,
        reason,
        notes
      });

      // Update inventory snapshot
      await tx
        .update(roastedInventory)
        .set({
          currentAmount: sql`${roastedInventory.currentAmount} + ${amountChange}`,
          lastUpdatedAt: new Date()
        })
        .where(and(
          eq(roastedInventory.userId, userId),
          eq(roastedInventory.roastBatchId, roastBatchId)
        ));
    });
  }

  async getInventorySnapshot(userId: string) {
    const [greenInv, roastedInv] = await Promise.all([
      this.db
        .select({
          id: greenCoffees.id,
          name: greenCoffees.name,
          origin: greenCoffees.origin,
          variety: greenCoffees.variety,
          currentAmount: greenInventory.currentAmount
        })
        .from(greenCoffees)
        .innerJoin(greenInventory, eq(greenCoffees.id, greenInventory.greenCoffeeId))
        .where(and(
          eq(greenCoffees.userId, userId),
          sql`${greenInventory.currentAmount} > 0`
        )),

      this.db
        .select({
          id: roastBatches.id,
          batchNumber: roastBatches.batchNumber,
          name: roastBatches.name,
          roastDate: roastBatches.roastDate,
          roastLevel: roastBatches.roastLevel,
          currentAmount: roastedInventory.currentAmount,
          greenCoffeeName: greenCoffees.name
        })
        .from(roastBatches)
        .innerJoin(roastedInventory, eq(roastBatches.id, roastedInventory.roastBatchId))
        .innerJoin(greenCoffees, eq(roastBatches.greenCoffeeId, greenCoffees.id))
        .where(and(
          eq(roastBatches.userId, userId),
          sql`${roastedInventory.currentAmount} > 0`
        ))
    ]);

    return {
      green: greenInv,
      roasted: roastedInv
    };
  }
}