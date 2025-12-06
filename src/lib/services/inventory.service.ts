import { CoffeeRepository } from '../repositories/coffee.repository';
import type { DrizzleDB } from '../db';

export interface InventorySnapshot {
  green: Array<{
    id: string;
    name: string;
    origin: string;
    variety: string | null;
    currentAmount: string;
  }>;
  roasted: Array<{
    id: string;
    batchNumber: number;
    name: string;
    roastDate: Date | null;
    roastLevel: string;
    currentAmount: string;
    greenCoffeeName: string;
  }>;
}

export interface GreenCoffeeInput {
  name: string;
  origin: string;
  farm?: string;
  variety?: string;
  process?: string;
  purchaseDate?: Date;
  supplier?: string;
  costPerKg?: number;
  notes?: string;
  initialAmount: number;
}

export interface RoastBatchInput {
  greenCoffeeId: string;
  name: string;
  roastDate: Date;
  roastLevel: string;
  greenWeight: number;
  roastedWeight: number;
  equipmentId?: string;
  notes?: string;
}

export class InventoryService {
  private coffeeRepo: CoffeeRepository;

  constructor(private db: DrizzleDB) {
    this.coffeeRepo = new CoffeeRepository(db);
  }

  async getCurrentInventory(userId: string): Promise<InventorySnapshot> {
    return await this.coffeeRepo.getInventorySnapshot(userId);
  }

  async addGreenCoffee(userId: string, input: GreenCoffeeInput) {
    const coffee = await this.coffeeRepo.createGreenCoffee({
      userId,
      name: input.name,
      origin: input.origin,
      farm: input.farm,
      variety: input.variety,
      process: input.process,
      purchaseDate: input.purchaseDate,
      supplier: input.supplier,
      costPerKg: input.costPerKg?.toString(),
      notes: input.notes
    });

    // Add initial inventory if provided
    if (input.initialAmount > 0) {
      await this.coffeeRepo.updateGreenCoffeeInventory(
        userId,
        coffee.id,
        input.initialAmount.toString(),
        'purchase',
        'Initial purchase',
        `Added ${input.initialAmount}g of ${input.name}`
      );
    }

    return coffee;
  }

  async completeRoast(userId: string, input: RoastBatchInput) {
    // Get next batch number
    const existingBatches = await this.coffeeRepo.getRoastBatches(userId);
    const nextBatchNumber = Math.max(0, ...existingBatches.map(b => b.batchNumber)) + 1;

    return await this.coffeeRepo.createRoastBatch({
      userId,
      greenCoffeeId: input.greenCoffeeId,
      batchNumber: nextBatchNumber,
      name: input.name,
      roastDate: input.roastDate,
      roastLevel: input.roastLevel,
      greenWeight: input.greenWeight.toString(),
      roastedWeight: input.roastedWeight.toString(),
      equipmentId: input.equipmentId,
      notes: input.notes
    });
  }

  async consumeRoastedCoffee(
    userId: string,
    roastBatchId: string,
    amount: number,
    reason?: string,
    notes?: string
  ) {
    return await this.coffeeRepo.updateRoastedCoffeeInventory(
      userId,
      roastBatchId,
      (-amount).toString(),
      'consumption',
      reason || 'Brewing',
      notes
    );
  }

  async adjustGreenInventory(
    userId: string,
    greenCoffeeId: string,
    oldAmount: number,
    newAmount: number,
    reason: string,
    notes?: string
  ) {
    const adjustment = newAmount - oldAmount;
    
    return await this.coffeeRepo.updateGreenCoffeeInventory(
      userId,
      greenCoffeeId,
      adjustment.toString(),
      'adjustment',
      reason,
      notes || `Adjusted from ${oldAmount}g to ${newAmount}g`
    );
  }

  async adjustRoastedInventory(
    userId: string,
    roastBatchId: string,
    oldAmount: number,
    newAmount: number,
    reason: string,
    notes?: string
  ) {
    const adjustment = newAmount - oldAmount;
    
    return await this.coffeeRepo.updateRoastedCoffeeInventory(
      userId,
      roastBatchId,
      adjustment.toString(),
      'adjustment',
      reason,
      notes || `Adjusted from ${oldAmount}g to ${newAmount}g`
    );
  }

  async getGreenCoffees(userId: string) {
    return await this.coffeeRepo.getGreenCoffees(userId);
  }

  async getRoastBatches(userId: string) {
    return await this.coffeeRepo.getRoastBatches(userId);
  }
}