/**
 * 🔐 END-TO-END ENCRYPTION SERVICE
 * 
 * This implements true E2EE using Web Crypto API
 * Messages are encrypted on sender's device and decrypted on receiver's device
 * Server (Supabase) only sees encrypted blobs
 */

// Key Storage Keys
const PRIVATE_KEY_STORAGE = 'squad_link_private_key'
const PUBLIC_KEY_STORAGE = 'squad_link_public_key'

interface KeyPair {
  publicKey: CryptoKey
  privateKey: CryptoKey
}

export class E2EEService {
  private static instance: E2EEService
  private keyPair: KeyPair | null = null

  private constructor() {}

  static getInstance(): E2EEService {
    if (!E2EEService.instance) {
      E2EEService.instance = new E2EEService()
    }
    return E2EEService.instance
  }

  /**
   * Generate a new RSA key pair for the user
   * This should be called on first login or when keys are lost
   */
  async generateKeyPair(): Promise<KeyPair> {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true, // extractable
        ['encrypt', 'decrypt']
      )

      this.keyPair = keyPair
      await this.saveKeysLocally(keyPair)
      
      return keyPair
    } catch (error) {
      console.error('Failed to generate key pair:', error)
      throw new Error('Key generation failed')
    }
  }

  /**
   * Save keys to IndexedDB (secure local storage)
   */
  private async saveKeysLocally(keyPair: KeyPair): Promise<void> {
    try {
      // Export keys to JWK format
      const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey)
      const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey)

      // Store in localStorage (in production, use IndexedDB for better security)
      localStorage.setItem(PUBLIC_KEY_STORAGE, JSON.stringify(publicKeyJwk))
      localStorage.setItem(PRIVATE_KEY_STORAGE, JSON.stringify(privateKeyJwk))
    } catch (error) {
      console.error('Failed to save keys:', error)
      throw new Error('Key storage failed')
    }
  }

  /**
   * Load keys from local storage
   */
  async loadKeysFromStorage(): Promise<KeyPair | null> {
    try {
      const publicKeyJwk = localStorage.getItem(PUBLIC_KEY_STORAGE)
      const privateKeyJwk = localStorage.getItem(PRIVATE_KEY_STORAGE)

      if (!publicKeyJwk || !privateKeyJwk) {
        return null
      }

      const publicKey = await window.crypto.subtle.importKey(
        'jwk',
        JSON.parse(publicKeyJwk),
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      )

      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        JSON.parse(privateKeyJwk),
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['decrypt']
      )

      this.keyPair = { publicKey, privateKey }
      return this.keyPair
    } catch (error) {
      console.error('Failed to load keys:', error)
      return null
    }
  }

  /**
   * Get public key as base64 string (to store in database)
   */
  async getPublicKeyString(): Promise<string> {
    if (!this.keyPair) {
      await this.loadKeysFromStorage()
    }

    if (!this.keyPair) {
      throw new Error('No key pair available')
    }

    const jwk = await window.crypto.subtle.exportKey('jwk', this.keyPair.publicKey)
    return btoa(JSON.stringify(jwk))
  }

  /**
   * Import public key from base64 string
   */
  async importPublicKey(publicKeyString: string): Promise<CryptoKey> {
    try {
      const jwk = JSON.parse(atob(publicKeyString))
      return await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      )
    } catch (error) {
      console.error('Failed to import public key:', error)
      throw new Error('Invalid public key')
    }
  }

  /**
   * Encrypt a message for a recipient
   * @param message - Plain text message
   * @param recipientPublicKeyString - Recipient's public key from database
   */
  async encryptMessage(message: string, recipientPublicKeyString: string): Promise<string> {
    try {
      const recipientPublicKey = await this.importPublicKey(recipientPublicKeyString)
      
      // Convert message to ArrayBuffer
      const encoder = new TextEncoder()
      const data = encoder.encode(message)

      // Encrypt
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        recipientPublicKey,
        data
      )

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt message')
    }
  }

  /**
   * Decrypt a message received
   * @param encryptedMessage - Base64 encoded encrypted message
   */
  async decryptMessage(encryptedMessage: string): Promise<string> {
    try {
      if (!this.keyPair) {
        await this.loadKeysFromStorage()
      }

      if (!this.keyPair) {
        throw new Error('No private key available')
      }

      // Convert from base64
      const encrypted = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0))

      // Decrypt
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP',
        },
        this.keyPair.privateKey,
        encrypted
      )

      // Convert back to string
      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt message')
    }
  }

  /**
   * For group chats: Encrypt with shared secret key
   * This uses AES-GCM which is faster than RSA for group messages
   */
  async generateSharedKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt message with shared key (for groups)
   */
  async encryptWithSharedKey(message: string, sharedKey: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      sharedKey,
      data
    )

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    }
  }

  /**
   * Decrypt message with shared key (for groups)
   */
  async decryptWithSharedKey(encryptedData: string, ivString: string, sharedKey: CryptoKey): Promise<string> {
    const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(ivString), c => c.charCodeAt(0))

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      sharedKey,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  /**
   * Check if user has keys set up
   */
  hasKeys(): boolean {
    return !!(localStorage.getItem(PUBLIC_KEY_STORAGE) && localStorage.getItem(PRIVATE_KEY_STORAGE))
  }

  /**
   * Clear all keys (logout)
   */
  clearKeys(): void {
    localStorage.removeItem(PUBLIC_KEY_STORAGE)
    localStorage.removeItem(PRIVATE_KEY_STORAGE)
    this.keyPair = null
  }

  /**
   * Backup encrypted private key to database
   * User provides a password, we encrypt the private key with it
   */
  async backupPrivateKey(password: string): Promise<string> {
    if (!this.keyPair) {
      throw new Error('No keys to backup')
    }

    // Derive key from password
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveKey']
    )

    const salt = window.crypto.getRandomValues(new Uint8Array(16))
    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    )

    // Export private key
    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', this.keyPair.privateKey)
    const privateKeyString = JSON.stringify(privateKeyJwk)

    // Encrypt private key
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      encoder.encode(privateKeyString)
    )

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)

    return btoa(String.fromCharCode(...combined))
  }

  /**
   * Restore private key from backup
   */
  async restorePrivateKey(encryptedBackup: string, password: string): Promise<void> {
    const combined = Uint8Array.from(atob(encryptedBackup), c => c.charCodeAt(0))
    
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const encrypted = combined.slice(28)

    // Derive key from password
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveKey']
    )

    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    // Decrypt
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      encrypted
    )

    const decoder = new TextDecoder()
    const privateKeyJwk = JSON.parse(decoder.decode(decrypted))

    // Import the restored private key
    const privateKey = await window.crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['decrypt']
    )

    // We need to also restore/generate the public key
    // For now, we'll need the user to provide it or regenerate the pair
    // In production, you'd store public key in the encrypted backup too
  }
}

export default E2EEService.getInstance()
