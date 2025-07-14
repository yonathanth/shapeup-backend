const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixUnhashedPasswords() {
  try {
    console.log("🔍 Starting password audit and fix...\n");

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        password: true,
        role: true,
        createdAt: true,
      },
    });

    console.log(`📊 Total users found: ${users.length}\n`);

    let unhashedCount = 0;
    let fixedCount = 0;
    let errorCount = 0;
    const usersToFix = [];

    // First pass: Identify users with unhashed passwords
    console.log("🔎 Identifying users with unhashed passwords...\n");

    for (const user of users) {
      // Check if password is already hashed
      // Bcrypt hashes typically start with $2a$, $2b$, $2x$, $2y$
      const isHashed = user.password && user.password.match(/^\$2[abxy]\$/);

      if (!isHashed) {
        unhashedCount++;
        usersToFix.push(user);
        console.log(
          `❌ UNHASHED: ${user.fullName} (${user.phoneNumber}) - Password: "${user.password}"`
        );
      } else {
        console.log(
          `✅ HASHED: ${user.fullName} (${user.phoneNumber}) - Password: [HASHED]`
        );
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(
      `   • Users with hashed passwords: ${users.length - unhashedCount}`
    );
    console.log(`   • Users with unhashed passwords: ${unhashedCount}`);

    if (unhashedCount === 0) {
      console.log(
        "\n🎉 All passwords are already properly hashed! No action needed."
      );
      return;
    }

    console.log(
      `\n🔧 Fixing ${unhashedCount} users with unhashed passwords...\n`
    );

    // Second pass: Fix unhashed passwords
    for (const user of usersToFix) {
      try {
        console.log(
          `🔒 Hashing password for: ${user.fullName} (${user.phoneNumber})`
        );

        // Hash the plain text password using the same method as controllers
        const hashedPassword = await bcrypt.hash(user.password, 10);

        // Update the user with the hashed password
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });

        fixedCount++;
        console.log(
          `   ✅ Fixed: ${user.fullName} - Password successfully hashed`
        );
      } catch (error) {
        errorCount++;
        console.log(`   ❌ Error fixing ${user.fullName}: ${error.message}`);
      }
    }

    console.log(`\n🎯 Final Results:`);
    console.log(`   • Successfully fixed: ${fixedCount} users`);
    console.log(`   • Errors encountered: ${errorCount} users`);
    console.log(`   • Total processed: ${fixedCount + errorCount} users`);

    if (fixedCount > 0) {
      console.log(
        `\n🎉 Password fix completed! All users should now be able to login properly.`
      );
      console.log(
        `📝 Note: Users affected can now login with their original passwords.`
      );
    }
  } catch (error) {
    console.error("💥 Fatal error during password fix:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Additional function to verify the fix
async function verifyPasswordFix() {
  try {
    console.log("\n🔍 Verifying password fix...\n");

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        password: true,
      },
    });

    let properlyHashedCount = 0;
    let stillUnhashedCount = 0;

    for (const user of users) {
      const isHashed = user.password && user.password.match(/^\$2[abxy]\$/);

      if (isHashed) {
        properlyHashedCount++;
      } else {
        stillUnhashedCount++;
        console.log(
          `⚠️  Still unhashed: ${user.fullName} (${user.phoneNumber})`
        );
      }
    }

    console.log(`📊 Verification Results:`);
    console.log(`   • Properly hashed passwords: ${properlyHashedCount}`);
    console.log(`   • Still unhashed passwords: ${stillUnhashedCount}`);

    if (stillUnhashedCount === 0) {
      console.log(
        `\n✅ VERIFICATION PASSED: All passwords are properly hashed!`
      );
    } else {
      console.log(
        `\n⚠️  VERIFICATION FAILED: ${stillUnhashedCount} passwords still need fixing.`
      );
    }
  } catch (error) {
    console.error("💥 Error during verification:", error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--verify-only")) {
    await verifyPasswordFix();
  } else if (args.includes("--help")) {
    console.log(`
🔐 Password Fix Script - Usage:

node fix-unhashed-passwords.js           # Run the complete fix
node fix-unhashed-passwords.js --verify-only   # Only verify current state
node fix-unhashed-passwords.js --help          # Show this help

This script will:
1. Identify users with unhashed passwords
2. Hash them using bcrypt with 10 salt rounds (same as controllers)
3. Update the database with hashed passwords
4. Verify the fix was successful

⚠️  IMPORTANT: This script modifies the database. Run on a backup first!
    `);
  } else {
    await fixUnhashedPasswords();
    await verifyPasswordFix();
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
