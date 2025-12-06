USE dpm_db;

ALTER TABLE `users`
ADD COLUMN `canParticipateInTenders` BOOLEAN NOT NULL DEFAULT 1;

ALTER TABLE companies
ADD COLUMN isVerifiedOnBinaa BOOLEAN DEFAULT FALSE;

ALTER TABLE `biddings`
ADD COLUMN stage VARCHAR(50) NULL;

ALTER TABLE `biddings` 
MODIFY COLUMN durationInNumbers INT;

ALTER TABLE `biddings` 
MODIFY COLUMN priceInNumbers INT;
