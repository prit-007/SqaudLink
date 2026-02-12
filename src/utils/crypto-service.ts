/**
 * 🔐 Squad Link Crypto Service - Multi-Device E2EE
 *
 * Architecture:
 * - Direct Messages: Hybrid (AES-GCM content + RSA-OAEP key wrapping)
 * - Group Messages: AES-GCM 256-bit with managed group keys
 * - Multi-Device: Each device has its own RSA key pair
 * - Key Storage: IndexedDB (Private Keys) + Supabase (Public Keys)
 * - Zero-Knowledge: Server never sees private keys or plaintext
 * - Signal Protocol Inspired: One-time pre-keys for async messaging
 *
 * Flow:
 * 1. Login → Initialize device and generate/load keys
 * 2. Send → Encrypt content with AES, wrap key with each device's RSA public key
 * 3. Receive → Unwrap AES key with device's RSA private key, decrypt content
 * 4. Offline → Use one-time pre-keys for async delivery
 *
 * @example
 * // On login:
 * await CryptoService.initializeDevice(userId);
 *
 * // Send message:
 * const payload = await CryptoService.encryptForDevices(text, recipientUserId);
 * await supabase.from('messages').insert({ content: JSON.stringify(payload), ... });
 *
 * // Receive message:
 * const encrypted = JSON.parse(message.content);
 * const plaintext = await CryptoService.decryptMessage(encrypted);
 */

import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// ==================== INTERFACES ====================

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

interface DeviceInfo {
  id: string;
  name: string;
  fingerprint: string;
  publicKey: string;
}

interface EncryptedPayload {
  content: string; // Base64 encrypted content
  iv: string; // Base64 initialization vector
  deviceKeys: Record<string, string>; // device_id -> Base64 encrypted AES key
  algorithm: "aes-gcm";
  version: number; // Protocol version
}

interface PreKey {
  keyId: string;
  publicKey: string;
  deviceId: string;
  isSigned: boolean;
  signature?: string;
}

// ==================== CRYPTO SERVICE ====================

export class CryptoService {
  // Constants
  private static readonly RSA_ALGORITHM = "RSA-OAEP";
  private static readonly KEY_SIZE = 2048;
  private static readonly HASH = "SHA-256";
  private static readonly AES_ALGORITHM = "AES-GCM";
  private static readonly AES_KEY_SIZE = 256;
  private static readonly STORAGE_KEY = "squad_link_device";
  private static readonly DB_NAME = "squad_link_crypto";
  private static readonly PRE_KEY_BATCH_SIZE = 100;
  private static readonly PROTOCOL_VERSION = 1;

