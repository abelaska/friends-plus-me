import crypto from 'crypto';

export default class Cryptor {
  constructor({ key, iv } = {}) {
    this.key = key;
    this.iv = iv;
  }

  setKey({ key, iv }) {
    this.key = key;
    this.iv = iv;
  }

  hmac(plain) {
    return crypto
      .createHmac('sha256', this.key)
      .update(plain)
      .digest('base64');
  }

  encrypt(plain) {
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.iv);
    let encrypted = cipher.update(plain, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  decrypt(encrypted) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, this.iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
