const simulacoes = {
    mru: {
        titulo: "MRU", formula: "x = x₀ + v·t", campos: ["x0", "v"], obrigatorios: ["v"],
        resolver: resolverMRU, estado: estadoMRU
    },
    mruv: {
        titulo: "MRUV", formula: "x = x₀ + v₀·t + a·t²/2", campos: ["x0", "v0", "a"], obrigatorios: ["v0", "a"],
        resolver: resolverMRUV, estado: estadoMRUV
    },
    queda_livre: {
        titulo: "Queda livre", formula: "y = y₀ + v₀·t − g·t²/2",
        campos: ["y0", "v0", "g", "solo"], obrigatorios: ["v0"],
        resolver: resolverQuedaLivre, estado: estadoQuedaLivre
    },
    forca: {
        titulo: "Segunda Lei de Newton", formula: "F = m·a", campos: ["m", "F", "x0", "v0"], obrigatorios: ["m", "F"],
        resolver: resolverNewton, estado: estadoNewton
    },
    atrito: {
        titulo: "Atrito", formula: "Fres = F − Fat; a = Fres/m",
        campos: ["m", "F", "mue", "muc", "g", "v0", "x0"], obrigatorios: ["m", "F", "mue", "muc"],
        resolver: resolverAtrito, estado: estadoAtrito
    },
    trabalho: {
        titulo: "Trabalho", formula: "W = F·Δx·cos(θ)", campos: ["F", "deslocamento", "angulo"],
        obrigatorios: ["F", "deslocamento"], resolver: resolverTrabalho, estado: estadoTrabalho
    }
};
const rotulos = {
    x0: "Posição inicial x₀ (m)", y0: "Posição vertical inicial y₀ (m)",
    v0: "Velocidade inicial v₀ (m/s)", v: "Velocidade v (m/s)",
    a: "Aceleração a (m/s²)", deslocamento: "Deslocamento Δx (m)",
    m: "Massa m (kg)", F: "Força F (N)", g: "Gravidade g (m/s²)",
    solo: "Posição do solo (m)",
    mue: "Atrito estático μₑ", muc: "Atrito cinético μ꜀", angulo: "Ângulo (graus)"
};
const duracaoPadrao = 5;
let atual, resultado, quadro, inicio, tempo = 0, duracao = duracaoPadrao, limites;
const porId = id => document.getElementById(id);
const mostrar = pagina => ["inicio", "opcoes-cinematica", "opcoes-dinamica", "simulacao"]
    .forEach(id => porId(id).hidden = id !== pagina);

function abrir(id) {
    atual = simulacoes[id];
    if (!atual) return;
    parar();
    resultado = null;
    tempo = 0;
    duracao = duracaoPadrao;
    limites = null;
    porId("titulo-simulacao").textContent = atual.titulo;
    porId("formula").textContent = atual.formula;
    porId("resultados").textContent = "";
    porId("parametros").replaceChildren();
    atual.campos.forEach(nome => {
        const label = document.createElement("label");
        label.textContent = rotulos[nome] + (atual.obrigatorios.includes(nome) ? " (obrigatório)" : " (opcional)");
        const input = document.createElement("input");
        input.type = "number";
        input.step = "any";
        input.id = "parametro-" + nome;
        input.dataset.campo = nome;
        input.required = atual.obrigatorios.includes(nome);
        input.addEventListener("input", invalidar);
        label.append(input);
        porId("parametros").append(label);
    });
    const label = document.createElement("label");
    label.textContent = "Tempo em segundos (opcional)";

    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.id = "duracao";
    input.addEventListener("input", invalidar);

    label.append(input);
    porId("parametros").append(label);
    
    limparCanvas();
    mostrar("simulacao");
}

function lerCampos() {
    const campos = {};
    porId("parametros").querySelectorAll("[data-campo]").forEach(input => {
        campos[input.dataset.campo] = input.value;
    });
    return campos;
}

function invalidar() {
    parar();
    resultado = null;
    tempo = 0;
    duracao = duracaoPadrao;
    limites = null;
    exibir({ mensagens: ["Parâmetros alterados. Inicie novamente para aplicar os novos valores."] });
    limparCanvas("Parâmetros alterados. Inicie novamente para aplicar os novos valores.");
}

