// js/app.js
/* Shared helpers, UIs and cart module for ComicVerse Hub */

// simple utilities
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* --- Cart module: stores items in localStorage as {id: qty} --- */
const Cart = {
    key: 'comicverse_cart_v1',
    load() {
        try {
            const raw = localStorage.getItem(this.key);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    },
    save(cartObj) {
        localStorage.setItem(this.key, JSON.stringify(cartObj));
    },
    add(id, qty = 1) {
        const cart = this.load();
        cart[id] = (cart[id] || 0) + qty;
        this.save(cart);
        return cart;
    },
    update(id, qty) {
        const cart = this.load();
        if (qty <= 0) {
            delete cart[id];
        } else {
            cart[id] = qty;
        }
        this.save(cart);
        return cart;
    },
    remove(id) {
        const cart = this.load();
        delete cart[id];
        this.save(cart);
        return cart;
    },
    clear() {
        localStorage.removeItem(this.key);
    },
    getCount() {
        const cart = this.load();
        return Object.values(cart).reduce((s, n) => s + (+n), 0);
    }
};

/* --- Cart UI helpers used on all pages --- */
const CartUI = {
    renderCount() {
        const countEls = document.querySelectorAll('#cart-count');
        countEls.forEach(el => el.textContent = Cart.getCount());
    },
    init() {
        this.renderFull();
        // cart-count in header
        this.renderCount();
        // checkout handler
        const btn = $('#checkout-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                Cart.clear();
                alert('Thank you for your simulated order! (This is a demo.)');
                location.href = 'index.html';
            });
        }
    },
    renderFull() {
        const container = $('#cart-items');
        if (!container) return;
        container.innerHTML = '';
        const cart = Cart.load();
        if (Object.keys(cart).length === 0) {
            container.innerHTML = '<div class="card">Your cart is empty. <a href="browse.html">Browse comics</a></div>';
            $('#cart-total').textContent = '0.00';
            this.renderCount();
            return;
        }
        // build rows
        const rows = document.createElement('div');
        rows.style.display = 'grid';
        rows.style.gap = '12px';
        Object.entries(cart).forEach(([id, qty]) => {
            const comic = COMICS.find(c => c.id === id);
            if (!comic) return;
            const row = document.createElement('div');
            row.className = 'card';
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center">
          <img src="${comic.cover}" alt="${comic.title}" style="height:84px;width:64px;object-fit:cover;border-radius:8px">
          <div>
            <div style="font-weight:600">${comic.title}</div>
            <div class="small">${comic.publisher} • ${comic.releaseDate}</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <input type="number" min="0" value="${qty}" class="qty-input" data-id="${id}">
          <div style="width:90px;text-align:right">$${(comic.price * qty).toFixed(2)}</div>
          <button class="btn remove-btn" data-id="${id}">Remove</button>
        </div>
      `;
            rows.appendChild(row);
        });
        container.appendChild(rows);

        // attach handlers
        container.querySelectorAll('.qty-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const v = parseInt(e.target.value) || 0;
                Cart.update(id, v);
                this.renderFull();
                this.renderCount();
                $('#cart-total').textContent = this.calcTotal().toFixed(2);
            });
        });
        container.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                Cart.remove(e.target.dataset.id);
                this.renderFull();
                this.renderCount();
                $('#cart-total').textContent = this.calcTotal().toFixed(2);
            });
        });

        $('#cart-total').textContent = this.calcTotal().toFixed(2);
        this.renderCount();
    },
    calcTotal() {
        const cart = Cart.load();
        let total = 0;
        for (const [id, qty] of Object.entries(cart)) {
            const comic = COMICS.find(c => c.id === id);
            if (comic) total += comic.price * qty;
        }
        return total;
    }
};

/* --- Homepage UI --- */
const HomeUI = {
    init() {
        this.buildHero();
        this.populateNewReleases();
        this.populatePopular();
        this.populatePublishers();
        this.startHeroRotation();
    },
    buildHero() {
        const container = $('#hero-carousel');
        if (!container) return;
        const slides = COMICS.filter(c => c.featured).slice(0, 5);
        container.innerHTML = '';
        slides.forEach((c, i) => {
            const s = document.createElement('div');
            s.className = 'hero-slide' + (i === 0 ? ' active' : '');
            s.innerHTML = `
        <img src="${c.cover}" alt="${c.title}">
        <div class="hero-content">
          <h1>${c.title}</h1>
          <p class="small">${c.synopsis.substring(0,140)}...</p>
          <p class="small">Price: $${c.price.toFixed(2)} • ${c.publisher}</p>
          <p><a class="btn" href="comic-detail.html?id=${c.id}">View</a></p>
        </div>
      `;
            container.appendChild(s);
        });
    },
    startHeroRotation() {
        const slides = () => Array.from(document.querySelectorAll('.hero-slide'));
        let idx = 0;
        setInterval(() => {
            const s = slides();
            if (s.length === 0) return;
            s[idx].classList.remove('active');
            idx = (idx + 1) % s.length;
            s[idx].classList.add('active');
        }, 4200);
    },
    populateNewReleases() {
        const grid = $('#new-grid');
        if (!grid) return;
        const items = COMICS.slice().sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)).slice(0, 6);
        grid.innerHTML = items.map(c => HomeUI.simpleCardHtml(c)).join('');
        HomeUI.attachCardHandlers(grid);
    },
    populatePopular() {
        const grid = $('#popular-grid');
        if (!grid) return;
        const items = COMICS.filter(c => c.popular).slice(0, 8);
        grid.innerHTML = items.map(c => HomeUI.simpleCardHtml(c)).join('');
        HomeUI.attachCardHandlers(grid);
    },
    populatePublishers() {
        const grid = $('#publisher-grid');
        if (!grid) return;
        const publishers = [...new Set(COMICS.map(c => c.publisher))];
        grid.innerHTML = publishers.map(p => `
      <div class="card">
        <h3>${p}</h3>
        <p class="small">${COMICS.filter(c=>c.publisher===p).length} titles</p>
        <p><a class="btn" href="browse.html">Browse</a></p>
      </div>
    `).join('');
    },
    simpleCardHtml(c) {
        return `
    <div class="card comic-card">
      <a href="comic-detail.html?id=${c.id}"><img src="${c.cover}" alt="${c.title}"></a>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600">${c.title}</div>
          <div class="small">${c.publisher}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700">$${c.price.toFixed(2)}</div>
        </div>
      </div>
    </div>`;
    },
    attachCardHandlers(grid) {
        // buttons on each card are simple links; if you had 'add to cart' there'd be handlers
    }
};

/* --- Browse UI --- */
const BrowseUI = {
    init() {
        this.grid = $('#browse-grid');
        this.publisherFilter = $('#publisher-filter');
        this.sortBy = $('#sort-by');
        this.search = $('#search');

        this.populatePublisherOptions();
        this.renderGrid(COMICS);
        this.addListeners();
    },
    populatePublisherOptions() {
        const pubs = [...new Set(COMICS.map(c => c.publisher))];
        pubs.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            this.publisherFilter.appendChild(opt);
        });
    },
    addListeners() {
        this.publisherFilter.addEventListener('change', () => this.applyFilters());
        this.sortBy.addEventListener('change', () => this.applyFilters());
        this.search.addEventListener('input', () => this.applyFilters());
    },
    applyFilters() {
        const p = this.publisherFilter.value;
        const s = this.search.value.trim().toLowerCase();
        let list = COMICS.slice();
        if (p) list = list.filter(c => c.publisher === p);
        if (s) list = list.filter(c => (c.title + ' ' + (c.characters || []).join(' ') + ' ' + c.genre).toLowerCase().includes(s));
        // sorting
        const sort = this.sortBy.value;
        if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
        else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
        else if (sort === 'title-asc') list.sort((a, b) => a.title.localeCompare(b.title));
        else if (sort === 'release-desc') list.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
        this.renderGrid(list);
    },
    renderGrid(list) {
        if (!this.grid) return;
        this.grid.innerHTML = list.map(c => this.cardHtml(c)).join('');
    },
    cardHtml(c) {
        return `
    <div class="card comic-card">
      <a href="comic-detail.html?id=${c.id}"><img src="${c.cover}" alt="${c.title}"></a>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600">${c.title}</div>
          <div class="small">${c.publisher}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700">$${c.price.toFixed(2)}</div>
          <div class="small">${c.releaseDate}</div>
        </div>
      </div>
    </div>`;
    }
};

/* --- Detail UI --- */
const DetailUI = {
    init() {
        const id = new URLSearchParams(window.location.search).get('id');
        const section = $('#detail-section');
        if (!id || !section) {
            section.innerHTML = '<div class="card">Invalid comic. <a href="browse.html">Return to browse</a></div>';
            return;
        }
        const comic = COMICS.find(c => c.id === id);
        if (!comic) {
            section.innerHTML = '<div class="card">Comic not found.</div>';
            return;
        }
        section.innerHTML = `
      <div style="display:grid;grid-template-columns:280px 1fr;gap:20px">
        <div class="card zoom-wrap">
          <img src="${comic.cover}" alt="${comic.title}" style="width:100%;height:420px;object-fit:cover">
        </div>
        <div class="card">
          <h1 style="margin:0">${comic.title}</h1>
          <div class="small">${comic.publisher} • ${comic.releaseDate}</div>
          <p class="small" style="margin-top:12px">${comic.synopsis}</p>
          <div style="margin-top:12px">
            <div class="small"><strong>Creators</strong></div>
            <div class="small">Writer: ${comic.creators.writer} • Artist: ${comic.creators.artist} • Colorist: ${comic.creators.colorist}</div>
          </div>
          <div style="display:flex;gap:12px;align-items:center;margin-top:18px">
            <div style="font-weight:700;font-size:1.15rem">$${comic.price.toFixed(2)}</div>
            <input type="number" id="qty" min="1" value="1" class="qty-input">
            <button id="add-to-cart" class="btn">Add to Cart</button>
          </div>
        </div>
      </div>
    `;

        // add handler
        $('#add-to-cart').addEventListener('click', () => {
            const qty = Math.max(1, parseInt($('#qty').value) || 1);
            Cart.add(comic.id, qty);
            CartUI.renderCount();
            alert(`${comic.title} has been added to your cart.`);
        });
    }
};

/* Export small things to global so pages can call */
window.HomeUI = HomeUI;
window.BrowseUI = BrowseUI;
window.DetailUI = DetailUI;
window.CartUI = CartUI;