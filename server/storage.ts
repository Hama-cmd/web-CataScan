import { db } from "./db";
import { screenings, type InsertScreening, type Screening } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createScreening(screening: InsertScreening): Promise<Screening>;
  getScreeningsByUser(userId: string): Promise<Screening[]>;
  getScreening(id: number): Promise<Screening | undefined>;
}

// In-memory fallback when database is unavailable
class MemoryStorage implements IStorage {
  private screenings: Screening[] = [];

  async createScreening(screening: InsertScreening): Promise<Screening> {
    const newScreening: Screening = {
      id: Date.now(),
      userId: screening.userId,
      imageUrl: screening.imageUrl,
      analysis: screening.analysis,
      createdAt: new Date(),
    };
    this.screenings.unshift(newScreening);
    return newScreening;
  }

  async getScreeningsByUser(userId: string): Promise<Screening[]> {
    return this.screenings.filter(s => s.userId === userId);
  }

  async getScreening(id: number): Promise<Screening | undefined> {
    return this.screenings.find(s => s.id === id);
  }
}

export class DatabaseStorage implements IStorage {
  async createScreening(screening: InsertScreening): Promise<Screening> {
    const [result] = await db!.insert(screenings).values(screening).returning();
    return result;
  }

  async getScreeningsByUser(userId: string): Promise<Screening[]> {
    return db!
      .select()
      .from(screenings)
      .where(eq(screenings.userId, userId))
      .orderBy(desc(screenings.createdAt));
  }

  async getScreening(id: number): Promise<Screening | undefined> {
    const [result] = await db!
      .select()
      .from(screenings)
      .where(eq(screenings.id, id));
    return result;
  }
}

// Use database if available, otherwise use in-memory storage
export const storage: IStorage = db ? new DatabaseStorage() : new MemoryStorage();
