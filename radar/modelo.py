import json, math, statistics as st, random
random.seed(2026)
# Pesquisas 2º turno, Flávio x Lula. v = votos válidos (F, L). t = totais (F, L) quando só isso saiu. Datas = campo.
P = [
 # instituto, campo, n, F_total, L_total, F_valid, L_valid, registro, fonte
 ["Datafolha","20–22/10",2520,47,46,50.0,50.0,"BR-09709/2026","CNN Brasil / Folha, 22/10"],
 ["Quaest","17–20/10",2154,45,44,None,None,"BR-08535/2026","Gazeta do Povo, 21/10"],
 ["AtlasIntel","13–18/10",4998,49.8,47.6,51.1,48.9,"BR-02418/2026","Gazeta do Povo, 19/10"],
 ["Veritá","18–22/10",15554,None,None,51.3,48.7,"—","Exame, 24/10"],
 ["Real Time Big Data","(até 23/10)",None,49,45,52.0,48.0,"—","Exame, 24/10"],
 ["Alfa Inteligência","(até 23/10)",None,49.9,46,52.0,48.0,"—","Exame, 24/10"],
 ["Ipespe/Abrapel","(até 23/10)",None,48,47,50.5,49.5,"—","Exame, 24/10"],
 ["Vox Brasil","(até 23/10)",None,None,None,49.4,50.6,"—","Exame, 24/10"],
 ["Gerp","14–16/10",2400,50,45,None,None,"—","Wikipedia (compilação), 24/10"],
 ["Futura","14–15/10",2000,49,47.5,None,None,"—","Wikipedia (compilação), 24/10"],
 ["MDA/CNT","13–15/10",2014,46.8,45.9,None,None,"—","Wikipedia (compilação), 24/10"],
 ["PoderData","13–15/10",3000,47,47,None,None,"—","Wikipedia (compilação), 24/10"],
 ["Nexus/BTG","10–12/10",2000,48,45,None,None,"—","Wikipedia (compilação), 24/10"],
 ["Palver","10–13/10",5000,50,49,None,None,"—","Wikipedia (compilação), 24/10"],
]
rows=[]
for inst,campo,n,ft,lt,fv,lv,reg,fonte in P:
    if fv is None:
        fv=round(ft/(ft+lt)*100,1); lv=round(100-fv,1); base="válidos calculados dos totais"
    else: base="válidos divulgados"
    rows.append(dict(instituto=inst,campo=campo,n=n,f_total=ft,l_total=lt,f=fv,l=lv,registro=reg,fonte=fonte,base=base))
# Média da última leitura de cada instituto, com peso maior para campo mais recente
w={"Datafolha":1.3,"Quaest":1.3,"AtlasIntel":1.2,"Veritá":1.0,"Real Time Big Data":1.0,"Alfa Inteligência":0.8,"Ipespe/Abrapel":1.0,"Vox Brasil":0.6,"Gerp":0.5,"Futura":0.8,"MDA/CNT":0.9,"PoderData":0.9,"Nexus/BTG":0.7,"Palver":0.7}
num=sum(r["f"]*w[r["instituto"]] for r in rows); den=sum(w.values())
media=num/den
simples=st.mean(r["f"] for r in rows)
mediana=st.median(r["f"] for r in rows)
# Calibração histórica: erro da média das pesquisas finais na parcela do candidato da direita (válidos), 2º turno
hist=[
 ["2014 (Dilma x Aécio)","Aécio: pesquisas ~48,2 · urna 48,4",+0.2],
 ["2018 (Bolsonaro x Haddad)","Bolsonaro: pesquisas ~55,5 · urna 55,1",-0.4],
 ["2022 (Lula x Bolsonaro)","Bolsonaro: pesquisas ~47,5 · urna 49,1",+1.6],
 ["2026 1º turno (válidos, F x L)","Flávio: pesquisas ~45,9 · urna 47,0",+1.1],
]
vies=st.mean(h[2] for h in hist)           # ~ +0,6 pp a favor da direita
sd_hist=st.pstdev(h[2] for h in hist)
sd=math.sqrt(sd_hist**2+2.0**2)            # erro histórico + erro de amostragem/agregação
N=200000; wins=0; vals=[]
for _ in range(N):
    x=random.gauss(media+vies, sd); vals.append(x); wins+= x>50
vals.sort()
p=wins/N
ic=(vals[int(N*0.05)],vals[int(N*0.95)])
# MS e Bela Vista: parcela de Flávio entre os dois no 1º turno (válidos), supondo transferência neutra dos demais
ms=58.60/(58.60+34.68)*100; bv=59.77/(59.77+36.25)*100
out=dict(atualizado="24/10/2026 12:10 (horário de MS)",pesquisas=rows,media_ponderada=round(media,1),media_simples=round(simples,1),mediana=round(mediana,1),
 vies_hist=round(vies,1),sd=round(sd,1),hist=hist,prob_flavio=round(p*100),prob_lula=round((1-p)*100),esperado=round(media+vies,1),ic90=[round(ic[0],1),round(ic[1],1)],
 ms=dict(primeiro=[58.60,34.68],dois=round(ms,1),fonte="TSE via Midiamax, 4–5/10/2026"),bv=dict(primeiro=[59.77,36.25],dois=round(bv,1),fonte="TSE via Midiamax, 5/10/2026"),
 pendentes=["Quaest (campo 23–24/10, BR-09158/2026)","Datafolha final","AtlasIntel final","MDA/CNT","Nexus/BTG","Palver","Futura"])
json.dump(out,open('/mnt/user-data/outputs/estudo_brasil/repo/radar/radar.json','w'),ensure_ascii=False,indent=1)
print(json.dumps({k:out[k] for k in ['media_ponderada','media_simples','mediana','vies_hist','sd','prob_flavio','esperado','ic90']},ensure_ascii=False)); print(out['ms'],out['bv'])
