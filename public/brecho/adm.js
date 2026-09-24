/* Painel da equipe do Brechó Solidário — página separada do site público. */

const SUPABASE_URL = "https://wwdrvysclsmxsldybafu.supabase.co";
const SUPABASE_KEY = "sb_publishable_9WYUQNJKGCjXwyYKpexOfg_P_NdGbKX";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let produtos = [];
let reservas = [];
let avaliacoes = [];

const STATUS_PRODUTO = {
    available: { texto: "Disponível", cor: "#19723a", fundo: "#e6f4ea" },
    reserved: { texto: "Reservado", cor: "#a84912", fundo: "#fdeee3" },
    exchanged: { texto: "Trocado", cor: "#334155", fundo: "#e8eef5" }
};

const STATUS_RESERVA = ["Pendente", "Em análise", "Confirmada", "Vendido", "Cancelada"];

function esc(valor) {
    return String(valor === null || valor === undefined ? "" : valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function texto(valor, padrao) {
    const limpo = typeof valor === "string" ? valor.trim() : "";
    return limpo || padrao;
}

function lista(valor) {
    return Array.isArray(valor) ? valor : [];
}

function dataBonita(valor) {
    if (!valor) return "—";

    const d = new Date(valor);

    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function toast(mensagem, tipo) {
    let pilha = document.getElementById("toast-stack");
    if (!pilha) {
        pilha = document.createElement("div");
        pilha.id = "toast-stack";
        pilha.setAttribute("aria-live", "polite");
        document.body.appendChild(pilha);
    }
    const icone = { sucesso: "check-circle-2", erro: "alert-circle", info: "info" }[tipo] || "info";
    const titulo = { sucesso: "Tudo certo!", erro: "Ops, algo deu errado", info: "Aviso" }[tipo] || "Aviso";
    const item = document.createElement("div");
    item.className = "toast toast-" + tipo;
    item.setAttribute("role", tipo === "erro" ? "alert" : "status");
    item.innerHTML = '<span class="toast-icon"><i data-lucide="' + icone + '"></i></span><div class="toast-body"><strong>' + titulo + "</strong><p>" + esc(mensagem) + '</p></div><button type="button" class="toast-close" aria-label="Fechar aviso">&times;</button><span class="toast-bar"></span>';
    pilha.appendChild(item);
    if (typeof lucide !== "undefined") lucide.createIcons();
    const fechar = () => { item.classList.add("saindo"); setTimeout(() => item.remove(), 300); };
    item.querySelector(".toast-close").addEventListener("click", fechar);
    setTimeout(fechar, 4500);
}

function botaoCarregando(botao, carregando, txt) {
    if (!botao) return;
    if (carregando) {
        botao.dataset.orig = botao.innerHTML;
        botao.disabled = true;
        botao.classList.add("is-loading");
        botao.innerHTML = '<span class="spinner" aria-hidden="true"></span> ' + esc(txt || "Salvando...");
    } else {
        botao.disabled = false;
        botao.classList.remove("is-loading");
        if (botao.dataset.orig) botao.innerHTML = botao.dataset.orig;
    }
}

function contarAte(el) {
    const alvo = Number(el.dataset.contar);
    if (!Number.isFinite(alvo) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const decimais = String(el.dataset.contar).includes(".") ? 1 : 0;
    const inicio = performance.now();
    const passo = (agora) => {
        const t = Math.min(1, (agora - inicio) / 800);
        el.textContent = (alvo * (1 - Math.pow(1 - t, 3))).toFixed(decimais);
        if (t < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
}

function aviso(mensagem, cor) {
    if (mensagem) toast(mensagem, cor === "#b23b16" ? "erro" : cor === "#a84912" ? "info" : "sucesso");
    const alvo = document.getElementById("panel-message");

    if (!alvo) return;

    alvo.textContent = mensagem || "";
    alvo.style.color = cor || "#19723a";

    if (mensagem) {
        window.clearTimeout(aviso._t);
        aviso._t = window.setTimeout(() => { alvo.textContent = ""; }, 5000);
    }
}

function erroAmigavel(error) {
    const msg = String(error?.message || "");

    if (msg.includes("duplicate key")) return "Já existe uma peça com esse código.";
    if (msg.includes("violates check constraint")) return "Algum campo está fora do formato aceito. Revise e tente de novo.";
    if (msg.toLowerCase().includes("row-level security")) return "Sua conta não tem permissão para esta ação.";

    return "Não foi possível concluir agora. Tente novamente.";
}

/* ---------------- LOGIN ---------------- */

function mensagemLogin(txt, cor) {
    const alvo = document.getElementById("login-message");

    if (alvo) {
        alvo.textContent = txt || "";
        alvo.style.color = cor || "#a84912";
    }
}

async function souAdmin() {
    const { data: sessao } = await sb.auth.getSession();

    if (!sessao?.session) return false;

    const { data, error } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", sessao.session.user.id)
        .eq("role", "admin")
        .maybeSingle();

    if (error) return false;

    return Boolean(data);
}

async function entrar(evento) {
    evento.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-password").value;

    mensagemLogin("Entrando...", "#334155");

    const { error } = await sb.auth.signInWithPassword({ email: email, password: senha });

    if (error) {
        const m = String(error.message || "").toLowerCase();

        mensagemLogin(
            m.includes("invalid login")
                ? "E-mail ou senha incorretos."
                : m.includes("not confirmed")
                    ? "Confirme o e-mail pelo link enviado antes de entrar."
                    : "Não foi possível entrar agora. Tente novamente.",
            "#b23b16"
        );

        return;
    }

    if (!(await souAdmin())) {
        await sb.auth.signOut();
        mensagemLogin("Esta conta não faz parte da equipe.", "#b23b16");
        return;
    }

    mensagemLogin("");
    await abrirPainel();
}

async function sair() {
    await sb.auth.signOut();

    produtos = [];
    reservas = [];
    avaliacoes = [];

    document.getElementById("panel-view").hidden = true;
    document.getElementById("login-view").hidden = false;
    document.getElementById("logout-btn").hidden = true;
}

/* ---------------- CARREGAR DADOS ---------------- */

async function carregarTudo() {
    const [p, r, a] = await Promise.all([
        sb.from("produtos").select("*").order("createdAt", { ascending: false }).limit(500),
        sb.from("reservas").select("*").order("createdAt", { ascending: false }).limit(500),
        sb.from("avaliacoes").select("*").order("createdAt", { ascending: false }).limit(500)
    ]);

    produtos = lista(p.data);
    reservas = lista(r.data);
    avaliacoes = lista(a.data);

    renderEstatisticas();
    renderProdutos();
    renderReservas();
    renderAvaliacoes();
    carregarExtras().catch((e) => console.error(e));
}

async function abrirPainel() {
    document.getElementById("login-view").hidden = true;
    document.getElementById("panel-view").hidden = false;
    document.getElementById("logout-btn").hidden = false;

    await carregarTudo();
}

/* ---------------- ESTATÍSTICAS ---------------- */

function cartaoEstatistica(rotulo, valor, detalhe) {
    return (
        '<div class="card stat-card">' +
        '<p class="text-xs font-extrabold tracking-[.14em]" style="color:#ef6b2e">' + esc(rotulo) + "</p>" +
        '<p class="brand-font mt-1 text-3xl font-bold" style="color:#092a46" data-contar="' + esc(valor) + '">' + esc(valor) + "</p>" +
        '<p class="mt-1 text-sm text-slate-600">' + esc(detalhe) + "</p>" +
        "</div>"
    );
}

function renderEstatisticas() {
    const alvo = document.getElementById("stats");

    if (!alvo) return;

    const disponiveis = produtos.filter((p) => p.status === "available").length;
    const reservados = produtos.filter((p) => p.status === "reserved").length;
    const trocados = produtos.filter((p) => p.status === "exchanged").length;
    const pendentes = reservas.filter((r) => r.status === "Pendente").length;

    const notas = avaliacoes.map((a) => Number(a.nota)).filter((n) => n >= 1 && n <= 5);
    const media = notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : "—";

    alvo.innerHTML =
        cartaoEstatistica("PEÇAS", produtos.length, disponiveis + " disponíveis") +
        cartaoEstatistica("EM MOVIMENTO", reservados + trocados, reservados + " reservadas · " + trocados + " trocadas") +
        cartaoEstatistica("RESERVAS", reservas.length, pendentes + " aguardando resposta") +
        cartaoEstatistica("NOTA MÉDIA", media, avaliacoes.length + " avaliações recebidas");
    alvo.querySelectorAll("[data-contar]").forEach(contarAte);
    renderAlertasParadas();
    renderImpacto();
}

let HORAS_PARADA = Number(localStorage.getItem("brecho-horas-parada")) || 48;

function reservaParada(r) {
    const d = Date.parse(r.createdAt || "");
    return r.status === "Pendente" && d && Date.now() - d > HORAS_PARADA * 3600000;
}

function renderAlertasParadas() {
    const alvo = document.getElementById("alertas-paradas");
    if (!alvo) return;
    const paradas = reservas.filter(reservaParada);
    const seletor = '<label class="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">Considerar parada após <select id="horas-parada" class="field" style="width:auto;padding:.3rem .6rem">' + [24, 48, 72, 120].map((h) => '<option value="' + h + '"' + (h === HORAS_PARADA ? " selected" : "") + ">" + h + " h</option>").join("") + "</select></label>";
    alvo.innerHTML = (paradas.length
        ? '<div class="card alerta-parada"><p class="font-extrabold" style="color:#a84912">⏰ ' + paradas.length + (paradas.length === 1 ? " reserva está parada" : " reservas estão paradas") + " há mais de " + HORAS_PARADA + ' horas em "Pendente".</p><p class="mt-1 text-sm text-slate-600">' + paradas.slice(0, 5).map((r) => esc(texto(r.nomeCompleto, "Sem nome")) + " (#" + esc(texto(r.codigoProduto, "—")) + ")").join(" · ") + '</p><button type="button" class="btn btn-soft mt-3" id="ver-paradas-btn">Ver reservas pendentes</button></div>'
        : "") + seletor;
}

function renderImpacto() {
    const alvo = document.getElementById("impacto");
    if (!alvo) return;
    const agora = new Date();
    const doMes = (r) => { const d = new Date(r.createdAt); return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear(); };
    const concluidas = reservas.filter((r) => r.status === "Vendido");
    const trocasMes = concluidas.filter(doMes).length;
    const doacoes = concluidas.reduce((s, r) => s + (Number(r.quantidade) || 0), 0);
    const total = reservas.length || 1;
    const barras = STATUS_RESERVA.map((s) => {
        const n = reservas.filter((r) => r.status === s).length;
        return '<div class="grid grid-cols-[110px_1fr_32px] items-center gap-3 text-sm"><span class="font-semibold text-slate-600">' + s + '</span><div class="barra-impacto"><span style="width:' + Math.round((n / total) * 100) + '%"></span></div><strong style="color:#092a46">' + n + "</strong></div>";
    }).join("");
    alvo.innerHTML =
        '<div class="flex flex-wrap items-end justify-between gap-3"><div><p class="text-xs font-extrabold tracking-[.14em]" style="color:#ef6b2e">PAINEL DE IMPACTO</p><h2 class="brand-font text-xl font-bold" style="color:#092a46">O bem que já circulou</h2></div></div>' +
        '<div class="mt-4 grid gap-3 sm:grid-cols-3">' +
        '<div class="rounded-xl bg-orange-50 p-4"><p class="text-xs font-bold text-slate-500">TROCAS NESTE MÊS</p><p class="brand-font text-3xl font-bold" style="color:#092a46" data-contar="' + trocasMes + '">' + trocasMes + "</p></div>" +
        '<div class="rounded-xl bg-orange-50 p-4"><p class="text-xs font-bold text-slate-500">TROCAS CONCLUÍDAS</p><p class="brand-font text-3xl font-bold" style="color:#092a46" data-contar="' + concluidas.length + '">' + concluidas.length + "</p></div>" +
        '<div class="rounded-xl bg-orange-50 p-4"><p class="text-xs font-bold text-slate-500">ITENS DOADOS</p><p class="brand-font text-3xl font-bold" style="color:#092a46" data-contar="' + doacoes + '">' + doacoes + "</p></div>" +
        "</div>" +
        '<p class="mt-5 text-sm font-bold text-slate-600">Reservas por situação</p><div class="mt-2 grid gap-2">' + barras + "</div>";
    alvo.querySelectorAll("[data-contar]").forEach(contarAte);
}

// Redimensiona (máx. 1600px) e comprime em JPEG antes de enviar
function comprimirImagem(arquivo) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(arquivo);
        img.onload = () => {
            const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * escala);
            canvas.height = Math.round(img.height * escala);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => resolve(blob && blob.size < arquivo.size ? blob : arquivo), "image/jpeg", 0.8);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(arquivo); };
        img.src = url;
    });
}

function proximoCodigoLivre() {
    const usados = new Set(produtos.map((p) => String(p.codigo)));
    const numeros = produtos.map((p) => parseInt(p.codigo, 10)).filter((n) => Number.isFinite(n));
    let n = (numeros.length ? Math.max(...numeros) : 0) + 1;
    while (usados.has(String(n).padStart(3, "0"))) n++;
    return String(n).padStart(3, "0");
}

async function enviarFoto() {
    const input = document.getElementById("product-arquivo");
    const status = document.getElementById("product-upload-status");
    const arquivo = input?.files?.[0];
    if (!arquivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
        toast("Envie uma foto JPG, PNG ou WEBP.", "erro"); input.value = ""; return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
        toast("A foto passa de 5 MB. Escolha uma menor.", "erro"); input.value = ""; return;
    }
    status.innerHTML = '<span class="spinner"></span> Otimizando foto...';
    const otimizada = await comprimirImagem(arquivo);
    const caminho = (crypto.randomUUID ? crypto.randomUUID() : Date.now()) + ".jpg";
    status.innerHTML = '<span class="spinner"></span> Enviando foto (' + Math.round(otimizada.size / 1024) + " KB)...";
    const { error } = await sb.storage.from("fotos-produtos").upload(caminho, otimizada, { contentType: "image/jpeg", upsert: false });
    if (error) {
        status.textContent = ""; toast("Não foi possível enviar a foto: " + erroAmigavel(error), "erro"); return;
    }
    const { data, error: erroLink } = await sb.storage.from("fotos-produtos").createSignedUrl(caminho, 60 * 60 * 24 * 365 * 10);
    if (erroLink || !data?.signedUrl) {
        status.textContent = ""; toast("A foto subiu, mas não geramos o link. Tente de novo.", "erro"); return;
    }
    document.getElementById("product-imagem").value = data.signedUrl;
    status.textContent = "Foto enviada ✓";
    atualizarPreviaFoto();
    toast("Foto enviada. Agora é só salvar a peça.", "sucesso");
}

function duplicarProduto(id) {
    const original = produtos.find((p) => String(p.id) === String(id));
    if (!original) return;
    abrirFormularioProduto(Object.assign({}, original, { id: "", codigo: proximoCodigoLivre() }));
    document.getElementById("product-form-title").textContent = "Duplicar peça";
    document.getElementById("product-codigo").focus();
    toast("Copiamos os dados com o próximo código livre. Revise e salve.", "info");
}

/* ---------------- PRODUTOS ---------------- */

function produtosFiltrados() {
    const busca = (document.getElementById("product-search")?.value || "").trim().toLowerCase();
    const status = document.getElementById("product-status-filter")?.value || "";
    const categoria = document.getElementById("product-category-filter")?.value || "";

    return produtos.filter((p) => {
        if (status && p.status !== status) return false;
        if (categoria && p.categoria !== categoria) return false;

        if (busca) {
            const alvo = (String(p.codigo || "") + " " + String(p.nome || "")).toLowerCase();
            if (!alvo.includes(busca)) return false;
        }

        return true;
    });
}

function renderProdutos() {
    const alvo = document.getElementById("product-list");

    if (!alvo) return;

    const itens = produtosFiltrados();

    if (!itens.length) {
        alvo.innerHTML = '<div class="card text-slate-600">Nenhuma peça encontrada com esses filtros.</div>';
        return;
    }

    alvo.innerHTML = itens
        .map((p) => {
            const st = STATUS_PRODUTO[p.status] || STATUS_PRODUTO.available;
            const imagem = texto(p.imagem, "");

            return (
                '<article class="card flex flex-wrap gap-4">' +
                (imagem
                    ? '<img src="' + esc(imagem) + '" alt="" style="width:88px;height:88px;object-fit:cover;border-radius:.75rem">'
                    : '<div style="width:88px;height:88px;border-radius:.75rem;background:#eef2f7;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:#64748b">Sem foto</div>') +
                '<div style="flex:1 1 240px;min-width:0">' +
                '<p class="text-xs font-bold text-slate-500">#' + esc(p.codigo) + " · " + esc(dataBonita(p.createdAt)) + "</p>" +
                '<h3 class="brand-font text-lg font-bold" style="color:#092a46">' + esc(texto(p.nome, "Peça sem nome")) + "</h3>" +
                '<p class="text-sm text-slate-600">' + esc(texto(p.tamanho, "Tamanho não informado")) + " · " + esc(texto(p.estado, "Estado não informado")) + "</p>" +
                '<p class="mt-1 text-sm text-slate-600">Troca: ' + esc(texto(p.troca, "não informada")) + "</p>" +
                '<span class="pill mt-2" style="color:' + st.cor + ";background:" + st.fundo + '">' + st.texto + "</span>" +
                "</div>" +
                '<div class="flex flex-wrap items-start gap-2">' +
                '<select class="field" data-produto-status="' + esc(p.id) + '" style="width:auto">' +
                Object.keys(STATUS_PRODUTO)
                    .map((k) => '<option value="' + k + '"' + (p.status === k ? " selected" : "") + ">" + STATUS_PRODUTO[k].texto + "</option>")
                    .join("") +
                "</select>" +
                '<button type="button" class="btn btn-soft" data-produto-editar="' + esc(p.id) + '">Editar</button>' +
                '<button type="button" class="btn btn-soft" data-produto-duplicar="' + esc(p.id) + '">Duplicar</button>' +
                '<button type="button" class="btn btn-soft" data-produto-excluir="' + esc(p.id) + '" style="color:#b23b16">Excluir</button>' +
                "</div>" +
                "</article>"
            );
        })
        .join("");
}

function abrirFormularioProduto(produto) {
    document.getElementById("product-form-box").hidden = false;
    document.getElementById("product-form-title").textContent = produto ? "Editar peça" : "Adicionar peça";

    document.getElementById("product-id").value = produto?.id || "";
    document.getElementById("product-codigo").value = produto?.codigo || "";
    document.getElementById("product-nome").value = produto?.nome || "";
    document.getElementById("product-categoria").value = produto?.categoria || "adult";
    document.getElementById("product-status").value = produto?.status || "available";
    document.getElementById("product-tamanho").value = produto?.tamanho || "";
    document.getElementById("product-estado").value = produto?.estado || "";
    document.getElementById("product-troca").value = produto?.troca || "";
    document.getElementById("product-descricao").value = produto?.descricao || "";
    document.getElementById("product-imagem").value = produto?.imagem || "";

    document.getElementById("product-arquivo").value = "";
    document.getElementById("product-upload-status").textContent = "";
    atualizarPreviaFoto();

    document.getElementById("product-form-box").scrollIntoView({ behavior: "smooth", block: "start" });
}

function fecharFormularioProduto() {
    document.getElementById("product-form-box").hidden = true;
    document.getElementById("product-form").reset();
    document.getElementById("product-id").value = "";
    atualizarPreviaFoto();
}

function atualizarPreviaFoto() {
    const caixa = document.getElementById("product-preview");
    const url = document.getElementById("product-imagem")?.value.trim();

    if (!caixa) return;

    if (!url) {
        caixa.hidden = true;
        caixa.innerHTML = "";
        return;
    }

    caixa.hidden = false;
    caixa.innerHTML =
        '<p class="text-sm font-bold text-slate-700">Prévia da foto</p>' +
        '<img src="' + esc(url) + '" alt="" style="margin-top:.5rem;width:140px;height:140px;object-fit:cover;border-radius:.75rem" ' +
        "onerror=\"this.replaceWith(Object.assign(document.createElement('p'),{className:'text-sm text-slate-500',textContent:'Não conseguimos carregar essa foto.'}))\">";
}

async function salvarProduto(evento) {
    evento.preventDefault();

    const id = document.getElementById("product-id").value;

    const corpo = {
        codigo: document.getElementById("product-codigo").value.trim(),
        nome: document.getElementById("product-nome").value.trim(),
        categoria: document.getElementById("product-categoria").value,
        status: document.getElementById("product-status").value,
        tamanho: document.getElementById("product-tamanho").value.trim(),
        estado: document.getElementById("product-estado").value.trim(),
        troca: document.getElementById("product-troca").value.trim(),
        descricao: document.getElementById("product-descricao").value.trim(),
        imagem: document.getElementById("product-imagem").value.trim()
    };

    const botao = document.getElementById("product-save-btn");

    botaoCarregando(botao, true, "Salvando...");

    const { error } = id
        ? await sb.from("produtos").update(corpo).eq("id", id)
        : await sb.from("produtos").insert(corpo);

    botaoCarregando(botao, false);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso(id ? "Peça atualizada." : "Peça adicionada ao catálogo.");
    fecharFormularioProduto();
    await carregarTudo();
}

async function excluirProduto(id) {
    if (!window.confirm("Excluir esta peça do catálogo? Essa ação não pode ser desfeita.")) return;

    const { error } = await sb.from("produtos").delete().eq("id", id);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso("Peça excluída.");
    await carregarTudo();
}

async function mudarStatusProduto(id, status) {
    const { error } = await sb.from("produtos").update({ status: status }).eq("id", id);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso("Status atualizado.");
    await carregarTudo();
}

/* ---------------- RESERVAS ---------------- */

function reservasFiltradas() {
    const busca = (document.getElementById("reserva-search")?.value || "").trim().toLowerCase();
    const status = document.getElementById("reserva-status-filter")?.value || "";

    return reservas.filter((r) => {
        if (status && r.status !== status) return false;

        if (busca) {
            const alvo = [r.nomeCompleto, r.contato, r.codigoProduto, r.nomeProduto].join(" ").toLowerCase();
            if (!alvo.includes(busca)) return false;
        }

        return true;
    });
}

function renderReservas() {
    const alvo = document.getElementById("reserva-list");

    if (!alvo) return;

    const itens = reservasFiltradas();

    if (!itens.length) {
        alvo.innerHTML = '<div class="card text-slate-600">Nenhuma reserva encontrada.</div>';
        return;
    }

    alvo.innerHTML = itens
        .map(
            (r) =>
                '<article class="card' + (reservaParada(r) ? " reserva-parada" : "") + '">' +
                '<div class="flex flex-wrap items-start justify-between gap-3">' +
                "<div>" +
                '<p class="text-xs font-bold text-slate-500">' + esc(dataBonita(r.createdAt)) + (reservaParada(r) ? ' · <span style="color:#a84912">⏰ parada há mais de ' + HORAS_PARADA + " h</span>" : "") + "</p>" +
                '<h3 class="brand-font text-lg font-bold" style="color:#092a46">' + esc(texto(r.nomeCompleto, "Sem nome")) + "</h3>" +
                '<p class="text-sm text-slate-600">Contato: ' + esc(texto(r.contato, "não informado")) + "</p>" +
                '<p class="text-sm text-slate-600">Peça: #' + esc(texto(r.codigoProduto, "—")) + " · " + esc(texto(r.nomeProduto, "—")) + "</p>" +
                '<p class="text-sm text-slate-600">Doação: ' + esc(texto(r.itemDoacao, "—")) + " (" + esc(texto(r.tipoDoacao, "—")) + ") · qtd " + esc(r.quantidade ?? "—") + "</p>" +
                "</div>" +
                '<div class="flex flex-wrap gap-2">' +
                '<select class="field" data-reserva-status="' + esc(r.id) + '" style="width:auto">' +
                STATUS_RESERVA.map((s) => '<option value="' + s + '"' + (r.status === s ? " selected" : "") + ">" + s + "</option>").join("") +
                "</select>" +
                '<button type="button" class="btn btn-soft" data-reserva-excluir="' + esc(r.id) + '" style="color:#b23b16">Excluir</button>' +
                "</div>" +
                "</div>" +
                '<label class="mt-4 block text-sm font-bold text-slate-700">Observações da equipe</label>' +
                '<textarea class="field mt-1" rows="2" data-reserva-obs="' + esc(r.id) + '">' + esc(r.observacoesEquipe || "") + "</textarea>" +
                '<button type="button" class="btn btn-soft mt-2" data-reserva-salvar="' + esc(r.id) + '">Salvar observação</button>' +
                "</article>"
        )
        .join("");
}

async function mudarStatusReserva(id, status) {
    const { error } = await sb.from("reservas").update({ status: status }).eq("id", id);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso("Reserva atualizada.");
    await carregarTudo();
}

async function salvarObservacao(id) {
    const campo = document.querySelector('[data-reserva-obs="' + id + '"]');

    const { error } = await sb
        .from("reservas")
        .update({ observacoesEquipe: (campo?.value || "").trim().slice(0, 1000) })
        .eq("id", id);

    aviso(error ? erroAmigavel(error) : "Observação salva.", error ? "#b23b16" : "#19723a");
}

async function excluirReserva(id) {
    if (!window.confirm("Excluir esta reserva?")) return;

    const { error } = await sb.from("reservas").delete().eq("id", id);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso("Reserva excluída.");
    await carregarTudo();
}

/* ---------------- AVALIAÇÕES ---------------- */

function renderAvaliacoes() {
    const alvo = document.getElementById("avaliacao-list");

    if (!alvo) return;

    if (!avaliacoes.length) {
        alvo.innerHTML = '<div class="card text-slate-600">Nenhuma avaliação recebida ainda.</div>';
        return;
    }

    alvo.innerHTML = avaliacoes
        .map(
            (a) =>
                '<article class="card">' +
                '<div class="flex flex-wrap items-start justify-between gap-3">' +
                "<div>" +
                '<p class="text-xs font-bold text-slate-500">' + esc(dataBonita(a.createdAt)) + "</p>" +
                '<p class="brand-font text-lg font-bold" style="color:#092a46">Nota ' + esc(a.nota ?? "—") + "/5</p>" +
                '<p class="text-sm text-slate-600">Facilidade: ' + esc(texto(a.facilidade, "—")) + " · Satisfação: " + esc(texto(a.satisfacao, "—")) + "</p>" +
                '<p class="text-sm text-slate-600">Participaria de novo: ' + esc(texto(a.participariaNovamente, "—")) + " · Recomendaria: " + esc(texto(a.recomendaria, "—")) + "</p>" +
                (texto(a.sugestao, "") ? '<p class="mt-2 text-slate-700">“' + esc(a.sugestao) + "”</p>" : "") +
                "</div>" +
                '<button type="button" class="btn btn-soft" data-avaliacao-excluir="' + esc(a.id) + '" style="color:#b23b16">Excluir</button>' +
                "</div>" +
                "</article>"
        )
        .join("");
}

async function excluirAvaliacao(id) {
    if (!window.confirm("Excluir esta avaliação?")) return;

    const { error } = await sb.from("avaliacoes").delete().eq("id", id);

    if (error) {
        aviso(erroAmigavel(error), "#b23b16");
        return;
    }

    aviso("Avaliação excluída.");
    await carregarTudo();
}

/* ---------------- PLANILHAS ---------------- */

function baixarCSV(nome, linhas) {
    if (!linhas.length) {
        aviso("Não há dados para baixar.", "#a84912");
        return;
    }

    const colunas = Object.keys(linhas[0]);

    const conteudo = [colunas.join(";")]
        .concat(
            linhas.map((l) =>
                colunas.map((c) => '"' + String(l[c] ?? "").replace(/"/g, '""') + '"').join(";")
            )
        )
        .join("\n");

    const url = URL.createObjectURL(new Blob(["\ufeff" + conteudo], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = nome;
    link.click();

    URL.revokeObjectURL(url);
}

/* ---------------- ABAS E EVENTOS ---------------- */

function trocarAba(aba) {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === aba));
    document.querySelectorAll("[data-panel]").forEach((s) => { s.hidden = s.dataset.panel !== aba; });
}

function ligarEventos() {
    document.getElementById("login-form").addEventListener("submit", entrar);
    document.getElementById("logout-btn").addEventListener("click", sair);

    document.querySelectorAll("[data-tab]").forEach((b) =>
        b.addEventListener("click", () => trocarAba(b.dataset.tab))
    );

    document.getElementById("new-product-btn").addEventListener("click", () => abrirFormularioProduto(null));
    document.getElementById("product-cancel-btn").addEventListener("click", fecharFormularioProduto);
    document.getElementById("product-form").addEventListener("submit", salvarProduto);
    document.getElementById("product-imagem").addEventListener("input", atualizarPreviaFoto);
    document.getElementById("product-arquivo").addEventListener("change", enviarFoto);

    ["product-search", "product-status-filter", "product-category-filter"].forEach((id) =>
        document.getElementById(id).addEventListener("input", renderProdutos)
    );

    ["reserva-search", "reserva-status-filter"].forEach((id) =>
        document.getElementById(id).addEventListener("input", renderReservas)
    );

    document.getElementById("export-reservas-anon-btn").addEventListener("click", () =>
        baixarCSV(
            "reservas-sem-contato.csv",
            reservasFiltradas().map((r) => ({
                data: dataBonita(r.createdAt),
                codigo: r.codigoProduto,
                peca: r.nomeProduto,
                doacao: r.itemDoacao,
                tipo: r.tipoDoacao,
                quantidade: r.quantidade,
                status: r.status
            }))
        )
    );

    document.getElementById("export-reservas-btn").addEventListener("click", () =>
        window.confirm("Esta planilha contém nomes e contatos (dados pessoais). Guarde-a em local seguro e não compartilhe. Continuar?") &&
        baixarCSV(
            "reservas.csv",
            reservasFiltradas().map((r) => ({
                data: dataBonita(r.createdAt),
                nome: r.nomeCompleto,
                contato: r.contato,
                codigo: r.codigoProduto,
                peca: r.nomeProduto,
                doacao: r.itemDoacao,
                tipo: r.tipoDoacao,
                quantidade: r.quantidade,
                status: r.status,
                observacoes: r.observacoesEquipe
            }))
        )
    );

    document.getElementById("export-avaliacoes-btn").addEventListener("click", () =>
        baixarCSV(
            "avaliacoes.csv",
            avaliacoes.map((a) => ({
                data: dataBonita(a.createdAt),
                nota: a.nota,
                facilidade: a.facilidade,
                satisfacao: a.satisfacao,
                participaria: a.participariaNovamente,
                recomendaria: a.recomendaria,
                sugestao: a.sugestao
            }))
        )
    );

    document.addEventListener("click", (e) => {
        const alvo = e.target.closest("#ver-paradas-btn,[data-produto-duplicar],[data-produto-editar],[data-produto-excluir],[data-reserva-excluir],[data-reserva-salvar],[data-avaliacao-excluir]");

        if (!alvo) return;

        if (alvo.id === "ver-paradas-btn") {
            trocarAba("reservas");
            document.getElementById("reserva-status-filter").value = "Pendente";
            renderReservas();
        } else if (alvo.dataset.produtoDuplicar) {
            duplicarProduto(alvo.dataset.produtoDuplicar);
        } else if (alvo.dataset.produtoEditar) {
            abrirFormularioProduto(produtos.find((p) => String(p.id) === alvo.dataset.produtoEditar));
        } else if (alvo.dataset.produtoExcluir) {
            excluirProduto(alvo.dataset.produtoExcluir);
        } else if (alvo.dataset.reservaExcluir) {
            excluirReserva(alvo.dataset.reservaExcluir);
        } else if (alvo.dataset.reservaSalvar) {
            salvarObservacao(alvo.dataset.reservaSalvar);
        } else if (alvo.dataset.avaliacaoExcluir) {
            excluirAvaliacao(alvo.dataset.avaliacaoExcluir);
        }
    });

    document.getElementById("equipe-form").addEventListener("submit", adicionarNaEquipe);
    document.getElementById("esqueci-btn").addEventListener("click", esqueciSenha);
    document.getElementById("senha-form").addEventListener("submit", salvarNovaSenha);
    document.addEventListener("click", (e) => {
        const r = e.target.closest("[data-remover-admin],[data-anonimizar]");
        if (!r) return;
        if (r.dataset.removerAdmin) removerDaEquipe(r.dataset.removerAdmin, r.dataset.email);
        else anonimizarReserva(r.dataset.anonimizar);
    });

    document.addEventListener("change", (e) => {
        if (e.target.id === "horas-parada") {
            HORAS_PARADA = Number(e.target.value) || 48;
            localStorage.setItem("brecho-horas-parada", String(HORAS_PARADA));
            renderAlertasParadas();
            renderReservas();
            return;
        }
        if (e.target.dataset?.produtoStatus) {
            mudarStatusProduto(e.target.dataset.produtoStatus, e.target.value);
        } else if (e.target.dataset?.reservaStatus) {
            mudarStatusReserva(e.target.dataset.reservaStatus, e.target.value);
        }
    });
}

/* ---------------- EQUIPE, LGPD E HISTÓRICO ---------------- */

async function carregarExtras() {
    const [admins, log, pedidos, hist] = await Promise.all([
        sb.rpc("listar_admins"),
        sb.from("admin_log").select("*").order("criado_em", { ascending: false }).limit(50),
        sb.from("pedidos_exclusao").select("*").order("criado_em", { ascending: false }).limit(200),
        sb.from("historico").select("*").order("criado_em", { ascending: false }).limit(200)
    ]);
    renderEquipe(lista(admins.data), lista(log.data));
    renderPedidos(lista(pedidos.data));
    renderHistorico(lista(hist.data));
}

function renderEquipe(admins, log) {
    const alvo = document.getElementById("equipe-list");
    alvo.innerHTML = admins.length
        ? admins.map((a) =>
            '<div class="card flex flex-wrap items-center justify-between gap-3"><div><p class="font-bold" style="color:#092a46">' + esc(a.email) + '</p><p class="text-sm text-slate-500">Administradora</p></div>' +
            (admins.length > 1 ? '<button type="button" class="btn btn-soft" style="color:#b23b16" data-remover-admin="' + esc(a.user_id) + '" data-email="' + esc(a.email) + '">Remover acesso</button>' : '<span class="text-xs text-slate-500">Única administradora — não pode ser removida</span>') +
            "</div>").join("")
        : '<div class="card text-slate-600">Nenhuma administradora encontrada.</div>';
    document.getElementById("admin-log").innerHTML = log.length
        ? log.map((l) => '<p class="text-sm text-slate-600">' + esc(dataBonita(l.criado_em)) + " · <strong>" + esc(l.autor_email || "sistema") + "</strong> " + esc(l.acao) + " <strong>" + esc(l.alvo_email) + "</strong></p>").join("")
        : '<p class="text-sm text-slate-500">Nenhuma mudança de acesso registrada ainda.</p>';
}

async function adicionarNaEquipe(evento) {
    evento.preventDefault();
    const campo = document.getElementById("equipe-email");
    const botao = document.getElementById("equipe-add-btn");
    const email = campo.value.trim().toLowerCase();
    if (!window.confirm("Dar acesso total ao painel para " + email + "?")) return;
    botaoCarregando(botao, true, "Adicionando...");
    try {
        const { data: s } = await sb.auth.getSession();
        const r = await fetch("/api/public/equipe-convidar", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + (s?.session?.access_token || "") },
            body: JSON.stringify({ email })
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.erro || "Não foi possível adicionar.");
        toast(d.acao === "convidou" ? "Convite enviado para " + email + ". A pessoa cria a senha pelo link do e-mail." : email + " agora é administradora.", "sucesso");
        campo.value = "";
        await carregarExtras();
    } catch (erro) {
        toast(erro.message, "erro");
    } finally {
        botaoCarregando(botao, false);
    }
}

async function removerDaEquipe(userId, email) {
    if (!window.confirm("Remover o acesso de " + email + " ao painel?")) return;
    const { error } = await sb.rpc("remover_admin", { _user_id: userId });
    if (error) {
        toast(String(error.message).includes("ULTIMO_ADMIN") ? "Não é possível remover a última administradora." : erroAmigavel(error), "erro");
        return;
    }
    toast("Acesso de " + email + " removido.", "sucesso");
    await carregarExtras();
}

function renderPedidos(pedidos) {
    const pendentes = pedidos.filter((p) => p.status === "Pendente");
    document.getElementById("pedidos-count").textContent = pendentes.length ? String(pendentes.length) : "";
    document.getElementById("pedidos-list").innerHTML = pedidos.length
        ? pedidos.map((p) => {
            const r = reservas.find((x) => x.id === p.reserva_id);
            return '<div class="card flex flex-wrap items-center justify-between gap-3"><div><p class="text-xs font-bold text-slate-500">' + esc(dataBonita(p.criado_em)) + " · " + esc(p.status) + '</p><p class="font-bold" style="color:#092a46">' + esc(r ? texto(r.nomeCompleto, "—") + " · peça #" + texto(r.codigoProduto, "—") : "Reserva " + p.reserva_id.slice(0, 8)) + "</p></div>" +
                (p.status === "Pendente" ? '<button type="button" class="btn btn-primary" data-anonimizar="' + esc(p.reserva_id) + '">Apagar nome e contato</button>' : '<span class="pill" style="background:#e6f4ea;color:#19723a">Concluído</span>') + "</div>";
        }).join("")
        : '<div class="card text-slate-600">Nenhum pedido de exclusão.</div>';
}

async function anonimizarReserva(id) {
    if (!window.confirm("Apagar definitivamente o nome e o contato desta reserva?")) return;
    const { error } = await sb.rpc("anonimizar_reserva", { _id: id });
    if (error) return toast(erroAmigavel(error), "erro");
    toast("Dados pessoais apagados.", "sucesso");
    await carregarTudo();
}

function resumoMudanca(h) {
    const antes = h.antes || {};
    const depois = h.depois || {};
    const item = depois.codigo || antes.codigo || depois.codigoProduto || antes.codigoProduto || "";
    const nome = depois.nome || antes.nome || depois.nomeProduto || antes.nomeProduto || "";
    if (h.acao === "INSERT") return (h.tabela === "produtos" ? "cadastrou a peça " : "nova reserva da peça ") + "#" + item + " " + nome;
    if (h.acao === "DELETE") return (h.tabela === "produtos" ? "excluiu a peça " : "excluiu reserva da peça ") + "#" + item + " " + nome;
    const campos = Object.keys(depois).filter((k) => JSON.stringify(antes[k]) !== JSON.stringify(depois[k]));
    const status = campos.includes("status") ? ' (situação: "' + antes.status + '" → "' + depois.status + '")' : "";
    return "alterou " + (h.tabela === "produtos" ? "a peça" : "reserva da peça") + " #" + item + " " + nome + status + (campos.length && !status ? " (" + campos.join(", ") + ")" : "");
}

function renderHistorico(hist) {
    document.getElementById("historico-list").innerHTML = hist.length
        ? hist.map((h) => '<p class="card text-sm text-slate-700" style="padding:.7rem 1rem">' + esc(dataBonita(h.criado_em)) + " · <strong>" + esc(h.autor_email || "site/sistema") + "</strong> " + esc(resumoMudanca(h)) + "</p>").join("")
        : '<div class="card text-slate-600">Nenhuma alteração registrada ainda.</div>';
}

/* ---------------- SENHA ---------------- */

async function esqueciSenha() {
    const email = document.getElementById("login-email").value.trim();
    if (!email) return mensagemLogin("Digite seu e-mail acima e toque em \"Esqueci minha senha\".", "#a84912");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/brecho/adm.html" });
    mensagemLogin(error ? "Não foi possível enviar agora. Tente novamente." : "Se o e-mail for da equipe, você receberá um link para criar nova senha.", error ? "#b23b16" : "#19723a");
}

async function salvarNovaSenha(evento) {
    evento.preventDefault();
    const botao = document.getElementById("senha-btn");
    const senha = document.getElementById("nova-senha").value;
    if (senha.length < 8) return toast("A senha precisa ter pelo menos 8 caracteres.", "erro");
    botaoCarregando(botao, true, "Salvando...");
    const { error } = await sb.auth.updateUser({ password: senha });
    botaoCarregando(botao, false);
    if (error) return toast("Não foi possível salvar a senha: " + (error.message || ""), "erro");
    history.replaceState(null, "", window.location.pathname);
    document.getElementById("senha-view").hidden = true;
    toast("Senha salva!", "sucesso");
    if (await souAdmin()) await abrirPainel();
    else document.getElementById("login-view").hidden = false;
}

/* ---------------- SAÍDA POR INATIVIDADE ---------------- */

let timerInatividade = null;
function reiniciarInatividade() {
    clearTimeout(timerInatividade);
    timerInatividade = setTimeout(async () => {
        if (!document.getElementById("panel-view").hidden) {
            await sair();
            mensagemLogin("Você saiu automaticamente após 30 minutos sem uso.", "#a84912");
        }
    }, 30 * 60 * 1000);
}

async function iniciar() {
    ligarEventos();
    ["click", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, reiniciarInatividade, { passive: true }));
    reiniciarInatividade();

    const hash = window.location.hash;
    if (/type=(invite|recovery)/.test(hash)) {
        await sb.auth.getSession();
        document.getElementById("login-view").hidden = true;
        document.getElementById("senha-view").hidden = false;
        return;
    }

    if (await souAdmin()) {
        await abrirPainel();
    }
}

iniciar();
