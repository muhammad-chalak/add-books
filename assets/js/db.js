// FILE: assets/js/db.js
/**
 * Ultimate Fixed IndexedDB Wrapper
 * Forces ObjectStore creation
 */

// ناوی نوێ بۆ دڵنیابوون لە پاککردنەوەی هەڵە کۆنەکان
const DB_NAME_FINAL = 'Kurdistan_Lib_ULTRA_FIXED';
const STORE_NAME_FINAL = 'files';
const DB_VERSION_FINAL = 1;

class StorageManager {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                alert("This browser doesn't support IndexedDB");
                reject("No IDB");
                return;
            }

            console.log("Opening DB:", DB_NAME_FINAL);
            const request = indexedDB.open(DB_NAME_FINAL, DB_VERSION_FINAL);

            // 1. لێرەدا کۆگاکە درووست دەکرێت
            request.onupgradeneeded = (event) => {
                console.log("DB: Upgrading schema...");
                const db = event.target.result;
                
                // ئەگەر کۆنەکە هەبوو، دەیسڕێتەوە بۆ ئەوەی سەرلەنوێ درووستی بکات
                if (db.objectStoreNames.contains(STORE_NAME_FINAL)) {
                    db.deleteObjectStore(STORE_NAME_FINAL);
                }
                
                // درووستکردنەوە
                db.createObjectStore(STORE_NAME_FINAL);
                console.log(`DB: ObjectStore '${STORE_NAME_FINAL}' CREATED.`);
            };

            // 2. سەرکەوتن
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("DB: Opened successfully.");

                // پشکنینی کۆتایی: ئایا objectStore بەڕاستی بوونی هەیە؟
                if (!this.db.objectStoreNames.contains(STORE_NAME_FINAL)) {
                    alert("هەڵە: کۆگای فایل درووست نەبوو! تکایە دووبارە Refresh بکەرەوە.");
                    // بەزۆر داخستن و سڕینەوەی داتابەیس بۆ هەوڵی دواتر
                    this.db.close();
                    indexedDB.deleteDatabase(DB_NAME_FINAL);
                    reject("Store missing");
                } else {
                    resolve();
                }
            };

            request.onerror = (event) => {
                console.error("DB Error:", event.target.error);
                alert("DB Error: " + event.target.error.message);
                reject(event.target.error);
            };
        });
    }

    // --- LocalStorage (Metadata) ---
    getMetadata() {
        const data = localStorage.getItem('books_meta_fixed');
        return data ? JSON.parse(data) : [];
    }

    saveMetadata(books) {
        try {
            localStorage.setItem('books_meta_fixed', JSON.stringify(books));
        } catch (e) {
            alert("Storage full! Please delete some books.");
        }
    }

    // --- IndexedDB Operations ---
    async saveFile(key, blob) {
        return new Promise((resolve, reject) => {
            try {
                // دڵنیابوونەوە لەوەی داتابەیس کراوەتەوە
                if (!this.db) {
                    throw new Error("Database not initialized. Reload page.");
                }

                const tx = this.db.transaction([STORE_NAME_FINAL], 'readwrite');
                const store = tx.objectStore(STORE_NAME_FINAL);
                
                const req = store.put(blob, key);
                
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject("Put Error: " + e.target.error);
                tx.onabort = (e) => reject("Tx Abort: " + e.target.error);
                tx.onerror = (e) => reject("Tx Error: " + e.target.error);

            } catch (e) {
                console.error(e);
                reject(e.message);
            }
        });
    }

    async getFile(key) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.db) throw new Error("DB closed");
                const tx = this.db.transaction([STORE_NAME_FINAL], 'readonly');
                const store = tx.objectStore(STORE_NAME_FINAL);
                const req = store.get(key);

                req.onsuccess = () => {
                    if (req.result) resolve(req.result);
                    else reject("File not found");
                };
                req.onerror = () => reject("Get Error");
            } catch (e) {
                reject(e.message);
            }
        });
    }

    async deleteFile(key) {
        return new Promise((resolve) => {
            if (!this.db) return resolve();
            try {
                const tx = this.db.transaction([STORE_NAME_FINAL], 'readwrite');
                const store = tx.objectStore(STORE_NAME_FINAL);
                store.delete(key);
                tx.oncomplete = () => resolve();
            } catch (e) {
                console.log("Delete error ignored", e);
                resolve();
            }
        });
    }

    // --- Combined Methods ---
    async addBook(bookMeta, fileObjects) {
        // ئەگەر داتابەیس نەبوو، دەیکەینەوە
        if (!this.db) await this.init();

        // 1. فایلەکان خەزن دەکەین
        for (let f of fileObjects) {
            await this.saveFile(f.key, f.blob);
        }

        // 2. زانیارییەکان خەزن دەکەین
        const books = this.getMetadata();
        books.unshift(bookMeta);
        this.saveMetadata(books);
    }

    async deleteBook(id) {
        let books = this.getMetadata();
        const book = books.find(b => b.id === id);
        if (!book) return;

        if (book.volumes) {
            for (let vol of book.volumes) {
                await this.deleteFile(vol.fileKey);
            }
        }

        books = books.filter(b => b.id !== id);
        this.saveMetadata(books);
    }
}

const db = new StorageManager();
