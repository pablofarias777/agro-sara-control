ALTER TABLE `Despesa` ADD COLUMN `propriedadeId` VARCHAR(191) NULL;

UPDATE `Despesa` AS `d`
INNER JOIN `Cultura` AS `c` ON `d`.`culturaId` = `c`.`id` AND `d`.`userId` = `c`.`userId`
SET `d`.`propriedadeId` = `c`.`propriedadeId`
WHERE `d`.`propriedadeId` IS NULL AND `d`.`culturaId` IS NOT NULL;

UPDATE `Despesa` AS `d`
INNER JOIN `Safra` AS `s` ON `d`.`safraId` = `s`.`id` AND `d`.`userId` = `s`.`userId`
INNER JOIN `Cultura` AS `c` ON `s`.`culturaId` = `c`.`id`
SET `d`.`propriedadeId` = `c`.`propriedadeId`
WHERE `d`.`propriedadeId` IS NULL AND `d`.`safraId` IS NOT NULL;

UPDATE `Despesa` AS `d`
INNER JOIN (
    SELECT `userId`, MIN(`id`) AS `pid` FROM `Propriedade` GROUP BY `userId`
) AS `p` ON `d`.`userId` = `p`.`userId`
SET `d`.`propriedadeId` = `p`.`pid`
WHERE `d`.`propriedadeId` IS NULL;

ALTER TABLE `Despesa` MODIFY COLUMN `propriedadeId` VARCHAR(191) NOT NULL;

CREATE INDEX `Despesa_propriedadeId_idx` ON `Despesa`(`propriedadeId`);

ALTER TABLE `Despesa` ADD CONSTRAINT `Despesa_propriedadeId_fkey` FOREIGN KEY (`propriedadeId`) REFERENCES `Propriedade`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
