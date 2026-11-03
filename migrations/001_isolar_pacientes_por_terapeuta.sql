-- Migração aditiva: preserva todos os pacientes e os dados clínicos existentes.
-- A instalação atual tem uma única terapeuta; os pacientes legados passam a
-- pertencer a essa conta. Em instalações com mais contas, associe os pacientes
-- manualmente antes de liberar o sistema para uso.

ALTER TABLE pacientes
    ADD COLUMN terapeuta_id INT NULL AFTER id;

SET @terapeuta_unica = (
    SELECT MIN(id)
    FROM terapeutas
    HAVING COUNT(*) = 1
);

UPDATE pacientes
SET terapeuta_id = @terapeuta_unica
WHERE terapeuta_id IS NULL
  AND @terapeuta_unica IS NOT NULL;

CREATE INDEX idx_pacientes_terapeuta_id
    ON pacientes (terapeuta_id);

ALTER TABLE pacientes
    ADD CONSTRAINT fk_pacientes_terapeutas
    FOREIGN KEY (terapeuta_id) REFERENCES terapeutas (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
