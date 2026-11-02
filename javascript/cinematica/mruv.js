function lerNumeroMRUV(valor) {
    if (valor === undefined || valor === null) return { ausente: true };
    if (typeof valor === "string") {
        valor = valor.trim();
        if (valor === "") return { ausente: true };
        valor = Number(valor.replace(",", "."));
    }
    if (typeof valor !== "number" || !Number.isFinite(valor)) return { erro: true };
    return { valor: valor };
}

function numerosProximosMRUV(primeiro, segundo) {
    return Math.abs(primeiro - segundo) <= 1e-9 * Math.max(1, Math.abs(primeiro), Math.abs(segundo));
}

function raizesMRUV(A, B, C) {
    if (A === 0) {
        if (B === 0) return { raizes: numerosProximosMRUV(C, 0) ? null : [] };
        return { raizes: [-C / B] };
    }

    let discriminante = B * B - 4 * A * C;
    const tolerancia = 1e-12 * Math.max(B * B, Math.abs(4 * A * C));
    if (discriminante < -tolerancia) return { raizes: [] };
    if (discriminante < 0) discriminante = 0;

    const primeira = (-B - Math.sqrt(discriminante)) / (2 * A);
    const segunda = (-B + Math.sqrt(discriminante)) / (2 * A);
    if (discriminante === 0) return { raizes: [primeira] };
    return { raizes: [Math.min(primeira, segunda), Math.max(primeira, segunda)] };
}

function possibilidadesMRUV(iniciais) {
    const pendentes = [Object.assign({}, iniciais)];
    const solucoes = [];

    while (pendentes.length > 0) {
        const valores = pendentes.pop();
        const { x0, x, v0, v, a, deslocamento: d, t } = valores;
        let proposta = null;
        let compativel = true;

        function conhecidos(...nomes) {
            for (const nome of nomes) {
                if (valores[nome] === undefined) return false;
            }
            return true;
        }

        function conferir(esquerda, direita) {
            if (!numerosProximosMRUV(esquerda, direita)) compativel = false;
        }

        function propor(nome, A, B, C) {
            if (valores[nome] !== undefined) return;
            const calculo = raizesMRUV(A, B, C);
            if (calculo.raizes === null) return;
            const raizes = [];
            for (let raiz of calculo.raizes) {
                if (nome === "t" && raiz < 0) {
                    if (numerosProximosMRUV(raiz, 0)) raiz = 0;
                    else continue;
                }
                raizes.push(raiz);
            }
            if (raizes.length === 0) {
                compativel = false;
            } else if (proposta === null || (proposta.raizes.length > 1 && raizes.length === 1)) {
                proposta = { nome: nome, raizes: raizes };
            }
        }

        function direto(nome, valor) { propor(nome, 0, 1, -valor); }

        if (conhecidos("x", "deslocamento")) conferir(d, x - x0);
        if (conhecidos("v", "v0", "a", "t")) conferir(v, v0 + a * t);
        if (conhecidos("deslocamento", "v0", "a", "t")) conferir(d, v0 * t + a * t * t / 2);
        if (conhecidos("v", "v0", "a", "deslocamento")) conferir(v * v, v0 * v0 + 2 * a * d);
        if (conhecidos("deslocamento", "v0", "v", "t")) conferir(d, (v0 + v) * t / 2);

        if (a === 0 || t === 0) {
            if (conhecidos("v0", "v")) conferir(v, v0);
            if (conhecidos("v0")) direto("v", v0);
            if (conhecidos("v")) direto("v0", v);
        }
        if (t === 0 || (a === 0 && v0 === 0) || (conhecidos("v0", "v") && v0 + v === 0)) {
            if (conhecidos("deslocamento")) conferir(d, 0);
            direto("deslocamento", 0);
        }

        if (conhecidos("x")) direto("deslocamento", x - x0);
        if (conhecidos("deslocamento")) direto("x", x0 + d);

        if (conhecidos("v0", "a", "t")) direto("v", v0 + a * t);
        if (conhecidos("v", "a", "t")) direto("v0", v - a * t);
        if (conhecidos("v", "v0", "t")) propor("a", 0, t, v0 - v);
        if (conhecidos("v", "v0", "a")) propor("t", 0, a, v0 - v);

        if (conhecidos("v0", "a", "t")) direto("deslocamento", v0 * t + a * t * t / 2);
        if (conhecidos("deslocamento", "a", "t")) propor("v0", 0, t, a * t * t / 2 - d);
        if (conhecidos("deslocamento", "v0", "t")) propor("a", 0, t * t / 2, v0 * t - d);
        if (conhecidos("deslocamento", "v0", "a")) propor("t", a / 2, v0, -d);

        if (conhecidos("v0", "a", "deslocamento")) propor("v", 1, 0, -v0 * v0 - 2 * a * d);
        if (conhecidos("v", "a", "deslocamento")) propor("v0", 1, 0, 2 * a * d - v * v);
        if (conhecidos("v", "v0", "deslocamento")) propor("a", 0, 2 * d, v0 * v0 - v * v);
        if (conhecidos("v", "v0", "a")) propor("deslocamento", 0, 2 * a, v0 * v0 - v * v);

        if (conhecidos("v0", "v", "t")) direto("deslocamento", (v0 / 2 + v / 2) * t);
        if (conhecidos("deslocamento", "v", "t")) propor("v0", 0, t / 2, v * t / 2 - d);
        if (conhecidos("deslocamento", "v0", "t")) propor("v", 0, t / 2, v0 * t / 2 - d);
        if (conhecidos("deslocamento", "v0", "v")) propor("t", 0, v0 / 2 + v / 2, -d);

        if (!compativel) continue;
        if (proposta === null) {
            if (Object.values(valores).every(Number.isFinite)) solucoes.push(valores);
            continue;
        }

        for (const raiz of proposta.raizes) {
            const alternativa = Object.assign({}, valores);
            alternativa[proposta.nome] = raiz === 0 ? 0 : raiz;
            pendentes.push(alternativa);
        }
    }
    return solucoes;
}

