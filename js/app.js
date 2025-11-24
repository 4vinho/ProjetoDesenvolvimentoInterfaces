const STORAGE_KEYS = {
    products: 'sc_products',
    cart: 'sc_cart',
    orders: 'sc_orders',
    profile: 'sc_profile'
};

const defaultProducts = [
    { nome: 'Café Turbo do Seu Zé', preco: 32.9, descricao: 'O favorito da vizinhança, desperta até preguiça de domingo.' },
    { nome: 'Chá Zen da Dona Rita', preco: 18.5, descricao: 'Calma instantânea para reuniões longas (ou sogras).' },
    { nome: 'Filtro Ninja Anti-Poeira', preco: 8.9, descricao: 'Vai do balcão ao escritório sem espirros pelo caminho.' },
    { nome: 'Biscoito Risadinha', preco: 12.4, descricao: 'Leve, crocante e com piada pronta em cada pacote.' }
];

const defaultOrders = [
    { id: 'PED-1001', cliente: 'Dona Maricota da Quitanda', itens: 3, total: 159.5, status: 'Em rota' },
    { id: 'PED-1002', cliente: 'Seu Madruga Empreendedor', itens: 2, total: 78.9, status: 'Separando' }
];

function loadFromStorage(key, fallback) {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) return fallback;
        const parsed = JSON.parse(stored);
        return parsed ?? fallback;
    } catch (e) {
        return fallback;
    }
}

