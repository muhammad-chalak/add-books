/* 
    Kurdistan Library - Core Logic
    Architecture: State-Based (Data stored in JSON, modified in RAM, Exported to file)
*/

// --- State ---
const state = {
    books: [],
    filter: { category: 'all', sub: 'all', search: '' },
    isAdmin: false,
    theme: localStorage.getItem('theme') || 'light'
};

// --- DOM Elements ---
const els = {
    grid: document.getElementById('booksGrid'),
    search: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    chips: document.querySelectorAll('.filter-chip'),
    subChips: document.querySelectorAll('.sub-chip'),
    subSection: document.getElementById('subCategories'),
    themeToggle: document.getElementById('themeToggle'),
    adminBtn: document.getElementById('adminBtn'),
    publicView: document.getElementById('publicView'),
    adminView: document.getElementById('adminView'),
    loginModal: document.getElementById('loginModal'),
    volumeModal: document.getElementById('volumeModal'),
    // Admin Forms
    bookForm: document.getElementById('bookForm'),
    volumeList: document.getElementById('volumeList'),
    coverInput: document.getElementById('coverGeneratorInput'),
    coverPreview: document.getElementById('coverPreview'),
    coverBase64: document.getElementById('inpCoverBase64')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    applyTheme();
    await loadBooks();
    setupEventListeners();
});

// --- Data Handling ---
async function loadBooks() {
    try {
        const res = await fetch('data/books.json');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        state.books = data.books || [];
        renderBooks();
    } catch (e) {
        console.error(e);
        // Fallback or Empty state if file missing
        state.books = [];
        els.grid.innerHTML = '<div class="error">هیچ کتێبێک نەدۆزرایەوە (یان JSON بوونی نییە)</div>';
    }
}

// --- Rendering ---
function renderBooks() {
    els.grid.innerHTML = '';
    
    // Filter Logic
    let filtered = state.books.filter(b => {
        const matchCat = state.filter.category === 'all' || b.category === state.filter.category;
        const matchSub = state.filter.sub === 'all' || b.subCategory === state.filter.sub;
        
        // Favorite logic
        if (state.filter.category === 'Favorites') {
            const favs = JSON.parse(localStorage.getItem('favs') || '[]');
            return favs.includes(b.id);
        }

        const term = state.filter.search.toLowerCase();
        const matchSearch = !term || b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term);

        return matchCat && matchSub && matchSearch;
    });

    if (filtered.length === 0) {
        els.grid.innerHTML = '<p>هیچ ئەنجامێک نەدۆزرایەوە</p>';
        return;
    }

    // Sort: Newest first
    filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    filtered.forEach(book => {
        const card = document.createElement('article');
        card.className = 'book-card';
        card.onclick = (e) => handleBookClick(e, book);

        const isFav = (JSON.parse(localStorage.getItem('favs') || '[]')).includes(book.id);
        
        card.innerHTML = `
            <img src="${book.coverThumb || 'assets/img/placeholder.jpg'}" class="card-cover" loading="lazy">
            <div class="card-content">
                <div class="card-title">${book.title}</div>
                <div class="card-author">${book.author}</div>
                <div class="card-badges">
                    <span class="badge">${book.category}</span>
                    ${book.volumes.length > 1 ? `<span class="badge">${book.volumes.length} بەرگ</span>` : ''}
                    ${isFav ? '<span class="badge">❤️</span>' : ''}
                </div>
            </div>
        `;
        els.grid.appendChild(card);
    });
}

// --- Interactions ---
function handleBookClick(e, book) {
    // Check if clicked volume or just card
    if (book.volumes.length === 1) {
        window.open(book.volumes[0].file, '_blank');
        addToHistory(book.id);
    } else {
        openVolumeModal(book);
    }
}

function openVolumeModal(book) {
    document.getElementById('vmTitle').innerText = book.title;
    const list = document.getElementById('vmList');
    list.innerHTML = '';
    
    book.volumes.forEach(vol => {
        const btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.innerText = vol.label;
        btn.onclick = () => {
            window.open(vol.file, '_blank');
            addToHistory(book.id);
            closeModal('volumeModal');
        };
        list.appendChild(btn);
    });
    
    // Add Fav Toggle in Modal
    const favBtn = document.createElement('button');
    const isFav = (JSON.parse(localStorage.getItem('favs') || '[]')).includes(book.id);
    favBtn.className = isFav ? 'btn-danger full-width' : 'btn-secondary full-width';
    favBtn.innerText = isFav ? 'لابردن لە دڵخوازەکان 💔' : 'زیادکردن بۆ دڵخوازەکان ❤️';
    favBtn.style.gridColumn = "span 2";
    favBtn.onclick = () => toggleFav(book.id);
    
    list.appendChild(favBtn);
    
    els.volumeModal.classList.add('open');
}

function toggleFav(id) {
    let favs = JSON.parse(localStorage.getItem('favs') || '[]');
    if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
    } else {
        favs.push(id);
    }
    localStorage.setItem('favs', JSON.stringify(favs));
    closeModal('volumeModal');
    renderBooks(); // Re-render to show heart
}

function addToHistory(id) {
    // Optional: Implement recent list logic
}