function resolverMRUV(dados = {}) {
    const grandezas = ["x0", "x", "v0", "v", "a", "deslocamento", "t"];
    const resultado = {
        movimento: "MRUV", sucesso: true, situacao: "parcial",
        fornecidos: {}, assumidos: {}, calculados: {}, desconhecidos: [],
        simulacaoPossivel: false, solucoes: [], mensagens: []
    };
    const valores = {};
    function falhar(mensagem) {
        resultado.sucesso = false;
        resultado.situacao = "erro";
        resultado.mensagens.push(mensagem);
    }
    if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
        falhar("Informe os dados do MRUV em um objeto JavaScript.");
        resultado.desconhecidos = grandezas.slice();
        return resultado;
    }
    for (const nome of grandezas) {
        const entrada = lerNumeroMRUV(dados[nome]);
        if (entrada.erro) falhar("O campo " + nome + " deve conter um número finito.");
        else if (!entrada.ausente) {
            valores[nome] = entrada.valor;
            resultado.fornecidos[nome] = entrada.valor;
        }
    }
    if (valores.t !== undefined && valores.t < 0) falhar("O tempo não pode ser negativo.");
    if (!resultado.sucesso) {
        resultado.desconhecidos = grandezas.filter(function (nome) { return valores[nome] === undefined; });
        return resultado;
    }
    if (valores.x0 === undefined) {
        valores.x0 = 0;
        resultado.assumidos.x0 = 0;
    }

    const solucoes = possibilidadesMRUV(valores);
    if (solucoes.length === 0) {
        falhar("Os dados não admitem solução física válida.");
        resultado.desconhecidos = grandezas.filter(function (nome) { return valores[nome] === undefined; });
        return resultado;
    }

    const comuns = {};
    for (const nome of grandezas) {
        const primeiro = solucoes[0][nome];
        let valorUnico = primeiro !== undefined;
        for (const solucao of solucoes) {
            if (solucao[nome] !== primeiro) valorUnico = false;
        }
        if (valorUnico) {
            comuns[nome] = primeiro;
            if (valores[nome] === undefined) resultado.calculados[nome] = primeiro;
        }
    }
    resultado.desconhecidos = grandezas.filter(function (nome) { return comuns[nome] === undefined; });
    resultado.simulacaoPossivel = comuns.v0 !== undefined && comuns.a !== undefined;
    if (solucoes.length > 1) {
        resultado.situacao = "ambiguo";
        resultado.solucoes = solucoes;
        resultado.mensagens.push("Há múltiplas soluções válidas. Consulte solucoes; nenhuma alternativa foi escolhida automaticamente.");
    } else {
        resultado.situacao = resultado.desconhecidos.length === 0 ? "determinado" : "parcial";
    }
    if (!resultado.simulacaoPossivel) {
        resultado.mensagens.push("Dados insuficientes para definir uma trajetória única.");
    }
    return resultado;
}

function estadoMRUV(resultado, tempo) {
    const estado = { movimento: "MRUV", sucesso: false, mensagens: [] };
    if (!resultado || resultado.movimento !== "MRUV" || resultado.sucesso !== true || resultado.simulacaoPossivel !== true) {
        estado.mensagens.push("Resolva um MRUV com trajetória única antes de consultar seu estado.");
        return estado;
    }
    const entrada = lerNumeroMRUV(tempo);
    if (entrada.erro || entrada.ausente || entrada.valor < 0) {
        estado.mensagens.push("Informe um tempo finito e não negativo para a consulta.");
        return estado;
    }
    const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
    const t = entrada.valor;
    const x = valores.x0 + valores.v0 * t + valores.a * t * t / 2;
    const v = valores.v0 + valores.a * t;
    if (!Number.isFinite(x) || !Number.isFinite(v)) {
        estado.mensagens.push("Resultado numérico inválido.");
        return estado;
    }
    return { movimento: "MRUV", sucesso: true, t: t, x: x, v: v, a: valores.a, mensagens: [] };
}
