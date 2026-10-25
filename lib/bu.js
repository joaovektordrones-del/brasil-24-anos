// Decodificador mínimo do Boletim de Urna (BU) do TSE — arquivo -bu.dat (ASN.1 DER).
// Extrai, para uma eleição (ex.: 6258), aptos, comparecimento e votos por candidato/branco/nulo.
function parseDER(buf, off, end) {
  const nodes = [];
  let i = off;
  while (i < end) {
    const tag = buf[i++];
    let len = buf[i++];
    if (len & 0x80) { const n = len & 0x7f; len = 0; for (let k = 0; k < n; k++) len = (len << 8) | buf[i++]; }
    const s = i, e = i + len;
    const node = { tag, s, e };
    if (tag & 0x20) node.ch = parseDER(buf, s, e);
    else {
      let n = 0; for (let k = s; k < e; k++) n = n * 256 + buf[k];
      node.n = (e - s) <= 6 ? n : null;
    }
    nodes.push(node);
    i = e;
  }
  return nodes;
}
function findSeqStartingWithInt(nodes, val, out = []) {
  for (const n of nodes) {
    if (n.ch) {
      if (n.tag === 0x30 && n.ch[0] && n.ch[0].tag === 2 && n.ch[0].n === val) out.push(n);
      findSeqStartingWithInt(n.ch, val, out);
    }
  }
  return out;
}
function collectVotes(nodes, out = []) {
  for (const n of nodes) {
    if (n.ch) {
      const c = n.ch;
      if (n.tag === 0x30 && c[0] && c[0].tag === 0x81 && c[1] && c[1].tag === 0x82) {
        const v = { tipo: c[0].n, qtd: c[1].n };
        const id = c.find(x => x.tag === 0xa3);
        if (id && id.ch) { v.partido = id.ch[0] && id.ch[0].n; v.codigo = id.ch[1] && id.ch[1].n; }
        out.push(v);
      } else collectVotes(c, out);
    }
  }
  return out;
}
function decodeBU(bytes, idEleicao) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const top = parseDER(buf, 0, buf.length);
  // envelope: OCTET STRING grande dentro do SEQUENCE raiz
  let inner = null;
  const root = top[0];
  if (root && root.ch) for (const c of root.ch) if (c.tag === 4 && (c.e - c.s) > 100) inner = parseDER(buf, c.s, c.e);
  if (!inner) inner = top;
  const ele = findSeqStartingWithInt(inner, idEleicao)[0];
  if (!ele) return null;
  const aptos = ele.ch[1] && ele.ch[1].n;
  // comparecimento: SEQ { ENUM tipoCargo, INT qtdComparecimento, ... } dentro de ele
  let comp = null;
  (function walk(nodes) { for (const n of nodes) { if (n.ch) { if (n.tag === 0x30 && n.ch[0] && n.ch[0].tag === 10 && n.ch[1] && n.ch[1].tag === 2 && comp === null) comp = n.ch[1].n; walk(n.ch); } } })(ele.ch);
  const votos = collectVotes(ele.ch);
  const r = { aptos, comp, nominal: {}, branco: 0, nulo: 0 };
  for (const v of votos) {
    if (v.tipo === 1 && v.codigo != null) r.nominal[v.codigo] = (r.nominal[v.codigo] || 0) + v.qtd;
    else if (v.tipo === 2) r.branco += v.qtd;
    else if (v.tipo === 3) r.nulo += v.qtd;
  }
  return r;
}
module.exports = { decodeBU, parseDER };
