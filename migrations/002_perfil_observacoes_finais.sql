-- Campo complementar do modelo de Perfil Ocupacional enviado pela terapeuta.
-- É uma alteração aditiva; os registros existentes permanecem intactos.
ALTER TABLE perfil_ocupacional
    ADD COLUMN observacoes_finais TEXT NULL AFTER desafios_participacao;
