// ========================================
// CONEXAO COM O BANCO (LOVABLE CLOUD)
// ========================================

const SUPABASE_URL = "https://wwdrvysclsmxsldybafu.supabase.co";
const SUPABASE_KEY = "sb_publishable_9WYUQNJKGCjXwyYKpexOfg_P_NdGbKX";

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    { auth: { persistSession: true, autoRefreshToken: true } }
);

function comId(registro) {
    return registro
        ? Object.assign({}, registro, { _id: registro.id })
        : registro;
}

function respostaApi(ok, corpo, status) {
    return {
        ok: ok,
        status: status || (ok ? 200 : 400),
        json: async () => corpo
    };
}

const TABELAS_PERMITIDAS = ["produtos", "reservas", "avaliacoes"];
const LIMITE_LEITURA = 500;
const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Limpa e limita o que o visitante digita antes de enviar ao banco
function limparEnvio(corpo) {
    if (!corpo || typeof corpo !== "object") return corpo;

    const limpo = {};

    Object.keys(corpo).forEach((chave) => {
        const valor = corpo[chave];

        if (typeof valor === "string") {
            limpo[chave] = valor.trim().slice(0, 1000);
        } else if (typeof valor === "number") {
            limpo[chave] = Number.isFinite(valor) ? valor : 0;
        } else {
            limpo[chave] = valor;
        }
    });

    return limpo;
}

async function apiBrecho(caminho, opcoes) {
    opcoes = opcoes || {};

    const metodo = (opcoes.method || "GET").toUpperCase();
    const partes = String(caminho).split("/").filter(Boolean);
    const tabela = partes[0];
    const id = partes[1];
    const corpo = opcoes.body ? limparEnvio(JSON.parse(opcoes.body)) : null;

    if (!TABELAS_PERMITIDAS.includes(tabela)) {
        return respostaApi(false, { erro: "Operação não permitida." });
    }

    if (id !== undefined && !UUID_REGEX.test(String(id))) {
        return respostaApi(false, { erro: "Registro inválido." });
    }

    try {
        if (metodo === "GET") {
            const { data, error } = await sb
                .from(tabela)
                .select("*")
                .order("createdAt", { ascending: false })
                .limit(LIMITE_LEITURA);

            if (error) throw error;

            return respostaApi(true, (data || []).map(comId));
        }

        if (metodo === "POST") {
            if (tabela === "reservas") {
                const { error } = await sb.from(tabela).insert(corpo);

                if (error) throw error;

                return respostaApi(true, comId(Object.assign({ id: "" }, corpo)));
            }

            const { data, error } = await sb
                .from(tabela)
                .insert(corpo)
                .select()
                .single();

            if (error) throw error;

            return respostaApi(true, comId(data));
        }

        if (metodo === "PUT" || metodo === "PATCH") {
            const { data, error } = await sb
                .from(tabela)
                .update(corpo)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;

            return respostaApi(true, comId(data));
        }

        if (metodo === "DELETE") {
            const { error } = await sb.from(tabela).delete().eq("id", id);

            if (error) throw error;

            return respostaApi(true, {});
        }

        return respostaApi(false, { erro: "Operação não suportada." });
    } catch (erro) {
        console.error("Erro no banco:", erro);

        let mensagem = erro?.message || "Erro ao acessar os dados.";

        if (String(erro?.code) === "23505") {
            mensagem = "Já existe um produto com esse código.";
        }

        if (String(mensagem).toLowerCase().includes("row-level security")) {
            mensagem = "Você precisa estar logado como equipe para fazer isso.";
        }

        return respostaApi(false, { erro: mensagem });
    }
}

async function verificarAdmin() {
    const { data: sessao } = await sb.auth.getSession();

    if (!sessao || !sessao.session) {
        admUnlocked = false;
        return false;
    }

    const { data, error } = await sb
        .from("user_roles")
        .select("role")
        .eq("role", "admin")
        .limit(1);

    admUnlocked = !error && Array.isArray(data) && data.length > 0;

    return admUnlocked;
}
// ========================================
// ESTADO DO SITE
// ========================================

let products = {};
let currentProduct = null;
let reservas = [];
let avaliacoes = [];

let admUnlocked = false;

// ========================================
// IMAGENS DOS PRODUTOS EXISTENTES
// ========================================

const productImages = {
    "001": "https://images.pexels.com/photos/4440566/pexels-photo-4440566.jpeg",
    "002": "https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=800",
    "003": "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800",
    "004": "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800",
    "005": "https://images.pexels.com/photos/15625985/pexels-photo-15625985.jpeg",
    "006": "https://images.pexels.com/photos/27204291/pexels-photo-27204291.jpeg"
};

// ========================================
// NAVEGAÇÃO
// ========================================

