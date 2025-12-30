// FILE: assets/js/db.js
/**
 * IndexedDB + LocalStorage Wrapper
 * Handles storing PDF blobs and Book Metadata
 */

const DB_NAME = 'KurdistanLibDB';
const DB_VERSION = 1;
const STORE_FILES = 'files'; // Stores PDF blobs

class StorageManager {
    constructor() {
        this.db = null;
    }

    // Initialize IndexedDB
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_FILES)) {
                    db.createObjectStore(STORE_FILES); // key is fileKey
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                console.error("IDB Error:", event);
                reject('Error opening DB');
            };
        });
    }

    // --- LocalStorage (Metadata) ---
    getMetadata() {
        const data = localStorage.getItem('books_meta');
        return data ? JSON.parse(data) : [];
    }

    saveMetadata(books) {
        localStorage.setItem('books_meta', JSON.stringify(books));
    }

    // --- IndexedDB (Files) ---
    async saveFile(key, blob) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([STORE_FILES], 'readwrite');
            const store = tx.objectStore(STORE_FILES);
            const req = store.put(blob, key);
            
            req.onsuccess = () => resolve();
            req.onerror = () => reject('Save file failed');
        });
    }

    async getFile(key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([STORE_FILES], 'readonly');
            const store = tx.objectStore(STORE_FILES);
            const req = store.get(key);

            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject('Get file failed');
        });
    }

    async deleteFile(key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([STORE_FILES], 'readwrite');
            const store = tx.objectStore(STORE_FILES);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
        });
    }

    // --- Combined Operations ---
    async addBook(bookMeta, fileObjects) {
        // 1. Save Files to IDB
        for (let f of fileObjects) {
            await this.saveFile(f.key, f.blob);
        }
        // 2. Save Meta to LS
        const books = this.getMetadata();
        books.unshift(bookMeta); // Add to top
        this.saveMetadata(books);
    }

    async deleteBook(id) {
        let books = this.getMetadata();
        const book = books.find(b => b.id === id);
        if (!book) return;

        // 1. Delete all volume files
        if (book.volumes) {
            for (let vol of book.volumes) {
                await this.deleteFile(vol.fileKey);
            }
        }

        // 2. Remove from LS
        books = books.filter(b => b.id !== id);
        this.saveMetadata(books);
    }
}

const db = new StorageManager();
