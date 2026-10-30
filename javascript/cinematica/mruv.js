/*
 * MRUV — posições em m, velocidades em m/s, aceleração em m/s² e tempo em s.
 * Uso: resolverMRUV({ v0: 2, a: 3, t: 4 }); estadoMRUV(resultado, 3);
 * Não depende do MRU. Também fornece auxiliares para quedalivre.js.
 */

function lerNumeroMRUV(valor) {
    if (valor === undefined || valor === null) return { ausente: true };
    if (typeof valor === "string") {
        valor = valor.trim();
        if (valor === "") return { ausente: true };
        const formato = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i;
        if (!formato.test(valor)) return { erro: true };
        valor = Number(valor.replace(",", "."));
    }
    if (typeof valor !== "number" || !Number.isFinite(valor)) return { erro: true };
    return { valor: valor };
}

function numerosProximosMRUV(primeiro, segundo) {
    return Math.abs(primeiro - segundo) <= 1e-9 * Math.max(1, Math.abs(primeiro), Math.abs(segundo));
}

// Resolve A*z² + B*z + C = 0. null indica que qualquer z satisfaz a relação.
function raizesMRUV(A, B, C) {
    if (![A, B, C].every(Number.isFinite)) {
        return { erro: "O cálculo excedeu o limite numérico." };
    }
    if (A === 0) {
        if (B === 0) return { raizes: numerosProximosMRUV(C, 0) ? null : [] };
        const raiz = -C / B;
        return Number.isFinite(raiz) ? { raizes: [raiz] }
            : { erro: "O cálculo excedeu o limite numérico." };
    }
    if (B === 0) {
        // Nas equações de Torricelli, as raízes têm módulos iguais e sinais opostos.
        if (C === 0) return { raizes: [0] };
        if ((A > 0) === (C > 0)) return { raizes: [] };
        const modulo = Math.sqrt(Math.abs(C)) / Math.sqrt(Math.abs(A));
        return Number.isFinite(modulo) ? { raizes: [-modulo, modulo] }
            : { erro: "O cálculo excedeu o limite numérico." };
    }

    // Escalar os coeficientes evita estouro desnecessário no discriminante.
    const escala = Math.max(Math.abs(A), Math.abs(B), Math.abs(C));
    A /= escala;
    B /= escala;
    C /= escala;
    let discriminante = B * B - 4 * A * C;
    const tolerancia = 1e-12 * Math.max(B * B, Math.abs(4 * A * C));
    if (discriminante < -tolerancia) return { raizes: [] };
    if (discriminante < 0) discriminante = 0;
    if (discriminante === 0) {
        const raiz = -B / (2 * A);
        return Number.isFinite(raiz) ? { raizes: [raiz] }
            : { erro: "O cálculo excedeu o limite numérico." };
    }

    // Forma equivalente à fórmula de Bhaskara que evita subtrair números próximos.
    const q = -(B + (B >= 0 ? 1 : -1) * Math.sqrt(discriminante)) / 2;
    const raizes = [q / A, C / q].sort(function (a, b) { return a - b; });
    if (!raizes.every(Number.isFinite)) return { erro: "O cálculo excedeu o limite numérico." };
    return { raizes: raizes };
}

