USE dpm_db;

ALTER TABLE `users`
ADD COLUMN `canParticipateInTenders` BOOLEAN NOT NULL DEFAULT 1;