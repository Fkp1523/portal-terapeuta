import { CapacitorSQLite } from '@capacitor-community/sqlite';

const database = 'portal_terapia_tablet';
const MAX_BYTES = 40 * 1024 * 1024;

// SQLCipher encrypts the native database. One atomic row is the local account's
// complete state; a failed transaction never replaces the previous snapshot.
export async function createNativeStore() {
    const exists = await CapacitorSQLite.isDatabase({ database });
    const secret = await CapacitorSQLite.isSecretStored();
    if (!secret.result) {
        if (exists.result) throw new Error('A chave local não está disponível. Preserve os dados do aplicativo e use um backup para recuperação.');
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const passphrase = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        await CapacitorSQLite.setEncryptionSecret({ passphrase });
        bytes.fill(0);
    }
    await CapacitorSQLite.createConnection({ database, version: 1, encrypted: true, mode: 'secret', readonly: false });
    await CapacitorSQLite.open({ database });
    await CapacitorSQLite.execute({ database, statements: 'CREATE TABLE IF NOT EXISTS portal_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);', transaction: true });
    return {
        async load() {
            const rows = await CapacitorSQLite.query({ database, statement: 'SELECT payload FROM portal_state WHERE id = 1;', values: [] });
            if (!rows.values?.length) return null;
            return JSON.parse(rows.values[0].payload);
        },
        async save(state) {
            const payload = JSON.stringify(state);
            if (new TextEncoder().encode(payload).length > MAX_BYTES) throw new Error('A base local atingiu o limite desta versão. Exporte um backup e solicite a atualização antes de continuar.');
            await CapacitorSQLite.run({ database, statement: 'INSERT INTO portal_state(id, payload) VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload;', values: [payload], transaction: true });
        }
    };
}
