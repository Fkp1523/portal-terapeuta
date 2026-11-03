-- Estrutura sem registros de pacientes, terapeutas ou atendimentos.
-- Snapshot para bancos novos, com o estado atual até a migração 006.
-- NÃO aplique as migrações 001 a 006 após este arquivo; use novas migrações para mudanças futuras.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- agenda
CREATE TABLE `agenda` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `data_hora` datetime NOT NULL,
  `status` varchar(50) DEFAULT 'Agendado',
  `observacoes` text,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `agenda_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- anamnese
CREATE TABLE `anamnese` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `data_avaliacao` date NOT NULL,
  `historico_medico_desenvolvimento` text,
  `historico_educacional` text,
  `historico_terapeutico` text,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `anamnese_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- avaliacao_sensorial
CREATE TABLE `avaliacao_sensorial` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `data_avaliacao` date NOT NULL,
  `contato_visual` int NOT NULL,
  `comunicacao_alternativa` int NOT NULL,
  `expressiva_linguagem` int NOT NULL,
  `receptiva_linguagem` int NOT NULL,
  `atencao_conjunta` int NOT NULL,
  `comportamento_exploratorio` int NOT NULL,
  `combinacoes` int NOT NULL,
  `uso_lapis` int NOT NULL,
  `higiene_pessoal` int NOT NULL,
  `vestuario` int NOT NULL,
  `uso_banheiro` int NOT NULL,
  `alimentacao` int NOT NULL,
  `motor_global` int NOT NULL,
  `motor_fino` int NOT NULL,
  `interacao_objetos` int NOT NULL,
  `interacao_bola` int NOT NULL,
  `resposta_emocional` int NOT NULL,
  `imitacoes` int NOT NULL,
  `tolerancia` int NOT NULL,
  `brincar` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `avaliacao_sensorial_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- copm_metas
CREATE TABLE `copm_metas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `data_avaliacao` date NOT NULL,
  `atividade_problema` varchar(255) NOT NULL,
  `nivel_importancia` int NOT NULL DEFAULT '5',
  `desempenho_inicial` int NOT NULL,
  `satisfacao_inicial` int NOT NULL,
  `desempenho_reavaliacao` int DEFAULT NULL,
  `satisfacao_reavaliacao` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `copm_metas_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- copm_reavaliacao_itens
CREATE TABLE `copm_reavaliacao_itens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sessao_id` bigint unsigned NOT NULL,
  `copm_meta_id` int DEFAULT NULL,
  `atividade_problema` text NOT NULL,
  `nivel_importancia` tinyint unsigned DEFAULT NULL,
  `desempenho_inicial` tinyint unsigned DEFAULT NULL,
  `satisfacao_inicial` tinyint unsigned DEFAULT NULL,
  `reavaliacao_desempenho` tinyint unsigned DEFAULT NULL,
  `reavaliacao_satisfacao` tinyint unsigned DEFAULT NULL,
  `observacao_item` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_copm_reavaliacao_item` (`sessao_id`,`copm_meta_id`),
  KEY `idx_copm_reavaliacao_meta` (`copm_meta_id`),
  CONSTRAINT `fk_copm_reavaliacao_item_sessao` FOREIGN KEY (`sessao_id`) REFERENCES `copm_reavaliacao_sessoes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- copm_reavaliacao_sessoes
CREATE TABLE `copm_reavaliacao_sessoes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `data_avaliacao_base` date NOT NULL,
  `data_reavaliacao` date DEFAULT NULL,
  `observacoes` text,
  `legado` tinyint(1) DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_copm_reavaliacao_legada` (`paciente_id`,`data_avaliacao_base`,`legado`),
  KEY `idx_copm_reavaliacao_paciente_data` (`paciente_id`,`data_reavaliacao`,`id`),
  CONSTRAINT `fk_copm_reavaliacao_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- evolucao_terapeutica
