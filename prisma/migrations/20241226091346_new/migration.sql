/*
  Warnings:

  - You are about to drop the column `slug` on the `broadcast` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `bmi` DROP FOREIGN KEY `bmi_userId_fkey`;

-- DropIndex
DROP INDEX `Broadcast_slug_key` ON `broadcast`;

-- AlterTable
ALTER TABLE `advertisement` MODIFY `description` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `broadcast` DROP COLUMN `slug`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `notification` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `name` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `description` TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE `bmi` ADD CONSTRAINT `bmi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