function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function showFeedback(field, message) {
    const helper = document.querySelector(`[data-feedback-for="${field.name}"]`);
    if (helper) {
        helper.textContent = message || '';
    }
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function setAlert(element, message) {
    if (!element) return;
    element.textContent = message;
    element.hidden = !message;
}

function validateField(field) {
    if (!field.value.trim()) {
        showFeedback(field, 'Preencha este campo.');
        return false;
    }
    if (field.minLength > 0 && field.value.length < field.minLength) {
        showFeedback(field, `Use pelo menos ${field.minLength} caracteres.`);
        return false;
    }
    if (field.type === 'number' && Number(field.value) < Number(field.min || 0)) {
        showFeedback(field, 'Valor abaixo do mínimo.');
        return false;
    }
    showFeedback(field, '');
    return true;
}

function getStatusClass(status) {
    const normalized = status?.toLowerCase() || '';
    if (normalized.includes('rota')) return 'status--rota';
    if (normalized.includes('pronto') || normalized.includes('entregue')) return 'status--pronta';
    return 'status--nova';
}

function refreshHome(products, orders, cart) {
    const totalGasto = orders.reduce((acc, order) => acc + (order.total ?? 0), 0);
    const totalItens = orders.reduce((acc, order) => acc + (order.itens ?? order.quantidade ?? 0), 0);

    const kpiValor = document.getElementById('kpi-valor');
    const kpiPedidos = document.getElementById('kpi-pedidos');
    const kpiItens = document.getElementById('kpi-itens');

    if (kpiValor) kpiValor.textContent = formatCurrency(totalGasto);
    if (kpiPedidos) kpiPedidos.textContent = orders.length;
    if (kpiItens) kpiItens.textContent = totalItens;

    renderFeatured(products);
    renderOrders(orders, 'recent-orders');

    const cartCounter = document.getElementById('cart-counter');
    if (cartCounter) cartCounter.textContent = `${cart.reduce((sum, item) => sum + item.quantidade, 0)} itens`;
}

function renderFeatured(products) {
    const featured = document.getElementById('featured-products');
    if (!featured) return;

    featured.innerHTML = '';
    if (products.length === 0) {
        featured.innerHTML = '<p class="muted">Nenhum produto no momento. O caminhão do Seu Zé está chegando.</p>';
        return;
    }

    products.slice(0, 3).forEach((produto) => {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-card__header">
                <strong>${produto.nome}</strong>
                <span class="pill pill--info">Destaque</span>
            </div>
            <p class="product-card__price">${formatCurrency(produto.preco)}</p>
            <p class="muted">${produto.descricao || 'Item selecionado pelo próprio Seu Zé.'}</p>
            <a class="ghost" href="catalogo.html">Adicionar ao carrinho</a>
        `;
        featured.appendChild(card);
    });
}

function renderOrders(orders, targetId = 'order-history') {
    const list = document.getElementById(targetId);
    if (!list) return;

    list.innerHTML = '';
    if (orders.length === 0) {
        const cols = targetId === 'recent-orders' ? 5 : 5;
        list.innerHTML = `<tr><td colspan="${cols}" class="muted">Nenhum pedido registrado ainda.</td></tr>`;
        return;
    }

    orders.slice().reverse().forEach((order) => {
        const itens = order.itens ?? order.quantidade ?? 0;
        const total = order.total ?? 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.cliente}</td>
            <td>${itens} itens</td>
            <td>${formatCurrency(total)}</td>
            <td><span class="status ${getStatusClass(order.status)}">${order.status}</span></td>
        `;
        list.appendChild(row);
    });
}

function renderCatalog(products) {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    grid.innerHTML = '';
    if (products.length === 0) {
        grid.innerHTML = '<p class="muted">Nenhum produto disponível no momento.</p>';
        return;
    }

    products.forEach((produto) => {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-card__header">
                <strong>${produto.nome}</strong>
                <span class="product-card__price">${formatCurrency(produto.preco)}</span>
            </div>
            <p class="muted">${produto.descricao || ''}</p>
            <button class="primary" data-action="add-cart" data-product="${produto.nome}">Colocar no carrinho</button>
        `;
        grid.appendChild(card);
    });
}

function renderCart(cart) {
    const list = document.getElementById('cart-items');
    const totalLabel = document.getElementById('cart-total');
    const counter = document.getElementById('cart-counter');
    if (!list || !totalLabel) return;

    list.innerHTML = '';
    if (cart.length === 0) {
        list.innerHTML = '<p class="muted">Carrinho vazio. Bora escolher algo gostoso?</p>';
    } else {
        cart.forEach((item) => {
            const article = document.createElement('article');
            article.className = 'cart__item';
            article.innerHTML = `
                <header>
                    <strong>${item.nome}</strong>
                    <button class="ghost" data-action="remove-item" data-product="${item.nome}">Remover</button>
                </header>
                <div class="cart__controls">
                    <button type="button" class="ghost" data-action="decrease" data-product="${item.nome}">-</button>
                    <span aria-live="polite">${item.quantidade} un</span>
                    <button type="button" class="ghost" data-action="increase" data-product="${item.nome}">+</button>
                    <span class="muted">${formatCurrency(item.preco * item.quantidade)}</span>
                </div>
            `;
            list.appendChild(article);
        });
    }

    const total = cart.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
    totalLabel.textContent = formatCurrency(total);
    if (counter) counter.textContent = `${cart.reduce((sum, item) => sum + item.quantidade, 0)} itens`;
}

function setupCatalog(products, cart, orders) {
    const grid = document.getElementById('catalog-grid');
    const cartList = document.getElementById('cart-items');
    const checkoutBtn = document.querySelector('[data-action="checkout"]');
    const feedback = document.getElementById('cart-feedback');

    function addToCart(productName) {
        const produto = products.find((p) => p.nome === productName);
        if (!produto) return;

        const existing = cart.find((item) => item.nome === productName);
        if (existing) {
            existing.quantidade += 1;
        } else {
            cart.push({ nome: produto.nome, preco: produto.preco, quantidade: 1 });
        }
        saveToStorage(STORAGE_KEYS.cart, cart);
        renderCart(cart);
        setAlert(feedback, `${produto.nome} adicionado ao carrinho!`);
    }

    grid?.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action="add-cart"]');
        if (!target) return;
        const productName = target.getAttribute('data-product');
        addToCart(productName);
    });

    cartList?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const action = button.getAttribute('data-action');
        const product = button.getAttribute('data-product');
        const item = cart.find((c) => c.nome === product);
        if (!item) return;

        if (action === 'increase') item.quantidade += 1;
        if (action === 'decrease') item.quantidade = Math.max(1, item.quantidade - 1);
        if (action === 'remove-item') cart.splice(cart.indexOf(item), 1);

        saveToStorage(STORAGE_KEYS.cart, cart);
        renderCart(cart);
    });

    checkoutBtn?.addEventListener('click', () => {
        if (cart.length === 0) {
            setAlert(feedback, 'O carrinho está vazio. Que tal escolher algo?');
            return;
        }

        const profile = loadFromStorage(STORAGE_KEYS.profile, {});
        const total = cart.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
        const itens = cart.reduce((sum, item) => sum + item.quantidade, 0);
        const novoPedido = {
            id: `PED-${Math.floor(Date.now() / 1000)}`,
            cliente: profile.nome || 'Cliente animado',
            itens,
            total,
            status: 'Aguardando confirmação'
        };

        orders.push(novoPedido);
        saveToStorage(STORAGE_KEYS.orders, orders);

        cart.splice(0, cart.length);
        saveToStorage(STORAGE_KEYS.cart, cart);
        renderCart(cart);
        renderOrders(orders, 'order-history');
        renderOrders(orders, 'recent-orders');
        refreshHome(products, orders, cart);
        setAlert(feedback, 'Pedido criado! Já estamos preparando o café.');
    });
}

function setupAuthForms() {
    const profile = loadFromStorage(STORAGE_KEYS.profile, {});
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    const loginFeedback = document.getElementById('login-feedback');
    const registerFeedback = document.getElementById('registro-feedback');

    const loginEmail = loginForm?.querySelector('input[name="email"]');
    if (loginEmail && profile.email) {
        loginEmail.value = profile.email;
    }

    if (loginForm) {
        loginForm.querySelectorAll('input').forEach((input) => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => showFeedback(input, ''));
        });

        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const valid = Array.from(loginForm.elements)
                .filter((el) => el.tagName === 'INPUT')
                .every((field) => validateField(field));

            if (!valid) return;

            const data = new FormData(loginForm);
            const email = data.get('email').trim();
            const remember = data.get('lembrar');

            saveToStorage(STORAGE_KEYS.profile, { ...profile, email, remember: Boolean(remember) });
            setAlert(loginFeedback, `Login feito! Carrinho e piadas guardados para ${email || 'você'}.`);
            loginForm.reset();
        });
    }

    if (registerForm) {
        const password = registerForm.querySelector('input[name="senha"]');
        const confirm = registerForm.querySelector('input[name="confirmar"]');

        registerForm.querySelectorAll('input').forEach((input) => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => showFeedback(input, ''));
        });

        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const valid = Array.from(registerForm.elements)
                .filter((el) => el.tagName === 'INPUT')
                .every((field) => validateField(field));

            if (!valid) return;

            if (password?.value !== confirm?.value) {
                showFeedback(confirm, 'As senhas precisam combinar.');
                return;
            }

            const data = new FormData(registerForm);
            const nome = data.get('nome').trim();
            const email = data.get('email').trim();

            saveToStorage(STORAGE_KEYS.profile, { nome, email });
            setAlert(registerFeedback, `Conta criada, ${nome || 'pessoa misteriosa'}! Bora encher o carrinho.`);
            registerForm.reset();
        });
    }
}

(function init() {
    const products = loadFromStorage(STORAGE_KEYS.products, defaultProducts);
    const cart = loadFromStorage(STORAGE_KEYS.cart, []);
    const orders = loadFromStorage(STORAGE_KEYS.orders, defaultOrders);

    renderFeatured(products);
    renderOrders(orders, 'recent-orders');
    renderOrders(orders, 'order-history');
    renderCatalog(products);
    renderCart(cart);
    refreshHome(products, orders, cart);
    setupCatalog(products, cart, orders);
    setupAuthForms();
})();
