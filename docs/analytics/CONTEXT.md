# MIZAN Architecture — ERP Loyiha CONTEXT

## Sana: 2026-02-28
## Status: REJALASHTIRISH TUGADI → BOSQICH 1 ga tayyor

---

## 1. FIRMA HAQIDA

- **Nomi:** MIZAN Architecture
- **Faoliyat:** Arxitektura loyihalash firmasi
- **Xodimlar:** 35+ kishi
- **Bo'limlar:** 8 ta (MP, ARX, 3D, INT, GD, SM, KON, ADM)
- **Proektlar:** 250+ (2022-yildan buyon, 3.5 yil)
- **Valyuta:** UZS (asosiy) + USD
- **Joriy kurs:** 12,850 UZS/USD

---

## 2. TANLANGAN ARXITEKTURA: 4 QATLAMLI MODEL

```
┌─────────────────────────────────────────────────┐
│  1-QATLAM: Odoo Community 17                    │
│  Proekt, Timesheet, Accounting, HR, Purchase    │
│  Port: 8069  |  URL: mizan.example.com          │
└──────────────────────┬──────────────────────────┘
                       │ API (XML-RPC)
                       ▼
┌─────────────────────────────────────────────────┐
│  2-QATLAM: MIZAN Costing Service (FastAPI)      │
│  Soat narxi, MIZAN ulushi, Plan vs Fakt, Risk   │
│  Port: 8000  |  Cron: har kecha 02:00           │
└──────────────────────┬──────────────────────────┘
                       │ SQLAlchemy
                       ▼
┌─────────────────────────────────────────────────┐
│  3-QATLAM: PostgreSQL 16                        │
│  Database: mizan_db                             │
│  Odoo jadvallar + mizan_* qo'shimcha jadvallar  │
│  Port: 5432                                     │
└──────────────────────┬──────────────────────────┘
                       │ SQL (read-only)
                       ▼
┌─────────────────────────────────────────────────┐
│  4-QATLAM: Metabase                             │
│  Dashboard, grafiklar, KPI, hisobotlar          │
│  Port: 3000  |  URL: dashboard.mizan.uz         │
└─────────────────────────────────────────────────┘
```

---

## 3. NIMA UCHUN 4 QATLAM?

- **Odoo yangilansa** → MIZAN mantiq buzilmaydi (alohida servisda)
- **MIZAN mantiq o'zgarsa** → Odoo ga tegmaysiz
- **Metabase** → faqat read-only, xavfsiz
- **Database yagona** → ma'lumot takrorlanmaydi
- **MIZAN Service Odoo ga yoza oladi** (BI esa yoza olmaydi — shuning uchun alohida)

---

## 4. DATABASE FOYDALANUVCHILAR

| User | Ruxsat | Ishlatadigan qatlam |
|------|--------|---------------------|
| odoo_user | READ-WRITE | Odoo (1-qatlam) |
| mizan_user | READ-WRITE | MIZAN Service (2-qatlam) |
| metabase_user | READ-ONLY | Metabase (4-qatlam) |

---

## 5. MIZAN QOSHIMCHA JADVALLAR (Odoo ga tegmasdan)

1. **mizan_exchange_rates** — kurs tarixi (sana, UZS/USD kurs)
2. **mizan_hourly_rates** — soat narxi tarixi (xodim_id, sana, narx, komponentlar)
3. **mizan_overhead_costs** — overhead xarajatlar (turi, summa, oy)
4. **mizan_equipment** — texnika amortizatsiya (nomi, narx, muddat, oylik)
5. **mizan_project_costs** — proekt MIZAN xarajatlari (proekt_id, oy, summa)
6. **mizan_project_budget** — Plan vs Fakt (proekt_id, plan, fakt)
7. **mizan_monthly_allocation** — oylik taqsimot (proekt_id, xodim_id, oy, soat, summa)

---

## 6. MIZAN BIZNES MANTIQ (FORMULALAR)

### Soat narxi hisoblash:
```
1_soat_narxi = (Maosh + Premiya + Soliq_12% + JSSM_12%
  + Admin_ulushi + Texnika_ulushi + Overhead_ulushi)
  / Oylik_soatlar (176)

Admin_ulushi = Jami_ADM_xarajat / 15_ishlab_chiqarish_xodim
Texnika_ulushi = Jami_amortizatsiya / 15
Overhead_ulushi = Jami_overhead / 15
USD_narx = UZS_narx / joriy_kurs
```

### Proekt narxlash:
```
MIZAN_ulushi = Jami_soatlar × O'rtacha_soat_narxi × Risk_koeff(1.15)
```

### Oylik MIZAN xarajat:
```
Har oy = Xodim_soatlari × Xodim_soat_narxi (shu oydagi)
Oy boshida kam (mobilizatsiya), o'rtada ko'p, oxirida kam
```

### Plan vs Fakt:
```
Plan = Shartnoma boshlangandagi hisoblangan MIZAN ulushi
Fakt = Haqiqiy oylik xarajatlar yig'indisi
Farq = Plan - Fakt (musbat = tejaldi, manfiy = ortiqcha)
```

---

## 7. TEXNOLOGIYA STACK

| Qatlam | Texnologiya | Versiya |
|--------|-------------|---------|
| ERP | Odoo Community | 17 |
| API | Python + FastAPI | 3.11+ |
| ORM | SQLAlchemy | 2.0+ |
| Database | PostgreSQL | 16 |
| BI | Metabase | Latest |
| Server | Ubuntu | 22.04 LTS |
| Proxy | Nginx | Latest |
| SSL | Let's Encrypt | Auto-renew |

