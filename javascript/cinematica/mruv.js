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

function resolverMRUV(dados = {}) {
    const resultado = {
        movimento: "MRUV", sucesso: true, situacao: "parcial",
        fornecidos: {}, assumidos: {}, calculados: {}, desconhecidos: [],
        simulacaoPossivel: false, solucoes: [], mensagens: []
    };
    if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
        resultado.mensagens.push("Informe os dados do MRUV em um objeto JavaScript.");
    } else {
        for (const nome of ["x0", "v0", "a"]) {
            const entrada = lerNumeroMRUV(dados[nome]);
            if (entrada.erro) resultado.mensagens.push("O campo " + nome + " deve conter um número válido.");
            else if (!entrada.ausente) resultado.fornecidos[nome] = entrada.valor;
        }
    }
    if (resultado.mensagens.length > 0) {
        resultado.sucesso = false;
        resultado.situacao = "erro";
        return resultado;
    }
    if (resultado.fornecidos.x0 === undefined) resultado.assumidos.x0 = 0;
    const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos);
    resultado.desconhecidos = ["x", "v", "deslocamento", "t"];
    for (const nome of ["v0", "a"]) {
        if (valores[nome] === undefined) resultado.desconhecidos.push(nome);
    }
    resultado.simulacaoPossivel = valores.v0 !== undefined && valores.a !== undefined;
    if (!resultado.simulacaoPossivel) {
        resultado.mensagens.push("Informe velocidade inicial e aceleração para definir o MRUV.");
    } else if (valores.a === 0) {
        resultado.calculados.v = valores.v0;
        resultado.desconhecidos = ["x", "deslocamento", "t"];
        if (valores.v0 === 0) {
            resultado.calculados.x = valores.x0;
            resultado.calculados.deslocamento = 0;
            resultado.desconhecidos = ["t"];
        }
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