function showScreen(id) {
    if ((id === "management" || id === "sales") && !admUnlocked) {
        id = "adm";
    }

    document.querySelectorAll(".screen").forEach((screen) => {
        screen.classList.remove("active");
    });

    const target = document.getElementById(id);

    if (target) {
        target.classList.add("active");
    }

    document.querySelectorAll("[data-nav-screen]").forEach((button) => {
        const isActive = button.dataset.navScreen === id;

        button.classList.toggle("active", isActive);

        button.setAttribute(
            "aria-current",
            isActive ? "page" : "false"
        );
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function toggleMenu(button) {
    const menu = document.getElementById("mobile-menu");

    if (!menu) return;

    menu.classList.toggle("open");

    if (button) {
        button.setAttribute(
            "aria-expanded",
            menu.classList.contains("open")
        );
    }
}

function closeMenu() {
    const menu = document.getElementById("mobile-menu");
    const button = document.querySelector(".mobile-toggle");

    if (menu) {
        menu.classList.remove("open");
    }

    if (button) {
        button.setAttribute("aria-expanded", "false");
    }
}

// ========================================
// PRODUTOS
// ========================================

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function transformarProduto(produto) {
    return {
        id: produto._id,
        code: produto.codigo,
        name: produto.nome,
        category: produto.categoria,
        size: produto.tamanho,
        condition: produto.estado,
        status: produto.status,
        description: produto.descricao,
        trade: produto.troca,
        image: (produto.imagem || productImages[produto.codigo]) || ""
    };
}

async function carregarProdutos() {
    try {
        const resposta = await apiBrecho(`/produtos`);

        if (!resposta.ok) {
            throw new Error("Erro ao buscar produtos.");
        }

        const dados = await resposta.json();

        products = {};

        dados.forEach((produto) => {
            const produtoFormatado = transformarProduto(produto);
            products[produtoFormatado.code] = produtoFormatado;
        });

        atualizarCatalogo();

        Object.keys(products).forEach(updateStatus);

        renderAdminProducts();

        console.log("Produtos carregados:", products);
    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);

        const grid = document.getElementById("product-grid");

        if (grid && !Object.keys(products).length) {
            grid.innerHTML = `
                <div class="col-span-full rounded-2xl border border-orange-200 bg-orange-50 p-8 text-center">
                    <p class="font-bold text-slate-700">
                        Não foi possível carregar os produtos agora.
                    </p>

                    <p class="mt-1 text-sm text-slate-600">
                        Verifique sua conexão e tente novamente em instantes.
                    </p>
                </div>
            `;
        }
    }
}

// ========================================
// NORMALIZAÇÃO DE CATEGORIAS
// ========================================

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function categoriaProdutoAdmin(category) {
    const categoria = normalizarTexto(category);

    const categorias = {
        adult: "Vestuário Adulto",
        adulto: "Vestuário Adulto",
        "vestuario adulto": "Vestuário Adulto",

        children: "Vestuário Infantil",
        child: "Vestuário Infantil",
        infantil: "Vestuário Infantil",
        "vestuario infantil": "Vestuário Infantil",

        shoes: "Calçados e Acessórios",
        calcados: "Calçados e Acessórios",
        acessorios: "Calçados e Acessórios",
        "calcados e acessorios": "Calçados e Acessórios"
    };

    return categorias[categoria] || category || "Não informado";
}

// ========================================
// CONVERTER CATEGORIA PARA UM PADRÃO
// ========================================

function normalizarCategoria(category) {
    const categoria = normalizarTexto(category);

    if (
        categoria === "adult" ||
        categoria === "adulto" ||
        categoria === "vestuario adulto"
    ) {
        return "adult";
    }

    if (
        categoria === "children" ||
        categoria === "child" ||
        categoria === "infantil" ||
        categoria === "vestuario infantil"
    ) {
        return "children";
    }

    if (
        categoria === "shoes" ||
        categoria === "shoe" ||
        categoria === "calcados" ||
        categoria === "calcado" ||
        categoria === "acessorios" ||
        categoria === "acessorio" ||
        categoria === "calcados e acessorios" ||
        categoria === "shoes accessories" ||
        categoria === "shoes-accessories" ||
        categoria === "accessories"
    ) {
        return "shoes";
    }

    return categoria;
}

// ========================================
// CATÁLOGO DINÂMICO
// ========================================

function atualizarCatalogo() {
    const grid = document.getElementById("product-grid");

    if (!grid) {
        console.warn("Elemento #product-grid não encontrado.");
        return;
    }

    grid.innerHTML = "";

    const produtos = Object.values(products);

    if (!produtos.length) {
        grid.innerHTML = `
            <div class="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p class="font-bold text-slate-700">
                    Nenhum produto disponível no momento.
                </p>
            </div>
        `;

        return;
    }

    produtos.forEach((produto) => {
        const card = criarCardProduto(produto);
        grid.appendChild(card);
    });

    const filtroAtivo = document.querySelector(
        "[data-category-filter].active"
    );

    if (filtroAtivo) {
        filterCategory(filtroAtivo.dataset.categoryFilter);
    }
}

function criarCardProduto(produto) {
    const card = document.createElement("article");

    card.dataset.product = produto.code;
    card.dataset.category = normalizarCategoria(produto.category);

    card.className =
        "group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg";

    const semImagemHTML = `
        <div class="text-center">
            <p class="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Sem imagem
            </p>

            <p class="mt-1 text-sm text-slate-500">
                Produto ${escaparHTML(produto.code)}
            </p>
        </div>
    `;

    const imagemHTML = produto.image
        ? `
            <div class="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <div class="absolute inset-0 flex items-center justify-center">
                    ${semImagemHTML}
                </div>

                <img
                    src="${escaparHTML(produto.image)}"
                    alt="${escaparHTML(produto.name)}"
                    class="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onerror="this.remove()"
                >

                <span
                    id="status-${escaparHTML(produto.code)}"
                    class="status ${escaparHTML(produto.status)} absolute right-3 top-3"
                >
                    ${statusText(produto.status)}
                </span>
            </div>
        `
        : `
            <div class="relative flex aspect-[4/3] items-center justify-center bg-slate-100">
                ${semImagemHTML}

                <span
                    id="status-${escaparHTML(produto.code)}"
                    class="status ${escaparHTML(produto.status)} absolute right-3 top-3"
                >
                    ${statusText(produto.status)}
                </span>
            </div>
        `;

    const troca = String(produto.trade || "")
        .replace(/^🥫\s*/, "")
        .replace(/^🧴\s*/, "");

    card.innerHTML = `
        ${imagemHTML}

        <div class="p-5">
            <p class="text-xs font-extrabold uppercase tracking-wider text-orange-600">
                Código ${escaparHTML(produto.code)}
            </p>

            <h3 class="mt-1 text-lg font-extrabold text-slate-800">
                ${escaparHTML(produto.name)}
            </h3>

            <p class="mt-2 text-sm text-slate-500">
                ${escaparHTML(categoriaProdutoAdmin(produto.category))}
            </p>

            <div class="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                    <strong>Tamanho:</strong>
                    ${escaparHTML(produto.size)}
                </p>

                <p>
                    <strong>Conservação:</strong>
                    ${escaparHTML(produto.condition)}
                </p>
            </div>

            <div class="mt-4 rounded-xl bg-orange-50 p-3">
                <p class="text-xs font-extrabold uppercase tracking-wide text-orange-700">
                    Valor da troca
                </p>

                <p class="mt-1 font-bold text-slate-700">
                    ${escaparHTML(troca)}
                </p>
            </div>

            <button
                type="button"
                class="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                onclick="openProduct('${escaparHTML(produto.code)}')"
            >
                VER PRODUTO
            </button>
        </div>
    `;

    return card;
}

// ========================================
// FILTRO DO CATÁLOGO
// ========================================

function filterCategory(category) {
    const filtro = normalizarTexto(category);

    console.log("Filtro selecionado:", category);
    console.log("Filtro normalizado:", filtro);

    document.querySelectorAll("[data-product]").forEach((card) => {
        const product = products[card.dataset.product];

        if (!product) {
            card.classList.add("hidden-by-filter");
            return;
        }

        const categoriaProduto = normalizarCategoria(
            product.category
        );

        let mostrar = false;

        if (
            filtro === "" ||
            filtro === "all" ||
            filtro === "todos" ||
            filtro === "todas" ||
            filtro === "*"
        ) {
            mostrar = true;
        } else if (
            filtro === "adult" ||
            filtro === "adulto" ||
            filtro === "vestuario adulto"
        ) {
            mostrar = categoriaProduto === "adult";
        } else if (
            filtro === "children" ||
            filtro === "child" ||
            filtro === "infantil" ||
            filtro === "vestuario infantil"
        ) {
            mostrar = categoriaProduto === "children";
        } else if (
            filtro === "shoes" ||
            filtro === "shoe" ||
            filtro === "calcados" ||
            filtro === "calcado" ||
            filtro === "acessorios" ||
            filtro === "acessorio" ||
            filtro === "calcados e acessorios" ||
            filtro === "shoes accessories" ||
            filtro === "shoes-accessories" ||
            filtro === "accessories"
        ) {
            mostrar = categoriaProduto === "shoes";
        } else if (
            filtro === "available" ||
            filtro === "disponivel"
        ) {
            mostrar = product.status === "available";
        } else {
            mostrar =
                categoriaProduto === normalizarCategoria(filtro);
        }

        card.classList.toggle(
            "hidden-by-filter",
            !mostrar
        );
    });

    document.querySelectorAll(
        "[data-category-filter]"
    ).forEach((button) => {
        const valorBotao = normalizarTexto(
            button.dataset.categoryFilter
        );

        const ativo =
            valorBotao === filtro ||
            (
                (filtro === "all" || filtro === "todos") &&
                (valorBotao === "all" || valorBotao === "todos")
            );

        button.classList.toggle("active", ativo);
    });

    showScreen("catalog");
}

// ========================================
// STATUS
// ========================================

function statusText(status) {
    if (status === "available") {
        return "DISPONÍVEL";
    }

    if (status === "reserved") {
        return "RESERVADO";
    }

    return "TROCADO";
}

function updateStatus(code) {
    const product = products[code];

    if (!product) return;

    const status = document.getElementById(
        `status-${code}`
    );

    if (status) {
        status.className = `status ${product.status}`;
        status.textContent = statusText(product.status);
    }
}

// ========================================
// PRODUTO DETALHADO
// ========================================

function openProduct(code) {
    const product = products[code];

    if (!product) {
        console.warn("Produto não encontrado:", code);
        return;
    }

    currentProduct = product;

    const detailStatus =
        document.getElementById("detail-status");

    if (detailStatus) {
        detailStatus.className =
            `status ${product.status}`;

        detailStatus.textContent =
            statusText(product.status);
    }

    const detailCode =
        document.getElementById("detail-code");

    if (detailCode) {
        detailCode.textContent =
            `CÓDIGO ${product.code}`;
    }

    const detailName =
        document.getElementById("detail-name");

    if (detailName) {
        detailName.textContent =
            product.name;
    }

    const detailDescription =
        document.getElementById("detail-description");

    if (detailDescription) {
        detailDescription.textContent =
            product.description;
    }

    const detailCategory =
        document.getElementById("detail-category");

    if (detailCategory) {
        detailCategory.textContent =
            categoriaProdutoAdmin(product.category);
    }

    const detailSize =
        document.getElementById("detail-size");

    if (detailSize) {
        detailSize.textContent =
            product.size;
    }

    const detailCondition =
        document.getElementById("detail-condition");

    if (detailCondition) {
        detailCondition.textContent =
            product.condition;
    }

    const detailAvailability =
        document.getElementById("detail-availability");

    if (detailAvailability) {
        detailAvailability.textContent =
            statusText(product.status);
    }

    const detailTrade =
        document.getElementById("detail-trade");

    if (detailTrade) {
        detailTrade.textContent =
            product.trade;
    }

    const image =
        document.getElementById("detail-image");

    if (image) {
        image.onerror = () => {
            image.style.display = "none";
        };

        if (product.image) {
            image.src = product.image;
            image.alt = product.name || "Imagem do produto";
            image.style.display = "";
        } else {
            image.removeAttribute("src");
            image.alt = "Imagem não cadastrada";
            image.style.display = "none";
        }
    }

    const button =
        document.getElementById("trade-button");

    if (button) {
        button.disabled =
            product.status !== "available";

        if (product.status === "available") {
            button.textContent =
                "QUERO TROCAR";
        } else if (product.status === "reserved") {
            button.textContent =
                "PEÇA RESERVADA";
        } else {
            button.textContent =
                "PEÇA JÁ TROCADA";
        }

        button.classList.toggle(
            "opacity-50",
            product.status !== "available"
        );

        button.classList.toggle(
            "cursor-not-allowed",
            product.status !== "available"
        );
    }

    showScreen("details");
}

// ========================================
// RESERVA
// ========================================

function openReservation() {
    if (!currentProduct) return;

    if (currentProduct.status !== "available") {
        return;
    }

    const reserveCode =
        document.getElementById("reserve-code");

    const reserveName =
        document.getElementById("reserve-name");

    const summary =
        document.getElementById(
            "reservation-product-summary"
        );

    const message =
        document.getElementById(
            "reservation-message"
        );

    if (reserveCode) {
        reserveCode.value =
            currentProduct.code;
    }

    if (reserveName) {
        reserveName.value =
            currentProduct.name;
    }

    if (summary) {
        summary.textContent =
            `Você está solicitando a reserva de: ${currentProduct.name} — Código ${currentProduct.code}`;
    }

    if (message) {
        message.textContent = "";
    }

    showScreen("reservation");
}

// ========================================
// RESERVAS
// ========================================

async function carregarReservas() {
    if (!admUnlocked) {
        reservas = [];
        return;
    }

    try {
        const resposta =
            await apiBrecho(`/reservas`);

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar reservas."
            );
        }

        reservas =
            await resposta.json();

        aplicarStatusDasReservas();
        renderReservations();

        console.log(
            "Reservas carregadas:",
            reservas
        );
    } catch (erro) {
        console.error(
            "Erro ao carregar reservas:",
            erro
        );
    }
}

