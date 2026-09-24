// ========================================
// CONEXAO COM O BANCO (LOVABLE CLOUD)
// ========================================

const SUPABASE_URL = "https://wwdrvysclsmxsldybafu.supabase.co";
const SUPABASE_KEY = "sb_publishable_9WYUQNJKGCjXwyYKpexOfg_P_NdGbKX";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

const LIMITE_LEITURA = 500;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIAS_NOVIDADE = 7;
const CHAVE_FAVORITOS = "brecho-favoritos";
const CHAVE_RESERVAS = "brecho-minhas-reservas";
const MENOS_MOVIMENTO = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ========================================
// ESTADO
// ========================================

let products = {};
let currentProduct = null;
let filtroAtual = "all";
let buscaAtual = "";
let ordemAtual = "recentes";
let soFavoritos = false;
let favoritos = lerLista(CHAVE_FAVORITOS);

// ========================================
// UTILITÁRIOS
// ========================================

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function garantirLista(valor) {
    if (Array.isArray(valor)) return valor;
    if (valor && Array.isArray(valor.data)) return valor.data;
    return [];
}

function textoOuPadrao(valor, padrao) {
    const texto = typeof valor === "string" ? valor.trim() : valor ?? "";
    return String(texto).length ? String(texto) : padrao;
}

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function lerLista(chave) {
    try {
        const valor = JSON.parse(localStorage.getItem(chave) || "[]");
        return Array.isArray(valor) ? valor.filter((v) => typeof v === "string").slice(0, 200) : [];
    } catch (_) {
        return [];
    }
}

function salvarLista(chave, lista) {
    try {
        localStorage.setItem(chave, JSON.stringify(lista.slice(0, 200)));
    } catch (_) {
        /* aparelho sem espaço ou modo privado: segue sem salvar */
    }
}

