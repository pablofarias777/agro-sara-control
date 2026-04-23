-- Cultura escopo por propriedade
ALTER TABLE `Cultura` ADD COLUMN `propriedadeId` VARCHAR(191) NULL;

UPDATE `Cultura` AS `c`
INNER JOIN (
    SELECT `userId`, MIN(`id`) AS `pid` FROM `Propriedade` GROUP BY `userId`
) AS `p` ON `p`.`userId` = `c`.`userId`
SET `c`.`propriedadeId` = `p`.`pid`;

ALTER TABLE `Cultura` MODIFY COLUMN `propriedadeId` VARCHAR(191) NOT NULL;

CREATE INDEX `Cultura_propriedadeId_idx` ON `Cultura`(`propriedadeId`);

ALTER TABLE `Cultura` ADD CONSTRAINT `Cultura_propriedadeId_fkey` FOREIGN KEY (`propriedadeId`) REFERENCES `Propriedade`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Centro de custo em despesas
ALTER TABLE `Despesa` ADD COLUMN `centroCusto` ENUM('plantio', 'irrigacao', 'mao_de_obra', 'transporte', 'insumos', 'manutencao') NULL;

-- Insumos, metas, etapas de calendário
CREATE TABLE `Insumo` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `categoria` ENUM('sementes', 'fertilizantes', 'defensivos', 'combustivel', 'ferramentas', 'embalagens', 'outros') NOT NULL,
    `unidade` ENUM('kg', 'L', 'ml', 'unidade', 'saco', 'tonelada', 'ha') NOT NULL,
    `quantidadeAtual` DOUBLE NOT NULL,
    `alertaEstoqueBaixo` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Insumo_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Meta` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `escopo` ENUM('cultura', 'safra') NOT NULL,
    `culturaId` VARCHAR(191) NULL,
    `safraId` VARCHAR(191) NULL,
    `metaFaturamento` DOUBLE NULL,
    `limiteGasto` DOUBLE NULL,
    `metaQuantidadeVendida` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Meta_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EtapaCalendarioSafra` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `safraId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('plantio', 'adubacao', 'irrigacao', 'aplicacao', 'colheita') NOT NULL,
    `dataPrevista` VARCHAR(191) NOT NULL,
    `concluida` BOOLEAN NOT NULL DEFAULT false,
    `concluidaEm` VARCHAR(191) NULL,
    `observacao` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EtapaCalendarioSafra_userId_idx`(`userId`),
    INDEX `EtapaCalendarioSafra_safraId_idx`(`safraId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Insumo` ADD CONSTRAINT `Insumo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Meta` ADD CONSTRAINT `Meta_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EtapaCalendarioSafra` ADD CONSTRAINT `EtapaCalendarioSafra_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EtapaCalendarioSafra` ADD CONSTRAINT `EtapaCalendarioSafra_safraId_fkey` FOREIGN KEY (`safraId`) REFERENCES `Safra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