function aplicarStatusDasReservas() {
    reservas.forEach((reserva) => {
        const produto =
            products[reserva.codigoProduto];

        if (!produto) return;

        if (
            reserva.status === "Pendente" ||
            reserva.status === "Em análise" ||
            reserva.status === "Confirmada"
        ) {
            produto.status = "reserved";
        }

        if (reserva.status === "Vendido") {
            produto.status = "exchanged";
        }

        updateStatus(produto.code);
    });
}

async function criarReserva() {
    if (!currentProduct) {
        return {
            ok: false
        };
    }

    const donationType =
        document.querySelector(
            'input[name="donation-type"]:checked'
        )?.value;

    const dados = {
        nomeCompleto:
            document.getElementById(
                "full-name"
            )?.value.trim() || "",

        contato:
            document.getElementById(
                "contact"
            )?.value.trim() || "",

        codigoProduto:
            currentProduct.code,

        nomeProduto:
            currentProduct.name,

        tipoDoacao:
            donationType || "",

        itemDoacao:
            document.getElementById(
                "donation-item"
            )?.value.trim() || "",

        quantidade:
            Number(
                document.getElementById(
                    "donation-quantity"
                )?.value || 0
            ),

        status: "Pendente",

        observacoesEquipe: ""
    };

    const resposta =
        await apiBrecho(`/reservas`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(dados)
            }
        );

    if (!resposta.ok) {
        const erro =
            await resposta
                .json()
                .catch(() => ({}));

        throw new Error(
            erro.erro ||
            erro.mensagem ||
            "Erro ao criar reserva."
        );
    }

    return await resposta.json();
}