function gerarId() {
    if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function icones() {
    if (typeof lucide !== "undefined") lucide.createIcons();
}

// ========================================
// CARTÕES DE AVISO (TOAST)
// ========================================

function toast(mensagem, tipo = "sucesso", titulo) {
    let pilha = document.getElementById("toast-stack");
    if (!pilha) {
        pilha = document.createElement("div");
        pilha.id = "toast-stack";
        pilha.setAttribute("aria-live", "polite");
        document.body.appendChild(pilha);
    }

    const icone = { sucesso: "check-circle-2", erro: "alert-circle", info: "info" }[tipo] || "info";
    const tituloPadrao = { sucesso: "Tudo certo!", erro: "Ops, algo deu errado", info: "Aviso" }[tipo] || "Aviso";

    const item = document.createElement("div");
    item.className = `toast toast-${tipo}`;
    item.setAttribute("role", tipo === "erro" ? "alert" : "status");
    item.innerHTML = `
        <span class="toast-icon"><i data-lucide="${icone}"></i></span>
        <div class="toast-body">
            <strong>${escaparHTML(titulo || tituloPadrao)}</strong>
            <p>${escaparHTML(mensagem)}</p>
        </div>
        <button type="button" class="toast-close" aria-label="Fechar aviso">&times;</button>
        <span class="toast-bar"></span>
    `;
    pilha.appendChild(item);
    icones();

    const fechar = () => {
        item.classList.add("saindo");
        setTimeout(() => item.remove(), 300);
    };
    item.querySelector(".toast-close").addEventListener("click", fechar);
    setTimeout(fechar, 4500);
}

function botaoCarregando(botao, carregando, textoCarregando) {
    if (!botao) return;
    if (carregando) {
        botao.dataset.textoOriginal = botao.innerHTML;
        botao.disabled = true;
        botao.classList.add("is-loading");
        botao.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${escaparHTML(textoCarregando || "Enviando...")}`;
    } else {
        botao.disabled = false;
        botao.classList.remove("is-loading");
        if (botao.dataset.textoOriginal) botao.innerHTML = botao.dataset.textoOriginal;
    }
}

// ========================================
// EFEITOS: ONDA DE CLIQUE E ENTRADA AO ROLAR
// ========================================

function ligarOndaDeClique() {
    document.addEventListener("pointerdown", (evento) => {
        if (MENOS_MOVIMENTO) return;
        const alvo = evento.target.closest("button, .category-card, .ripple");
        if (!alvo || alvo.disabled) return;

        const caixa = alvo.getBoundingClientRect();
        const tamanho = Math.max(caixa.width, caixa.height) * 2;
        const onda = document.createElement("span");
        onda.className = "ripple-wave";
        onda.style.width = onda.style.height = `${tamanho}px`;
        onda.style.left = `${evento.clientX - caixa.left - tamanho / 2}px`;
        onda.style.top = `${evento.clientY - caixa.top - tamanho / 2}px`;

        if (getComputedStyle(alvo).position === "static") alvo.style.position = "relative";
        alvo.classList.add("ripple-host");
        alvo.appendChild(onda);
        setTimeout(() => onda.remove(), 650);
    });
}

let observadorEntrada = null;

function animarEntrada(elementos) {
    if (MENOS_MOVIMENTO || !("IntersectionObserver" in window)) return;

    if (!observadorEntrada) {
        observadorEntrada = new IntersectionObserver(
            (entradas) => {
                entradas.forEach((entrada) => {
                    if (entrada.isIntersecting) {
                        entrada.target.classList.add("revelado");
                        observadorEntrada.unobserve(entrada.target);
                    }
                });
            },
            { threshold: 0.1 }
        );
    }

    elementos.forEach((el, indice) => {
        el.classList.add("revelar");
        el.style.transitionDelay = `${Math.min(indice, 8) * 60}ms`;
        observadorEntrada.observe(el);
    });
}

// ========================================
// NAVEGAÇÃO
// ========================================

function showScreen(id) {
    const target = document.getElementById(id);
    if (!target) id = "home";

    document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
    (target || document.getElementById("home")).classList.add("active");

    document.querySelectorAll("[data-nav-screen]").forEach((button) => {
        const ativo = button.dataset.navScreen === id;
        button.classList.toggle("active", ativo);
        button.setAttribute("aria-current", ativo ? "page" : "false");
    });

    if (id === "track") preencherMinhasReservas();

    window.scrollTo({ top: 0, behavior: MENOS_MOVIMENTO ? "auto" : "smooth" });
}

function toggleMenu(button) {
    const menu = document.getElementById("mobile-menu");
    if (!menu) return;
    menu.classList.toggle("open");
    if (button) button.setAttribute("aria-expanded", menu.classList.contains("open"));
}

function closeMenu() {
    const menu = document.getElementById("mobile-menu");
    const button = document.querySelector(".mobile-toggle");
    if (menu) menu.classList.remove("open");
    if (button) button.setAttribute("aria-expanded", "false");
}

// ========================================
// CATEGORIAS E STATUS
// ========================================

function normalizarCategoria(category) {
    const c = normalizarTexto(category);
    if (["adult", "adulto", "vestuario adulto"].includes(c)) return "adult";
    if (["children", "child", "infantil", "vestuario infantil"].includes(c)) return "children";
    if (["shoes", "shoe", "calcados", "acessorios", "accessories", "calcados e acessorios"].includes(c)) return "shoes";
    return c;
}

function nomeCategoria(category) {
    return (
        { adult: "Vestuário Adulto", children: "Vestuário Infantil", shoes: "Calçados e Acessórios" }[
            normalizarCategoria(category)
        ] || "Não informado"
    );
}

function statusText(status) {
    if (status === "available") return "DISPONÍVEL";
    if (status === "reserved") return "RESERVADO";
    return "TROCADO";
}

function ehNovidade(produto) {
    const data = Date.parse(produto.createdAt || "");
    if (!data) return false;
    return Date.now() - data < DIAS_NOVIDADE * 24 * 60 * 60 * 1000;
}

// ========================================
// PRODUTOS
// ========================================

function transformarProduto(produto) {
    const item = produto && typeof produto === "object" ? produto : {};
    return {
        id: item.id ?? "",
        code: textoOuPadrao(item.codigo, ""),
        name: textoOuPadrao(item.nome, "Peça sem nome"),
        category: normalizarCategoria(textoOuPadrao(item.categoria, "adult")),
        size: textoOuPadrao(item.tamanho, "Não informado"),
        condition: textoOuPadrao(item.estado, "Não informado"),
        status: textoOuPadrao(item.status, "available"),
        description: textoOuPadrao(item.descricao, ""),
        trade: textoOuPadrao(item.troca, ""),
        image: textoOuPadrao(item.imagem, ""),
        createdAt: textoOuPadrao(item.createdAt, "")
    };
}

function mostrarEsqueletos() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 6 })
        .map(
            () => `
            <div class="skeleton-card" aria-hidden="true">
                <div class="skeleton skeleton-img"></div>
                <div class="p-5 space-y-3">
                    <div class="skeleton h-3 w-1/3"></div>
                    <div class="skeleton h-5 w-3/4"></div>
                    <div class="skeleton h-3 w-1/2"></div>
                    <div class="skeleton h-11 w-full"></div>
                </div>
            </div>`
        )
        .join("");
    grid.setAttribute("aria-busy", "true");
}

async function carregarProdutos() {
    mostrarEsqueletos();
    const grid = document.getElementById("product-grid");

    try {
        const { data, error } = await sb
            .from("produtos")
            .select("*")
            .order("createdAt", { ascending: false })
            .limit(LIMITE_LEITURA);

        if (error) throw error;

        products = {};
        garantirLista(data).forEach((bruto) => {
            const produto = transformarProduto(bruto);
            if (produto.code) products[produto.code] = produto;
        });

        atualizarContadores();
        atualizarCatalogo();
    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full rounded-2xl border border-orange-200 bg-orange-50 p-8 text-center">
                    <p class="font-bold text-slate-700">Não foi possível carregar as peças agora.</p>
                    <p class="mt-1 text-sm text-slate-600">Verifique sua conexão e tente novamente.</p>
                    <button type="button" class="mt-4 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white" onclick="carregarProdutos()">Tentar novamente</button>
                </div>`;
        }
        toast("Não conseguimos carregar o catálogo. Tente novamente.", "erro");
    } finally {
        if (grid) grid.removeAttribute("aria-busy");
    }
}

