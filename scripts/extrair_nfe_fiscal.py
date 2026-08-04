#!/usr/bin/env python3
"""
Extrai dados fiscais de XMLs de NF-e de entrada, cruza com catálogo de produtos
e gera CSVs + SQL. Não altera o banco.
"""
import os, sys, csv, json, re, math, io
from pathlib import Path
from collections import defaultdict
import xml.etree.ElementTree as ET
from supabase import create_client, Client

# forçar UTF-8 no terminal Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── configuração ──────────────────────────────────────────────────────────────
# Caminhos parametrizáveis: env NFE_INPUT_DIR / NFE_OUTPUT_DIR ou 1º arg CLI.
# Fallback: input data/nfe/ e output data/nfe-output/ dentro do repo.
REPO_ROOT = Path(__file__).resolve().parent.parent
PASTA_BASE = Path(os.environ.get("NFE_INPUT_DIR", sys.argv[1] if len(sys.argv) > 1 else REPO_ROOT / "data" / "nfe"))
SAIDA = Path(os.environ.get("NFE_OUTPUT_DIR", REPO_ROOT / "data" / "nfe-output"))
CNPJ_ANDINHO = "20590412000136"
NCM_PREFIXOS = ("33", "34", "21")  # cosmético, sabão/lenço, alimento

# ── 1. contagem de arquivos ──────────────────────────────────────────────────
if not PASTA_BASE.exists():
    print(f"ERRO: pasta de entrada não existe: {PASTA_BASE}")
    print("Defina NFE_INPUT_DIR, passe o caminho como argumento ou crie data/nfe/")
    sys.exit(1)
SAIDA.mkdir(parents=True, exist_ok=True)
xmls = sorted(PASTA_BASE.rglob("*.xml"))
print(f"ARQUIVOS ENCONTRADOS: {len(xmls)}")
por_dir = defaultdict(int)
for f in xmls:
    por_dir[str(f.parent.relative_to(PASTA_BASE))] += 1
for d, n in sorted(por_dir.items()):
    print(f"  {n:>4}  {d if d != '.' else '(raiz)'}")
if len(xmls) != 267:
    print(f"\nERRO: esperados 267 XMLs, encontrados {len(xmls)}. Abortando.")
    sys.exit(1)
print()

# ── helpers XML ──────────────────────────────────────────────────────────────
NS = {"nfe": "http://www.portalfiscal.inf.br/nfe"}

def tag_text(parent, tag):
    """Retorna texto de uma subtag ou ''."""
    el = parent.find(f"nfe:{tag}", NS)
    return el.text.strip() if el is not None and el.text else ""

def tag_text_any(parent, *tags):
    """Primeira subtag que existir."""
    for t in tags:
        v = tag_text(parent, t)
        if v:
            return v
    return ""

def cst_de_grupo(imposto_el, grupo_nome):
    """Extrai CST e nome do subgrupo dentro de <ICMS>, <PIS>, <COFINS>."""
    grupo = imposto_el.find(f"nfe:{grupo_nome}", NS)
    if grupo is None:
        return "", ""
    # o subgrupo é o primeiro filho (ex: <ICMS60>, <PISNT>, <PISAliq>)
    sub = None
    for child in grupo:
        sub = child
        break
    if sub is None:
        return "", ""
    cst = tag_text(sub, "CST") or tag_text(sub, "CSOSN")
    return cst, sub.tag.split("}")[-1] if "}" in sub.tag else sub.tag

# ── 2. parse dos XMLs ───────────────────────────────────────────────────────
itens = []          # todos os itens válidos
notas_info = []     # metadados das notas válidas
ignoradas = []      # notas ignoradas (destinatário errado)
filtro_finnfe = 0   # descartadas por finNFe=4
filtro_tpnf = 0     # descartadas por tpNF=0
filtro_ncm = 0      # itens descartados por NCM fora dos capítulos
chaves_vistas = set()

