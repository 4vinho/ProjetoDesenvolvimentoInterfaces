const STORAGE_KEYS = {
    products: 'sc_products',
    orders: 'sc_orders',
    profile: 'sc_profile'
};

const defaultProducts = [
    { nome: 'Café Turbo do Seu Zé', preco: 32.9, estoque: 25 },
    { nome: 'Chá Zen da Dona Rita', preco: 18.5, estoque: 40 },
    { nome: 'Filtro Ninja Anti-Poeira', preco: 8.9, estoque: 60 }
];

const defaultOrders = [
    { cliente: 'Dona Maricota da Quitanda', produto: 'Café Turbo do Seu Zé', quantidade: 2, total: 65.8 },
    { cliente: 'Seu Madruga Empreendedor', produto: 'Filtro Ninja Anti-Poeira', quantidade: 5, total: 44.5 }
];

function loadFromStorage(key, fallback) {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) return fallback;

        const parsed = JSON.parse(stored);
        if (Array.isArray(fallback)) {
            return Array.isArray(parsed) ? parsed : fallback;
        }

        if (typeof fallback === 'object' && fallback !== null) {
            return typeof parsed === 'object' && parsed !== null ? parsed : fallback;
        }

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

function refreshHome(products, orders) {
    const receita = orders.reduce((total, pedido) => total + pedido.total, 0);
    const kpiReceita = document.getElementById('kpi-receita');
    const kpiPedidos = document.getElementById('kpi-pedidos');
    const kpiProdutos = document.getElementById('kpi-produtos');

    if (kpiReceita) kpiReceita.textContent = formatCurrency(receita);
    if (kpiPedidos) kpiPedidos.textContent = orders.length;
    if (kpiProdutos) kpiProdutos.textContent = products.length;

    const recentTable = document.getElementById('recent-orders');
    if (!recentTable) return;

    recentTable.innerHTML = '';
    if (orders.length === 0) {
        recentTable.innerHTML = '<tr><td colspan="4" class="muted">Nenhum pedido registrado ainda.</td></tr>';
        return;
    }

    orders.slice(-5).reverse().forEach((pedido) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pedido.cliente}</td>
            <td>${pedido.produto}</td>
            <td>${pedido.quantidade}</td>
            <td>${formatCurrency(pedido.total)}</td>
        `;
        recentTable.appendChild(row);
    });
}

function renderProducts(products) {
    const list = document.getElementById('product-list');
    const select = document.querySelector('select[name="produto"]');
    if (list) {
        list.innerHTML = '';
        if (products.length === 0) {
            list.innerHTML = '<tr><td colspan="3" class="muted">Nenhum produto cadastrado.</td></tr>';
        } else {
            products.forEach((produto) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${produto.nome}</td>
                    <td>${formatCurrency(produto.preco)}</td>
                    <td>${produto.estoque} un</td>
                `;
                list.appendChild(row);
            });
        }
    }

    if (select) {
        select.innerHTML = '<option value="">Selecione</option>';
        products.forEach((produto) => {
            const option = document.createElement('option');
            option.value = produto.nome;
            option.textContent = `${produto.nome} (${formatCurrency(produto.preco)})`;
            option.dataset.price = produto.preco;
            select.appendChild(option);
        });
    }
}

