const FORMAT = 'portal-to-backup';
const ITERATIONS = 600000;
const MAX_BYTES = 40 * 1024 * 1024;
const context = new TextEncoder().encode(`${FORMAT}:1`);

function encode(bytes) {
    let text = '';
    for (let start = 0; start < bytes.length; start += 32768) text += String.fromCharCode(...bytes.subarray(start, start + 32768));
    return btoa(text);
}
function decode(text, length) {
    if (typeof text !== 'string' || (length && text.length !== Math.ceil(length / 3) * 4) || text.length % 4 || text.length > Math.ceil((MAX_BYTES + 16) / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw new Error('Backup inválido.');
    const bytes = Uint8Array.from(atob(text), char => char.charCodeAt(0));
    if (length && bytes.length !== length) throw new Error('Backup inválido.');
    return bytes;
}
async function keyFrom(password, salt, cryptoProvider) {
    if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('Use uma senha de backup com 12 a 256 caracteres.');
    const material = await cryptoProvider.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return cryptoProvider.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptBackup(snapshot, password, cryptoProvider = globalThis.crypto) {
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
    if (bytes.length > MAX_BYTES) throw new Error('Backup maior que o limite desta versão.');
    const salt = cryptoProvider.getRandomValues(new Uint8Array(16));
    const iv = cryptoProvider.getRandomValues(new Uint8Array(12));
    const key = await keyFrom(password, salt, cryptoProvider);
    const ciphertext = await cryptoProvider.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: context }, key, bytes);
    return JSON.stringify({ format: FORMAT, version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, createdAt: new Date().toISOString(), salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) });
}
export async function decryptBackup(text, password, cryptoProvider = globalThis.crypto) {
    if (typeof text !== 'string' || text.length > 57 * 1024 * 1024) throw new Error('Arquivo de backup grande demais ou inválido.');
    let envelope;
    try { envelope = JSON.parse(text); } catch { throw new Error('Este arquivo não é um backup válido do portal.'); }
    if (!envelope || envelope.format !== FORMAT || envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== ITERATIONS) throw new Error('Formato de backup não reconhecido por esta versão.');
    const salt = decode(envelope.salt, 16);
    const iv = decode(envelope.iv, 12);
    const ciphertext = decode(envelope.ciphertext);
    if (ciphertext.length < 16 || ciphertext.length > MAX_BYTES + 16) throw new Error('Backup inválido.');
    const key = await keyFrom(password, salt, cryptoProvider);
    let plain;
    try { plain = await cryptoProvider.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: context }, key, ciphertext); }
    catch { throw new Error('Senha de backup incorreta ou arquivo alterado/incompleto. Nenhum dado foi restaurado.'); }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plain)); }
    catch { throw new Error('Conteúdo do backup inválido. Nenhum dado foi restaurado.'); }
}