function atualizarContadores() {
    const lista = Object.values(products);
    const contagem = {
        adult: lista.filter((p) => p.category === "adult").length,
        child: lista.filter((p) => p.category === "children").length,
        accessories: lista.filter((p) => p.category === "shoes").length
    };

    Object.entries(contagem).forEach(([chave, total]) => {
        const cartao = document.querySelector(`.category-card[data-category-filter="${chave}"]`);
        if (!cartao) return;
        let selo = cartao.querySelector(".cat-count");
        if (!selo) {
            selo = document.createElement("span");
            selo.className = "cat-count";
            cartao.appendChild(selo);
        }
        selo.textContent = total === 1 ? "1 peça" : `${total} peças`;
    });
}

function produtosVisiveis() {
    const busca = normalizarTexto(buscaAtual);
    let lista = Object.values(products).filter((p) => {
        if (filtroAtual === "adult" && p.category !== "adult") return false;
        if (filtroAtual === "child" && p.category !== "children") return false;
        if (filtroAtual === "accessories" && p.category !== "shoes") return false;
        if (filtroAtual === "available" && p.status !== "available") return false;
        if (soFavoritos && !favoritos.includes(p.code)) return false;
        if (busca && !normalizarTexto(`${p.name} ${p.code}`).includes(busca)) return false;
        return true;
    });

    if (ordemAtual === "az") {
        lista.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    } else if (ordemAtual === "disponiveis") {
        lista.sort((a, b) => (a.status === "available" ? 0 : 1) - (b.status === "available" ? 0 : 1));
    } else {
        lista.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
    }

    return lista;
}

function atualizarCatalogo() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;

    const total = Object.keys(products).length;
    const lista = produtosVisiveis();
    grid.innerHTML = "";

    const resumo = document.getElementById("catalog-result-count");
    if (resumo) {
        resumo.textContent = total
            ? `${lista.length} de ${total} ${total === 1 ? "peça" : "peças"}`
            : "";
    }

    if (!total) {
        grid.innerHTML = `
            <div class="empty-state col-span-full">
                <i data-lucide="package-open"></i>
                <p class="font-bold text-slate-700">Nenhuma peça cadastrada no momento.</p>
                <p class="mt-1 text-sm text-slate-600">Volte em breve — novas peças chegam sempre.</p>
            </div>`;
        icones();
        return;
    }

    if (!lista.length) {
        const dica = soFavoritos
            ? "Toque no coração de uma peça para guardá-la aqui."
            : "Tente outra palavra, outra categoria ou toque em “Todos”.";
        grid.innerHTML = `
            <div id="catalog-empty-filter" class="empty-state col-span-full">
                <i data-lucide="${soFavoritos ? "heart" : "search-x"}"></i>
                <p class="font-bold text-slate-700">${soFavoritos ? "Você ainda não tem favoritos aqui." : "Nenhuma peça encontrada."}</p>
                <p class="mt-1 text-sm text-slate-600">${dica}</p>
            </div>`;
        icones();
        return;
    }

    const cards = lista.map(criarCardProduto);
    cards.forEach((card) => grid.appendChild(card));
    icones();
    animarEntrada(cards);
}