CREATE TABLE `evolucao_terapeutica` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `profissional` varchar(150) DEFAULT NULL,
  `especialidade` varchar(100) DEFAULT NULL,
  `duracao` varchar(50) DEFAULT NULL,
  `horario` varchar(50) DEFAULT NULL,
  `data_registro` date NOT NULL,
  `programa_terapeutico` text,
  `objetivo` text,
  `evolucao` text,
  `desempenho` text,
  `reforcadores` text,
  `intercorrencias` text,
  `conduta` text,
  `devolutiva` text,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `evolucao_terapeutica_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ficha_observacao
CREATE TABLE `ficha_observacao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int DEFAULT NULL,
  `data_atendimento` date DEFAULT NULL,
  `atendimento_num` varchar(255) DEFAULT NULL,
  `idade` varchar(50) DEFAULT NULL,
  `duracao` varchar(50) DEFAULT NULL,
  `terapeuta` varchar(255) DEFAULT NULL,
  `checkboxes` json DEFAULT NULL,
  `obs_1` text,
  `obs_2` text,
  `obs_3` text,
  `obs_4` text,
  `obs_5` text,
  `obs_6` text,
  `obs_7` text,
  `orientacoes_cuidador` text,
  `sintese_desempenho` text,
  `sintese_faixa_etaria` text,
  `sintese_acompanhar` text,
  `sintese_conduta` text,
  `sintese_encaminhamento` text,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `ficha_observacao_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- pacientes
CREATE TABLE `pacientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `terapeuta_id` int DEFAULT NULL,
  `nome` varchar(150) NOT NULL,
  `data_nascimento` date NOT NULL,
  `diagnostico` varchar(255) DEFAULT NULL,
  `responsavel` varchar(150) DEFAULT NULL,
  `telefone` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pacientes_terapeuta_id` (`terapeuta_id`),
  CONSTRAINT `fk_pacientes_terapeutas` FOREIGN KEY (`terapeuta_id`) REFERENCES `terapeutas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- pedi_autocuidado
CREATE TABLE `pedi_autocuidado` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `data_avaliacao` date NOT NULL,
  `respostas` text NOT NULL,
  `escore_total` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `pedi_autocuidado_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- perfil_ocupacional
CREATE TABLE `perfil_ocupacional` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `data_avaliacao` date NOT NULL,
  `ambiental` text,
  `pessoal` text,
  `ocupacoes` text,
  `padroes_desempenho` text,
  `habilidade_interacao` text,
  `fatores_cliente` text,
  `desafios_participacao` text,
  `observacoes_finais` text,
  `coisas_irritam` text,
  `coisas_gosto` text,
  `como_comunico` text,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `perfil_ocupacional_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- plano_intervencao
CREATE TABLE `plano_intervencao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `data_registro` date NOT NULL,
  `profissional_responsavel` varchar(150) DEFAULT NULL,
  `itens` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `plano_intervencao_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- programacao_terapeutica
CREATE TABLE `programacao_terapeutica` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `terapeuta_responsavel` varchar(150) DEFAULT NULL,
  `supervisora` varchar(150) DEFAULT NULL,
  `programa` varchar(255) NOT NULL,
  `objetivos` text NOT NULL,
  `data_registro` date NOT NULL,
  `tentativas` varchar(50) DEFAULT NULL,
  `alcancado` varchar(10) DEFAULT 'Não',
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `programacao_terapeutica_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- relatorios_convenio
CREATE TABLE `relatorios_convenio` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `periodo_inicio` date DEFAULT NULL,
  `periodo_fim` date DEFAULT NULL,
  `conteudo` mediumtext NOT NULL,
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_relatorios_convenio_paciente_data` (`paciente_id`,`criado_em`),
  CONSTRAINT `fk_relatorios_convenio_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- roda_vida
CREATE TABLE `roda_vida` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `data_avaliacao` date NOT NULL,
  `vida_social` int DEFAULT '5',
  `contribuicao` int DEFAULT '5',
  `familia` int DEFAULT '5',
  `recursos_financeiros` int DEFAULT '5',
  `profissional` int DEFAULT '5',
  `amoroso` int DEFAULT '5',
  `criatividade_hobbies` int DEFAULT '5',
  `plenitude_realizacao` int DEFAULT '5',
  `equilibrio_emocional` int DEFAULT '5',
  `espiritualidade` int DEFAULT '5',
  `saude_disposicao` int DEFAULT '5',
  `desenvolvimento_pessoal` int DEFAULT '5',
  `observacoes` text,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `roda_vida_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- terapeutas
CREATE TABLE `terapeutas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) NOT NULL,
  `usuario` varchar(50) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `crefito` varchar(50) NOT NULL,
  `foto_perfil` mediumtext,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
