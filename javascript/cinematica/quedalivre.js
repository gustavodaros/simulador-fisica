function coordenadasVerticais(valores) {
    const verticais = {};
    for (const nome of Object.keys(valores)) {
        let destino = nome;
        if (nome === "x0") destino = "y0";
        if (nome === "x") destino = "y";
        verticais[destino] = valores[nome];
    }
    return verticais;
}

function eventosQuedaLivre(valores) {
    const eventos = {};
    if (valores.v0 === undefined) return { valores: eventos };
    const { y0, v0, g, solo } = valores;

    let tempoMaximo = 0;
    if (v0 > 0) tempoMaximo = v0 / g;
    eventos.tempoAlturaMaxima = tempoMaximo;
    eventos.yMaximo = y0 + v0 * tempoMaximo - g * tempoMaximo * tempoMaximo / 2;
    if (solo !== undefined) {
        eventos.alturaMaxima = eventos.yMaximo - solo;
        const calculo = raizesMRUV(-g / 2, v0, y0 - solo);
        for (const t of calculo.raizes || []) {
            const velocidade = v0 - g * t;
            if (t >= 0 && velocidade <= 0) {
                if (eventos.tempoImpacto === undefined || t < eventos.tempoImpacto) {
                    eventos.tempoImpacto = t === 0 ? 0 : t;
                    eventos.velocidadeImpacto = velocidade;
                }
            }
        }
    }
    if (!Object.values(eventos).every(Number.isFinite)) {
        return { erro: "Resultado numérico inválido nos eventos verticais." };
    }
    return { valores: eventos };
}

function resolverQuedaLivre(dados = {}) {
    const adicionais = ["solo", "alturaInicial", "yMaximo", "alturaMaxima", "tempoAlturaMaxima", "tempoImpacto", "velocidadeImpacto"];
    const objetoValido = dados !== null && typeof dados === "object" && !Array.isArray(dados);
    const entrada = objetoValido ? dados : {};
    const gravidade = lerNumeroMRUV(entrada.g);
    const g = gravidade.ausente ? 9.81 : gravidade.valor;
    const resultado = resolverMRUV(objetoValido ? {
        x0: entrada.y0, x: entrada.y, v0: entrada.v0, v: entrada.v,
        a: -g, deslocamento: entrada.deslocamento, t: entrada.t
    } : dados);
    resultado.movimento = "QUEDA_LIVRE";
    for (const tipo of ["fornecidos", "assumidos", "calculados"]) {
        resultado[tipo] = coordenadasVerticais(resultado[tipo]);
    }
    const desconhecidosMRUV = resultado.desconhecidos.map(function (nome) {
        if (nome === "x0") return "y0";
        if (nome === "x") return "y";
        return nome;
    });
    if (resultado.sucesso) resultado.calculados.a = resultado.fornecidos.a;
    delete resultado.fornecidos.a;

    function finalizar() {
        const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
        resultado.desconhecidos = desconhecidosMRUV.concat(adicionais.filter(function (nome) {
            return valores[nome] === undefined;
        }));
        return resultado;
    }
    function falhar(mensagem) {
        resultado.sucesso = false;
        resultado.situacao = "erro";
        resultado.simulacaoPossivel = false;
        resultado.calculados = {};
        resultado.solucoes = [];
        resultado.mensagens = [mensagem];
        return finalizar();
    }
    if (!objetoValido) return finalizar();
    if (gravidade.erro || g <= 0) return falhar("A gravidade deve ser um número positivo.");
    if (gravidade.ausente) resultado.assumidos.g = g;
    else resultado.fornecidos.g = g;

    for (const nome of ["solo", "alturaInicial"]) {
        const numero = lerNumeroMRUV(entrada[nome]);
        if (numero.erro) return falhar("O campo " + nome + " deve conter um número válido.");
        if (!numero.ausente) resultado.fornecidos[nome] = numero.valor;
    }
    if (!resultado.sucesso) return finalizar();

    const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
    if (valores.alturaInicial !== undefined && valores.alturaInicial < 0) {
        return falhar("A altura inicial acima do solo não pode ser negativa.");
    }
    if (valores.alturaInicial !== undefined && valores.solo === undefined) {
        valores.solo = valores.y0 - valores.alturaInicial;
        resultado.calculados.solo = valores.solo;
    }
    if (valores.solo !== undefined) {
        const altura = valores.y0 - valores.solo;
        if (!Number.isFinite(altura) || altura < 0) return falhar("A posição inicial está abaixo do solo informado.");
        if (valores.alturaInicial !== undefined && !numerosProximosMRUV(altura, valores.alturaInicial)) {
            return falhar("Dados contraditórios: alturaInicial deve ser igual a y0 - solo.");
        }
        if (valores.alturaInicial === undefined) {
            valores.alturaInicial = altura;
            resultado.calculados.alturaInicial = altura;
        }
    }

    resultado.solucoes = resultado.solucoes.map(function (solucao) {
        const vertical = coordenadasVerticais(solucao);
        delete vertical.a;
        vertical.g = g;
        if (valores.solo !== undefined) vertical.solo = valores.solo;
        return vertical;
    });
    const alternativas = resultado.solucoes.length > 0 ? resultado.solucoes : [valores];
    const eventos = [];
    for (const alternativa of alternativas) {
        const analise = eventosQuedaLivre(alternativa);
        if (analise.erro) return falhar(analise.erro);
        eventos.push(analise.valores);
    }
    for (const nome of Object.keys(eventos[0])) {
        const comum = eventos.every(function (evento) {
            return evento[nome] !== undefined && numerosProximosMRUV(evento[nome], eventos[0][nome]);
        });
        if (comum) resultado.calculados[nome] = eventos[0][nome];
    }
    if (valores.solo === undefined) {
        resultado.mensagens.push("Solo desconhecido: não é possível determinar impacto nem altura acima do chão. yMaximo é uma coordenada vertical.");
    }
    const impacto = resultado.calculados.tempoImpacto;
    if (valores.t !== undefined && impacto !== undefined && valores.t > impacto && !numerosProximosMRUV(valores.t, impacto)) {
        resultado.mensagens.push("O tempo informado é posterior ao impacto. Os resultados nesse instante são apenas a continuação matemática das equações.");
    }
    return finalizar();
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