// ========================================
// AVALIAÇÕES
// ========================================

async function carregarAvaliacoes() {
    try {
        const resposta =
            await apiBrecho(`/avaliacoes`
            );

        if (!resposta.ok) {
            throw new Error(
                "Erro ao buscar avaliações."
            );
        }

        avaliacoes =
            await resposta.json();

        renderFeedback();

        console.log(
            "Avaliações carregadas:",
            avaliacoes
        );
    } catch (erro) {
        console.error(
            "Erro ao carregar avaliações:",
            erro
        );
    }
}

// ========================================
// FEEDBACK
// ========================================

function renderFeedback() {
    const list =
        document.getElementById(
            "feedback-list"
        );

    if (!list) return;

    if (!avaliacoes.length) {
        list.innerHTML =
            `
            <div class="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma avaliação recebida ainda.
            </div>
            `;

        return;
    }

    list.innerHTML =
        avaliacoes
            .map((avaliacao) => {
                const nota =
                    Number(
                        avaliacao.nota
                    ) || 0;

                const stars =
                    "★".repeat(nota) +
                    "☆".repeat(
                        Math.max(
                            0,
                            5 - nota
                        )
                    );

                const data =
                    avaliacao.createdAt
                        ? new Date(
                            avaliacao.createdAt
                        ).toLocaleDateString(
                            "pt-BR"
                        )
                        : "Data não informada";

                return `
                    <article class="rounded-2xl border border-slate-200 bg-white p-5">

                        <div class="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p class="font-extrabold text-slate-800">
                                    Avaliação do atendimento
                                </p>

                                <p class="mt-1 text-sm text-slate-500">
                                    ${data}
                                </p>
                            </div>

                            <span
                                class="font-bold tracking-wide text-orange-600"
                                aria-label="${nota} de 5 estrelas"
                            >
                                ${stars}
                            </span>
                        </div>

                        <dl class="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">

                            <div>
                                <dt class="font-bold">
                                    Facilidade
                                </dt>

                                <dd>
                                    ${avaliacao.facilidade || "Não informado"}
                                </dd>
                            </div>

                            <div>
                                <dt class="font-bold">
                                    Satisfação
                                </dt>

                                <dd>
                                    ${avaliacao.satisfacao || "Não informado"}
                                </dd>
                            </div>

                            <div>
                                <dt class="font-bold">
                                    Participaria novamente?
                                </dt>

                                <dd>
                                    ${avaliacao.participariaNovamente || "Não informado"}
                                </dd>
                            </div>

                            <div>
                                <dt class="font-bold">
                                    Recomendaria?
                                </dt>

                                <dd>
                                    ${avaliacao.recomendaria || "Não informado"}
                                </dd>
                            </div>

                        </dl>

                        <p class="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-slate-700">
                            <strong>Sugestão:</strong>
                            ${avaliacao.sugestao || "Nenhuma sugestão registrada."}
                        </p>

                    </article>
                `;
            })
            .join("");
}

// ========================================
// RENDERIZAÇÃO DAS RESERVAS
// ========================================

