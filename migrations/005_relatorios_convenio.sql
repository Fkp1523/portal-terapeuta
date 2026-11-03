-- Histórico de relatórios editáveis, sempre isolado pela conta do paciente.
CREATE TABLE relatorios_convenio (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    paciente_id INT NOT NULL,
    periodo_inicio DATE NULL,
    periodo_fim DATE NULL,
    conteudo MEDIUMTEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_relatorios_convenio_paciente_data (paciente_id, criado_em),
    CONSTRAINT fk_relatorios_convenio_paciente
        FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
