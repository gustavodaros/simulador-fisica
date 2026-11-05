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
    const objetoValido = dados !== null && typeof dados === "object" && !Array.isArray(dados);
    const entrada = objetoValido ? dados : {};
    const gravidade = lerNumeroMRUV(entrada.g);
    const g = gravidade.ausente ? 9.81 : gravidade.valor;
    const resultado = resolverMRUV(objetoValido ? { x0: entrada.y0, v0: entrada.v0, a: -g } : dados);
    resultado.movimento = "QUEDA_LIVRE";
    if (resultado.fornecidos.x0 !== undefined) {
        resultado.fornecidos.y0 = resultado.fornecidos.x0;
        delete resultado.fornecidos.x0;
    }
    if (resultado.assumidos.x0 !== undefined) {
        resultado.assumidos.y0 = resultado.assumidos.x0;
        delete resultado.assumidos.x0;
    }
    if (resultado.sucesso) resultado.calculados.a = -g;
    delete resultado.fornecidos.a;
    resultado.desconhecidos = ["y", "v", "deslocamento", "t"];

    function falhar(mensagem) {
        resultado.sucesso = false;
        resultado.situacao = "erro";
        resultado.simulacaoPossivel = false;
        resultado.calculados = {};
        resultado.mensagens = [mensagem];
        return resultado;
    }
    if (!objetoValido) return resultado;
    if (gravidade.erro || g <= 0) return falhar("A gravidade deve ser um número positivo.");
    if (gravidade.ausente) resultado.assumidos.g = g;
    else resultado.fornecidos.g = g;
    const solo = lerNumeroMRUV(entrada.solo);
    if (solo.erro) return falhar("A posição do solo deve conter um número válido.");
    if (!solo.ausente) resultado.fornecidos.solo = solo.valor;
    if (!resultado.sucesso) return resultado;

    const valores = Object.assign({}, resultado.assumidos, resultado.fornecidos, resultado.calculados);
    if (!solo.ausente) {
        const altura = valores.y0 - solo.valor;
        if (!Number.isFinite(altura) || altura < 0) return falhar("A posição inicial está abaixo do solo informado.");
        resultado.calculados.alturaInicial = altura;
    }
    const eventos = eventosQuedaLivre(valores);
    if (eventos.erro) return falhar(eventos.erro);
    Object.assign(resultado.calculados, eventos.valores);
    for (const nome of ["solo", "alturaInicial", "yMaximo", "alturaMaxima", "tempoAlturaMaxima", "tempoImpacto", "velocidadeImpacto"]) {
        if (resultado.fornecidos[nome] === undefined && resultado.calculados[nome] === undefined) resultado.desconhecidos.push(nome);
    }
    return resultado;
}

function estadoQuedaLivre(resultado, tempo) {
    const estado = { movimento: "QUEDA_LIVRE", sucesso: false, mensagens: [] };
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