function criarCardProduto(produto) {
    const card = document.createElement("article");
    card.dataset.product = produto.code;
    card.dataset.category = produto.category;
    card.className = "product-card group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";

    const codigo = escaparHTML(produto.code);
    const favorito = favoritos.includes(produto.code);

    const imagem = produto.image
        ? `<img src="${escaparHTML(produto.image)}" alt="${escaparHTML(produto.name)}"
               class="product-img relative h-full w-full object-cover" loading="lazy" onerror="this.remove()">`
        : "";

    const troca = String(produto.trade || "").replace(/^(🥫|🧴)\s*/, "");

    card.innerHTML = `
        <div class="relative aspect-[4/3] overflow-hidden bg-slate-100">
            <div class="absolute inset-0 flex items-center justify-center text-center">
                <div>
                    <p class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Sem imagem</p>
                    <p class="mt-1 text-sm text-slate-500">Produto ${codigo}</p>
                </div>
            </div>
            ${imagem}
            <span id="status-${codigo}" class="status ${escaparHTML(produto.status)} absolute right-3 top-3">${statusText(produto.status)}</span>
            ${ehNovidade(produto) ? '<span class="badge-novidade absolute left-3 top-3">NOVIDADE</span>' : ""}
            <button type="button" class="fav-btn absolute bottom-3 right-3 ${favorito ? "ativo" : ""}"
                data-fav="${codigo}" aria-pressed="${favorito}" aria-label="${favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}">
                <i data-lucide="heart"></i>
            </button>
        </div>
        <div class="p-5">
            <p class="text-xs font-extrabold uppercase tracking-wider text-orange-600">Código ${codigo}</p>
            <h3 class="mt-1 text-lg font-extrabold text-slate-800">${escaparHTML(produto.name)}</h3>
            <p class="mt-2 text-sm text-slate-500">${escaparHTML(nomeCategoria(produto.category))}</p>
            <div class="mt-3 space-y-1 text-sm text-slate-600">
                <p><strong>Tamanho:</strong> ${escaparHTML(produto.size)}</p>
                <p><strong>Conservação:</strong> ${escaparHTML(produto.condition)}</p>
            </div>
            <div class="mt-4 rounded-xl bg-orange-50 p-3">
                <p class="text-xs font-extrabold uppercase tracking-wide text-orange-700">Valor da troca</p>
                <p class="mt-1 font-bold text-slate-700">${escaparHTML(troca || "A combinar")}</p>
            </div>
            <button type="button" class="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600"
                data-open-product="${codigo}">VER PRODUTO</button>
        </div>`;

    return card;
}

// ========================================
// FILTROS, BUSCA E ORDENAÇÃO
// ========================================

function filterCategory(category) {
    filtroAtual = ["adult", "child", "accessories", "available"].includes(category) ? category : "all";

    document.querySelectorAll("[data-category-filter]").forEach((botao) => {
        botao.classList.toggle("active", botao.dataset.categoryFilter === filtroAtual);
    });

    atualizarCatalogo();
    showScreen("catalog");
}

function ligarControlesDoCatalogo() {
    const busca = document.getElementById("catalog-search");
    const ordem = document.getElementById("catalog-sort");
    const favs = document.getElementById("catalog-favorites");
    let espera = null;

    if (busca) {
        busca.addEventListener("input", () => {
            clearTimeout(espera);
            espera = setTimeout(() => {
                buscaAtual = busca.value.slice(0, 80);
                atualizarCatalogo();
            }, 200);
        });
    }

    if (ordem) {
        ordem.addEventListener("change", () => {
            ordemAtual = ordem.value;
            atualizarCatalogo();
        });
    }

    if (favs) {
        favs.addEventListener("click", () => {
            soFavoritos = !soFavoritos;
            favs.classList.toggle("active", soFavoritos);
            favs.setAttribute("aria-pressed", String(soFavoritos));
            atualizarCatalogo();
        });
    }

    const grid = document.getElementById("product-grid");
    if (grid) {
        grid.addEventListener("click", (evento) => {
            const fav = evento.target.closest("[data-fav]");
            if (fav) {
                alternarFavorito(fav.dataset.fav);
                return;
            }
            const abrir = evento.target.closest("[data-open-product]");
            if (abrir) openProduct(abrir.dataset.openProduct);
        });
    }
}