const nomes = {
    x0: ["Posição inicial x₀", "m"], y0: ["Posição vertical inicial y₀", "m"], x: ["Posição x", "m"], y: ["Posição y", "m"],
    v0: ["Velocidade inicial v₀", "m/s"], v: ["Velocidade v", "m/s"], a: ["Aceleração a", "m/s²"],
    t: ["Tempo t", "s"], deslocamento: ["Deslocamento Δx", "m"], m: ["Massa m", "kg"], F: ["Força F", "N"],
    g: ["Gravidade g", "m/s²"], solo: ["Posição do solo", "m"], mue: ["Atrito estático μₑ", ""],
    muc: ["Atrito cinético μ꜀", ""], angulo: ["Ângulo θ", "°"], N: ["Normal N", "N"],
    fatMax: ["Atrito estático máximo", "N"], Fat: ["Atrito Fat", "N"], Fres: ["Força resultante", "N"],
    tempoParada: ["Tempo até parar", "s"], distanciaParada: ["Distância até parar", "m"],
    trabalho: ["Trabalho W", "J"], alturaInicial: ["Altura inicial", "m"], yMaximo: ["Posição vertical máxima", "m"],
    alturaMaxima: ["Altura máxima acima do solo", "m"], tempoAlturaMaxima: ["Tempo até a altura máxima", "s"],
    tempoFinal: ["Tempo considerado (final da simulação)", "s"],
    xFinal: ["Posição final", "m"], yFinal: ["Posição vertical final", "m"],
    vFinal: ["Velocidade final", "m/s"], vConstante: ["Velocidade constante", "m/s"],
    deslocamentoVertical: ["Deslocamento vertical Δy", "m"],
    forcaResultante: ["Força resultante", "N"], forcaAplicada: ["Força aplicada", "N"],
    tempoAtual: ["Tempo atual", "s"], trabalhoTotal: ["Trabalho total", "J"],
    tempoImpacto: ["Tempo até o impacto", "s"], velocidadeImpacto: ["Velocidade no impacto", "m/s"]
};

function formatar(nome, valor) {
    if (Math.abs(valor) < 0.00005) valor = 0;
    const [rotulo, unidade] = nomes[nome] || [nome, ""];
    return rotulo + " = " + Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 4 }) + (unidade ? " " + unidade : "");
}

function exibir(dados) {
    const itens = [...(dados.mensagens || [])];
    ["fornecidos", "calculados"].forEach(tipo => {
        const valores = Object.entries(dados[tipo] || {}).filter(([, valor]) => Number.isFinite(valor));
        if (valores.length) itens.push(tipo === "fornecidos" ? "Dados" : "Resultados");
        valores.forEach(([nome, valor]) => itens.push(formatar(nome, valor)));
    });
    const lista = document.createElement("ul");
    itens.forEach(texto => {
        const li = document.createElement("li");
        li.textContent = texto;
        lista.append(li);
    });
    porId("resultados").replaceChildren(lista);
}

function exibirResultados(consulta) {
    const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
    let dados, calculados;
    if (atual === simulacoes.forca) {
        dados = { m: valores.m, forcaResultante: valores.F };
        calculados = { a: valores.a };
    } else if (atual === simulacoes.trabalho) {
        dados = { F: valores.F, deslocamento: valores.deslocamento, angulo: valores.angulo };
        calculados = { trabalhoTotal: valores.trabalho };
    } else if (atual === simulacoes.atrito) {
        dados = { m: valores.m, forcaAplicada: valores.F, mue: valores.mue, muc: valores.muc, g: valores.g };
        calculados = { tempoAtual: consulta.t, N: valores.N, fatMax: valores.fatMax,
            Fat: consulta.Fat, Fres: consulta.Fres, a: consulta.a };
    } else if (atual === simulacoes.queda_livre) {
        dados = { y0: valores.y0, v0: valores.v0, g: valores.g, solo: valores.solo };
        calculados = { tempoFinal: duracao, yFinal: consulta.y, vFinal: consulta.v,
            deslocamentoVertical: consulta.y - valores.y0,
            yMaximo: valores.yMaximo, alturaMaxima: valores.alturaMaxima,
            tempoImpacto: valores.tempoImpacto, velocidadeImpacto: valores.velocidadeImpacto };
    } else {
        dados = atual === simulacoes.mru ? { x0: valores.x0, vConstante: valores.v }
            : { x0: valores.x0, v0: valores.v0, a: valores.a };
        calculados = { tempoFinal: duracao, xFinal: consulta.x, deslocamento: consulta.x - valores.x0 };
        if (atual === simulacoes.mruv) calculados.vFinal = consulta.v;
    }
    exibir({ fornecidos: dados, calculados: calculados });
}