for arq in xmls:
    try:
        tree = ET.parse(str(arq))
    except ET.ParseError as e:
        print(f"  ERRO parse {arq.name}: {e}")
        continue
    root = tree.getroot()

    # chave de acesso
    chave = tag_text(root, "chNFe") or arq.stem
    if chave in chaves_vistas:
        continue
    chaves_vistas.add(chave)

    # dest
    dest = root.find(".//nfe:dest", NS)
    if dest is None:
        ignoradas.append((arq.name, "sem dest", ""))
        continue
    dest_cnpj = tag_text(dest, "CNPJ")
    if dest_cnpj != CNPJ_ANDINHO:
        ignoradas.append((arq.name, dest_cnpj, ""))
        continue

    # emit
    emit = root.find(".//nfe:emit", NS)
    emit_cnpj = tag_text(emit, "CNPJ") if emit is not None else ""
    emit_nome = tag_text(emit, "xNome") if emit is not None else ""

    # ide
    ide = root.find(".//nfe:ide", NS)
    fin_nfe = tag_text(ide, "finNFe") if ide is not None else ""
    tp_nf = tag_text(ide, "tpNF") if ide is not None else ""
    n_nf = tag_text(ide, "nNF") if ide is not None else ""
    dh_emi = tag_text(ide, "dhEmi") or tag_text(ide, "dEmi") or ""

    if fin_nfe == "4":
        filtro_finnfe += 1
        continue
    if tp_nf == "0":
        filtro_tpnf += 1
        continue

    # dets
    dets = root.findall(".//nfe:det", NS)
    if not dets:
        continue

    notas_info.append({
        "arq": arq.name, "nNF": n_nf, "emit_cnpj": emit_cnpj,
        "emit_nome": emit_nome, "finNFe": fin_nfe, "tpNF": tp_nf,
        "dhEmi": dh_emi, "itens": len(dets),
    })

    for det in dets:
        prod = det.find("nfe:prod", NS)
        imposto = det.find("nfe:imposto", NS)
        if prod is None:
            continue

        ncm = tag_text(prod, "NCM")
        if ncm and not ncm.startswith(NCM_PREFIXOS):
            filtro_ncm += 1
            continue

        icms_cst, icms_grupo = cst_de_grupo(imposto, "ICMS") if imposto is not None else ("", "")
        pis_cst, pis_grupo = cst_de_grupo(imposto, "PIS") if imposto is not None else ("", "")
        cofins_cst, cofins_grupo = cst_de_grupo(imposto, "COFINS") if imposto is not None else ("", "")

        # orig dentro do grupo ICMS
        icms_el = imposto.find("nfe:ICMS", NS) if imposto is not None else None
        orig = ""
        if icms_el is not None:
            for child in icms_el:
                orig = tag_text(child, "orig")
                if orig:
                    break

        itens.append({
            "arq": arq.name,
            "nNF": n_nf,
            "chNFe": chave,
            "emit_cnpj": emit_cnpj,
            "emit_nome": emit_nome,
            "dhEmi": dh_emi,
            "cProd": tag_text(prod, "cProd"),
            "cEAN": tag_text(prod, "cEAN"),
            "xProd": tag_text(prod, "xProd"),
            "ncm": ncm,
            "cest": tag_text(prod, "CEST"),
            "cfop": tag_text(prod, "CFOP"),
            "uCom": tag_text(prod, "uCom"),
            "vUnCom": tag_text(prod, "vUnCom"),
            "orig": orig,
            "cst_icms": icms_cst,
            "grupo_icms": icms_grupo,
            "cst_pis": pis_cst,
            "cst_cofins": cofins_cst,
        })

print(f"Notas ignoradas (dest != ANDINHO): {len(ignoradas)}")
print(f"Notas descartadas finNFe=4 (devolução): {filtro_finnfe}")
print(f"Notas descartadas tpNF=0: {filtro_tpnf}")
print(f"Itens descartados por NCM fora 33/34/21: {filtro_ncm}")
print(f"Notas válidas: {len(notas_info)}")
print(f"Itens extraídos: {len(itens)}")

# ── 3. conectar Supabase e ler catálogo ──────────────────────────────────────
dotenv_path = Path.cwd() / ".env"
if dotenv_path.exists():
    import dotenv
    dotenv.load_dotenv(dotenv_path)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY necessários no .env")
    sys.exit(1)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

produtos = []
offset = 0
while True:
    resp = sb.table("products").select("id, sku, name, ncm, category, is_active").range(offset, offset + 999).execute()
    if not resp.data:
        break
    produtos.extend(resp.data)
    offset += 1000
    if len(resp.data) < 1000:
        break

print(f"\nProdutos no catálogo: {len(produtos)}")

