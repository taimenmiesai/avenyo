# Avenyo – asiakasdatan käyttöjärjestelmä (UI-konsepti)

Klikattava käyttöliittymäkonsepti pikaruokaketjun asiakasdatalle. Kaikki luvut ja asiakkaat ovat demodataa.

## Näkymät

| Sivu | Sisältö |
|---|---|
| `index.html` | Alkunäkymä: roolivalinta (CRM, markkinointipäällikkö, taloushallinto), KPI:t, käyrät ja ateriakortit |
| `segmentit.html` | Asiakassegmentit (uskolliset, aktiiviset, hiipuvat, uudet), asiakaslista ja toimintopalkki |
| `aikakone.html` | Yksittäisen asiakkaan menneisyys ja ennuste aikajanalla, kaksi skenaariota |
| `kohdeyleiso.html` | 10 asiakkaan kohdeyleisö, jossa ääripään ostohistoriat koko valikoimasta |

Segmentti-, aikakone- ja kohdeyleisönäkymissä on toiminnot **Luo toimenpide**, **Luo kohdeyleisö** ja **Luo look-alike-yleisö**.

## Rakenne

- `design/*.dc.html` – näkymien lähdetiedostot
- `tools/build.py` – rakentaa sivut lähdetiedostoista: `python3 tools/build.py`
- `assets/runtime.js` – kevyt näkymämoottori (mallit, tila, tapahtumat), ei riippuvuuksia

Sivusto on staattinen. Avaa `index.html` selaimessa tai julkaise GitHub Pagesilla.