function renderReservations() {
    const list =
        document.getElementById(
            "reservation-list"
        );

    if (!list) return;

    if (!reservas.length) {
        list.innerHTML =
            `
            <div class="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma solicitação de reserva registrada.
            </div>
            `;

        return;
    }

    list.innerHTML =
        reservas
            .map((reserva) => {
                const status =
                    reserva.status ||
                    "Pendente";

                let statusClass =
                    "reserved";

                if (status === "Confirmada") {
                    statusClass =
                        "available";
                }

                if (status === "Vendido") {
                    statusClass =
                        "exchanged";
                }

                return `
                    <article class="rounded-2xl border border-slate-200 p-4">

                        <div class="flex flex-wrap items-start justify-between gap-3">

                            <div>
                                <p class="font-extrabold text-slate-800">
                                    ${reserva.nomeProduto || "Produto"}
                                    · Código ${reserva.codigoProduto || "-"}
                                </p>

                                <p class="mt-1 text-sm text-slate-600">
                                    Cliente:
                                    ${reserva.nomeCompleto || "Não informado"}
                                    · Contato:
                                    ${reserva.contato || "Não informado"}
                                </p>

                                <p class="mt-1 text-sm text-slate-600">
                                    Troca:
                                    ${reserva.itemDoacao || reserva.tipoDoacao || "Não informado"}
                                    · Quantidade:
                                    ${reserva.quantidade || 0}
                                </p>
                            </div>

                            <span class="status ${statusClass}">
                                ${status.toUpperCase()}
                            </span>

                        </div>

                        <div class="mt-4 flex flex-wrap gap-2">

                            <button
                                type="button"
                                class="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white"
                                onclick="updateReservation('${reserva._id}', 'Confirmada')"
                            >
                                Confirmar pedido
                            </button>

                            <button
                                type="button"
                                class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
                                onclick="updateReservation('${reserva._id}', 'Em análise')"
                            >
                                Marcar em análise
                            </button>

                            <button
                                type="button"
                                class="rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold text-white"
                                onclick="updateReservation('${reserva._id}', 'Vendido')"
                            >
                                Marcar como trocado
                            </button>

                            <button
                                type="button"
                                class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                                onclick="excluirReserva('${reserva._id}')"
                            >
                                Excluir
                            </button>

                        </div>

                    </article>
                `;
            })
            .join("");
}

// ========================================
// ATUALIZAR RESERVA
// ========================================

async function updateReservation(id, status) {
    const reserva =
        reservas.find(
            (item) => item._id === id
        );

    if (!reserva) return;

    const message =
        document.getElementById(
            "management-message"
        );

    if (message) {
        message.style.color = "";
        message.textContent =
            "Atualizando pedido...";
    }

    try {
        let observacoes =
            reserva.observacoesEquipe ||
            "";

        if (status === "Em análise") {
            observacoes =
                "Reserva recebida e aguardando análise da equipe.";
        }

        if (status === "Confirmada") {
            observacoes =
                "Reserva aprovada pela equipe.";
        }

        if (status === "Vendido") {
            observacoes =
                "Troca concluída.";
        }

        const resposta =
            await apiBrecho(`/reservas/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            status,
                            observacoesEquipe:
                                observacoes
                        })
                }
            );

        if (!resposta.ok) {
            const erro =
                await resposta
                    .json()
                    .catch(() => ({}));

            throw new Error(
                erro.erro ||
                erro.mensagem ||
                "Erro ao atualizar reserva."
            );
        }

        const atualizada =
            await resposta.json();

        const indice =
            reservas.findIndex(
                (item) =>
                    item._id === id
            );

        if (indice !== -1) {
            reservas[indice] =
                atualizada;
        }

        const produto =
            products[
                atualizada.codigoProduto
            ];

        if (produto) {
            if (status === "Vendido") {
                produto.status =
                    "exchanged";
            } else {
                produto.status =
                    "reserved";
            }

            updateStatus(
                produto.code
            );
        }

        renderReservations();
        renderAdminProducts();

        if (message) {
            message.style.color =
                "#19723a";

            message.textContent =
                "Pedido atualizado com sucesso.";
        }
    } catch (erro) {
        console.error(
            "Erro ao atualizar reserva:",
            erro
        );

        if (message) {
            message.style.color =
                "#b23b16";

            message.textContent =
                "Não foi possível atualizar este pedido.";
        }
    }
}

// ========================================
// EXCLUIR PEDIDO / RESERVA
// ========================================

async function excluirReserva(id) {
    const reserva =
        reservas.find(
            (item) => item._id === id
        );

    if (!reserva) return;

    const confirmar =
        window.confirm(
            `Deseja realmente excluir o pedido de "${reserva.nomeCompleto || "cliente"}"?`
        );

    if (!confirmar) return;

    const message =
        document.getElementById(
            "management-message"
        );

    if (message) {
        message.style.color = "";
        message.textContent =
            "Excluindo pedido...";
    }

    try {
        const resposta =
            await apiBrecho(`/reservas/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!resposta.ok) {
            const erro =
                await resposta
                    .json()
                    .catch(() => ({}));

            throw new Error(
                erro.erro ||
                erro.mensagem ||
                "Erro ao excluir pedido."
            );
        }

        reservas =
            reservas.filter(
                (item) => item._id !== id
            );

        renderReservations();

        if (message) {
            message.style.color =
                "#19723a";

            message.textContent =
                "Pedido excluído com sucesso.";
        }
    } catch (erro) {
        console.error(
            "Erro ao excluir pedido:",
            erro
        );

        if (message) {
            message.style.color =
                "#b23b16";

            message.textContent =
                "Não foi possível excluir o pedido.";
        }
    }
}

// ========================================
// PRODUTOS - ADMIN
// ========================================

function statusProdutoAdmin(status) {
    if (status === "available") {
        return {
            texto: "DISPONÍVEL",
            classe: "available"
        };
    }

    if (status === "reserved") {
        return {
            texto: "RESERVADO",
            classe: "reserved"
        };
    }

    return {
        texto: "TROCADO",
        classe: "exchanged"
    };
}

