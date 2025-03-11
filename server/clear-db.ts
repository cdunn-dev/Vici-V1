
import { db } from "./db";
import { users } from "@shared/schema";

async function clearUsers() {
  console.log("Clearing users table...");
  
  try {
    await db.delete(users);
    console.log("✅ Users table cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing users table:", error);
  } finally {
    // Close the database connection
    await db.$pool.end();
  }
}

// Run the function
clearUsers();