---

## 8. SERVER TALABLARI

- **RAM:** 8 GB minimum
- **Disk:** 40 GB+ (SSD)
- **CPU:** 4 core
- **OS:** Ubuntu 22.04 LTS
- **Tavsiya:** Hetzner CPX31 ($15/oy) yoki DigitalOcean ($24/oy)

---

## 9. BO'LIMLAR VA XODIMLAR TUZILMASI

| Kod | Bo'lim | Xodimlar soni | Turi |
|-----|--------|---------------|------|
| MP | Bosh arxitektor | 1 | Ishlab chiqarish |
| ARX | Arxitektura | 5 | Ishlab chiqarish |
| 3D | 3D vizualizatsiya | 3 | Ishlab chiqarish |
| INT | Interer dizayn | 3 | Ishlab chiqarish |
| GD | Grafik dizayn | 2 | Ishlab chiqarish |
| SM | Smeta va hisob | 3 | Ishlab chiqarish |
| KON | Konstruktiv | 3 | Ishlab chiqarish |
| ADM | Ma'muriyat | 5 | Ma'muriy |
| | **JAMI** | **25 ishlab chiq. + 5 admin = ~35** | |

Ishlab chiqarish xodimlari: 15+ (soat narxi hisoblanadi)
Admin xodimlar: 5 (ulushi taqsimlanadi)

---

## 10. BOSQICHLAR HOLATI

| # | Bosqich | Status | Chatlar |
|---|---------|--------|---------|
| 1 | PostgreSQL o'rnatish | ⬜ Boshlanmagan | 1 |
| 2 | Odoo o'rnatish + sozlash | ⬜ Boshlanmagan | 3-4 |
| 3 | MIZAN qo'shimcha jadvallar | ⬜ Boshlanmagan | 1-2 |
| 4-5 | MIZAN Costing Service | ⬜ Boshlanmagan | 6-8 |
| 6 | Odoo integratsiya | ⬜ Boshlanmagan | 2-3 |
| 7 | Metabase + Dashboard | ⬜ Boshlanmagan | 3-4 |
| 8 | Xavfsizlik + rollar | ⬜ Boshlanmagan | 2 |
| 9-10 | Import + Sinov + Trening | ⬜ Boshlanmagan | 3-4 |
| | **JAMI** | | **~25-30** |

---

## 11. FAYLLAR

### Tayyor hujjatlar:
- `mizan_arxitektura_full_db.xlsx` — Excel baza (9 list, 3290 formula)
- `MIZAN_Jadval_Mantiqi_Hujjat.docx` — Excel mantiq hujjati
- `MIZAN_ERP_Qollanma.docx` — Claude bilan ishlash qo'llanmasi
- `MIZAN_Moliyaviy_Solishtirma.docx` — Odoo vs Maxsus narx tahlili
- `MIZAN_4_Qatlamli_ERP_Qollanma.docx` — 4 qatlamli arxitektura qo'llanma
- `CONTEXT.md` — Shu fayl

### Yaratilishi kerak:
- `database/schema.sql` — PostgreSQL jadvallar
- `database/seed.sql` — Namuna ma'lumotlar
- `mizan-service/` — FastAPI loyiha
- `docker-compose.yml` — Barcha xizmatlarni birga ishga tushirish
- `nginx/` — Reverse proxy konfiguratsiya

---

## 12. DIZAYN TIZIMI (PASTEL ARXITEKTURA)

### Ranglar:
- **Asosiy jigarrang:** #8B7355 (sarlavhalar)
- **Krem fon:** #F5F0EB
- **Sage yashil:** #A8C5B8 (accent)
- **Dusty ko'k:** #B8C5D6 (accent)
- **Terracotta:** #D4A89A (accent)
- **Mint yashil:** #D5E8D4 (USD ustunlar)
- **Lavanda:** #DDD0E6 (MIZAN yozuvlar)
- **Sariq:** #F5EDDC (yakuniy yozuvlar)
- **Matn:** #4A3728 (dark umber)

### Shrift:
- **Century Gothic** (geometrik sans-serif, arxitektura standarti)

---

## 13. HAR YANGI CHATDA BIRINCHI XABAR

```
Salom! Men MIZAN Architecture uchun 4 qatlamli ERP tizim quryapman.

Arxitektura: Odoo Community + MIZAN FastAPI Service + PostgreSQL + Metabase

Oldingi bosqichlarda tayyor:
[shu yerga qaysi bosqichlar tugaganini yozing]

Bugun BOSQICH [raqam] ni boshlaymiz: [nomi]

Mana CONTEXT.md fayli [paperclip bilan yuklang]

Men dasturchi emasman, har qadamni tushuntir.
```

---

## 14. MUHIM QARORLAR LOGI

| Sana | Qaror | Sabab |
|------|-------|-------|
| 2026-02-28 | Odoo Community tanlandi (Enterprise emas) | Bepul, yetarli modullar |
| 2026-02-28 | MIZAN mantiq alohida FastAPI servis | BI faqat read-only, biznes mantiq read-write kerak |
| 2026-02-28 | Metabase tanlandi (Power BI emas) | Bepul, open-source, PostgreSQL bilan yaxshi |
| 2026-02-28 | Database userlar 3 ta | Xavfsizlik: Metabase faqat read-only |
| 2026-02-28 | Odoo jadvallariga tegmaslik | Yangilanish xavfsizligi |

---

*Oxirgi yangilanish: 2026-02-28*
*Keyingi bosqich: BOSQICH 1 — PostgreSQL o'rnatish*
