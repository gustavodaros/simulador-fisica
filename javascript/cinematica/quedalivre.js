/*
 * Movimento vertical: eixo positivo para cima, g > 0 e a = -g.
 * Carregue mruv.js antes deste arquivo (nenhuma dependência de HTML ou DOM).
 * Uso: resolverQuedaLivre({ alturaInicial: 20, v0: 0, g: 10 });
 *      estadoQuedaLivre(resultado, 1);
 * A origem y0 = 0 não representa o solo, a menos que solo = 0 seja conhecido.
 */

function coordenadasVerticais(valores) {
    const verticais = {};
    for (const nome of Object.keys(valores)) {
        const destino = nome === "x0" ? "y0" : nome === "x" ? "y" : nome;
        verticais[destino] = valores[nome];
    }
    return verticais;
}

function eventosQuedaLivre(valores) {
    const eventos = {};
    if (valores.v0 === undefined) return { valores: eventos };
    const { y0, v0, g, solo } = valores;

    // Se começa descendo, o máximo para t >= 0 é a própria posição inicial.
    const tempoMaximo = v0 > 0 ? v0 / g : 0;
    eventos.tempoAlturaMaxima = tempoMaximo;
    eventos.yMaximo = y0 + v0 * tempoMaximo / 2;
    if (solo !== undefined) {
        eventos.alturaMaxima = eventos.yMaximo - solo;
        const calculo = raizesMRUV(-g / 2, v0, y0 - solo);
        if (calculo.erro) return { erro: calculo.erro };
        const encontros = (calculo.raizes || []).filter(function (t) {
            // Exclui a partida para cima a partir do chão: interessa o retorno.
            return t >= 0 && v0 - g * t <= 0;
        }).sort(function (a, b) { return a - b; });
        if (encontros.length > 0) {
            eventos.tempoImpacto = encontros[0] === 0 ? 0 : encontros[0];
            // Torricelli: vImpacto = -sqrt(v0² + 2*g*alturaInicial).
            // hypot calcula a raiz da soma de quadrados sem elevar valores grandes ao quadrado.
            eventos.velocidadeImpacto = -Math.hypot(v0, Math.SQRT2 * Math.sqrt(g) * Math.sqrt(y0 - solo));
        }
    }
    if (!Object.values(eventos).every(Number.isFinite)) {
        return { erro: "O cálculo dos eventos verticais excedeu o limite numérico." };
    }
    return { valores: eventos };
}