function renderAdminProducts() {
    const list =
        document.getElementById(
            "admin-product-list"
        );

    if (!list) return;

    const produtos =
        Object.values(products);

    if (!produtos.length) {
        list.innerHTML =
            `
            <div class="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Nenhum produto cadastrado.
            </div>
            `;

        return;
    }

    list.innerHTML =
        produtos
            .map((produto) => {
                const status =
                    statusProdutoAdmin(
                        produto.status
                    );

                return `
                    <article
                        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >

                        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                            <div class="flex gap-4">

                                ${
                                    produto.image
                                        ? `
                                            <img
                                                src="${escaparHTML(produto.image)}"
                                                alt="${escaparHTML(produto.name)}"
                                                class="h-24 w-24 rounded-xl bg-slate-100 object-cover"
                                                loading="lazy"
                                                onerror="this.remove()"
                                            >
                                        `
                                        : `
                                            <div class="flex h-24 w-24 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                                                SEM IMAGEM
                                            </div>
                                        `
                                }

                                <div>

                                    <p class="text-xs font-extrabold tracking-wider text-orange-600">
                                        CÓDIGO ${produto.code}
                                    </p>

                                    <h4 class="mt-1 text-lg font-extrabold text-slate-800">
                                        ${produto.name}
                                    </h4>

                                    <p class="mt-1 text-sm text-slate-500">
                                        ${categoriaProdutoAdmin(produto.category)}
                                    </p>

                                    <p class="mt-1 text-sm text-slate-500">
                                        Tamanho: ${produto.size}
                                        · ${produto.condition}
                                    </p>

                                </div>

                            </div>

                            <span class="status ${status.classe}">
                                ${status.texto}
                            </span>

                        </div>

                        <div class="mt-4 rounded-xl bg-orange-50 p-3">

                            <p class="text-xs font-extrabold uppercase tracking-wide text-orange-700">
                                Valor da troca
                            </p>

                            <p class="mt-1 font-bold text-slate-700">
                                ${produto.trade}
                            </p>

                        </div>

                        <p class="mt-3 text-sm text-slate-600">
                            ${produto.description}
                        </p>

                        <div class="mt-5 flex flex-wrap gap-2">

                            <button
                                type="button"
                                class="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white"
                                onclick="editarProduto('${produto.id}')"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700"
                                onclick="excluirProduto('${produto.id}')"
                            >
                                Excluir
                            </button>

                            <button
                                type="button"
                                class="rounded-lg border border-orange-300 px-4 py-2 text-sm font-bold text-orange-700"
                                onclick="alternarStatusProduto('${produto.id}')"
                            >
                                Alterar status
                            </button>

                        </div>

                    </article>
                `;
            })
            .join("");
}

// ========================================
// FORMULÁRIO DE PRODUTO
// ========================================

function abrirFormularioProduto(produto = null) {
    const container =
        document.getElementById(
            "admin-product-form-container"
        );

    const title =
        document.getElementById(
            "admin-product-form-title"
        );

    const form =
        document.getElementById(
            "admin-product-form"
        );

    if (!container || !form) return;

    container.classList.remove("hidden");

    if (produto) {
        title.textContent =
            "Editar produto";

        document.getElementById(
            "admin-product-id"
        ).value = produto.id;

        document.getElementById(
            "admin-product-code"
        ).value = produto.code;

        document.getElementById(
            "admin-product-name"
        ).value = produto.name;

        document.getElementById(
            "admin-product-category"
        ).value = produto.category;

        document.getElementById(
            "admin-product-size"
        ).value = produto.size;

        document.getElementById(
            "admin-product-condition"
        ).value = produto.condition;

        document.getElementById(
            "admin-product-status"
        ).value = produto.status;

        document.getElementById(
            "admin-product-exchange"
        ).value = produto.trade;

        document.getElementById(
            "admin-product-description"
        ).value = produto.description;

        document.getElementById(
            "admin-product-image"
        ).value = produto.image || "";
    } else {
        title.textContent =
            "Adicionar produto";

        form.reset();

        document.getElementById(
            "admin-product-id"
        ).value = "";

        document.getElementById(
            "admin-product-status"
        ).value = "available";
    }

    container.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function fecharFormularioProduto() {
    const container =
        document.getElementById(
            "admin-product-form-container"
        );

    const form =
        document.getElementById(
            "admin-product-form"
        );

    if (container) {
        container.classList.add("hidden");
    }

    if (form) {
        form.reset();
    }

    const id =
        document.getElementById(
            "admin-product-id"
        );

    if (id) {
        id.value = "";
    }
}

function editarProduto(id) {
    const produto =
        Object.values(products).find(
            (item) => item.id === id
        );

    if (!produto) return;

    abrirFormularioProduto(produto);
}

// ========================================
// EXCLUIR PRODUTO
// ========================================

async function excluirProduto(id) {
    const produto =
        Object.values(products).find(
            (item) => item.id === id
        );

    if (!produto) return;

    const confirmar =
        window.confirm(
            `Deseja realmente excluir o produto "${produto.name}"?`
        );

    if (!confirmar) return;

    const message =
        document.getElementById(
            "management-message"
        );

    try {
        const resposta =
            await apiBrecho(`/produtos/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!resposta.ok) {
            const erro =
                await resposta
                    .json()
                    .catch(() => ({}));

            throw new Error(
                erro.erro ||
                erro.mensagem ||
                "Erro ao excluir produto."
            );
        }

        await carregarProdutos();

        atualizarCatalogo();
        renderAdminProducts();

        if (
            currentProduct &&
            currentProduct.id === id
        ) {
            currentProduct = null;
            showScreen("catalog");
        }

        if (message) {
            message.style.color =
                "#19723a";

            message.textContent =
                "Produto excluído com sucesso.";
        }
    } catch (erro) {
        console.error(
            "Erro ao excluir produto:",
            erro
        );

        if (message) {
            message.style.color =
                "#b23b16";

            message.textContent =
                "Não foi possível excluir o produto.";
        }
    }
}

// ========================================
// ALTERAR STATUS
// ========================================

async function alternarStatusProduto(id) {
    const produto =
        Object.values(products).find(
            (item) => item.id === id
        );

    if (!produto) return;

    const proximosStatus = {
        available: "reserved",
        reserved: "exchanged",
        exchanged: "available"
    };

    const novoStatus =
        proximosStatus[produto.status] ||
        "available";

    try {
        const resposta =
            await apiBrecho(`/produtos/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        status: novoStatus
                    })
                }
            );

        if (!resposta.ok) {
            const erro =
                await resposta
                    .json()
                    .catch(() => ({}));

            throw new Error(
                erro.erro ||
                erro.mensagem ||
                "Erro ao alterar status."
            );
        }

        await carregarProdutos();

        const message =
            document.getElementById(
                "management-message"
            );

        if (message) {
            message.style.color =
                "#19723a";

            message.textContent =
                "Status do produto atualizado.";
        }
    } catch (erro) {
        console.error(
            "Erro ao alterar status:",
            erro
        );

        const message =
            document.getElementById(
                "management-message"
            );

        if (message) {
            message.style.color =
                "#b23b16";

            message.textContent =
                "Não foi possível alterar o status.";
        }
    }
}

