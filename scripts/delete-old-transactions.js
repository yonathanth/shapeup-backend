const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function deleteOldTransactions() {
  try {
    console.log("🗑️  Starting transaction cleanup...\n");

    // Set the cutoff date to July 12, 2025
    const cutoffDate = new Date("2025-07-12T00:00:00.000Z");
    console.log(
      `📅 Deleting all transactions before: ${cutoffDate.toISOString()}\n`
    );

    // First, get count of transactions to be deleted
    const transactionsToDelete = await prisma.transaction.count({
      where: {
        createdAt: {
          lt: cutoffDate, // Less than the cutoff date
        },
      },
    });

    console.log(`📊 Found ${transactionsToDelete} transactions to delete\n`);

    if (transactionsToDelete === 0) {
      console.log(
        "✅ No transactions found before the cutoff date. Nothing to delete."
      );
      return;
    }

    // Get a preview of transactions to be deleted
    const previewTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        name: true,
        amount: true,
        type: true,
        createdAt: true,
      },
      take: 5, // Show first 5 as preview
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("🔍 Preview of transactions to be deleted:");
    previewTransactions.forEach((transaction, index) => {
      console.log(
        `   ${index + 1}. ${transaction.name} - ${transaction.amount} Birr (${
          transaction.type
        }) - ${transaction.createdAt.toISOString()}`
      );
    });

    if (transactionsToDelete > 5) {
      console.log(`   ... and ${transactionsToDelete - 5} more transactions`);
    }
    console.log("");

    // Perform the deletion
    console.log("🗑️  Proceeding with deletion...\n");

    const deletionResult = await prisma.transaction.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(
      `✅ Successfully deleted ${deletionResult.count} transactions!`
    );
    console.log(
      `📅 All transactions before ${cutoffDate.toISOString()} have been removed.`
    );

    // Show remaining transaction count
    const remainingCount = await prisma.transaction.count();
    console.log(`📊 Remaining transactions in database: ${remainingCount}`);

    // Show date range of remaining transactions
    if (remainingCount > 0) {
      const oldestRemaining = await prisma.transaction.findFirst({
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
        },
      });

      const newestRemaining = await prisma.transaction.findFirst({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
        },
      });

      console.log(`📅 Remaining transactions date range:`);
      console.log(`   Oldest: ${oldestRemaining?.createdAt.toISOString()}`);
      console.log(`   Newest: ${newestRemaining?.createdAt.toISOString()}`);
    }

    console.log("\n🎉 Transaction cleanup completed successfully!");
  } catch (error) {
    console.error("💥 Error during transaction cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Function to show current transaction statistics
async function showTransactionStats() {
  try {
    console.log("📊 Current Transaction Statistics:\n");

    const totalCount = await prisma.transaction.count();
    console.log(`Total transactions: ${totalCount}`);

    if (totalCount === 0) {
      console.log("No transactions found in the database.");
      return;
    }

    // Get date range
    const oldest = await prisma.transaction.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    const newest = await prisma.transaction.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    console.log(
      `Date range: ${oldest?.createdAt.toISOString()} to ${newest?.createdAt.toISOString()}`
    );

    // Get breakdown by type
    const incomeCount = await prisma.transaction.count({
      where: { type: "Income" },
    });

    const expenseCount = await prisma.transaction.count({
      where: { type: "Expense" },
    });

    console.log(`\nBreakdown by type:`);
    console.log(`   Income transactions: ${incomeCount}`);
    console.log(`   Expense transactions: ${expenseCount}`);

    // Show count before cutoff date
    const cutoffDate = new Date("2025-07-12T00:00:00.000Z");
    const beforeCutoffCount = await prisma.transaction.count({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`\nTransactions before July 12, 2025: ${beforeCutoffCount}`);
    console.log(
      `Transactions after July 12, 2025: ${totalCount - beforeCutoffCount}`
    );
  } catch (error) {
    console.error("Error fetching transaction stats:", error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--stats") || args.includes("-s")) {
    await showTransactionStats();
  } else if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🗑️  Transaction Cleanup Script - Usage:

node delete-old-transactions.js           # Delete all transactions before July 12, 2025
node delete-old-transactions.js --stats   # Show current transaction statistics
node delete-old-transactions.js --help    # Show this help

This script will:
1. Find all transactions created before July 12, 2025 (00:00:00 UTC)
2. Show a preview of transactions to be deleted
3. Delete all matching transactions
4. Show summary of remaining transactions

⚠️  WARNING: This operation is irreversible!
⚠️  Make sure to backup your database before running this script!
    `);
  } else {
    await showTransactionStats();
    console.log("\n" + "=".repeat(60) + "\n");
    await deleteOldTransactions();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Script interrupted. Cleaning up...");
  await prisma.$disconnect();
  process.exit(0);
});

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
