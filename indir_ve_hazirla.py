import json, urllib.parse, urllib.request, time, io, csv, pathlib, html, re
from PIL import Image, ImageOps
ROOT=pathlib.Path(__file__).resolve().parent
items=json.loads((ROOT/"fotograf_listesi.json").read_text(encoding="utf-8"))
headers={"User-Agent":"MySchoolWOW-Education/1.0 (contact: educational use; Wikimedia Commons)"}
def get(url):
    req=urllib.request.Request(url,headers=headers)
    with urllib.request.urlopen(req,timeout=45) as r:return r.read()
def info(name):
    q=urllib.parse.urlencode({"action":"query","format":"json","prop":"imageinfo","iiprop":"url|extmetadata","titles":"File:"+name,"iiurlwidth":"1600"})
    obj=json.loads(get("https://commons.wikimedia.org/w/api.php?"+q))
    page=next(iter(obj["query"]["pages"].values()))
    if "imageinfo" not in page:raise ValueError("Wikimedia dosyası bulunamadı: "+name)
    return page["imageinfo"][0]
def strip(s):return re.sub("<[^>]+>","",html.unescape(s or "")).strip()
out=ROOT/"assets"/"puzzles"
credits=[]
errors=[]
for it in items:
    target=out/("tema"+str(it["tema"]))/("hafta"+str(it["hafta"])+".webp")
    target.parent.mkdir(parents=True,exist_ok=True)
    try:
        meta=info(it["file"]); ext=meta.get("extmetadata",{})
        lic=strip(ext.get("LicenseShortName",{}).get("value",""))
        # Commons file metadata licenses: reject non-free/unknown and NC/ND.
        if not lic or any(x in lic.lower() for x in ("non-free","fair use","-nc","-nd","copyrighted","unknown")):
            raise ValueError("Lisans incelenmeli: "+lic)
        raw=get(meta.get("thumburl") or meta["url"])
        im=Image.open(io.BytesIO(raw)).convert("RGB")
        im=ImageOps.fit(im,(1500,1000),method=Image.Resampling.LANCZOS)
        im.save(target,"WEBP",quality=83,method=6)
        credits.append({"tema":it["tema"],"hafta":it["hafta"],"yer":it["yer"],"dosya":str(target.relative_to(ROOT)),"kaynak":"https://commons.wikimedia.org/wiki/File:"+urllib.parse.quote(it["file"].replace(" ","_")),"lisans":lic,"yazar":strip(ext.get("Artist",{}).get("value","")),"atıf":strip(ext.get("Attribution",{}).get("value",""))})
        print("OK",target)
    except Exception as e:
        errors.append({"tema":it["tema"],"hafta":it["hafta"],"dosya":it["file"],"hata":str(e)})
        print("HATA",it["file"],e)
    time.sleep(.2)
with (ROOT/"FOTOGRAF_KAYNAKLARI.csv").open("w",encoding="utf-8-sig",newline="") as f:
    w=csv.DictWriter(f,fieldnames=["tema","hafta","yer","dosya","kaynak","lisans","yazar","atıf"],delimiter=";");w.writeheader();w.writerows(credits)
(ROOT/"HATALAR.json").write_text(json.dumps(errors,ensure_ascii=False,indent=2),encoding="utf-8")
print(f"Başarılı: {len(credits)}/24. Hatalar: {len(errors)}")
if errors:raise SystemExit(1)
