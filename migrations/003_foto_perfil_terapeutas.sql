-- Foto profissional pequena, otimizada pelo navegador e vinculada à conta.
-- A alteração é aditiva; todas as contas e os demais dados permanecem intactos.
ALTER TABLE terapeutas
    ADD COLUMN foto_perfil MEDIUMTEXT NULL AFTER crefito;