# ── 4. cruzar EAN com SKU ────────────────────────────────────────────────────
# Monta mapa: EAN individual → produto (explodindo SKUs compostos por "/")
ean_para_produto = {}
for p in produtos:
    sku = (p.get("sku") or "").strip()
    if not sku:
        continue
    for parte in sku.split("/"):
        e = parte.strip()
        if e:
            ean_para_produto[e] = p

# EANs sem SEM GTIN / vazios
sem_ean = [i for i in itens if not i["cEAN"] or i["cEAN"].upper().startswith("SEM") or len(i["cEAN"]) < 8]
itens_com_ean = [i for i in itens if i["cEAN"] and not i["cEAN"].upper().startswith("SEM") and len(i["cEAN"]) >= 8]
print(f"Itens sem EAN utilizável: {len(sem_ean)}")
print(f"Itens com EAN: {len(itens_com_ean)}")

# ── 5. consolidar por EAN ────────────────────────────────────────────────────
por_ean = defaultdict(list)
for i in itens_com_ean:
    por_ean[i["cEAN"]].append(i)

print(f"EANs distintos: {len(por_ean)}")

def chave_classificacao(i):
    return f"{i['ncm']}|{i['cest']}|{i['orig']}|{i['cst_icms']}|{i['cst_pis']}|{i['cst_cofins']}"

def chave_ncm_only(i):
    return i["ncm"]

consolidado = []
divergentes = []

for ean, lista in por_ean.items():
    chaves = set(chave_classificacao(i) for i in lista)
    if len(chaves) == 1:
        i = lista[0]
        p = ean_para_produto.get(ean)
        consolidado.append({
            "ean": ean,
            "xProd": i["xProd"],
            "fornecedor": i["emit_nome"],
            "ncm": i["ncm"],
            "cest": i["cest"],
            "orig": i["orig"],
            "cst_icms": i["cst_icms"],
            "cst_pis": i["cst_pis"],
            "cst_cofins": i["cst_cofins"],
            "unidade": i["uCom"],
            "vezes": len(lista),
            "fornecedores_distintos": len(set(x["emit_cnpj"] for x in lista)),
            "casou": p is not None,
            "product_id": p["id"] if p else "",
            "product_name": p["name"] if p else "",
            "ncm_atual": p.get("ncm") or "" if p else "",
            "category": p.get("category") or "" if p else "",
        })
    else:
        for i in lista:
            p = ean_para_produto.get(ean)
            divergentes.append({
                "ean": ean,
                "xProd": i["xProd"],
                "arq": i["arq"],
                "nNF": i["nNF"],
                "dhEmi": i["dhEmi"],
                "emit_cnpj": i["emit_cnpj"],
                "fornecedor": i["emit_nome"],
                "ncm": i["ncm"],
                "cest": i["cest"],
                "orig": i["orig"],
                "cst_icms": i["cst_icms"],
                "cst_pis": i["cst_pis"],
                "cst_cofins": i["cst_cofins"],
                "existe_catalogo": ean in ean_para_produto,
            })

eans_unicos_divergentes = set(d["ean"] for d in divergentes)
print(f"EANs consistentes: {len(consolidado)}")
print(f"Itens divergentes (linhas): {len(divergentes)}")
print(f"EANs únicos divergentes: {len(eans_unicos_divergentes)}")
print("  (chave de divergência: NCM|CEST|orig|CST_ICMS|CST_PIS|CST_COFINS — 6 campos rigorosos)")

# ── 6. estatísticas de cobertura ─────────────────────────────────────────────
# Cobertura = produtos do catálogo cujo SKU/EAN aparece nas notas
produtos_por_ean = {}  # ean individual -> set de product_id
produtos_sku_ean_proprio = {}  # product_id -> SKU que é um único EAN
for p in produtos:
    sku = (p.get("sku") or "").strip()
    if not sku:
        continue
    partes = [e.strip() for e in sku.split("/") if e.strip()]
    for e in partes:
        produtos_por_ean.setdefault(e, set()).add(p["id"])
    if len(partes) == 1:
        produtos_sku_ean_proprio[p["id"]] = partes[0]

produtos_cobertos = set()
produtos_cobertos_ean_proprio = set()
produtos_cobertos_por_kit = set()

for ean in por_ean:
    for pid in produtos_por_ean.get(ean, set()):
        produtos_cobertos.add(pid)
        if pid in produtos_sku_ean_proprio and produtos_sku_ean_proprio[pid] == ean:
            produtos_cobertos_ean_proprio.add(pid)
        else:
            produtos_cobertos_por_kit.add(pid)