function renderOrders(orders) {
    const list = document.getElementById('order-list');
    if (!list) return;

    list.innerHTML = '';
    if (orders.length === 0) {
        list.innerHTML = '<tr><td colspan="4" class="muted">Nenhum pedido registrado.</td></tr>';
        return;
    }

    orders.slice().reverse().forEach((pedido) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pedido.cliente}</td>
            <td>${pedido.produto}</td>
            <td>${pedido.quantidade}</td>
            <td>${formatCurrency(pedido.total)}</td>
        `;
        list.appendChild(row);
    });
}

function setupProductForm(products, onSave) {
    const form = document.getElementById('product-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const produto = {
            nome: data.get('nome').trim(),
            preco: Number(data.get('preco')),
            estoque: Number(data.get('estoque'))
        };

        const valid = Array.from(form.elements)
            .filter((el) => el.tagName === 'INPUT')
            .every((field) => validateField(field));

        if (!valid) return;

        products.push(produto);
        saveToStorage(STORAGE_KEYS.products, products);
        renderProducts(products);
        if (typeof onSave === 'function') onSave();
        form.reset();
    });

    form.querySelectorAll('input').forEach((input) => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => showFeedback(input, ''));
    });
}

function setupOrderForm(products, orders, onSave) {
    const form = document.getElementById('order-form');
    const totalLabel = document.getElementById('order-total');
    if (!form || !totalLabel) return;

    const productSelect = form.querySelector('select[name="produto"]');
    const quantityInput = form.querySelector('input[name="quantidade"]');

    function updateTotal() {
        const selected = productSelect.options[productSelect.selectedIndex];
        const price = Number(selected?.dataset.price || 0);
        const qty = Number(quantityInput.value || 0);
        const total = price * qty;
        totalLabel.textContent = `Total estimado: ${formatCurrency(total || 0)}`;
    }

    productSelect?.addEventListener('change', () => {
        validateField(productSelect);
        updateTotal();
    });

    quantityInput?.addEventListener('input', () => {
        validateField(quantityInput);
        updateTotal();
    });

    form.querySelectorAll('input, select').forEach((field) => {
        field.addEventListener('blur', () => validateField(field));
        field.addEventListener('input', () => showFeedback(field, ''));
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const valid = Array.from(form.elements)
            .filter((el) => el.tagName === 'INPUT' || el.tagName === 'SELECT')
            .every((field) => validateField(field));

        if (!valid) return;

        const data = new FormData(form);
        const produtoNome = data.get('produto');
        const produto = products.find((p) => p.nome === produtoNome);
        const quantidade = Number(data.get('quantidade'));

        if (!produto) {
            showFeedback(productSelect, 'Selecione um produto válido.');
            return;
        }

        if (quantidade > produto.estoque) {
            showFeedback(quantityInput, 'Estoque insuficiente.');
            return;
        }

        const total = quantidade * produto.preco;
        const novoPedido = {
            cliente: data.get('cliente').trim(),
            produto: produto.nome,
            quantidade,
            total
        };

        produto.estoque -= quantidade;
        saveToStorage(STORAGE_KEYS.products, products);

        orders.push(novoPedido);
        saveToStorage(STORAGE_KEYS.orders, orders);

        renderProducts(products);
        renderOrders(orders);
        updateTotal();
        if (typeof onSave === 'function') onSave();
        form.reset();
        updateTotal();
    });
}

function setupActions(products, orders) {
    const clearProducts = document.querySelector('[data-action="limpar-produtos"]');
    const clearOrders = document.querySelector('[data-action="limpar-pedidos"]');
    const refresh = document.querySelector('[data-action="atualizar-resumo"]');

    clearProducts?.addEventListener('click', () => {
        saveToStorage(STORAGE_KEYS.products, []);
        renderProducts(products.splice(0, products.length));
    });

    clearOrders?.addEventListener('click', () => {
        saveToStorage(STORAGE_KEYS.orders, []);
        renderOrders(orders.splice(0, orders.length));
        refreshHome(products, orders);
    });

    refresh?.addEventListener('click', () => refreshHome(products, orders));
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
            setAlert(loginFeedback, `Login estiloso liberado para ${email || 'você'}! Café passado e tudo certo.`);
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
            setAlert(registerFeedback, `Conta criada, ${nome || 'pessoa misteriosa'}! Pode escolher seu avental favorito.`);
            registerForm.reset();
        });
    }
}

(function init() {
    const products = loadFromStorage(STORAGE_KEYS.products, defaultProducts);
    const orders = loadFromStorage(STORAGE_KEYS.orders, defaultOrders);

    renderProducts(products);
    renderOrders(orders);
    refreshHome(products, orders);
    setupProductForm(products, () => refreshHome(products, orders));
    setupOrderForm(products, orders, () => refreshHome(products, orders));
    setupActions(products, orders);
    setupAuthForms();
})();