function estado(t) {
    return atual.estado(resultado, t, duracao);
}

function desenhar(t) {
    const s = estado(t);
    if (!s.sucesso) {
        exibir({ mensagens: s.mensagens || ["Não foi possível calcular o movimento."] });
        return false;
    }
    if (atual === simulacoes.atrito) exibirResultados(s);
    desenharMovimentoCanvas(s, atual === simulacoes.queda_livre ? "QUEDA_LIVRE" : atual.titulo, limites);
    return true;
}

function ajustarEscala(inicio) {
    const largura = porId("tela").width;
    let menor = 0, maior = 0, forcaMax = 0;
    for (let i = 0; i <= 200; i++) {
        const s = estado(duracao * i / 200);
        if (!s.sucesso) continue;
        if (Number.isFinite(s.x)) {
            menor = Math.min(menor, s.x - inicio);
            maior = Math.max(maior, s.x - inicio);
        }
        if (Number.isFinite(s.F)) forcaMax = Math.max(forcaMax, Math.abs(s.F));
        if (Number.isFinite(s.Fat)) forcaMax = Math.max(forcaMax, Math.abs(s.Fat));
    }
    const percurso = maior - menor;
    const escala = percurso > 0 ? Math.min(100, largura * 0.8 / percurso) : 10;
    const origem = percurso > 0 ? largura * 0.1 - menor * escala : largura / 2;
    return { escala: escala, origem: origem, forcaMax: forcaMax };
}

function animar(ms) {
    if (inicio === null) inicio = ms - tempo * 1000;
    tempo = Math.min((ms - inicio) / 1000, duracao);
    if (desenhar(tempo) && tempo < duracao) quadro = requestAnimationFrame(animar);
    else parar();
}

function parar() {
    if (quadro !== null) cancelAnimationFrame(quadro);
    quadro = inicio = null;
}

function iniciar() {
    if (quadro !== null) return;
    if (!resultado || !resultado.sucesso || !resultado.simulacaoPossivel || tempo >= duracao) {
        const obrigatorioVazio = porId("parametros").querySelector("input:required:invalid");
        if (obrigatorioVazio) return obrigatorioVazio.reportValidity();
        const campos = lerCampos();

        const valorDuracao = porId("duracao").value;

        if (valorDuracao === "") {
        duracao = duracaoPadrao;
        } else {
        duracao = Number(valorDuracao);
        }

        if (!Number.isFinite(duracao) || duracao <= 0) {
        alert("Digite um tempo válido em segundos.");
        return;
}

resultado = atual.resolver(campos);
        if (!resultado.sucesso || !resultado.simulacaoPossivel) {
            exibir({ mensagens: resultado.mensagens.length ? resultado.mensagens : ["Não foi possível calcular o movimento."] });
            return;
        }
        tempo = 0;
        const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
        if (atual === simulacoes.queda_livre && valores.tempoImpacto >= 0) duracao = Math.min(duracao, valores.tempoImpacto);
        const final = estado(duracao);
        if (!final.sucesso) return exibir({ mensagens: final.mensagens });
        exibirResultados(final);
        const a = estado(0);
        if (!a.sucesso) return exibir({ mensagens: a.mensagens });
        limites = atual === simulacoes.queda_livre
            ? { inicio: a.y, solo: valores.solo }
            : Object.assign({ inicio: a.x }, ajustarEscala(a.x));
        desenhar(0);
    }
    if (tempo >= duracao) return;
    quadro = requestAnimationFrame(animar);
}

porId("cinematica").onclick = () => mostrar("opcoes-cinematica");
porId("dinamica").onclick = () => mostrar("opcoes-dinamica");
document.querySelectorAll("#opcoes-cinematica button[id], #opcoes-dinamica button[id]")
    .forEach(button => button.onclick = () => abrir(button.id));
document.querySelectorAll(".voltar").forEach(button => button.onclick = () => mostrar("inicio"));
porId("voltar-simulacao").onclick = () => {
    parar();
    mostrar(Object.keys(simulacoes).indexOf(Object.keys(simulacoes).find(id => simulacoes[id] === atual)) < 3
        ? "opcoes-cinematica" : "opcoes-dinamica");
};
porId("iniciar").onclick = iniciar;
porId("pausar").onclick = parar;
porId("reiniciar").onclick = () => {
    parar();
    tempo = 0;
    if (resultado && resultado.simulacaoPossivel) desenhar(0);
    else limparCanvas();
};
mostrar("inicio");
limparCanvas();