// ========================================
// FAVORITOS
// ========================================

function alternarFavorito(codigo) {
    if (!products[codigo]) return;
    const jaEra = favoritos.includes(codigo);
    favoritos = jaEra ? favoritos.filter((c) => c !== codigo) : [codigo, ...favoritos];
    salvarLista(CHAVE_FAVORITOS, favoritos);

    document.querySelectorAll(`[data-fav="${CSS.escape(codigo)}"], #detail-fav[data-code="${CSS.escape(codigo)}"]`).forEach((botao) => {
        botao.classList.toggle("ativo", !jaEra);
        botao.setAttribute("aria-pressed", String(!jaEra));
        botao.classList.remove("pulsar");
        void botao.offsetWidth;
        botao.classList.add("pulsar");
    });

    atualizarContadorFavoritos();
    toast(jaEra ? "Peça removida dos favoritos." : "Peça guardada nos seus favoritos.", "info", jaEra ? "Removida" : "Favoritada ♥");

    if (soFavoritos && jaEra) atualizarCatalogo();
}

function atualizarContadorFavoritos() {
    const contador = document.getElementById("favorites-count");
    if (contador) {
        const total = favoritos.filter((c) => products[c]).length;
        contador.textContent = total ? String(total) : "";
    }
}

// ========================================
// DETALHE DO PRODUTO
// ========================================

function openProduct(code) {
    const product = products[code];
    if (!product) {
        toast("Essa peça não está mais disponível no catálogo.", "erro");
        return;
    }
    currentProduct = product;

    const definir = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    };

    const detailStatus = document.getElementById("detail-status");
    if (detailStatus) {
        detailStatus.className = `status ${product.status}`;
        detailStatus.textContent = statusText(product.status);
    }

    definir("detail-code", `CÓDIGO ${product.code}`);
    definir("detail-name", product.name);
    definir("detail-description", product.description);
    definir("detail-category", nomeCategoria(product.category));
    definir("detail-size", product.size);
    definir("detail-condition", product.condition);
    definir("detail-availability", statusText(product.status));
    definir("detail-trade", product.trade || "A combinar com a equipe");

    const image = document.getElementById("detail-image");
    if (image) {
        image.onerror = () => { image.style.display = "none"; };
        if (product.image) {
            image.src = product.image;
            image.alt = product.name;
            image.style.display = "";
        } else {
            image.removeAttribute("src");
            image.alt = "Imagem não cadastrada";
            image.style.display = "none";
        }
    }

    const fav = document.getElementById("detail-fav");
    if (fav) {
        const ativo = favoritos.includes(product.code);
        fav.dataset.code = product.code;
        fav.classList.toggle("ativo", ativo);
        fav.setAttribute("aria-pressed", String(ativo));
    }

    const button = document.getElementById("trade-button");
    if (button) {
        const disponivel = product.status === "available";
        button.disabled = !disponivel;
        button.textContent = disponivel ? "QUERO TROCAR" : product.status === "reserved" ? "PEÇA RESERVADA" : "PEÇA JÁ TROCADA";
        button.classList.toggle("opacity-50", !disponivel);
        button.classList.toggle("cursor-not-allowed", !disponivel);
    }

    showScreen("details");
}

