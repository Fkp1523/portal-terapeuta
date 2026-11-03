import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptBackup, decryptBackup } from './backup-crypto.js';

const password = 'uma senha longa de backup para teste';
const snapshot = { version: 1, pacientes: [{ id: 1, nome: 'Paciente fictício', diagnostico: 'Teste — ação' }], anamnese: [{ paciente_id: 1, historico: 'Texto clínico fictício' }] };

test('backup encrypted round trip preserves notes and uses fresh salt/IV', async () => {
    const first = await encryptBackup(snapshot, password);
    const second = await encryptBackup(snapshot, password);
    assert.deepEqual(await decryptBackup(first, password), snapshot);
    assert.notEqual(first, second);
    assert.ok(!first.includes('Paciente fictício'));
    assert.ok(!first.includes('Texto clínico'));
});

test('wrong password and changed ciphertext cannot restore any state', async () => {
    const encrypted = await encryptBackup(snapshot, password);
    await assert.rejects(decryptBackup(encrypted, 'outra senha longa e incorreta'), /Senha de backup incorreta/);
    const envelope = JSON.parse(encrypted);
    const bytes = Buffer.from(envelope.ciphertext, 'base64'); bytes[5] ^= 0xff;
    envelope.ciphertext = bytes.toString('base64');
    await assert.rejects(decryptBackup(JSON.stringify(envelope), password), /arquivo alterado/);
});

test('unsupported or hostile envelopes fail before an expensive KDF', async () => {
    const envelope = JSON.parse(await encryptBackup(snapshot, password));
    await assert.rejects(decryptBackup(JSON.stringify({ ...envelope, iterations: 999999999 }), password), /Formato/);
    await assert.rejects(decryptBackup(JSON.stringify({ ...envelope, salt: 'A'.repeat(1000000) }), password), /inválido/);
    await assert.rejects(decryptBackup('{not json}', password), /não é um backup/);
    await assert.rejects(encryptBackup(snapshot, 'admin'), /12 a 256/);
});