// Analisa uma possibilidade por vez; as raízes diferentes nunca são misturadas.
function possibilidadesMRUV(iniciais) {
    const pendentes = [Object.assign({}, iniciais)];
    const solucoes = [];
    const erros = [];

    while (pendentes.length > 0) {
        const valores = pendentes.pop();
        const { x0, x, v0, v, a, deslocamento: d, t } = valores;
        const propostas = [];
        let erro = "";

        function conhecidos(...nomes) {
            return nomes.every(function (nome) { return valores[nome] !== undefined; });
        }

        function conferir(esquerda, direita, equacao) {
            if (!Number.isFinite(esquerda) || !Number.isFinite(direita)) {
                erro = "A verificação de " + equacao + " excedeu o limite numérico.";
            } else if (!numerosProximosMRUV(esquerda, direita)) {
                erro = "Dados contraditórios: não satisfazem " + equacao + ".";
            }
        }

        function propor(nome, A, B, C) {
            if (valores[nome] !== undefined) return;
            const calculo = raizesMRUV(A, B, C);
            if (calculo.erro) { erro = calculo.erro; return; }
            if (calculo.raizes === null) return;
            const raizes = calculo.raizes.map(function (raiz) {
                // Uma raiz teoricamente zero pode sair ligeiramente negativa
                // por arredondamento. As equações serão conferidas novamente.
                return nome === "t" && raiz < 0 && numerosProximosMRUV(raiz, 0) ? 0 : raiz;
            }).filter(function (raiz) {
                return nome !== "t" || raiz >= 0;
            });
            if (raizes.length === 0) {
                erro = "Dados incompatíveis: não há solução real válida para " + nome
                    + (nome === "t" ? " com tempo não negativo." : ".");
            } else {
                propostas.push({ nome: nome, raizes: raizes });
            }
        }

        function direto(nome, valor) { propor(nome, 0, 1, -valor); }

        if (conhecidos("x", "deslocamento")) conferir(d, x - x0, "deslocamento = x - x0");
        if (conhecidos("v", "v0", "a", "t")) conferir(v, v0 + a * t, "v = v0 + a*t");
        if (conhecidos("deslocamento", "v0", "a", "t")) conferir(d, v0 * t + a * t * t / 2, "deslocamento = v0*t + a*t²/2");
        if (conhecidos("v", "v0", "a", "deslocamento")) conferir(v * v, v0 * v0 + 2 * a * d, "v² = v0² + 2*a*deslocamento");
        if (conhecidos("deslocamento", "v0", "v", "t")) conferir(d, (v0 / 2 + v / 2) * t, "deslocamento = (v0 + v)*t/2");

        // Casos degenerados: multiplicar por zero pode eliminar uma incógnita.
        if (a === 0 || t === 0) {
            if (conhecidos("v0", "v")) conferir(v, v0, "v = v0 quando a = 0 ou t = 0");
            if (conhecidos("v0")) direto("v", v0);
            if (conhecidos("v")) direto("v0", v);
        }
        if (t === 0 || (a === 0 && v0 === 0) || (conhecidos("v0", "v") && v0 + v === 0)) {
            if (conhecidos("deslocamento")) conferir(d, 0, "deslocamento nulo neste caso");
            direto("deslocamento", 0);
        }

        if (conhecidos("x")) direto("deslocamento", x - x0);
        if (conhecidos("deslocamento")) direto("x", x0 + d);

        // v = v0 + a*t.
        if (conhecidos("v0", "a", "t")) direto("v", v0 + a * t);
        if (conhecidos("v", "a", "t")) direto("v0", v - a * t);
        if (conhecidos("v", "v0", "t")) propor("a", 0, t, v0 - v);
        if (conhecidos("v", "v0", "a")) propor("t", 0, a, v0 - v);

        // d = v0*t + a*t²/2.
        if (conhecidos("v0", "a", "t")) direto("deslocamento", v0 * t + a * t * t / 2);
        if (conhecidos("deslocamento", "a", "t")) propor("v0", 0, t, a * t * t / 2 - d);
        if (conhecidos("deslocamento", "v0", "t")) propor("a", 0, t * t / 2, v0 * t - d);
        if (conhecidos("deslocamento", "v0", "a")) propor("t", a / 2, v0, -d);

        // Torricelli. Os dois sinais da velocidade devem ser considerados.
        if (conhecidos("v0", "a", "deslocamento")) propor("v", 1, 0, -v0 * v0 - 2 * a * d);
        if (conhecidos("v", "a", "deslocamento")) propor("v0", 1, 0, 2 * a * d - v * v);
        if (conhecidos("v", "v0", "deslocamento")) propor("a", 0, 2 * d, v0 * v0 - v * v);
        if (conhecidos("v", "v0", "a")) propor("deslocamento", 0, 2 * a, v0 * v0 - v * v);

        // d = (v0 + v)*t/2; também resolve casos em que a é desconhecida.
        if (conhecidos("v0", "v", "t")) direto("deslocamento", (v0 / 2 + v / 2) * t);
        if (conhecidos("deslocamento", "v", "t")) propor("v0", 0, t / 2, v * t / 2 - d);
        if (conhecidos("deslocamento", "v0", "t")) propor("v", 0, t / 2, v0 * t / 2 - d);
        if (conhecidos("deslocamento", "v0", "v")) propor("t", 0, v0 / 2 + v / 2, -d);

        if (erro) {
            erros.push(erro);
            continue;
        }
        if (propostas.length === 0) {
            solucoes.push(valores);
            continue;
        }

        // Primeiro usar resultados únicos; abrir alternativas só quando necessário.
        const proposta = propostas.find(function (item) { return item.raizes.length === 1; }) || propostas[0];
        for (const raiz of proposta.raizes) {
            const alternativa = Object.assign({}, valores);
            alternativa[proposta.nome] = raiz === 0 ? 0 : raiz;
            pendentes.push(alternativa);
        }
    }
    return { solucoes: solucoes, erros: erros };
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
    for (const nome of Object.keys(dados)) {
        if (!grandezas.includes(nome)) falhar("Campo não reconhecido no MRUV: " + nome + ".");
    }
    for (const nome of grandezas) {
        const entrada = lerNumeroMRUV(dados[nome]);
        if (entrada.erro) falhar("O campo " + nome + " deve conter um número finito.");
        else if (!entrada.ausente) valores[nome] = entrada.valor;
    }
    resultado.fornecidos = Object.assign({}, valores);
    if (valores.t !== undefined && valores.t < 0) falhar("O tempo não pode ser negativo.");
    if (!resultado.sucesso) {
        resultado.desconhecidos = grandezas.filter(function (nome) { return valores[nome] === undefined; });
        return resultado;
    }
    if (valores.x0 === undefined) {
        valores.x0 = 0;
        resultado.assumidos.x0 = 0;
        resultado.mensagens.push("Posição inicial não informada: adotado x0 = 0 m.");
    }

    const analise = possibilidadesMRUV(valores);
    if (analise.solucoes.length === 0) {
        falhar(analise.erros[0] || "Os dados não admitem solução física válida.");
        resultado.desconhecidos = grandezas.filter(function (nome) { return valores[nome] === undefined; });
        return resultado;
    }

    const comuns = {};
    for (const nome of grandezas) {
        const primeiro = analise.solucoes[0][nome];
        if (primeiro !== undefined && analise.solucoes.every(function (solucao) {
            // Raízes distintas, mesmo próximas, não viram uma escolha implícita.
            return solucao[nome] === primeiro;
        })) {
            comuns[nome] = primeiro;
            if (valores[nome] === undefined) resultado.calculados[nome] = primeiro;
        }
    }
    resultado.desconhecidos = grandezas.filter(function (nome) { return comuns[nome] === undefined; });
    resultado.simulacaoPossivel = comuns.v0 !== undefined && comuns.a !== undefined;
    if (analise.solucoes.length > 1) {
        resultado.situacao = "ambiguo";
        resultado.solucoes = analise.solucoes.sort(function (a, b) {
            return (a.t ?? 0) - (b.t ?? 0) || (a.v0 ?? 0) - (b.v0 ?? 0) || (a.v ?? 0) - (b.v ?? 0);
        });
        resultado.mensagens.push("Há múltiplas soluções válidas. Consulte solucoes; nenhuma alternativa foi escolhida automaticamente.");
    } else {
        resultado.situacao = resultado.desconhecidos.length === 0 ? "determinado" : "parcial";
    }
    if (resultado.desconhecidos.length > 0) {
        resultado.mensagens.push("Grandezas sem valor único: " + resultado.desconhecidos.join(", ") + ".");
    }
    resultado.mensagens.push(resultado.simulacaoPossivel
        ? "Trajetória definida por x0, v0 e a; é possível consultar seu estado."
        : "Não há uma trajetória única: é necessário determinar v0 e a.");
    return resultado;
}

// Para escolher uma trajetória ambígua, resolva novamente com a solução desejada:
// resolverMRUV(resultado.solucoes[indice]). Nenhuma escolha é implícita.
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
    if (![valores.x0, valores.v0, valores.a].every(Number.isFinite)) {
        estado.mensagens.push("O resultado não contém condições iniciais válidas.");
        return estado;
    }
    const t = entrada.valor;
    const x = valores.x0 + valores.v0 * t + valores.a * t * t / 2;
    const v = valores.v0 + valores.a * t;
    if (![x, v].every(Number.isFinite)) {
        estado.mensagens.push("A consulta excedeu o limite numérico.");
        return estado;
    }
    return { movimento: "MRUV", sucesso: true, t: t, x: x, v: v, a: valores.a, mensagens: [] };
}
