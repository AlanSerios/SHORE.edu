import JSZip from 'jszip';

/**
 * SHORE Encrypted Client-Side Document Vault
 * Uses Web Crypto API (AES-GCM 256-bit) + IndexedDB for secure, zero-server storage.
 */

const DB_NAME = 'SHORE_Secure_Vault_DB';

const DB_VERSION = 1;

const STORE_NAME = 'encrypted_documents';

// Open / initialize IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userEmail', 'userEmail', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Derive AES-GCM Key using PBKDF2 from user credentials/salt
async function deriveKey(userEmail) {
  const enc = new TextEncoder();

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(userEmail || 'shore_default_salt_vault'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = enc.encode(`shore_vault_${userEmail || 'universal'}`);

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a File or Blob and save it to client-side IndexedDB
 */
export async function encryptAndSaveDocument(userEmail, docKey, file, metadata = {}) {
  try {
    const key = await deriveKey(userEmail);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();

    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );

    const record = {
      id: `${userEmail}_${docKey}`,
      userEmail,
      docKey,
      name: metadata.name || file.name,
      originalFileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      updatedAt: new Date().toISOString(),
      iv: Array.from(iv),
      cipherData: encryptedContent,
      notes: metadata.notes || '',
      category: metadata.category || 'universal'
    };

    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error('Failed to encrypt and save document:', error);
    throw error;
  }
}

/**
 * Decrypt a stored document from IndexedDB
 */
export async function loadAndDecryptDocument(userEmail, docKey) {
  try {
    const db = await openDB();
    const id = `${userEmail}_${docKey}`;

    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!record) return null;

    const key = await deriveKey(userEmail);
    const iv = new Uint8Array(record.iv);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      record.cipherData
    );

    const blob = new Blob([decryptedBuffer], { type: record.fileType });

    return {
      ...record,
      blob,
      objectUrl: URL.createObjectURL(blob)
    };
  } catch (error) {
    console.error('Failed to decrypt document:', error);
    throw error;
  }
}

/**
 * Get all document metadata for a user (without decrypting all bodies immediately)
 */
export async function getAllVaultDocuments(userEmail) {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('userEmail');
      const req = index.getAll(userEmail);

      req.onsuccess = () => {
        const results = (req.result || []).map(r => ({
          id: r.id,
          docKey: r.docKey,
          name: r.name,
          originalFileName: r.originalFileName,
          fileType: r.fileType,
          fileSize: r.fileSize,
          updatedAt: r.updatedAt,
          notes: r.notes,
          category: r.category
        }));

        resolve(results);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error('Failed to fetch vault documents:', error);

    return [];
  }
}

/**
 * Delete a document from IndexedDB
 */
export async function deleteVaultDocument(userEmail, docKey) {
  try {
    const db = await openDB();
    const id = `${userEmail}_${docKey}`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error('Failed to delete vault document:', error);
    throw error;
  }
}

/**
 * Helper to download a single file directly in its original format
 */
export async function downloadSingleDocument(userEmail, docKey) {
  const doc = await loadAndDecryptDocument(userEmail, docKey);

  if (!doc) throw new Error('Document not found in vault');

  const link = document.createElement('a');
  link.href = doc.objectUrl;
  link.download = doc.originalFileName || `${doc.name}.${doc.fileType.split('/')[1] || 'bin'}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(doc.objectUrl), 1000);
}

/**
 * Export multiple or all vault documents as a single .zip archive
 */
export async function exportDocumentsAsZip(userEmail, docKeys = [], zipName = 'SHORE_Application_Documents.zip') {
  const zip = new JSZip();
  const allMeta = await getAllVaultDocuments(userEmail);
  const targetKeys = docKeys.length > 0 ? docKeys : allMeta.map(m => m.docKey);

  let addedCount = 0;

  for (const key of targetKeys) {
    try {
      const doc = await loadAndDecryptDocument(userEmail, key);

      if (doc && doc.blob) {
        const fileName = doc.originalFileName || `${doc.name}.${doc.fileType.split('/')[1] || 'bin'}`;
        zip.file(fileName, doc.blob);
        addedCount++;
      }
    } catch (e) {
      console.warn(`Could not add ${key} to zip:`, e);
    }
  }

  if (addedCount === 0) {
    throw new Error('No uploaded files found to bundle.');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return addedCount;
}

/**
 * Smart matching helper to check if a required document name matches an uploaded file in the vault.
 */
export function findVaultDocForReq(reqName, vaultDocs = []) {
  if (!reqName || !vaultDocs || vaultDocs.length === 0) return null;
  const lowerReq = reqName.toLowerCase();

  const keywordMap = [
    { keys: ['psa_birth_cert'], terms: ['birth certificate', 'psa birth', 'secpa', 'psa authenticated', 'birth cert', 'psa'] },
    { keys: ['form_137_138'], terms: ['form 137', 'form 138', 'report card', 'transcript of records', 'tor', 'gwa', 'grade 12', 'grades', 'transcript'] },
    { keys: ['good_moral'], terms: ['good moral', 'certificate of good moral', 'moral character', 'character certificate'] },
    { keys: ['brgy_residency'], terms: ['residency', 'indigency', 'barangay certificate', 'certificate of residency', 'brgy clearance', 'barangay residency', 'barangay indigency'] },
    { keys: ['parents_itr'], terms: ['itr', 'tax exemption', 'proof of income', '4ps', 'annual gross income', 'parents 2025/2026', 'parents\' itr', 'bir certificate', 'income tax'] },
    { keys: ['id_photo_2x2'], terms: ['2x2', 'id photo', 'id picture', 'white background', 'passport size photo', 'photo'] },
    { keys: ['recommendation'], terms: ['recommendation', 'recommendation letter', 'endorsement letter', 'reference letter', 'teacher recommendation'] },
    { keys: ['residence_sketch'], terms: ['sketch of residence', 'vicinity sketch', 'residence map', 'sketch map', 'house sketch', 'vicinity map'] }
  ];

  for (const item of keywordMap) {
    if (item.terms.some(t => lowerReq.includes(t))) {
      const found = vaultDocs.find(d => item.keys.includes(d.docKey));

      if (found) return found;
    }
  }

  for (const doc of vaultDocs) {
    const docName = (doc.name || '').toLowerCase();
    const origName = (doc.originalFileName || '').toLowerCase();

    if (docName && (lowerReq.includes(docName) || docName.includes(lowerReq))) {
      return doc;
    }

    if (origName && (lowerReq.includes(origName) || origName.includes(lowerReq))) {
      return doc;
    }
  }

  return null;
}