function compartilharWhatsApp() {
    if (!currentProduct) return;
    let link = "";
    try {
        link = window.top.location.href.split("#")[0];
    } catch (_) {
        link = document.referrer || window.location.origin;
    }
    const texto = `Olha essa peça no Brechó Solidário: ${currentProduct.name} (código ${currentProduct.code}). Troca: ${currentProduct.trade || "a combinar"}. ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
}

// ========================================
// RESERVA
// ========================================

function openReservation() {
    if (!currentProduct || currentProduct.status !== "available") return;

    const valor = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v;
    };
    valor("reserve-code", currentProduct.code);
    valor("reserve-name", currentProduct.name);

    const summary = document.getElementById("reservation-product-summary");
    if (summary) summary.textContent = `Você está solicitando a reserva de: ${currentProduct.name} — Código ${currentProduct.code}`;

    const message = document.getElementById("reservation-message");
    if (message) message.textContent = "";

    showScreen("reservation");
}

async function criarReserva() {
    const tipo = document.querySelector('input[name="donation-type"]:checked')?.value || "";
    const campo = (id) => (document.getElementById(id)?.value || "").trim();

    const dados = {
        id: gerarId(),
        nomeCompleto: campo("full-name").slice(0, 120),
        contato: campo("contact").slice(0, 120),
        codigoProduto: currentProduct.code.slice(0, 20),
        nomeProduto: currentProduct.name.slice(0, 120),
        tipoDoacao: tipo.slice(0, 60),
        itemDoacao: campo("donation-item").slice(0, 300),
        quantidade: Math.min(100, Math.max(1, Number(campo("donation-quantity")) || 1)),
        status: "Pendente",
        observacoesEquipe: ""
    };

    if (!dados.nomeCompleto || !dados.contato || !dados.itemDoacao) {
        throw new Error("Preencha nome, contato e o item da doação.");
    }

    const { error } = await sb.from("reservas").insert(dados);
    if (error) {
        if (error.code === "23514") throw new Error("Alguns dados estão fora do formato aceito. Revise os campos.");
        throw new Error("Não foi possível registrar sua solicitação. Tente novamente.");
    }
    return dados;
}

function configurarReserva() {
    const form = document.getElementById("reservation-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!currentProduct) return;

        const submit = document.getElementById("reservation-submit");
        const message = document.getElementById("reservation-message");
        if (message) message.textContent = "";
        botaoCarregando(submit, true, "Registrando...");

        try {
            const reserva = await criarReserva();

            currentProduct.status = "reserved";
            const minhas = lerLista(CHAVE_RESERVAS).filter((id) => id !== reserva.id);
            salvarLista(CHAVE_RESERVAS, [reserva.id, ...minhas].slice(0, 20));

            const confirmacao = document.getElementById("confirmation-product");
            if (confirmacao) {
                confirmacao.innerHTML = `
                    <p class="font-extrabold text-slate-800">${escaparHTML(currentProduct.name)}</p>
                    <p class="mt-1 text-sm text-slate-600">Código da peça: ${escaparHTML(currentProduct.code)}</p>
                    <p class="mt-3 text-sm font-bold text-orange-700">${escaparHTML(currentProduct.trade)}</p>`;
            }

            const codigo = document.getElementById("confirmation-code");
            if (codigo) codigo.textContent = reserva.id;

            form.reset();
            atualizarCatalogo();
            showScreen("confirmation");
            soltarConfete();
            toast("Sua reserva foi registrada. Guarde o código para acompanhar.", "sucesso", "Reserva solicitada!");
        } catch (erro) {
            console.error("Erro ao criar reserva:", erro);
            if (message) {
                message.style.color = "#b23b16";
                message.textContent = erro.message;
            }
            toast(erro.message, "erro");
        } finally {
            botaoCarregando(submit, false);
        }
    });
}

function copiarCodigoReserva() {
    const codigo = document.getElementById("confirmation-code")?.textContent || "";
    if (!codigo) return;
    const ok = () => toast("Código copiado. Cole-o em “Acompanhar reserva”.", "sucesso", "Copiado!");
    if (navigator.clipboard) {
        navigator.clipboard.writeText(codigo).then(ok).catch(() => toast("Não foi possível copiar. Selecione o código e copie manualmente.", "erro"));
    } else {
        toast("Selecione o código e copie manualmente.", "info");
    }
}

function soltarConfete() {
    if (MENOS_MOVIMENTO) return;
    const cores = ["#ef6b2e", "#092a46", "#174d37", "#f4a47c", "#dce9dd"];
    const camada = document.createElement("div");
    camada.className = "confete-camada";
    for (let i = 0; i < 40; i++) {
        const peca = document.createElement("span");
        peca.className = "confete";
        peca.style.left = `${Math.random() * 100}%`;
        peca.style.background = cores[i % cores.length];
        peca.style.animationDelay = `${Math.random() * 0.4}s`;
        peca.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
        camada.appendChild(peca);
    }
    document.body.appendChild(camada);
    setTimeout(() => camada.remove(), 3200);
}

// ========================================
// ACOMPANHAR RESERVA
// ========================================

function irParaAcompanhar() {
    const codigo = document.getElementById("confirmation-code")?.textContent || "";
    const campo = document.getElementById("track-code");
    if (campo && codigo) campo.value = codigo;
    showScreen("track");
}

function preencherMinhasReservas() {
    const area = document.getElementById("track-recent");
    if (!area) return;
    const minhas = lerLista(CHAVE_RESERVAS).filter((id) => UUID_REGEX.test(id));
    if (!minhas.length) {
        area.innerHTML = "";
        return;
    }
    area.innerHTML =
        '<p class="text-sm font-bold text-slate-600">Reservas feitas neste aparelho:</p><div class="mt-2 flex flex-wrap gap-2">' +
        minhas
            .map((id) => `<button type="button" class="chip" data-track="${escaparHTML(id)}">${escaparHTML(id.slice(0, 8))}…</button>`)
            .join("") +
        "</div>";
}

const ETAPAS_RESERVA = ["Pendente", "Em análise", "Confirmada", "Vendido"];

async function consultarReserva(codigo) {
    const resultado = document.getElementById("track-result");
    const botao = document.getElementById("track-submit");
    const id = String(codigo || "").trim().toLowerCase();

    if (!UUID_REGEX.test(id)) {
        toast("O código deve ter o formato mostrado na confirmação da reserva.", "erro", "Código inválido");
        return;
    }

    botaoCarregando(botao, true, "Consultando...");
    if (resultado) resultado.innerHTML = '<div class="skeleton h-40 w-full rounded-2xl"></div>';

    try {
        const { data, error } = await sb.rpc("consultar_reserva", { _id: id });
        if (error) throw error;
        const reserva = garantirLista(data)[0];

        if (!reserva) {
            resultado.innerHTML = `<div class="empty-state"><i data-lucide="search-x"></i><p class="font-bold text-slate-700">Não encontramos uma reserva com esse código.</p><p class="mt-1 text-sm text-slate-600">Confira se copiou o código completo.</p></div>`;
            icones();
            return;
        }

        const cancelada = reserva.status === "Cancelada";
        const indice = ETAPAS_RESERVA.indexOf(reserva.status);
        const etapas = ETAPAS_RESERVA.map((etapa, i) => {
            const nomeEtapa = etapa === "Vendido" ? "Troca concluída" : etapa;
            const classe = cancelada ? "" : i < indice ? "feita" : i === indice ? "atual" : "";
            return `<li class="etapa ${classe}"><span class="etapa-ponto"></span>${escaparHTML(nomeEtapa)}</li>`;
        }).join("");

        const data_ = reserva.createdAt ? new Date(reserva.createdAt).toLocaleDateString("pt-BR") : "";

        resultado.innerHTML = `
            <div class="track-card">
                <p class="text-xs font-extrabold uppercase tracking-wider text-orange-600">Peça ${escaparHTML(reserva.codigoProduto)}</p>
                <h3 class="mt-1 text-xl font-extrabold text-slate-800">${escaparHTML(reserva.nomeProduto)}</h3>
                <p class="mt-1 text-sm text-slate-500">Solicitada em ${escaparHTML(data_)}</p>
                ${
                    cancelada
                        ? '<p class="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">Esta reserva foi cancelada. A peça pode ter voltado ao catálogo.</p>'
                        : `<ol class="etapas mt-6">${etapas}</ol>`
                }
            </div>`;
    } catch (erro) {
        console.error("Erro ao consultar reserva:", erro);
        if (resultado) resultado.innerHTML = "";
        toast("Não foi possível consultar agora. Tente novamente.", "erro");
    } finally {
        botaoCarregando(botao, false);
    }
}

function configurarAcompanhamento() {
    const form = document.getElementById("track-form");
    if (form) {
        form.addEventListener("submit", (evento) => {
            evento.preventDefault();
            consultarReserva(document.getElementById("track-code")?.value);
        });
    }
    const recentes = document.getElementById("track-recent");
    if (recentes) {
        recentes.addEventListener("click", (evento) => {
            const chip = evento.target.closest("[data-track]");
            if (!chip) return;
            const campo = document.getElementById("track-code");
            if (campo) campo.value = chip.dataset.track;
            consultarReserva(chip.dataset.track);
        });
    }
}

// ========================================
// AVALIAÇÃO (PÓS-VENDA)
// ========================================

function configurarAvaliacao() {
    const form = document.getElementById("feedback-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = document.getElementById("feedback-submit");
        const message = document.getElementById("feedback-message");
        const rating = document.querySelector('input[name="rating"]:checked');

        if (!rating) {
            toast("Escolha uma nota de 1 a 5.", "erro", "Falta a nota");
            return;
        }

        botaoCarregando(button, true, "Enviando...");
        if (message) message.textContent = "";

        try {
            const campo = (id) => (document.getElementById(id)?.value || "").trim();
            const { error } = await sb.from("avaliacoes").insert({
                nota: Math.min(5, Math.max(1, Number(rating.value))),
                facilidade: campo("ease").slice(0, 60),
                satisfacao: campo("satisfaction").slice(0, 60),
                participariaNovamente: campo("again").slice(0, 60),
                recomendaria: campo("recommend").slice(0, 60),
                sugestao: campo("suggestion").slice(0, 1000)
            });
            if (error) throw error;

            form.reset();
            if (message) {
                message.style.color = "#19723a";
                message.textContent = "OBRIGADO POR PARTICIPAR! Sua avaliação foi enviada.";
            }
            soltarConfete();
            toast("Sua opinião ajuda o brechó a melhorar.", "sucesso", "Avaliação enviada!");
        } catch (erro) {
            console.error("Erro ao enviar avaliação:", erro);
            toast("Não foi possível enviar sua avaliação. Tente novamente.", "erro");
        } finally {
            botaoCarregando(button, false);
        }
    });
}

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    icones();
    showScreen("home");
    ligarOndaDeClique();
    ligarControlesDoCatalogo();
    configurarReserva();
    configurarAvaliacao();
    configurarAcompanhamento();

    document.querySelectorAll('[data-category-filter="all"]').forEach((b) => b.classList.add("active"));

    carregarProdutos().then(atualizarContadorFavoritos);
    animarEntrada(Array.from(document.querySelectorAll("#how article, #rules li")));
});

// ========================================
// REDE DE SEGURANÇA DE TELA
// ========================================

function mostrarAvisoDeFalha() {
    if (document.getElementById("app-error-boundary")) return;

    const aviso = document.createElement("div");
    aviso.id = "app-error-boundary";
    aviso.setAttribute("role", "alert");
    aviso.style.cssText =
        "position:fixed;left:0;right:0;bottom:0;z-index:9999;margin:0 auto;" +
        "max-width:36rem;padding:1rem 1.25rem;background:#fff7ed;" +
        "border:1px solid #fdba74;border-radius:1rem 1rem 0 0;" +
        "box-shadow:0 -6px 20px rgba(15,23,42,.12);font-family:inherit;color:#334155";
    aviso.innerHTML =
        '<p style="font-weight:700;color:#0f172a;margin:0">Algo não carregou como esperado.</p>' +
        '<p style="margin:.25rem 0 .75rem;font-size:.875rem">Suas informações estão salvas. Você pode tentar novamente.</p>' +
        '<div style="display:flex;gap:.5rem;flex-wrap:wrap">' +
        '<button type="button" id="app-error-retry" style="min-height:44px;padding:.5rem 1rem;border:0;border-radius:.75rem;background:#f97316;color:#fff;font-weight:700;cursor:pointer">Tentar novamente</button>' +
        '<button type="button" id="app-error-dismiss" style="min-height:44px;padding:.5rem 1rem;border:1px solid #cbd5e1;border-radius:.75rem;background:#fff;color:#334155;cursor:pointer">Continuar mesmo assim</button>' +
        "</div>";
    document.body.appendChild(aviso);

    document.getElementById("app-error-retry").addEventListener("click", async () => {
        await carregarProdutos();
        aviso.remove();
    });
    document.getElementById("app-error-dismiss").addEventListener("click", () => aviso.remove());
}

window.addEventListener("error", (evento) => {
    console.error("Falha de renderização:", evento.error || evento.message);
    mostrarAvisoDeFalha();
});

window.addEventListener("unhandledrejection", (evento) => {
    console.error("Falha não tratada:", evento.reason);
    mostrarAvisoDeFalha();
});