produtos_sem_cobertura = [p for p in produtos if p["id"] not in produtos_cobertos]

print(f"\nEANs consistentes que casaram com catálogo: {len(set(c['ean'] for c in consolidado if c['casou']))}")
print(f"EANs consistentes SEM produto no catálogo: {len(set(c['ean'] for c in consolidado if not c['casou']))}")
print(f"Produtos cobertos por nota: {len(produtos_cobertos)} de {len(produtos)} ({len(produtos_cobertos)/len(produtos)*100:.1f}%)")
print(f"  - com EAN próprio casado: {len(produtos_cobertos_ean_proprio)}")
print(f"  - kits/contados por parte do SKU: {len(produtos_cobertos_por_kit)}")
print(f"Produtos do catálogo SEM cobertura: {len(produtos_sem_cobertura)} de {len(produtos)}")
print(f"  (destes, ativos: {sum(1 for p in produtos_sem_cobertura if p.get('is_active'))})")

# ── 7. CST stats ─────────────────────────────────────────────────────────────
def cst_stats(itens_lista, campo, label):
    cont = defaultdict(int)
    for i in itens_lista:
        cont[i[campo] or "(vazio)"] += 1
    total = sum(cont.values())
    print(f"\n  {label} ({total} itens):")
    for k, n in sorted(cont.items(), key=lambda x: -x[1]):
        print(f"    CST {k}: {n} ({n/total*100:.1f}%)")
    return cont

print("\n── CST PIS/COFINS ──")
cst_pis_stats = cst_stats(itens_com_ean, "cst_pis", "PIS")
cst_cofins_stats = cst_stats(itens_com_ean, "cst_cofins", "COFINS")
print("\n── CST ICMS ──")
cst_icms_stats = cst_stats(itens_com_ean, "cst_icms", "ICMS")