// ========================================
// SALVAR PRODUTO
// ========================================

async function salvarProdutoAdmin(event) {
    event.preventDefault();

    const id =
        document.getElementById(
            "admin-product-id"
        )?.value;

    const dados = {
        codigo:
            document.getElementById(
                "admin-product-code"
            )?.value.trim(),

        nome:
            document.getElementById(
                "admin-product-name"
            )?.value.trim(),

        categoria:
            document.getElementById(
                "admin-product-category"
            )?.value,

        tamanho:
            document.getElementById(
                "admin-product-size"
            )?.value.trim(),

        estado:
            document.getElementById(
                "admin-product-condition"
            )?.value.trim(),

        status:
            document.getElementById(
                "admin-product-status"
            )?.value,

        troca:
            document.getElementById(
                "admin-product-exchange"
            )?.value.trim(),

        descricao:
            document.getElementById(
                "admin-product-description"
            )?.value.trim(),

        imagem:
            document.getElementById(
                "admin-product-image"
            )?.value.trim() || ""
    };

    const message =
        document.getElementById(
            "management-message"
        );

    const button =
        document.getElementById(
            "admin-product-save-btn"
        );

    try {
        if (button) {
            button.disabled = true;
            button.textContent =
                "Salvando...";
        }

        const resposta =
            await fetch(
                id
                    ? `${API_URL}/produtos/${id}`
                    : `${API_URL}/produtos`,
                {
                    method: id
                        ? "PUT"
                        : "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(dados)
                }
            );

        if (!resposta.ok) {
            const erro =
                await resposta
                    .json()
                    .catch(() => ({}));

            throw new Error(
                erro.erro ||
                erro.mensagem ||
                "Erro ao salvar produto."
            );
        }

        await resposta.json();

        await carregarProdutos();

        atualizarCatalogo();
        renderAdminProducts();

        fecharFormularioProduto();

        if (message) {
            message.style.color =
                "#19723a";

            message.textContent =
                id
                    ? "Produto atualizado com sucesso."
                    : "Produto adicionado com sucesso.";
        }
    } catch (erro) {
        console.error(
            "Erro ao salvar produto:",
            erro
        );

        if (message) {
            message.style.color =
                "#b23b16";

            message.textContent =
                erro.message ||
                "Não foi possível salvar o produto.";
        }
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent =
                "Salvar produto";
        }
    }
}

// ========================================
// ABAS DO ADM
// ========================================

function abrirAbaADM(aba) {
    document.querySelectorAll(
        "[data-admin-section]"
    ).forEach((section) => {
        section.hidden =
            section.dataset.adminSection !== aba;
    });

    document.querySelectorAll(
        "[data-admin-tab]"
    ).forEach((button) => {
        const ativa =
            button.dataset.adminTab === aba;

        button.classList.toggle(
            "bg-slate-900",
            ativa
        );

        button.classList.toggle(
            "text-white",
            ativa
        );

        button.classList.toggle(
            "bg-white",
            !ativa
        );

        button.classList.toggle(
            "text-slate-700",
            !ativa
        );

        button.classList.toggle(
            "border",
            !ativa
        );

        button.classList.toggle(
            "border-slate-300",
            !ativa
        );
    });

    if (aba === "products") {
        renderAdminProducts();
    }

    if (aba === "reservations") {
        renderReservations();
    }

    if (aba === "feedback") {
        renderFeedback();
    }
}

function configurarAbasADM() {
    document.querySelectorAll(
        "[data-admin-tab]"
    ).forEach((button) => {
        button.addEventListener(
            "click",
            () => {
                abrirAbaADM(
                    button.dataset.adminTab
                );
            }
        );
    });

    const addButton =
        document.getElementById(
            "admin-add-product-btn"
        );

    if (addButton) {
        addButton.addEventListener(
            "click",
            () => {
                abrirFormularioProduto();
            }
        );
    }

    const form =
        document.getElementById(
            "admin-product-form"
        );

    if (form) {
        form.addEventListener(
            "submit",
            salvarProdutoAdmin
        );
    }

    const cancelButton =
        document.getElementById(
            "admin-product-cancel-btn"
        );

    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            fecharFormularioProduto
        );
    }

    const cancelButtonBottom =
        document.getElementById(
            "admin-product-cancel-btn-bottom"
        );

    if (cancelButtonBottom) {
        cancelButtonBottom.addEventListener(
            "click",
            fecharFormularioProduto
        );
    }

    abrirAbaADM("products");
}

// ========================================
// LOGIN ADM
// ========================================

async function abrirAreaDaEquipe() {
    showScreen("management");
    abrirAbaADM("products");

    await carregarProdutos();
    await carregarReservas();
    await carregarAvaliacoes();
}

function mensagemADM(texto, cor) {
    const message = document.getElementById("adm-message");

    if (!message) return;

    message.style.color = cor || "";
    message.textContent = texto;
}

function traduzirErroLogin(erro) {
    const texto = String(erro?.message || "").toLowerCase();

    if (texto.includes("invalid login")) {
        return "E-mail ou senha incorretos.";
    }

    if (texto.includes("already registered")) {
        return "Este e-mail já tem acesso criado. Use a opção de entrar.";
    }

    if (texto.includes("password")) {
        return "A senha precisa ter pelo menos 6 caracteres.";
    }

    return "Não foi possível concluir. Tente novamente.";
}

async function acessarADM(criarConta) {
    const email =
        document.getElementById("adm-email")?.value.trim();

    const senha =
        document.getElementById("adm-password")?.value;

    if (!email || !senha) {
        mensagemADM("Informe e-mail e senha.", "#b23b16");
        return;
    }

    mensagemADM(criarConta ? "Criando acesso..." : "Entrando...");

    const { data, error } = criarConta
        ? await sb.auth.signUp({
            email: email,
            password: senha,
            options: { emailRedirectTo: window.location.href }
        })
        : await sb.auth.signInWithPassword({
            email: email,
            password: senha
        });

    if (error) {
        mensagemADM(traduzirErroLogin(error), "#b23b16");
        return;
    }

    if (!data || !data.session) {
        mensagemADM(
            "Enviamos um e-mail de confirmação. Confirme o cadastro e volte para entrar.",
            "#a84912"
        );
        return;
    }

    await sb.rpc("reivindicar_admin");

    if (await verificarAdmin()) {
        mensagemADM("Acesso liberado. Área da equipe aberta.", "#19723a");
        await abrirAreaDaEquipe();
    } else {
        mensagemADM(
            "Esta conta ainda não tem permissão de equipe. Peça a liberação a um administrador.",
            "#b23b16"
        );
    }
}

