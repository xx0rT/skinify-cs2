// Alternative VAPID key generator using Node's crypto
const crypto = require('crypto');

function urlBase64Encode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateVAPIDKeys() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();

  const publicKey = urlBase64Encode(ecdh.getPublicKey());
  const privateKey = urlBase64Encode(ecdh.getPrivateKey());

  return {
    publicKey,
    privateKey
  };
}

console.log('\n=== VAPID Keys Generated ===\n');
const keys = generateVAPIDKeys();
console.log('Public Key:');
console.log(keys.publicKey);
console.log('\nPrivate Key:');
console.log(keys.privateKey);
console.log('\n=== Add these to your .env file ===\n');
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@example.com`);
console.log('\n');
