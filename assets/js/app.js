// FILE: assets/js/app.js
/**
 * Main Application Logic
 * UI Controller, Event Handling, Routing
 */

const app = {
    state: {
        books: [],
        currentFilter: 'all',
        currentSubFilter: 'all',
        selectedFiles: [],
        generatedCover: null
    },

    init: async () => {
        await db.init();
        app.loadBooks();
        app.checkSession();
        // Handle iOS URL bar hiding fix
        window.scrollTo(0,1);
    },

    loadBooks: () => {
        app.state.books = db.getMetadata();
        app.renderBooks();
    },

    // --- Navigation & Routing ---
    navigate: (viewName) => {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active', 'hidden'));
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        
        const target = document.getElementById(`view-${viewName}`);
        if(target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
        window.scrollTo(0,0);
    },

    toggleAdminPanel: () => {
        const isLoggedIn = localStorage.getItem('admin_session');
        if (isLoggedIn) {
            app.navigate('admin');
            app.renderAdminList();
        } else {
            document.getElementById('adminModal').classList.remove('hidden');
        }
    },

    closeModals: () => {
        document.querySelectorAll('.modal').forEach(el => el.classList.add('hidden'));
    },

    // --- Auth ---
    checkAdmin: () => {
        const pin = document.getElementById('adminPin').value;
        if (pin === '1234') {
            localStorage.setItem('admin_session', Date.now());
            app.closeModals();
            document.getElementById('adminPin').value = '';
            app.navigate('admin');
            app.renderAdminList();
        } else {
            app.toast('کۆدەکە هەڵەیە!');
        }
    },

    checkSession: () => {
        // Auto logout after 30 mins
        const sess = localStorage.getItem('admin_session');
        if(sess && (Date.now() - sess > 30*60*1000)) {
            localStorage.removeItem('admin_session');
        }
    },

    logout: () => {
        localStorage.removeItem('admin_session');
        app.navigate('home');
        app.toast('دەرچوویت');
    },

    switchAdminTab: (tab) => {
        document.querySelectorAll('.admin-panel').forEach(e => e.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(e => e.classList.remove('active'));
        
        document.getElementById(`admin-tab-${tab}`).classList.remove('hidden');
        // Find button index to set active (simple query)
        const btns = document.querySelectorAll('.tab-btn');
        if(tab === 'add') btns[0].classList.add('active');
        else btns[1].classList.add('active');
        
        if(tab === 'list') app.renderAdminList();
    },

    // --- Home Logic ---
    renderBooks: () => {
        const grid = document.getElementById('booksGrid');
        grid.innerHTML = '';
        
        let filtered = app.state.books;

        // Category Filter
        if (app.state.currentFilter !== 'all') {
            filtered = filtered.filter(b => b.category === app.state.currentFilter);
        }
        
        // Islamic Sub-filter
        if (app.state.currentFilter === 'ئیسـلامی' && app.state.currentSubFilter !== 'all') {
            filtered = filtered.filter(b => b.islamic_section === app.state.currentSubFilter);
        }

        // Search
        const search = document.getElementById('searchInput').value.toLowerCase();
        if (search) {
            filtered = filtered.filter(b => 
                b.title.toLowerCase().includes(search) || 
                b.author.toLowerCase().includes(search)
            );
        }

        if (filtered.length === 0) {
            document.getElementById('emptyState').classList.remove('hidden');
        } else {
            document.getElementById('emptyState').classList.add('hidden');
            filtered.forEach(book => {
                const card = document.createElement('div');
                card.className = 'book-card';
                card.onclick = () => app.openBook(book.id);
                card.innerHTML = `
                    <img src="${book.cover && book.cover.imageData ? book.cover.imageData : 'assets/img/placeholder.png'}" class="card-cover" loading="lazy">
                    <div class="card-info">
                        <div class="card-title">${book.title}</div>
                        <div class="card-author">${book.author}</div>
                        ${book.islamic_section ? `<span class="card-badge">${book.islamic_section}</span>` : ''}
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    },

    filterCategory: (cat, btn) => {
        app.state.currentFilter = cat;
        app.state.currentSubFilter = 'all'; // reset sub
        
        // UI Active State
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');

        // Show/Hide Sub filters
        const subNav = document.getElementById('islamicFilters');
        if (cat === 'ئیسـلامی') subNav.classList.remove('hidden');
        else subNav.classList.add('hidden');

        app.renderBooks();
    },

    filterSub: (sub) => {
        app.state.currentSubFilter = sub;
        document.querySelectorAll('.chip-sm').forEach(c => c.classList.remove('active'));
        event.target.classList.add('active');
        app.renderBooks();
    },

    handleSearch: () => {
        app.renderBooks();
    },

    // --- Book Details ---
    openBook: (id) => {
        const book = app.state.books.find(b => b.id === id);
        if (!book) return;

        const container = document.getElementById('bookDetailContent');
        
        let volumesHtml = '';
        book.volumes.forEach((vol, idx) => {
            volumesHtml += `
                <div class="volume-item">
                    <span>📚 ${vol.label}</span>
                    <button class="volume-btn" onclick="app.downloadVolume('${vol.fileKey}', '${vol.label}')">کردنەوە / داگرتن</button>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="detail-header">
                <img src="${book.cover.imageData}" class="detail-cover">
                <div class="detail-meta">
                    <h2>${book.title}</h2>
                    <h4>نووسەر: ${book.author}</h4>
                    <span class="card-badge">${book.category} ${book.islamic_section ? ' / ' + book.islamic_section : ''}</span>
                    <div class="detail-desc">${book.description || 'هیچ زانیارییەک بەردەست نییە.'}</div>
                </div>
            </div>
            <div class="volume-list">
                <h3>بەشەکانی کتێب (${book.volumes.length})</h3>
                ${volumesHtml}
            </div>
        `;
        
        app.navigate('details');
    },

    downloadVolume: async (key, label) => {
        try {
            const fileBlob = await db.getFile(key);
            if (!fileBlob) {
                app.toast('فایلەکە نەدۆزرایەوە!');
                return;
            }
            const url = URL.createObjectURL(fileBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${label}.pdf`; // Name for download
            document.body.appendChild(a);
            a.click();
            
            // Open in new tab for iPhone viewing
            setTimeout(() => {
                window.open(url, '_blank');
                document.body.removeChild(a);
            }, 100);
        } catch (e) {
            console.error(e);
            app.toast('کێشەیەک هەیە لە کردنەوەی فایل');
        }
    },

    // --- Admin: Add Book ---
    handleFileSelect: async (input) => {
        const files = Array.from(input.files);
        if (files.length === 0) return;

        app.state.selectedFiles = files;
        
        // 1. Generate Cover from first file
        document.getElementById('coverPreview').innerHTML = '<span class="placeholder">جارێ...</span>';
        const coverData = await generateCoverFromPDF(files[0]);
        app.state.generatedCover = coverData;
        
        if (coverData) {
            document.getElementById('coverPreview').innerHTML = `<img src="${coverData}">`;
        }

        // 2. List volumes with editable names
        const listContainer = document.getElementById('filePreviewList');
        listContainer.innerHTML = '';
        files.forEach((f, i) => {
            const div = document.createElement('div');
            div.className = 'file-list-item';
            div.innerHTML = `
                <span>📄</span>
                <input type="text" id="vol_name_${i}" value="بەرگی ${i + 1}">
                <small>(${Math.round(f.size/1024/1024*10)/10} MB)</small>
            `;
            listContainer.appendChild(div);
        });
    },

    toggleIslamicSub: (val) => {
        const grp = document.getElementById('newIslamicSubGroup');
        if (val === 'ئیسـلامی') grp.classList.remove('hidden');
        else grp.classList.add('hidden');
    },

    saveNewBook: async () => {
        const btn = document.getElementById('saveBtn');
        btn.innerText = 'تکایە چاوەڕێبە...';
        btn.disabled = true;

        try {
            const title = document.getElementById('newTitle').value;
            const author = document.getElementById('newAuthor').value;
            const cat = document.getElementById('newCategory').value;
            const sub = cat === 'ئیسـلامی' ? document.getElementById('newIslamicSection').value : '';
            const desc = document.getElementById('newDesc').value;
            
            if (!app.state.selectedFiles.length) {
                alert('تکایە فایل هەڵبژێرە');
                throw new Error('No files');
            }

            const bookId = 'bk_' + Date.now();
            const volumes = [];
            const fileObjects = [];

            // Process each file
            for (let i = 0; i < app.state.selectedFiles.length; i++) {
                const file = app.state.selectedFiles[i];
                const label = document.getElementById(`vol_name_${i}`).value || `File ${i+1}`;
                const fileKey = `${bookId}_v${i+1}`;
                
                volumes.push({ label, fileKey });
                fileObjects.push({ key: fileKey, blob: file });
            }

            const newBook = {
                id: bookId,
                title, author, category: cat, islamic_section: sub, description: desc,
                createdAt: new Date().toISOString(),
                volumes,
                cover: { type: 'generated', imageData: app.state.generatedCover }
            };

            await db.addBook(newBook, fileObjects);
            
            app.toast('کتێب بە سەرکەوتوویی زیادکرا');
            document.getElementById('addBookForm').reset();
            document.getElementById('filePreviewList').innerHTML = '';
            document.getElementById('coverPreview').innerHTML = '';
            app.state.selectedFiles = [];
            app.loadBooks(); // refresh memory
            
} catch (e) {
    console.error(e);
    alert('هەڵە: ' + e.message); // ئەمە هۆکارەکە دەنووسێت
} finally {
            btn.innerText = 'زیادکردن';
            btn.disabled = false;
        }
    },

    // --- Admin: List & Delete ---
    renderAdminList: () => {
        const list = document.getElementById('adminBookList');
        list.innerHTML = '';
        app.state.books.forEach(b => {
            const div = document.createElement('div');
            div.className = 'admin-book-item';
            div.innerHTML = `
                <div>
                    <strong>${b.title}</strong>
                    <br><small>${b.volumes.length} بەرگ</small>
                </div>
                <button class="btn-danger" onclick="app.deleteBook('${b.id}')">سڕینەوە</button>
            `;
            list.appendChild(div);
        });
    },

    deleteBook: async (id) => {
        if(confirm('دڵنیای لە سڕینەوەی ئەم کتێبە و هەموو فایلەکانی؟')) {
            await db.deleteBook(id);
            app.loadBooks();
            app.renderAdminList();
            app.toast('سڕایەوە');
        }
    },

    exportData: () => {
        const data = JSON.stringify(app.state.books, null, 2);
        const blob = new Blob([data], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `books_backup_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    toast: (msg) => {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
};

// Start
document.addEventListener('DOMContentLoaded', app.init);
