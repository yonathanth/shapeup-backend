const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function resetUserPasswords() {
  try {
    console.log("🔐 Starting password reset for all users...\n");

    // Get all users with role "user"
    const users = await prisma.user.findMany({
      where: {
        role: "user",
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
      },
    });

    console.log(`📊 Found ${users.length} users with role "user"\n`);

    if (users.length === 0) {
      console.log('ℹ️  No users found with role "user". Nothing to update.');
      return;
    }

    // Hash the new password "1234"
    console.log('🔒 Hashing new password "1234"...');
    const newHashedPassword = await bcrypt.hash("1234", 10);
    console.log(
      `✅ Password hashed successfully: ${newHashedPassword.substring(
        0,
        20
      )}...\n`
    );

    console.log("🔄 Updating user passwords...\n");

    let successCount = 0;
    let errorCount = 0;

    // Update all users' passwords
    for (const user of users) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: newHashedPassword },
        });

        successCount++;
        console.log(`✅ Updated: ${user.fullName} (${user.phoneNumber})`);
      } catch (error) {
        errorCount++;
        console.log(
          `❌ Error updating ${user.fullName} (${user.phoneNumber}): ${error.message}`
        );
      }
    }

    console.log(`\n🎯 Password Reset Results:`);
    console.log(`   • Successfully updated: ${successCount} users`);
    console.log(`   • Errors encountered: ${errorCount} users`);
    console.log(`   • Total processed: ${successCount + errorCount} users`);

    if (successCount > 0) {
      console.log(`\n🎉 Password reset completed!`);
      console.log(`📝 All users can now login with password: "1234"`);
      console.log(
        `⚠️  Note: This affects only users with role "user", not admins/staff`
      );
    }
  } catch (error) {
    console.error("💥 Fatal error during password reset:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Function to verify the password reset
async function verifyPasswordReset() {
  try {
    console.log("\n🔍 Verifying password reset...\n");

    // Test the new password with a few users
    const testUsers = await prisma.user.findMany({
      where: { role: "user" },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        password: true,
      },
      take: 5, // Test with first 5 users
    });

    console.log('🧪 Testing password "1234" against updated users...\n');

    let verificationSuccessCount = 0;
    let verificationFailCount = 0;

    for (const user of testUsers) {
      try {
        const isPasswordCorrect = await bcrypt.compare("1234", user.password);

        if (isPasswordCorrect) {
          verificationSuccessCount++;
          console.log(`✅ VERIFIED: ${user.fullName} - Password "1234" works`);
        } else {
          verificationFailCount++;
          console.log(
            `❌ FAILED: ${user.fullName} - Password "1234" doesn't work`
          );
        }
      } catch (error) {
        verificationFailCount++;
        console.log(`❌ ERROR verifying ${user.fullName}: ${error.message}`);
      }
    }

    console.log(`\n📊 Verification Results:`);
    console.log(`   • Successful verifications: ${verificationSuccessCount}`);
    console.log(`   • Failed verifications: ${verificationFailCount}`);

    if (verificationFailCount === 0) {
      console.log(
        `\n✅ VERIFICATION PASSED: All tested users can login with "1234"!`
      );
    } else {
      console.log(
        `\n⚠️  VERIFICATION ISSUES: ${verificationFailCount} users may have problems.`
      );
    }
  } catch (error) {
    console.error("💥 Error during verification:", error);
  }
}

// Function to show current user count
async function showUserStats() {
  try {
    const userRoleCounts = await prisma.user.groupBy({
      by: ["role"],
      _count: {
        role: true,
      },
    });

    console.log("👥 Current user statistics by role:");
    userRoleCounts.forEach((roleCount) => {
      console.log(`   • ${roleCount.role}: ${roleCount._count.role} users`);
    });
    console.log("");
  } catch (error) {
    console.error("Error fetching user stats:", error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--verify-only")) {
    await verifyPasswordReset();
  } else if (args.includes("--stats")) {
    await showUserStats();
  } else if (args.includes("--help")) {
    console.log(`
🔐 User Password Reset Script - Usage:

node reset-user-passwords.js                    # Reset all user passwords to "1234"
node reset-user-passwords.js --verify-only      # Only verify current passwords
node reset-user-passwords.js --stats            # Show user statistics by role  
node reset-user-passwords.js --help             # Show this help

This script will:
1. Find all users with role "user" 
2. Hash password "1234" using bcrypt (10 salt rounds)
3. Update all user passwords to the hashed version
4. Verify the changes were successful

⚠️  IMPORTANT: 
- This only affects users with role "user"
- Admins, staff, and other roles are NOT affected
- This script modifies the database. Run on a backup first!
- After running, all users can login with password "1234"
    `);
  } else {
    await showUserStats();
    await resetUserPasswords();
    await verifyPasswordReset();
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