# ── 8. escrever CSVs ────────────────────────────────────────────────────────
def escrever_csv(caminho, cabecalho, linhas):
    with open(caminho, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(cabecalho)
        for linha in linhas:
            w.writerow(linha)
    print(f"  -> {caminho}")

# 8a. mapeamento_fiscal.csv
escrever_csv(
    SAIDA / "mapeamento_fiscal.csv",
    ["ean", "nome_no_xml", "ncm", "cest", "orig", "cst_icms", "cst_pis_cofins",
     "unidade", "fornecedor", "casou_com_catalogo", "sku_do_catalogo"],
    [(c["ean"], c["xProd"], c["ncm"], c["cest"], c["orig"], c["cst_icms"],
      f"{c['cst_pis']}/{c['cst_cofins']}", c["unidade"], c["fornecedor"],
      "sim" if c["casou"] else "não", c["product_id"])
     for c in consolidado]
)

# 8b. divergencias.csv
escrever_csv(
    SAIDA / "divergencias.csv",
    ["ean", "xProd", "arquivo", "nNF", "dhEmi", "emit_cnpj", "fornecedor",
     "ncm", "cest", "orig", "cst_icms", "cst_pis", "cst_cofins", "existe_no_catalogo"],
    [(d["ean"], d["xProd"], d["arq"], d["nNF"], d["dhEmi"], d["emit_cnpj"],
      d["fornecedor"], d["ncm"], d["cest"], d["orig"], d["cst_icms"],
      d["cst_pis"], d["cst_cofins"], "sim" if d["existe_catalogo"] else "não")
     for d in divergentes]
)

# 8c. skus_compostos.csv
kits = [p for p in produtos if p.get("sku") and "/" in p["sku"]]
linhas_kit = []
for p in kits:
    eans_kit = [e.strip() for e in p["sku"].split("/") if e.strip()]
    ncms_kit = set()
    for e in eans_kit:
        # busca o NCM desse EAN nas notas
        ncm_encontrado = ""
        cest_encontrado = ""
        if e in por_ean:
            ncm_encontrado = por_ean[e][0]["ncm"]
            cest_encontrado = por_ean[e][0]["cest"]
            ncms_kit.add(ncm_encontrado)
        linhas_kit.append((p["id"], p["name"], e, ncm_encontrado, cest_encontrado))
    # marca divergência se >1 NCM no kit
    if len(ncms_kit) > 1:
        for i in range(len(linhas_kit)):
            if linhas_kit[-(len(eans_kit)-i)][0] == p["id"]:
                pass  # marcamos abaixo
    # reescreve as últimas N linhas com flag
    for i in range(len(eans_kit)):
        idx = len(linhas_kit) - len(eans_kit) + i
        e = eans_kit[i]
        ncm_encontrado = ""
        cest_encontrado = ""
        if e in por_ean:
            ncm_encontrado = por_ean[e][0]["ncm"]
            cest_encontrado = por_ean[e][0]["cest"]
        linhas_kit[idx] = (p["id"], p["name"], e, ncm_encontrado, cest_encontrado,
                           "SIM" if len(ncms_kit) > 1 else "NÃO")

escrever_csv(
    SAIDA / "skus_compostos.csv",
    ["sku_catalogo", "nome_produto", "ean_do_kit", "ncm", "cest", "ncm_divergente_no_kit"],
    linhas_kit
)

# 8d. resumo_para_contador.csv
combinacoes = defaultdict(lambda: {"count": 0, "exemplos": []})
for i in itens_com_ean:
    chave = (i["ncm"], i["cest"], i["cst_icms"], f"{i['cst_pis']}/{i['cst_cofins']}", i["orig"])
    c = combinacoes[chave]
    c["count"] += 1
    if len(c["exemplos"]) < 3:
        c["exemplos"].append(i["xProd"])

escrever_csv(
    SAIDA / "resumo_para_contador.csv",
    ["ncm", "cest", "cst_icms", "cst_pis_cofins", "orig", "qtd_itens", "exemplo1", "exemplo2", "exemplo3"],
    [(k[0], k[1], k[2], k[3], k[4], v["count"],
      v["exemplos"][0] if len(v["exemplos"]) > 0 else "",
      v["exemplos"][1] if len(v["exemplos"]) > 1 else "",
      v["exemplos"][2] if len(v["exemplos"]) > 2 else "")
     for k, v in sorted(combinacoes.items(), key=lambda x: -x[1]["count"])]
)

# 8e. cobertura_por_categoria.csv
# Para produtos cobertos, agrupar por category
cat_cobertura = defaultdict(lambda: {"cobertos": 0, "total": 0, "ncms": defaultdict(int), "cests": defaultdict(int)})
for p in produtos:
    cat = p.get("category") or "(sem categoria)"
    cat_cobertura[cat]["total"] += 1
    # verifica se está coberto
    sku = (p.get("sku") or "").strip()
    coberto = False
    if sku:
        for parte in sku.split("/"):
            if parte.strip() in ean_para_produto and parte.strip() in set(c["ean"] for c in consolidado if c["casou"]):
                coberto = True
                break
    if coberto:
        cat_cobertura[cat]["cobertos"] += 1
        # NCM e CEST desse produto
        for parte in sku.split("/"):
            e = parte.strip()
            if e in por_ean:
                ncm = por_ean[e][0]["ncm"]
                cest = por_ean[e][0]["cest"]
                cat_cobertura[cat]["ncms"][ncm] += 1
                cat_cobertura[cat]["cests"][cest] += 1

linhas_cat = []
for cat, dados in sorted(cat_cobertura.items(), key=lambda x: -x[1]["total"]):
    ncms_ordenados = sorted(dados["ncms"].items(), key=lambda x: -x[1])
    cests_ordenados = sorted(dados["cests"].items(), key=lambda x: -x[1])
    ncm_dominante = ncms_ordenados[0][0] if ncms_ordenados else ""
    ncm_dominante_pct = ncms_ordenados[0][1] / sum(dados["ncms"].values()) * 100 if dados["ncms"] else 0
    conflito = "NÃO" if len(ncms_ordenados) <= 1 or ncm_dominante_pct >= 95 else "SIM"
    sem_cobertura_cat = dados["total"] - dados["cobertos"]
    linhas_cat.append((
        cat, dados["total"], dados["cobertos"], sem_cobertura_cat,
        ncm_dominante, f"{ncm_dominante_pct:.0f}%",
        conflito,
        "; ".join(f"{n}({c})" for n, c in ncms_ordenados[:5]),
        "; ".join(f"{c}({n})" for c, n in cests_ordenados[:5]),
    ))

escrever_csv(
    SAIDA / "cobertura_por_categoria.csv",
    ["categoria", "total_produtos", "cobertos", "sem_cobertura",
     "ncm_dominante", "dominancia_pct", "conflito_real",
     "ncms_encontrados", "cests_encontrados"],
    linhas_cat
)

# ── 9. SQL ──────────────────────────────────────────────────────────────────
# Para o SQL, divergência só por NCM (ignorar orig/cst)
por_ncm = defaultdict(list)
for c in consolidado:
    if not c["casou"] or not c["ncm"]:
        continue
    por_ncm[c["ncm"]].append(c["ean"])


sql_lines = [
    "-- Popula products.ncm a partir dos XMLs de NF-e de ENTRADA",
    f"-- Gerado em 2026-07-31. Fonte: {len(notas_info)} notas, {len(itens)} itens.",
    "-- SOMENTE ncm: cest, origem, cst_icms e cst_pis_cofins ainda não existem como",
    "-- coluna em products. NÃO cria coluna, NÃO decide CFOP/CST de saída.",
    "-- Casamento por products.sku = <cEAN> da nota (explodindo SKUs compostos por /).",
    f"-- {len(produtos_cobertos)} produtos atingidos.",
    "-- Divergência considerada apenas quando o NCM difere (orig/cst variam por posição na cadeia).",
    "-- Blocos de até 100 SKUs.",
    "--",
    "-- CONFERÊNCIA (rodar depois):",
    "--   SELECT ncm, count(*) FROM public.products WHERE ncm IS NOT NULL",
    "--   GROUP BY ncm ORDER BY 2 DESC;",
]

bloco = 0
for ncm, eans in sorted(por_ncm.items(), key=lambda x: -len(x[1])):
    for i in range(0, len(eans), 100):
        parte = eans[i:i+100]
        bloco += 1
        sql_lines.append(f"\n-- bloco {bloco}: NCM {ncm} ({len(parte)} SKUs)")
        sql_lines.append("UPDATE public.products SET ncm = '" + ncm + "'")
        sql_lines.append("WHERE sku IN (")
        for j, e in enumerate(parte):
            comma = "," if j < len(parte) - 1 else ""
            sql_lines.append(f"  '{e}'{comma}")
        sql_lines.append(");")

sql_text = "\n".join(sql_lines)
with open(SAIDA / "POPULAR_ncm.sql", "w", encoding="utf-8") as f:
    f.write(sql_text)
print(f"  -> {SAIDA / 'POPULAR_ncm.sql'} ({bloco} blocos)")

# ── 10. resumo final ─────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("RESUMO FINAL")
print("=" * 60)
print(f"XMLs processados: {len(xmls)} (raiz: {por_dir.get('.', 0)}, subpasta: {por_dir.get('Nova pasta', 0)})")
print(f"Notas válidas: {len(notas_info)}")
print(f"Fornecedores distintos: {len(set(n['emit_cnpj'] for n in notas_info))}")
print(f"Itens extraídos: {len(itens)}")
print(f"EANs distintos: {len(por_ean)}")
print(f"Produtos cobertos: {len(produtos_cobertos)} de {len(produtos)} ({len(produtos_cobertos)/len(produtos)*100:.1f}%)")
print(f"  - com EAN próprio casado: {len(produtos_cobertos_ean_proprio)}")
print(f"  - kits/contados por parte do SKU: {len(produtos_cobertos_por_kit)}")
print(f"Produtos sem cobertura: {len(produtos_sem_cobertura)} de {len(produtos)}")
print(f"  (ativos: {sum(1 for p in produtos_sem_cobertura if p.get('is_active'))})")
print(f"Itens divergentes (linhas): {len(divergentes)}")
print(f"EANs únicos divergentes: {len(eans_unicos_divergentes)}")
print(f"Blocos SQL: {bloco}")
print(f"\nArquivos gerados em {SAIDA}:")
for nome in ["mapeamento_fiscal.csv", "divergencias.csv", "skus_compostos.csv",
             "resumo_para_contador.csv", "cobertura_por_categoria.csv", "POPULAR_ncm.sql"]:
    caminho = SAIDA / nome
    if caminho.exists():
        print(f"  {caminho.name} ({caminho.stat().st_size:,} bytes)")

# alerta cobertura acima do esperado
if len(produtos_cobertos) > 250:
    print(f"\nALERTA: cobertura subiu para {len(produtos_cobertos)} produtos.")
    print("Isso altera o volume de produtos que podem ser preenchidos por dado real de nota")
    print("em vez de regra por categoria. Revisar estratégia de classificação fiscal.")