function resolverQuedaLivre(dados = {}) {
    const campos = ["y0", "y", "v0", "v", "g", "deslocamento", "t", "solo", "alturaInicial"];
    const principais = ["y0", "y", "v0", "v", "a", "deslocamento", "t"];
    const adicionais = ["solo", "alturaInicial", "yMaximo", "alturaMaxima", "tempoAlturaMaxima", "tempoImpacto", "velocidadeImpacto"];
    const resultado = {
        movimento: "QUEDA_LIVRE", sucesso: true, situacao: "parcial",
        fornecidos: {}, assumidos: {}, calculados: {}, desconhecidos: [],
        simulacaoPossivel: false, solucoes: [], mensagens: []
    };
    function falhar(mensagem) {
        resultado.sucesso = false;
        resultado.situacao = "erro";
        resultado.simulacaoPossivel = false;
        resultado.mensagens.push(mensagem);
    }
    if (typeof resolverMRUV !== "function" || typeof raizesMRUV !== "function") {
        falhar("Carregue mruv.js antes de utilizar o movimento vertical.");
        resultado.desconhecidos = principais.concat(adicionais);
        return resultado;
    }
    if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
        falhar("Informe os dados do movimento vertical em um objeto JavaScript.");
        resultado.desconhecidos = principais.concat(adicionais);
        return resultado;
    }

    const valores = {};
    for (const nome of Object.keys(dados)) {
        if (!campos.includes(nome)) falhar("Campo não reconhecido no movimento vertical: " + nome + ".");
    }
    for (const nome of campos) {
        const entrada = lerNumeroMRUV(dados[nome]);
        if (entrada.erro) falhar("O campo " + nome + " deve conter um número finito.");
        else if (!entrada.ausente) valores[nome] = entrada.valor;
    }
    resultado.fornecidos = Object.assign({}, valores);
    if (valores.g !== undefined && valores.g <= 0) falhar("A gravidade g deve ser positiva; a aceleração será -g.");
    if (valores.t !== undefined && valores.t < 0) falhar("O tempo não pode ser negativo.");
    if (valores.alturaInicial !== undefined && valores.alturaInicial < 0) falhar("A altura inicial acima do solo não pode ser negativa.");
    if (!resultado.sucesso) {
        resultado.desconhecidos = principais.concat(adicionais).filter(function (nome) { return valores[nome] === undefined; });
        return resultado;
    }

    if (valores.g === undefined) {
        valores.g = 9.81;
        resultado.assumidos.g = 9.81;
        resultado.mensagens.push("Gravidade não informada: adotado g = 9.81 m/s².");
    }
    if (valores.y0 === undefined) {
        valores.y0 = 0;
        resultado.assumidos.y0 = 0;
        resultado.mensagens.push("Posição inicial não informada: adotado y0 = 0 m.");
    }

    // alturaInicial é a distância ao chão, não a coordenada y0.
    if (valores.alturaInicial !== undefined && valores.solo === undefined) {
        valores.solo = valores.y0 - valores.alturaInicial;
        resultado.calculados.solo = valores.solo;
    }
    if (valores.solo !== undefined) {
        const altura = valores.y0 - valores.solo;
        if (!Number.isFinite(altura) || !Number.isFinite(valores.solo)) {
            falhar("A relação entre altura, origem e solo excedeu o limite numérico.");
        } else if (altura < 0) {
            falhar("A posição inicial está abaixo do solo informado.");
        } else if (valores.alturaInicial !== undefined && !numerosProximosMRUV(altura, valores.alturaInicial)) {
            falhar("Dados contraditórios: alturaInicial deve ser igual a y0 - solo.");
        } else if (valores.alturaInicial === undefined) {
            valores.alturaInicial = altura;
            resultado.calculados.alturaInicial = altura;
        }
    }
    if (!resultado.sucesso) {
        // Um resultado de erro não deve carregar cálculos não finitos.
        resultado.calculados = {};
        resultado.desconhecidos = principais.concat(adicionais).filter(function (nome) { return valores[nome] === undefined; });
        return resultado;
    }

    const entradaMRUV = { x0: valores.y0, a: -valores.g };
    for (const nome of ["v0", "v", "deslocamento", "t"]) {
        if (valores[nome] !== undefined) entradaMRUV[nome] = valores[nome];
    }
    if (valores.y !== undefined) entradaMRUV.x = valores.y;
    const base = resolverMRUV(entradaMRUV);
    resultado.mensagens.push(...base.mensagens.map(function (mensagem) {
        return mensagem.replace(/\bx0\b/g, "y0").replace(/\bx\b/g, "y");
    }));
    if (!base.sucesso) {
        falhar("Não foi possível resolver o movimento vertical com os dados informados.");
        resultado.desconhecidos = principais.concat(adicionais).filter(function (nome) { return valores[nome] === undefined; });
        return resultado;
    }

    const comuns = coordenadasVerticais(Object.assign({}, base.assumidos, base.fornecidos, base.calculados));
    for (const nome of Object.keys(comuns)) {
        if (resultado.fornecidos[nome] === undefined && resultado.assumidos[nome] === undefined) {
            resultado.calculados[nome] = comuns[nome];
        }
    }
    // Os eventos são calculados por alternativa; só valores comuns são publicados.
    const alternativas = base.solucoes.length > 0 ? base.solucoes.map(coordenadasVerticais) : [comuns];
    const eventos = [];
    for (const alternativa of alternativas) {
        const analise = eventosQuedaLivre(Object.assign({}, alternativa, { g: valores.g, solo: valores.solo }));
        if (analise.erro) {
            falhar(analise.erro);
            resultado.desconhecidos = principais.concat(adicionais).filter(function (nome) {
                return Object.assign({}, valores, resultado.calculados)[nome] === undefined;
            });
            return resultado;
        }
        eventos.push(analise.valores);
    }
    for (const nome of Object.keys(eventos[0])) {
        if (eventos.every(function (evento) { return evento[nome] === eventos[0][nome]; })) {
            resultado.calculados[nome] = eventos[0][nome];
        }
    }

    // Cada solução pode ser passada novamente a resolverQuedaLivre para seleção.
    resultado.solucoes = base.solucoes.map(function (solucao) {
        const vertical = coordenadasVerticais(solucao);
        delete vertical.a;
        vertical.g = valores.g;
        if (valores.solo !== undefined) vertical.solo = valores.solo;
        return vertical;
    });
    resultado.situacao = base.situacao; // Considera as grandezas principais; solo é opcional.
    resultado.simulacaoPossivel = base.simulacaoPossivel;
    const todos = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
    resultado.desconhecidos = principais.concat(adicionais).filter(function (nome) { return todos[nome] === undefined; });
    if (valores.solo === undefined) {
        resultado.mensagens.push("Solo desconhecido: não é possível determinar impacto nem altura acima do chão. yMaximo é uma coordenada vertical.");
    }
    if (todos.t !== undefined && todos.tempoImpacto !== undefined && todos.t > todos.tempoImpacto && !numerosProximosMRUV(todos.t, todos.tempoImpacto)) {
        resultado.mensagens.push("O tempo informado é posterior ao impacto. Os resultados nesse instante são apenas a continuação matemática das equações.");
    }
    return resultado;
}

function estadoQuedaLivre(resultado, tempo) {
    const estado = { movimento: "QUEDA_LIVRE", sucesso: false, mensagens: [] };
    if (typeof estadoMRUV !== "function") {
        estado.mensagens.push("Carregue mruv.js antes de utilizar o movimento vertical.");
        return estado;
    }
    if (!resultado || resultado.movimento !== "QUEDA_LIVRE" || resultado.sucesso !== true || resultado.simulacaoPossivel !== true) {
        estado.mensagens.push("Resolva um movimento vertical com trajetória única antes de consultar seu estado.");
        return estado;
    }
    const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
    const base = {
        movimento: "MRUV", sucesso: true, simulacaoPossivel: true,
        fornecidos: { x0: valores.y0, v0: valores.v0, a: valores.a }
    };
    const consulta = estadoMRUV(base, tempo);
    if (!consulta.sucesso) {
        estado.mensagens = consulta.mensagens;
        return estado;
    }
    if (valores.tempoImpacto !== undefined && consulta.t > valores.tempoImpacto && !numerosProximosMRUV(consulta.t, valores.tempoImpacto)) {
        estado.aposImpacto = true;
        estado.mensagens.push("O instante é posterior ao impacto. Este modelo não descreve o movimento após a colisão.");
        return estado;
    }
    return { movimento: "QUEDA_LIVRE", sucesso: true, t: consulta.t, y: consulta.x, v: consulta.v, a: consulta.a, mensagens: [] };
}