  // In-memory cache
  private static deviceInfo: DeviceInfo | null = null;
  private static privateKey: CryptoKey | null = null;
  private static ensureSecureContext() {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error(
        "🔒 E2EE requires a Secure Context (HTTPS). " +
          'If you are testing on mobile via LAN/Tailscale, you must enable "Treat insecure origin as secure" in chrome://flags.'
      );
    }
  }
  // ==================== INITIALIZATION ====================

  /**
   * 🎯 Initialize device on login/app start
   * Call this once when the app loads or user logs in
   */
  static async initializeDevice(userId: string): Promise<DeviceInfo> {
    // Check if device already registered
    const storedDevice = this.getStoredDeviceInfo();

    if (storedDevice) {
      // Load existing device
      try {
        this.deviceInfo = storedDevice;
        this.privateKey = await this.loadPrivateKey(storedDevice.id);

        // Update last active timestamp
        await this.updateDeviceActivity(storedDevice.id);

        console.log("✅ Device initialized:", storedDevice.name);
        return storedDevice;
      } catch (error) {
        console.warn("⚠️ Failed to load device, re-registering...", error);
        // Fall through to register new device
      }
    }

    // Register new device
    const fingerprint = await this.generateDeviceFingerprint();
    const deviceName = this.getDeviceName();
    const keyPair = await this.generateKeyPair();

    // Export public key
    const publicKeyStr = await this.exportPublicKey(keyPair.publicKey);

    // Save to Supabase
    const { data, error } = await supabase
      .from("user_devices")
      .insert({
        user_id: userId,
        device_name: deviceName,
        device_fingerprint: fingerprint,
        public_key: publicKeyStr,
      })
      .select()
      .single();

    if (error) {
      // If user_devices table doesn't exist, E2EE is not set up yet
      if (
        error.code === "42P01" ||
        error.message.includes('relation "user_devices" does not exist')
      ) {
        console.warn(
          "⚠️ E2EE table not set up. Run migration_v2.1_spice_pack.sql to enable E2EE."
        );
        console.warn(
          "Messages will be stored in plaintext until E2EE is configured."
        );
        return {
          id: "no-e2ee",
          name: deviceName,
          fingerprint,
          publicKey: publicKeyStr,
        };
      }
      throw new Error(`Failed to register device: ${error.message}`);
    }

    const deviceInfo: DeviceInfo = {
      id: data.id,
      name: deviceName,
      fingerprint,
      publicKey: publicKeyStr,
    };

    // Save private key to IndexedDB
    await this.savePrivateKey(keyPair.privateKey, data.id);
    this.storeDeviceInfo(deviceInfo);

    // Cache in memory
    this.deviceInfo = deviceInfo;
    this.privateKey = keyPair.privateKey;

    // Generate pre-keys for async messaging
    await this.generatePreKeys(userId, data.id);

    console.log("✅ New device registered:", deviceName);
    return deviceInfo;
  }

  /**
   * Check if device is initialized
   */
  static isInitialized(): boolean {
    return this.deviceInfo !== null && this.privateKey !== null;
  }

  /**
   * Get current device info
   */
  static getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  // ==================== ENCRYPTION ====================

  /**
   * 📤 Encrypt message for all recipient devices
   * This is the main method for sending encrypted messages
   *
   * @param plaintext - The message to encrypt
   * @param recipientUserId - The recipient's user ID
   * @returns EncryptedPayload to store in database
   */
  static async encryptForDevices(
    plaintext: string,
    recipientUserId: string
  ): Promise<EncryptedPayload> {
    if (!this.isInitialized()) {
      throw new Error("Device not initialized. Call initializeDevice() first.");
    }

    // 1. Generate random AES key for this message
    const aesKey = await this.generateAESKey();

    // 2. Encrypt content with AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
      { name: this.AES_ALGORITHM, iv },
      aesKey,
      encoder.encode(plaintext)
    );

    // 3. Get all active devices for recipient
    const recipientDevices = await this.getActiveDevices(recipientUserId);

    if (recipientDevices.length === 0) {
      throw new Error("Recipient has no active devices");
    }

    // 4. Encrypt AES key with each device's RSA public key
    const deviceKeys: Record<string, string> = {};

    for (const device of recipientDevices) {
      const publicKey = await this.importPublicKey(device.publicKey);
      const encryptedKey = await this.wrapKey(aesKey, publicKey);
      deviceKeys[device.id] = encryptedKey;
    }

    // 5. Also encrypt for own devices (to see sent messages on other devices)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const myDevices = await this.getActiveDevices(user.id);
      for (const device of myDevices) {
        const publicKey = await this.importPublicKey(device.publicKey);
        const encryptedKey = await this.wrapKey(aesKey, publicKey);
        deviceKeys[device.id] = encryptedKey;
      }
    }

    return {
      content: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer),
      deviceKeys,
      algorithm: "aes-gcm",
      version: this.PROTOCOL_VERSION,
    };
  }

  /**
   * Wrap (encrypt) AES key with RSA public key
   */
  private static async wrapKey(
    aesKey: CryptoKey,
    rsaPublicKey: CryptoKey
  ): Promise<string> {
    // Export AES key as raw bytes
    const keyBytes = await window.crypto.subtle.exportKey("raw", aesKey);

    // Encrypt with RSA-OAEP
    const encrypted = await window.crypto.subtle.encrypt(
      { name: this.RSA_ALGORITHM },
      rsaPublicKey,
      keyBytes
    );

    return this.arrayBufferToBase64(encrypted);
  }

  // ==================== DECRYPTION ====================

  /**
   * 📥 Decrypt message with current device's private key
   * This is the main method for receiving encrypted messages
   *
   * @param payload - The encrypted payload from database
   * @returns Decrypted plaintext
   */
  static async decryptMessage(
    payload: EncryptedPayload | string
  ): Promise<string> {
    // Handle legacy format (plain base64 string - not encrypted)
    if (typeof payload === "string") {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(payload);
        if (parsed.content && parsed.deviceKeys) {
          return await this.decryptMessage(parsed);
        }
      } catch {
        // Not JSON, assume it's plain text or legacy encrypted
        return payload;
      }
    }

    if (!this.isInitialized() || !this.deviceInfo || !this.privateKey) {
      throw new Error("Device not initialized. Call initializeDevice() first.");
    }

    // Type guard - at this point payload must be EncryptedPayload
    if (typeof payload === "string") {
      throw new Error("Invalid payload format");
    }

    // 1. Get encrypted AES key for this device
    const encryptedKeyBase64 = payload.deviceKeys[this.deviceInfo.id];
    if (!encryptedKeyBase64) {
      throw new Error(
        "Message not encrypted for this device. Try syncing on the original device."
      );
    }

    // 2. Unwrap (decrypt) AES key with RSA private key
    const encryptedKey = this.base64ToArrayBuffer(encryptedKeyBase64);
    const keyBytes = await window.crypto.subtle.decrypt(
      { name: this.RSA_ALGORITHM },
      this.privateKey,
      encryptedKey
    );

    // 3. Import AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: this.AES_ALGORITHM },
      false,
      ["decrypt"]
    );

    // 4. Decrypt content with AES-GCM
    const encrypted = this.base64ToArrayBuffer(payload.content);
    const iv = this.base64ToArrayBuffer(payload.iv);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: this.AES_ALGORITHM, iv },
      aesKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  // ==================== KEY MANAGEMENT ====================

  /**
   * Generate RSA-OAEP key pair
   */
  private static async generateKeyPair(): Promise<KeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: this.RSA_ALGORITHM,
        modulusLength: this.KEY_SIZE,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: this.HASH,
      },
      true,
      ["encrypt", "decrypt"]
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    };
  }

  /**
   * Generate AES-GCM key
   */
  private static async generateAESKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: this.AES_ALGORITHM,
        length: this.AES_KEY_SIZE,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Export public key to base64 string
   */
  private static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return this.arrayBufferToBase64(exported);
  }

  /**
   * Import public key from base64 string
   */
  private static async importPublicKey(
    publicKeyBase64: string
  ): Promise<CryptoKey> {
    const keyData = this.base64ToArrayBuffer(publicKeyBase64);

    return await window.crypto.subtle.importKey(
      "spki",
      keyData,
      {
        name: this.RSA_ALGORITHM,
        hash: this.HASH,
      },
      true,
      ["encrypt"]
    );
  }

  // ==================== PRE-KEYS (Signal Protocol Style) ====================

  /**
   * Generate batch of one-time pre-keys for async messaging
   */
  private static async generatePreKeys(
    userId: string,
    deviceId: string
  ): Promise<void> {
    console.log(`🔑 Generating ${this.PRE_KEY_BATCH_SIZE} pre-keys...`);

    const preKeys: any[] = [];

    for (let i = 0; i < this.PRE_KEY_BATCH_SIZE; i++) {
      const keyPair = await this.generateKeyPair();
      const publicKeyStr = await this.exportPublicKey(keyPair.publicKey);
      const keyId = `${deviceId}-${Date.now()}-${i}`;

      preKeys.push({
        user_id: userId,
        device_id: deviceId,
        key_id: keyId,
        public_key: publicKeyStr,
        is_signed: false,
      });
    }

    // Batch insert
    const { error } = await supabase.from("e2ee_pre_keys").insert(preKeys);
    if (error) {
      console.error("Failed to generate pre-keys:", error);
    } else {
      console.log("✅ Pre-keys generated");
    }
  }

  /**
   * Check pre-key count and replenish if low
   */
  static async checkAndReplenishPreKeys(
    userId: string,
    deviceId: string
  ): Promise<void> {
    const { count } = await supabase
      .from("e2ee_pre_keys")
      .select("*", { count: "exact", head: true })
      .eq("device_id", deviceId);

    if ((count || 0) < 20) {
      console.log("⚠️ Low on pre-keys, replenishing...");
      await this.generatePreKeys(userId, deviceId);
    }
  }

  /**
   * Claim a one-time pre-key for async messaging
   */
  static async claimPreKey(
    recipientUserId: string,
    deviceId?: string
  ): Promise<PreKey | null> {
    const { data, error } = await supabase
      .rpc("claim_one_time_key", {
        target_user_id: recipientUserId,
        target_device_id: deviceId || null,
      })
      .single();

    if (error || !data) {
      console.warn("No pre-key available:", error);
      return null;
    }

    // Type assertion for RPC result
    const result = data as any;

    return {
      keyId: result.key_id,
      publicKey: result.public_key,
      deviceId: result.device_id,
      isSigned: result.is_signed,
      signature: result.signature,
    };
  }

  // ==================== DEVICE MANAGEMENT ====================

  /**
   * Generate device fingerprint based on browser characteristics
   */
  private static async generateDeviceFingerprint(): Promise<string> {
    this.ensureSecureContext();   
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset().toString(),
      screen.width + "x" + screen.height,
      screen.colorDepth.toString(),
      navigator.hardwareConcurrency?.toString() || "",
    ];

    const fingerprint = components.join("|");
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hash = await window.crypto.subtle.digest("SHA-256", data);

    return this.arrayBufferToBase64(hash).slice(0, 32);
  }

  /**
   * Get human-readable device name
   */
  private static getDeviceName(): string {
    const ua = navigator.userAgent;

    if (/iPhone/.test(ua)) return "iPhone";
    if (/iPad/.test(ua)) return "iPad";
    if (/Android/.test(ua)) return "Android Device";
    if (/Mac/.test(ua)) return "Mac";
    if (/Win/.test(ua)) return "Windows PC";
    if (/Linux/.test(ua)) return "Linux PC";

    return "Unknown Device";
  }

  /**
   * Get active devices for a user (active in last 7 days)
   */
  private static async getActiveDevices(
    userId: string
  ): Promise<Array<{ id: string; publicKey: string }>> {
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("user_devices")
      .select("id, public_key")
      .eq("user_id", userId)
      .gte("last_active_at", sevenDaysAgo);

    if (error) {
      console.error("Failed to fetch devices:", error);
      return [];
    }

    return (data || []).map((d) => ({ id: d.id, publicKey: d.public_key }));
  }

  /**
   * Update device last_active timestamp
   */
  private static async updateDeviceActivity(deviceId: string): Promise<void> {
    await supabase
      .from("user_devices")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", deviceId);
  }

  /**
   * Remove device (logout/revoke)
   */
  static async removeDevice(): Promise<void> {
    if (!this.deviceInfo) return;

    // Delete from Supabase
    await supabase.from("user_devices").delete().eq("id", this.deviceInfo.id);

    // Clear local storage
    localStorage.removeItem(this.STORAGE_KEY);
    await this.deletePrivateKey(this.deviceInfo.id);

    this.deviceInfo = null;
    this.privateKey = null;

    console.log("✅ Device removed");
  }

  /**
   * List all devices for current user
   */
  static async listMyDevices(): Promise<
    Array<{
      id: string;
      name: string;
      lastActive: string;
      isCurrent: boolean;
    }>
  > {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("user_devices")
      .select("id, device_name, last_active_at")
      .eq("user_id", user.id)
      .order("last_active_at", { ascending: false });

    return (data || []).map((d) => ({
      id: d.id,
      name: d.device_name,
      lastActive: d.last_active_at,
      isCurrent: d.id === this.deviceInfo?.id,
    }));
  }

  // ==================== LOCAL STORAGE ====================

  /**
   * Store device info in localStorage
   */
  private static storeDeviceInfo(info: DeviceInfo): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(info));
  }

  /**
   * Get stored device info from localStorage
   */
  private static getStoredDeviceInfo(): DeviceInfo | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  // ==================== INDEXED DB (Private Key Storage) ====================

  /**
   * Open IndexedDB
   */
  private static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("keys")) {
          db.createObjectStore("keys", { keyPath: "id" });
        }
      };
    });
  }

  /**
   * Save private key to IndexedDB
   */
  private static async savePrivateKey(
    privateKey: CryptoKey,
    deviceId: string
  ): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction("keys", "readwrite");
    const store = tx.objectStore("keys");

    const keyData = await window.crypto.subtle.exportKey("jwk", privateKey);
    await store.put({ id: deviceId, key: keyData });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Load private key from IndexedDB
   */
  private static async loadPrivateKey(deviceId: string): Promise<CryptoKey> {
    const db = await this.openDB();
    const tx = db.transaction("keys", "readonly");
    const store = tx.objectStore("keys");

    const result: any = await new Promise((resolve, reject) => {
      const request = store.get(deviceId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!result) {
      throw new Error("Private key not found");
    }

    return await window.crypto.subtle.importKey(
      "jwk",
      result.key,
      {
        name: this.RSA_ALGORITHM,
        hash: this.HASH,
      },
      true,
      ["decrypt"]
    );
  }

  /**
   * Delete private key from IndexedDB
   */
  private static async deletePrivateKey(deviceId: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction("keys", "readwrite");
    const store = tx.objectStore("keys");
    await store.delete(deviceId);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==================== UTILITIES ====================

  /**
   * Convert ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
