-- Campos complementares da ficha de observação enviada pela terapeuta.
-- Preserva todos os atendimentos e respostas já gravados.
ALTER TABLE ficha_observacao
    ADD COLUMN obs_7 TEXT NULL AFTER obs_6,
    ADD COLUMN sintese_encaminhamento TEXT NULL AFTER sintese_conduta;
