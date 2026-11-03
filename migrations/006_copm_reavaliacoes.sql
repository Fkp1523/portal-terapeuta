-- Mantém cada rodada do COPM, sem sobrescrever escores de reavaliações anteriores.
-- Os escores iniciais são copiados para um retrato da situação na data da reavaliação.
CREATE TABLE IF NOT EXISTS copm_reavaliacao_sessoes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    paciente_id INT NOT NULL,
    data_avaliacao_base DATE NOT NULL,
    data_reavaliacao DATE NULL,
    observacoes TEXT NULL,
    legado TINYINT(1) NULL DEFAULT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_copm_reavaliacao_legada (paciente_id, data_avaliacao_base, legado),
    INDEX idx_copm_reavaliacao_paciente_data (paciente_id, data_reavaliacao, id),
    CONSTRAINT fk_copm_reavaliacao_paciente
        FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS copm_reavaliacao_itens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sessao_id BIGINT UNSIGNED NOT NULL,
    copm_meta_id INT NULL,
    atividade_problema TEXT NOT NULL,
    nivel_importancia TINYINT UNSIGNED NULL,
    desempenho_inicial TINYINT UNSIGNED NULL,
    satisfacao_inicial TINYINT UNSIGNED NULL,
    reavaliacao_desempenho TINYINT UNSIGNED NULL,
    reavaliacao_satisfacao TINYINT UNSIGNED NULL,
    observacao_item TEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_copm_reavaliacao_item (sessao_id, copm_meta_id),
    INDEX idx_copm_reavaliacao_meta (copm_meta_id),
    CONSTRAINT fk_copm_reavaliacao_item_sessao
        FOREIGN KEY (sessao_id) REFERENCES copm_reavaliacao_sessoes (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Preserva a reavaliação antiga, cuja tabela não guardava a data da rodada.
INSERT INTO copm_reavaliacao_sessoes
    (paciente_id, data_avaliacao_base, data_reavaliacao, observacoes, legado)
SELECT c.paciente_id, c.data_avaliacao, NULL,
       'Registro legado migrado. A data da reavaliação não era armazenada no sistema anterior.', 1
FROM copm_metas c
WHERE c.desempenho_reavaliacao IS NOT NULL OR c.satisfacao_reavaliacao IS NOT NULL
GROUP BY c.paciente_id, c.data_avaliacao
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);

INSERT INTO copm_reavaliacao_itens
    (sessao_id, copm_meta_id, atividade_problema, nivel_importancia,
     desempenho_inicial, satisfacao_inicial, reavaliacao_desempenho,
     reavaliacao_satisfacao)
SELECT s.id, c.id, c.atividade_problema, c.nivel_importancia,
       c.desempenho_inicial, c.satisfacao_inicial,
       c.desempenho_reavaliacao, c.satisfacao_reavaliacao
FROM copm_reavaliacao_sessoes s
INNER JOIN copm_metas c
    ON c.paciente_id = s.paciente_id
   AND c.data_avaliacao = s.data_avaliacao_base
WHERE s.legado = 1
  AND (c.desempenho_reavaliacao IS NOT NULL OR c.satisfacao_reavaliacao IS NOT NULL)
ON DUPLICATE KEY UPDATE id = copm_reavaliacao_itens.id;