async function sairDaADM() {
    await sb.auth.signOut();

    admUnlocked = false;
    reservas = [];

    mensagemADM("Você saiu da área da equipe.", "#19723a");
    showScreen("adm");
}

function configurarADM() {
    const form = document.getElementById("adm-form");

    const signupButton =
        document.getElementById("adm-signup-btn");

    const logoutButton =
        document.getElementById("adm-logout-btn");

    if (signupButton) {
        signupButton.addEventListener("click", () => acessarADM(true));
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", sairDaADM);
    }

    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            acessarADM(false);
        });
    }
}

// ========================================
// FORMULÁRIO DE RESERVA
// ========================================

function configurarReserva() {
    const form =
        document.getElementById(
            "reservation-form"
        );

    if (!form) return;

    form.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            if (!currentProduct) {
                return;
            }

            const submit =
                document.getElementById(
                    "reservation-submit"
                );

            const message =
                document.getElementById(
                    "reservation-message"
                );

            if (submit) {
                submit.disabled = true;

                submit.classList.add(
                    "opacity-60"
                );
            }

            if (message) {
                message.style.color = "";

                message.textContent =
                    "Registrando solicitação...";
            }

            try {
                const reserva =
                    await criarReserva();

                reservas.unshift(
                    reserva
                );

                currentProduct.status =
                    "reserved";

                updateStatus(
                    currentProduct.code
                );

                const confirmationProduct =
                    document.getElementById(
                        "confirmation-product"
                    );

                if (confirmationProduct) {
                    confirmationProduct.innerHTML = `
                        <p class="font-extrabold text-slate-800">
                            ${currentProduct.name}
                        </p>

                        <p class="mt-1 text-sm text-slate-600">
                            Código: ${currentProduct.code}
                        </p>

                        <p class="mt-3 text-sm font-bold text-orange-700">
                            ${currentProduct.trade}
                        </p>
                    `;
                }

                form.reset();

                renderReservations();

                showScreen(
                    "confirmation"
                );
            } catch (erro) {
                console.error(
                    "Erro ao criar reserva:",
                    erro
                );

                if (message) {
                    message.style.color =
                        "#b23b16";

                    message.textContent =
                        "Não foi possível registrar sua solicitação. Tente novamente.";
                }
            } finally {
                if (submit) {
                    submit.disabled =
                        false;

                    submit.classList.remove(
                        "opacity-60"
                    );
                }
            }
        }
    );
}

// ========================================
// FORMULÁRIO DE AVALIAÇÃO
// ========================================

function configurarAvaliacao() {
    const form =
        document.getElementById(
            "feedback-form"
        );

    if (!form) return;

    form.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            const button =
                document.getElementById(
                    "feedback-submit"
                );

            const message =
                document.getElementById(
                    "feedback-message"
                );

            const rating =
                document.querySelector(
                    'input[name="rating"]:checked'
                );

            if (!rating) {
                if (message) {
                    message.style.color =
                        "#b23b16";

                    message.textContent =
                        "Selecione uma nota.";
                }

                return;
            }

            if (button) {
                button.disabled = true;

                button.classList.add(
                    "opacity-60"
                );
            }

            if (message) {
                message.textContent =
                    "Enviando avaliação...";
            }

            try {
                const dados = {
                    nota:
                        Number(
                            rating.value
                        ),

                    facilidade:
                        document.getElementById(
                            "ease"
                        )?.value || "",

                    satisfacao:
                        document.getElementById(
                            "satisfaction"
                        )?.value || "",

                    participariaNovamente:
                        document.getElementById(
                            "again"
                        )?.value || "",

                    recomendaria:
                        document.getElementById(
                            "recommend"
                        )?.value || "",

                    sugestao:
                        document.getElementById(
                            "suggestion"
                        )?.value.trim() || ""
                };

                const resposta =
                    await apiBrecho(`/avaliacoes`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    dados
                                )
                        }
                    );

                if (!resposta.ok) {
                    const erro =
                        await resposta
                            .json()
                            .catch(
                                () => ({})
                            );

                    throw new Error(
                        erro.erro ||
                        erro.mensagem ||
                        "Erro ao enviar avaliação."
                    );
                }

                const avaliacao =
                    await resposta.json();

                avaliacoes.unshift(
                    avaliacao
                );

                form.reset();

                if (message) {
                    message.style.color =
                        "#19723a";

                    message.textContent =
                        "OBRIGADO POR PARTICIPAR! Sua avaliação foi enviada.";
                }

                renderFeedback();
            } catch (erro) {
                console.error(
                    "Erro ao enviar avaliação:",
                    erro
                );

                if (message) {
                    message.style.color =
                        "#b23b16";

                    message.textContent =
                        "Não foi possível enviar sua avaliação. Tente novamente.";
                }
            } finally {
                if (button) {
                    button.disabled =
                        false;

                    button.classList.remove(
                        "opacity-60"
                    );
                }
            }
        }
    );
}

// ========================================
// INICIALIZAÇÃO
// ========================================

async function inicializarSistema() {
    try {
        await verificarAdmin();
        await carregarProdutos();
        await carregarReservas();
        await carregarAvaliacoes();

        renderReservations();
        renderFeedback();
        renderAdminProducts();
    } catch (erro) {
        console.error(
            "Erro ao inicializar sistema:",
            erro
        );
    }
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        if (
            typeof lucide !==
            "undefined"
        ) {
            lucide.createIcons();
        }

        showScreen("home");

        configurarADM();
        configurarAbasADM();
        configurarReserva();
        configurarAvaliacao();

        inicializarSistema();
    }
);