function setupEventListeners() {
    // Theme
    els.themeToggle.onclick = () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme();
    };

    // Filter Chips
    els.chips.forEach(chip => {
        chip.onclick = () => {
            els.chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.filter.category = chip.dataset.cat;
            
            // Show Sub-cat if Islamic
            if (state.filter.category === 'Islamic') els.subSection.classList.remove('hidden');
            else els.subSection.classList.add('hidden');
            
            state.filter.sub = 'all'; // reset sub
            document.querySelectorAll('.sub-chip').forEach(c => c.classList.remove('active'));
            renderBooks();
        };
    });

    els.subChips.forEach(chip => {
        chip.onclick = () => {
            els.subChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.filter.sub = chip.dataset.sub;
            renderBooks();
        }
    });

    // Search
    els.searchBtn.onclick = () => {
        state.filter.search = els.search.value;
        renderBooks();
    };
    els.search.onkeyup = (e) => {
        if(e.key === 'Enter') els.searchBtn.click();
    };

    // Admin Access
    els.adminBtn.onclick = () => {
        if (state.isAdmin) showAdminPanel();
        else els.loginModal.classList.add('open');
    };

    document.getElementById('loginConfirm').onclick = () => {
        const pass = document.getElementById('adminPass').value;
        if (pass === '1234') {
            state.isAdmin = true;
            closeModal('loginModal');
            showAdminPanel();
        } else {
            alert('کۆدی هەڵە!');
        }
    };

    // Admin Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
            document.getElementById('tab' + (btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1))).classList.remove('hidden');
        };
    });

    // Add Volume Row
    document.getElementById('addVolumeBtn').onclick = () => addVolumeRow();

    // Auto Cover Gen
    els.coverInput.onchange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const page = await pdf.getPage(1);
            const scale = 1.0;
            const viewport = page.getViewport({scale});
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({canvasContext: context, viewport: viewport}).promise;
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            
            els.coverPreview.src = base64;
            els.coverBase64.value = base64;
        } catch(err) {
            alert('کێشە لە درووستکردنی کەڤەر: ' + err.message);
        }
    };

    // Submit Book
    els.bookForm.onsubmit = (e) => {
        e.preventDefault();
        saveBook();
    };

    // JSON Download
    document.getElementById('downloadJsonBtn').onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({books: state.books}, null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", "books.json");
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    };

    document.getElementById('exitAdminBtn').onclick = () => {
        els.adminView.classList.add('hidden');
        els.publicView.classList.remove('hidden');
        renderBooks();
    };
    
    // Category change in Admin
    document.getElementById('inpCategory').onchange = (e) => {
        const sub = document.getElementById('groupSubCat');
        if(e.target.value === 'Islamic') sub.classList.remove('hidden');
        else sub.classList.add('hidden');
    };
}

// --- Admin Logic ---
function showAdminPanel() {
    els.publicView.classList.add('hidden');
    els.adminView.classList.remove('hidden');
    renderAdminList();
    addVolumeRow(true); // init one row
}

function renderAdminList() {
    const tbody = document.getElementById('adminBookList');
    tbody.innerHTML = '';
    state.books.forEach((book, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${book.coverThumb}" class="admin-thumb"></td>
            <td>${book.title}</td>
            <td>${book.category}</td>
            <td>
                <button class="btn-danger small" onclick="deleteBook(${index})">سڕینەوە</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addVolumeRow(isFirst = false) {
    const div = document.createElement('div');
    div.className = 'volume-row';
    div.innerHTML = `
        <input type="text" placeholder="ناوی بەرگ (بەرگی ١)" class="vol-label" value="${isFirst ? 'بەرگی یەک' : ''}">
        <input type="text" placeholder="ناوی فایل (books/file.pdf)" class="vol-path">
        ${!isFirst ? '<button type="button" class="btn-danger small" onclick="this.parentElement.remove()">X</button>' : ''}
    `;
    els.volumeList.appendChild(div);
}

function saveBook() {
    // Gather Data
    const title = document.getElementById('inpTitle').value;
    const author = document.getElementById('inpAuthor').value;
    const cat = document.getElementById('inpCategory').value;
    const subCat = document.getElementById('inpSubCategory').value;
    const cover = els.coverBase64.value;
    
    // Gather Volumes
    const volumes = [];
    document.querySelectorAll('.volume-row').forEach(row => {
        const label = row.querySelector('.vol-label').value;
        const path = row.querySelector('.vol-path').value;
        if(path) volumes.push({label, file: path});
    });

    if(volumes.length === 0) {
        alert('تکایە لانی کەم یەک فایلی PDF دیاری بکە (پات/Path بنووسە)');
        return;
    }

    const newBook = {
        id: Date.now().toString(),
        title, author, category: cat, subCategory: subCat,
        coverThumb: cover,
        volumes: volumes,
        createdAt: new Date().toISOString()
    };

    state.books.unshift(newBook);
    alert('کتێب زیادکرا! لەبیرت نەچێت JSON دابەزێنیت.');
    renderAdminList();
    els.bookForm.reset();
    els.volumeList.innerHTML = '';
    addVolumeRow(true);
    els.coverPreview.src = '';
}

function deleteBook(index) {
    if(confirm('دڵنیایت لە سڕینەوە؟')) {
        state.books.splice(index, 1);
        renderAdminList();
    }
}

// --- Utils ---
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
}
