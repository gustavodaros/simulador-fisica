function desenharMovimentoCanvas(estado, movimento, limites = {}) {
    const tela = document.getElementById("tela");
    const c = tela && tela.getContext("2d");
    if (!c) return;

    const { width: w, height: h } = tela;
    const vertical = movimento === "QUEDA_LIVRE";
    const inicio = limites.inicio || 0, fim = limites.fim || inicio;
    const temSolo = Number.isFinite(limites.solo);
    const solo = temSolo ? limites.solo : 0;
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#f8fafc";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#64748b";
    c.lineWidth = 3;
    c.beginPath();

    let x, y, pos;
    if (vertical) {
        pos = Number.isFinite(estado.y) ? estado.y : solo;
        const min = temSolo ? Math.min(solo, inicio, fim) : Math.min(inicio, fim);
        const max = temSolo ? Math.max(solo, inicio, fim) : Math.max(inicio, fim);
        const faixa = Math.max(max - min, 1);
        const escala = h * 0.65 / faixa, chao = h * 0.85;
        y = chao - (pos - min) * escala - (temSolo ? 18 : 0);
        x = w / 2;
        if (temSolo) {
            c.moveTo(40, chao - (solo - min) * escala);
            c.lineTo(w - 40, chao - (solo - min) * escala);
        }
    } else {
        pos = Number.isFinite(estado.x) ? estado.x : inicio;
        x = w * 0.16 + (pos - inicio) / (fim - inicio || 1) * w * 0.68;
        y = h * 0.72;
        c.moveTo(40, y + 24);
        c.lineTo(w - 40, y + 24);
    }
    c.stroke();
    c.fillStyle = "#2563eb";
    c.beginPath();
    c.arc(Math.max(18, Math.min(w - 18, x)), Math.max(18, Math.min(h - 18, y)), 18, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#0f172a";
    c.font = "14px sans-serif";
    c.fillText((vertical ? "y" : "x") + " = " + pos.toFixed(2) + " m", 16, 22);
    c.fillText("t = " + estado.t.toFixed(2) + " s", w - 105, 22);
    if (Number.isFinite(estado.v)) c.fillText("v = " + estado.v.toFixed(2) + " m/s", 16, h - 10);
    if (Number.isFinite(estado.a)) c.fillText("a = " + estado.a.toFixed(2) + " m/s²", w - 140, h - 10);
}

function limparCanvas(mensagem = "Configure os parâmetros e inicie a simulação.") {
    const tela = document.getElementById("tela");
    const c = tela && tela.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, tela.width, tela.height);
    c.fillStyle = "#f8fafc";
    c.fillRect(0, 0, tela.width, tela.height);
    c.fillStyle = "#475569";
    c.font = "16px sans-serif";
    c.textAlign = "center";
    c.fillText(mensagem, tela.width / 2, tela.height / 2);
    c.textAlign = "start";
}
