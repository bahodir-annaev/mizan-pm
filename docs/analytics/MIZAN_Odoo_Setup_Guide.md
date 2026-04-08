# MIZAN Architecture — Odoo 17 O'rnatish va Sozlash Qo'llanmasi

**Sana:** 2026-03-01  
**Maqsad:** Odoo Community 17 ni Nizam ga o'xshash interfeys bilan o'rnatish, real ma'lumotlar import qilish  
**Server:** Ubuntu 22.04 LTS (Hetzner CPX31 tavsiya — $15/oy)

---

## MUNDARIJA

1. [Server tayyorlash va Odoo o'rnatish](#1-server-tayyorlash)
2. [Dark Mode tema o'rnatish (Nizam uslubi)](#2-dark-mode)
3. [Odoo asosiy sozlash](#3-asosiy-sozlash)
4. [Bo'limlar (Отделы) yaratish](#4-bolimlar)
5. [Xodimlar import qilish (rasmlar bilan)](#5-xodimlar)
6. [Klientlar import qilish](#6-klientlar)
7. [Proektlar yaratish va sozlash](#7-proektlar)
8. [Vazifalar bosqichlari (Nizam uslubi)](#8-vazifalar)
9. [Timesheet (Play/Stop) sozlash](#9-timesheet)
10. [Dashboard yaratish](#10-dashboard)
11. [Foydalanuvchilar va rollar](#11-rollar)
12. [MIZAN Costing Service qo'shish (keyingi bosqich)](#12-costing)

---

## 1. SERVER TAYYORLASH VA ODOO O'RNATISH {#1-server-tayyorlash}

### 1.1. Server sotib olish

Hetzner Cloud dan CPX31 buyurtma qiling:
- **RAM:** 8 GB
- **CPU:** 4 core (AMD)
- **Disk:** 80 GB SSD
- **OS:** Ubuntu 22.04
- **Narx:** ~$15/oy
- **Lokatsiya:** Helsinki yoki Falkenstein (Toshkentga yaqin)

### 1.2. Serverga ulanish

```bash
# Kompyuteringizda terminal (yoki PuTTY) oching
ssh root@SIZNING_SERVER_IP
```

### 1.3. Tizimni yangilash

```bash
sudo apt update && sudo apt upgrade -y
```

**Nima qiladi:** Serverdagi barcha dasturlarni eng oxirgi versiyaga yangilaydi. Xuddi telefonning "Обновить всё" tugmasiga o'xshash.

### 1.4. Kerakli dasturlarni o'rnatish

```bash
# Python va kerakli kutubxonalar
sudo apt install -y python3-pip python3-dev python3-venv \
  libxml2-dev libxslt1-dev zlib1g-dev libsasl2-dev \
  libldap2-dev build-essential libssl-dev libffi-dev \
  libmysqlclient-dev libjpeg-dev libpq-dev \
  libjpeg8-dev liblcms2-dev libblas-dev libatlas-base-dev \
  npm node-less xfonts-75dpi xfonts-base wkhtmltopdf \
  git wget curl

# Node.js (interfeys uchun)
sudo apt install -y nodejs npm
sudo npm install -g rtlcss less
```

### 1.5. PostgreSQL o'rnatish

```bash
# PostgreSQL 16 o'rnatish
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16

# Odoo uchun foydalanuvchi yaratish
sudo -u postgres createuser --superuser odoo
sudo -u postgres psql -c "ALTER USER odoo WITH PASSWORD 'KUCHLI_PAROL_YOZING';"
```

**PostgreSQL nima?** Bu ma'lumotlar bazasi — xuddi katta Excel fayl, lekin serverda ishlaydi va minglab odamlar bir vaqtda foydalana oladi.

### 1.6. Odoo foydalanuvchisi yaratish

```bash
sudo adduser --system --home=/opt/odoo --group odoo
```

### 1.7. Odoo 17 yuklab olish

```bash
sudo git clone https://github.com/odoo/odoo.git --depth 1 --branch 17.0 /opt/odoo/odoo-server
```

### 1.8. Python muhit yaratish

```bash
cd /opt/odoo
sudo python3 -m venv odoo-venv
sudo chown -R odoo:odoo /opt/odoo/odoo-venv
source odoo-venv/bin/activate
pip install -r /opt/odoo/odoo-server/requirements.txt
deactivate
```

### 1.9. Qo'shimcha modullar papkasi

```bash
sudo mkdir /opt/odoo/custom-addons
sudo chown -R odoo:odoo /opt/odoo/custom-addons
```

### 1.10. Odoo konfiguratsiya fayli

```bash
sudo nano /etc/odoo.conf
```

Quyidagini yozing:

```ini
[options]
; Admin parol — buni o'zgartiring!
admin_passwd = ADMIN_MAXFIY_PAROL

; Database
db_host = localhost
db_port = 5432
db_user = odoo
db_password = KUCHLI_PAROL_YOZING
db_name = mizan_db

; Yo'llar
addons_path = /opt/odoo/odoo-server/addons, /opt/odoo/custom-addons

; Log
logfile = /var/log/odoo/odoo.log
log_level = info

; Port
http_port = 8069
xmlrpc_port = 8069

; Ishlash sozlamalari
workers = 4
max_cron_threads = 2
limit_memory_hard = 2684354560
limit_memory_soft = 2147483648
limit_time_cpu = 600
limit_time_real = 1200
```

```bash
sudo chown odoo:odoo /etc/odoo.conf
sudo chmod 640 /etc/odoo.conf
sudo mkdir -p /var/log/odoo
sudo chown odoo:odoo /var/log/odoo
```

### 1.11. Systemd xizmat yaratish

```bash
sudo nano /etc/systemd/system/odoo.service
```

```ini
[Unit]
Description=Odoo 17
After=network.target postgresql.service

[Service]
Type=simple
SyslogIdentifier=odoo
PermissionsStartOnly=true
User=odoo
Group=odoo
ExecStart=/opt/odoo/odoo-venv/bin/python3 /opt/odoo/odoo-server/odoo-bin -c /etc/odoo.conf
StandardOutput=journal+console
Restart=on-failure

[Install]
WantedBy=default.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable odoo
sudo systemctl start odoo
```

### 1.12. Nginx reverse proxy

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/odoo
```

```nginx
upstream odoo {
    server 127.0.0.1:8069;
}

server {
    listen 80;
    server_name mizan.example.com;  # O'zingizning domeningiz

    access_log /var/log/nginx/odoo.access.log;
    error_log /var/log/nginx/odoo.error.log;

    proxy_buffers 16 64k;
    proxy_buffer_size 128k;
    client_max_body_size 100m;

    location / {
        proxy_pass http://odoo;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_redirect off;
    }

    location /longpolling {
        proxy_pass http://127.0.0.1:8072;
    }

    location ~* /web/static/ {
        proxy_cache_valid 200 90m;
        proxy_buffering on;
        expires 864000;
        proxy_pass http://odoo;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/odoo /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 1.13. SSL sertifikat (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mizan.example.com
```

### 1.14. Tekshirish

Brauzerda oching: `http://SIZNING_SERVER_IP:8069`

Ko'rsatilishi kerak: Odoo database yaratish sahifasi.
- **Master Password:** ADMIN_MAXFIY_PAROL (1.10 da yozgan)
- **Database Name:** mizan_db
- **Email:** admin@mizanarchitect.uz
- **Password:** admin uchun parol
- **Language:** Russian (keyinroq O'zbek qo'shish mumkin)
- **Country:** Uzbekistan
- **Demo data:** ❌ Bo'sh qoldiring (demo ma'lumot kerak emas!)

---

## 2. DARK MODE TEMA O'RNATISH {#2-dark-mode}

### 2.1. Dark Mode Backend Theme (bepul variant)

Bu modul Odoo interfeysingizni Nizam dagi kabi qorong'u qiladi.

**Usul 1: OCA web_dark_mode (tavsiya)**

```bash
cd /opt/odoo/custom-addons

# OCA web modullarini yuklab olish
sudo git clone https://github.com/OCA/web.git --depth 1 --branch 17.0 /opt/odoo/oca-web

# Dark mode modulni custom-addons ga nusxalash
sudo cp -r /opt/odoo/oca-web/web_dark_mode /opt/odoo/custom-addons/
sudo chown -R odoo:odoo /opt/odoo/custom-addons/web_dark_mode
```

**Usul 2: Cybrosys Dark Mode Backend Theme**

```
1. https://apps.odoo.com/apps/themes/17.0/dark_mode_backend sahifasiga kiring
2. "Download" bosing → ZIP fayl yuklanadi
3. ZIP ni serverga yuklang:
   scp dark_mode_backend.zip root@SERVER_IP:/opt/odoo/custom-addons/
4. Serverda:
   cd /opt/odoo/custom-addons
   unzip dark_mode_backend.zip
   chown -R odoo:odoo dark_mode_backend/
```

### 2.2. Modulni Odoo da o'rnatish

```bash
# Odoo ni qayta ishga tushirish (yangi modullar ko'rinishi uchun)
sudo systemctl restart odoo
```

Odoo interfeysi:
1. **«Настройки»** (Settings) menyusiga kiring
2. **«Активировать режим разработчика»** (Developer Mode) ni yoqing — sahifa pastida yozuv bor
3. **«Приложения»** (Apps) menyusiga kiring
4. **«Обновить список приложений»** (Update Apps List) bosing
5. Qidiruvga `dark` yozing
6. **"Dark Mode Backend Theme"** topiladi → **«Установить»** (Install) bosing

### 2.3. MIZAN ranglarini sozlash

Agar CSS orqali qo'shimcha sozlash kerak bo'lsa (Nizam ranglariga yaqinlashtirish):

```bash
sudo nano /opt/odoo/custom-addons/mizan_theme/__manifest__.py
```

```python
{
    'name': 'MIZAN Theme Customization',
    'version': '17.0.1.0.0',
    'category': 'Theme',
    'summary': 'MIZAN Architecture custom colors',
    'depends': ['web'],
    'data': [],
    'assets': {
        'web.assets_backend': [
            'mizan_theme/static/src/scss/mizan_colors.scss',
        ],
    },
    'installable': True,
    'auto_install': False,
}
```

```bash
sudo mkdir -p /opt/odoo/custom-addons/mizan_theme/static/src/scss
sudo nano /opt/odoo/custom-addons/mizan_theme/static/src/scss/mizan_colors.scss
```

```scss
// MIZAN Architecture — Nizam ga o'xshash ranglar
:root {
  // Asosiy qorong'u fon
  --mizan-bg-dark: #1a1d23;
  --mizan-bg-card: #22262d;
  --mizan-bg-sidebar: #181b20;
  
  // Matn ranglari
  --mizan-text-primary: #e4e6ea;
  --mizan-text-secondary: #9ca3af;
  
  // Accent ranglar (Nizam dan)
  --mizan-accent-green: #10b981;
  --mizan-accent-blue: #3b82f6;
  --mizan-accent-red: #ef4444;
  --mizan-accent-yellow: #f59e0b;
}

// Dark mode da sidebar rangi
.o_main_navbar {
  background-color: var(--mizan-bg-dark) !important;
}
```

```bash
# __init__.py fayl (bo'sh, lekin kerak)
sudo touch /opt/odoo/custom-addons/mizan_theme/__init__.py
sudo chown -R odoo:odoo /opt/odoo/custom-addons/mizan_theme/
sudo systemctl restart odoo
```

---

## 3. ODOO ASOSIY SOZLASH {#3-asosiy-sozlash}

### 3.1. Kerakli modullarni o'rnatish

Odoo ga kirganingizdan keyin **«Приложения»** (Apps) menyusiga o'ting va quyidagilarni o'rnating:

| Modul nomi | Ruscha | Nima uchun kerak |
|-----------|--------|-----------------|
| Project | Проекты | Proektlarni boshqarish |
| Timesheets | Расписания | Play/Stop timesheet |
| HR (Employees) | Сотрудники | Xodimlar ma'lumotlari |
| Contacts | Контакты | Klientlar bazasi |
| Accounting | Бухгалтерия | Moliyaviy hisob (keyinroq) |
| Purchase | Закупки | Xaridlar (keyinroq) |
| Calendar | Календарь | Voqealar kalendari |
| Discuss | Обсуждения | Ichki xabarlar |

**Qanday o'rnatish:**
1. «Приложения» sahifasiga kiring
2. Qidiruvga modul nomini yozing (masalan, "Project")
3. **«Установить»** (Install) tugmasini bosing
4. Kutib turing (1-2 daqiqa)
5. Keyingi modulni o'rnating

### 3.2. Kompaniya ma'lumotlarini sozlash

1. **«Настройки»** → **«Общие настройки»** → **«Компании»**
2. "My Company" ni bosing va o'zgartiring:

| Maydon | Qiymat |
|--------|--------|
| Название компании | MIZAN Architecture |
| Адрес | Toshkent, O'zbekiston |
| Телефон | +998 XX XXX XX XX |
| Эл. почта | info@mizanarchitect.uz |
| Веб-сайт | mizanarchitect.uz |
| Валюта | UZS |
| ИНН | Sizning INN |

3. **Logotip yuklash:** "Загрузить" bosing → MIZAN logotipini tanlang

### 3.3. Valyuta sozlash

1. **«Настройки»** → **«Бухгалтерия»** → **«Валюты»**
2. **USD** ni yoqing (agar o'chirilgan bo'lsa)
3. Kursni qo'ying: **1 USD = 12,850 UZS**

### 3.4. Til sozlash

1. **«Настройки»** → **«Переводы»** → **«Языки»**
2. "Russian / русский" — allaqachon o'rnatilgan
3. Agar O'zbek til kerak: "Uzbek" ni qidiring → **«Активировать»**

---

## 4. BO'LIMLAR YARATISH {#4-bolimlar}

**Yo'l:** «Сотрудники» → «Конфигурация» → «Отделы»

Har bir bo'limni qo'shing:

| Bo'lim nomi | Ruscha yozish | Menejer |
|------------|---------------|---------|
| MP — Bosh arxitektor | Главный архитектор | Jahongir Ikromov |
| ARX — Arxitektura | Архитектура | (ko'rsating) |
| 3D — 3D vizualizatsiya | 3D Визуализация | (ko'rsating) |
| INT — Interer dizayn | Интерьер Дизайн | (ko'rsating) |
| GD — Grafik dizayn | Графический Дизайн | (ko'rsating) |
| SM — Smeta va hisob | Сметный отдел | (ko'rsating) |
| KON — Konstruktiv | Конструктив | (ko'rsating) |
| ADM — Ma'muriyat | Администрация | (ko'rsating) |

**Qanday qo'shish:**
1. «Сотрудники» menyusi → «Конфигурация» → «Отделы»
2. **«Создать»** (Create) bosing
3. "Название отдела" maydoniga nomni yozing
4. "Руководитель" maydoniga menejer ismini tanlang
5. **«Сохранить»** (Save) bosing

---

## 5. XODIMLAR IMPORT QILISH {#5-xodimlar}

### 5.1. Excel fayl tayyorlash

Quyidagi ustunlar bilan Excel fayl yarating (yoki men tayyorlagan namunani ishlating):

| Ism (Name) | Bo'lim (Department) | Lavozim (Job Title) | Ish email | Telefon |
|-----------|---------------------|---------------------|-----------|---------|
| ABDULLA ABDULLAYEV | Архитектура | Arxitektor | abdulla@mizanarchitect.uz | |
| ABDURASHID ABDUG'OFUROV | Конструктив | Konstruktor | abdurashid@mizanarchitect.uz | |
| ADIZ SAIDOV | 3D Визуализация | 3D Vizualizer | adiz@mizanarchitect.uz | |
| AZIZ MUXAMEDOV | Архитектура | Arxitektor | aziz.m@mizanarchitect.uz | |
| AZIZ OMONOV | Архитектура | Arxitektor | aziz.o@mizanarchitect.uz | |
| BEHZOD NIYAZOV | Сметный отдел | Smetchi | behzod@mizanarchitect.uz | |
| DAVRON DJURAYEV | 3D Визуализация | 3D Vizualizer | davron@mizanarchitect.uz | |
| FARHOD INAGAMOV | Конструктив | Konstruktor | farhod@mizanarchitect.uz | |
| IBROXIM ISLOMOV | Архитектура | Arxitektor | ibroxim@mizanarchitect.uz | |
| ISKANDAR XUDOYBERDIYEV | Интерьер Дизайн | Interer dizayner | iskandar@mizanarchitect.uz | |
| ISLOM DJURAYEV | 3D Визуализация | 3D Vizualizer | islom@mizanarchitect.uz | |
| JAHONGIR IKROMOV | Главный архитектор | Bosh arxitektor | jahongir@mizanarchitect.uz | |
| OLCHINBEK OLIMOV | Конструктив | Konstruktor | olchinbek@mizanarchitect.uz | |
| RAMZIDDIN MUXUTDINOV | Архитектура | Arxitektor | ramziddin@mizanarchitect.uz | |
| SHAHZOD RAHMATOV | Архитектура | Arxitektor | shahzod@mizanarchitect.uz | |
| SHAXBOZ UMATALIYEV | 3D Визуализация | 3D Vizualizer | shaxboz@mizanarchitect.uz | |
| UMAR RISBEKOV | Администрация | HR menejer | umar.r@mizanarchitect.uz | |
| UMAR SHARIPOV | Архитектура | Arxitektor | umar.sh@mizanarchitect.uz | |
| UMID RAXMATOV | Графический Дизайн | Grafik dizayner | umid@mizanarchitect.uz | |
| XASAN G'ANIXO'JAYEV | Архитектура | Arxitektor | xasan@mizanarchitect.uz | |
| ZAFARJON RAXMATOV | Архитектура | Arxitektor | zafarjon@mizanarchitect.uz | |
| ZIYOVIDDIN FAXRIDDINOV | 3D Визуализация | 3D Vizualizer | ziyoviddin@mizanarchitect.uz | |
| ZOIR AHMADALIYEV | Интерьер Дизайн | Interer dizayner | zoir@mizanarchitect.uz | |

### 5.2. Import qilish

1. **«Сотрудники»** menyusiga kiring
2. **«Список»** (List) ko'rinishiga o'ting
3. Yuqori o'ng burchakda **⚙️ → «Импорт записей»** (Import records) bosing
4. Excel faylingizni yuklang: **«Загрузить файл»**
5. Ustunlarni moslashtiring:
   - "Ism" → `Имя сотрудника` (Name)
   - "Bo'lim" → `Отдел` (Department)
   - "Lavozim" → `Должность` (Job Title)
   - "Email" → `Рабочий эл. адрес` (Work Email)
6. **«Импортировать»** (Import) bosing

### 5.3. Xodim rasmlarini yuklash

Har bir xodim uchun rasm yuklash:

1. **«Сотрудники»** ro'yxatidan xodim ismini bosing
2. Xodim sahifasi ochiladi
3. Chap tepada **rasm joyi** ko'rinadi (doira shakli)
4. Rasm ustiga bosing → **«Загрузить»** → rasmni tanlang
5. **«Сохранить»** bosing

**Maslahat:** Rasmlarni oldindan tayyorlab qo'ying:
- Hajmi: 200×200 px yoki 300×300 px (kvadrat)
- Format: JPG yoki PNG
- Nizam dan olib ishlatsangiz ham bo'ladi

### 5.4. Xodimni tizim foydalanuvchisiga aylantirish

Har bir xodim Odoo ga kirib, timesheet yoza olishi uchun foydalanuvchi (user) yaratish kerak:

1. Xodim sahifasida yuqorida **«Создать пользователя»** tugmasi bor
2. Bosing → foydalanuvchi sozlash sahifasi ochiladi
3. **Email** — xodimning email manzili
4. **Группы доступа** — rolga qarab sozlang (keyinroq batafsil)
5. **«Сохранить»** bosing
6. Xodimga login va parol jo'natiladi

---

## 6. KLIENTLAR IMPORT QILISH {#6-klientlar}

### 6.1. Klientlar ro'yxati (Nizam dan)

Sizning ma'lumotlaringiz bo'yicha asosiy klientlar:

| Klient nomi | Proektlar soni |
|------------|---------------|
| Xurshid Hidoyatov | 41 |
| Jahongir Ikromov | 17 |
| Mizan Architect (ichki) | 15 |
| Discover Invest | 10 |
| Uztelecom | 6 |
| Xurshid O'rmonov | 6 |
| Jahongir Aripov | 4 |
| KOC | 4 |
| Abdugaffor | 3 |
| UDAP | 3 |
| Artur | 3 |
| Fayzulloh aka | 3 |
| AHK | 3 |
| Wendys | 3 |
| Botir Promebel | 1 |
| MANAR Development | 1 |
| Chipland | 1 |
| Sanjar aka | 1 |
| Avtoritet severny | 1 |

### 6.2. Import qilish

1. **«Контакты»** menyusiga kiring
2. **«Список»** ko'rinishiga o'ting
3. **⚙️ → «Импорт записей»**
4. Excel fayl yuklang (ustunlar: Имя, Телефон, Эл. почта, Адрес)
5. **Turi:** "Компания" tanlang (har bir klient — kompaniya)
6. **«Импортировать»** bosing

---

## 7. PROEKTLAR YARATISH VA SOZLASH {#7-proektlar}

### 7.1. Proekt bosqichlarini sozlash

Nizam dagi kabi — proektning o'zi uchun bosqichlar:

1. **«Проекты»** menyusiga kiring
2. Har bir proekt yaratishda teglar qo'shish mumkin

### 7.2. Proekt turi (teglar)

Nizam da "Type of Project" ustuni bor. Odoo da buni **teglar** (Ярлыки) orqali qilamiz:

**Yo'l:** «Проекты» → «Конфигурация» → «Ярлыки» (Tags)

| Teg nomi | Rang |
|---------|------|
| Design | 🟢 Yashil |
| DED | 🔵 Ko'k |
| Concept | 🟡 Sariq |
| Masterplan | 🟣 Binafsha |
| Visualization | 🟠 Apelsin |
| Interior | 🔴 Qizil |
| Graphic | ⚪ Kulrang |
| Construction | 🟤 Jigarrang |

### 7.3. Proektlarni yaratish

1. **«Проекты»** → **«Создать»** (Create)
2. Har bir proekt uchun to'ldiring:

| Maydon | Nima yozish | Misol |
|--------|------------|-------|
| Название | Proekt nomi | Xiva qal'asi |
| Клиент | Klientni tanlang | Discover Invest |
| Менеджер | Mas'ul xodim | Jahongir Ikromov |
| Ярлыки | Proekt turi | Concept, Visualization |
| Дата начала | Boshlanish sanasi | 2026-01-20 |
| Крайний срок | Muddat | 2026-04-20 |
| Расписания | ✅ Yoqilgan | Timesheet yozish uchun |

### 7.4. Proektlarni Excel dan import qilish

156 ta proektni qo'lda kiritish ko'p vaqt oladi. Import qiling:

1. **«Проекты»** → **«Список»** ko'rinishi
2. **⚙️ → «Импорт записей»**
3. Excel faylni tayyorlang:

```
Ustunlar:
- Название (name)
- Клиент (partner_id) — klient nomi
- Дата начала (date_start)
- Крайний срок (date)
- Ярлыки (tag_ids) — vergul bilan ajratilgan
```

4. Fayl yuklab → ustunlarni moslashtiring → **«Импортировать»**

**Muhim:** Avval klientlar import qilingan bo'lishi kerak, aks holda Odoo klientni topa olmaydi.

---

## 8. VAZIFALAR BOSQICHLARI (NIZAM USLUBI) {#8-vazifalar}

### 8.1. Vazifa bosqichlarini sozlash

Nizam dagi pipeline: **Планирование → В работе → На согласовании → Выполнено**

Odoo da har bir proekt uchun bosqichlar sozlanadi:

1. Biror proektni oching
2. **Vazifalar** ro'yxatiga o'ting
3. **«Доска»** (Kanban) ko'rinishiga o'ting
4. **«+ Этап»** (+ Stage) bosing va quyidagilarni yarating:

| Bosqich nomi | Tartib | Tavsif |
|-------------|--------|--------|
| Планирование | 1 | Vazifa rejalashtirilmoqda |
| В работе | 2 | Xodim ishlayapti |
| На согласовании | 3 | Tekshiruvda |
| Келишиш учун | 4 | Bosh arxitektor ko'rishi kerak |
| Выполнено | 5 | Tugallangan (yashil belgi) |

**Muhim:** "Выполнено" bosqichiga o'tgan vazifalar **«Свернутый»** (Folded) qilib belgilanishi kerak — bu yashirilgan holatda ko'rinadi.

### 8.2. Vazifa turlarini yaratish (Type of Work)

Nizam da "Type of work" ustuni bor. Odoo da buni **Custom Field** orqali qo'shamiz:

1. **Режим разработчика** yoqilgan bo'lishi kerak
2. **«Настройки»** → **«Техническое»** → **«Поля»**
3. **«Создать»** bosing:
   - Модель: `project.task`
   - Имя поля: `x_type_of_work`
   - Тип: Выбор (Selection)
   - Значения:
     - `design` — Дизайн
     - `modeling_viz` — Моделирование и визуализация экстерьера
     - `interior_viz` — Интерьер Визуализация
     - `exterior_viz` — Экстерьер Визуализация
     - `marketing` — Маркетинг
     - `ded` — DED (Детальный проект)
     - `concept` — Концепт
     - `construction` — Конструктив
     - `smeta` — Смета

### 8.3. Urgency (Срочность) maydonlari

Nizam da urgency bor (Высокий, Средний, Низкий). Odoo da bu **«Приоритет»** (Priority) maydoni sifatida standart mavjud — yulduzchalar bilan ko'rinadi. Qo'shimcha maydon kerak emas.

---

## 9. TIMESHEET (PLAY/STOP) SOZLASH {#9-timesheet}

### 9.1. Timesheet modulini yoqish

1. Agar hali o'rnatmagan bo'lsangiz: **«Приложения»** → "Timesheets" → **«Установить»**
2. **«Настройки»** → **«Расписания»** (Timesheets) bo'limiga kiring
3. Sozlamalar:
   - ✅ **«Привязка к проекту/задаче»** — yoqilgan
   - ✅ **«Таймер»** — yoqilgan (bu Play/Stop funksiyasi!)

### 9.2. Xodim uchun timesheet qanday ishlaydi

**Nizam dagi kabi ishlaydi:**

1. Xodim Odoo ga kiradi
2. **«Расписания»** (Timesheets) menyusiga o'tadi
3. **«Мои расписания»** sahifasi ochiladi
4. Yangi qator qo'shadi:
   - Proekt tanlaydi
   - Vazifa tanlaydi
   - ▶️ **«Старт»** (Play) bosadi — timer boshlaydi
   - Ish tugagach ⏹️ **«Стоп»** (Stop) bosadi

**Yoki vazifadan:**
1. Biror vazifani ochadi
2. **«Расписания»** tabiga o'tadi
3. ▶️ **Play** bosadi — soat hisoblana boshlaydi
4. Boshqa vazifaga o'tsa — yangi vazifada Play bosadi, oldingi avtomatik to'xtaydi

### 9.3. Menejer nazorati

Menejer (Jahongir Ikromov) quyidagilarni ko'ra oladi:

1. **«Расписания»** → **«Все расписания»** — barcha xodimlar timesheet
2. **Hisobot:** «Расписания» → **«Отчёты»** → «По проектам» / «По сотрудникам»
3. Oylik jami soatlar — Nizam dagi "Отчет по проектам" ning Odoo versiyasi

---

## 10. DASHBOARD YARATISH {#10-dashboard}

### 10.1. Odoo standart dashboard

Odoo 17 da **«Обсуждения»** (Discuss) moduli va **«Проекты»** sahifasi dashboard vazifasini bajaradi.

### 10.2. Metabase bilan professional dashboard (TAVSIYA)

Eng yaxshi variant — Metabase dan foydalanish. Bu CONTEXT.md dagi 4-qatlam.

**Metabase o'rnatish:**

```bash
# Docker o'rnatish (agar yo'q bo'lsa)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Metabase ishga tushirish
sudo docker run -d \
  --name metabase \
  --restart always \
  -p 3000:3000 \
  -e MB_DB_TYPE=postgres \
  -e MB_DB_DBNAME=metabase_db \
  -e MB_DB_PORT=5432 \
  -e MB_DB_USER=metabase_user \
  -e MB_DB_PASS=METABASE_PAROL \
  -e MB_DB_HOST=localhost \
  metabase/metabase
```

**Metabase read-only foydalanuvchi:**

```sql
-- PostgreSQL da
CREATE USER metabase_user WITH PASSWORD 'METABASE_PAROL';
GRANT CONNECT ON DATABASE mizan_db TO metabase_user;
GRANT USAGE ON SCHEMA public TO metabase_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_user;
```

### 10.3. Dashboard elementlari

Metabase da quyidagi dashboardlarni yaratamiz:

**DASHBOARD 1: "MIZAN — Umumiy ko'rinish"**

| Element | Turi | Ma'lumot manbai |
|---------|------|-----------------|
| Ochiq proektlar soni | Katta raqam (KPI) | `project_project WHERE active=true` |
| Jami xodimlar | Katta raqam | `hr_employee WHERE active=true` |
| Bu oydagi soatlar | Katta raqam | `account_analytic_line` |
| Bu hafta timesheet | Grafik (bar) | Xodim → Soat |
| Proektlar bo'yicha soat | Pie chart | Proekt → Jami soat |
| Xodimlar hozir ishlamoqda | Jadval + rasm | Oxirgi timesheet yozuvlar |
| Muddati o'tgan vazifalar | Jadval (qizil) | `project_task WHERE date_deadline < NOW()` |

**DASHBOARD 2: "Xodimlar — Oylik hisobot"**

| Element | Turi |
|---------|------|
| Har xodim uchun oylik soat | Gorizontal bar |
| Xodim rasmi + jami soat | Kartochka |
| Bo'lim bo'yicha soat | Pie chart |
| Kun bo'yicha soat (kalendar) | Heatmap |

**DASHBOARD 3: "Proekt — Batafsil"**

| Element | Turi |
|---------|------|
| Proekt bo'yicha xodimlar soati | Stacked bar |
| Proekt progress | Progress bar |
| Vazifalar statusi | Kanban-like |
| Muddatgacha qolgan kunlar | Raqam |

### 10.4. Nizam dagi elementlarning Metabase ekvivalentlari

| Nizam element | Metabase ekvivalenti |
|--------------|---------------------|
| "Обзор проектов" — Ochiq/Выполнено/Ожидание | 3 ta KPI kartochka |
| "Обзор всех заданий" — donut chart | Pie/Donut chart (vazifa statuslari) |
| "Сотрудники в каких задачах работают" | Jadval: xodim ↔ proekt ↔ vazifa ↔ soat |
| "Отчет по проектам" — kunlik soatlar matritsasi | Pivot jadval |
| Xodimlar suratlari bilan ro'yxat | HTML kartochkalar (Metabase custom question) |

---

## 11. FOYDALANUVCHILAR VA ROLLAR {#11-rollar}

### 11.1. Rollar tuzilmasi

| Rol | Kim | Odoo dagi guruh | Nima ko'ra oladi |
|-----|-----|-----------------|-----------------|
| **Admin** | Jahongir Ikromov | Settings + All | Hammasi |
| **Menejer** | Bo'lim boshliqlari | Project Manager | O'z bo'limi proektlari, barcha timesheet |
| **Xodim** | Oddiy xodimlar | Internal User | O'z vazifalari, o'z timesheet |
| **Kuzatuvchi** | Moliyachi | Project User (read-only) | Hisobotlar |

### 11.2. Sozlash

1. **«Настройки»** → **«Пользователи и компании»** → **«Пользователи»**
2. Har bir foydalanuvchini oching
3. **«Доступ к приложениям»** bo'limida:

**Admin (Jahongir):**
- Проект: Администратор
- Расписания: Администратор
- Сотрудники: Администратор
- Бухгалтерия: Администратор

**Menejer (Bo'lim boshlig'i):**
- Проект: Администратор
- Расписания: Все расписания
- Сотрудники: Ответственный
- Бухгалтерия: (yo'q)

**Xodim (Oddiy):**
- Проект: Пользователь
- Расписания: Собственные расписания
- Сотрудники: (yo'q — faqat o'zini ko'radi)
- Бухгалтерия: (yo'q)

---

## 12. MIZAN COSTING SERVICE (KEYINGI BOSQICH) {#12-costing}

Bu CONTEXT.md dagi 2-qatlam. Odoo to'liq sozlanganidan keyin boshlaymiz.

**Nima qiladi:**
- Har bir xodimning soat narxini hisoblaydi
- Proektning MIZAN ulushini aniqlaydi
- Plan vs Fakt byudjet nazorati
- Risk koeffitsient bilan narxlash

**Texnologiya:**
- Python + FastAPI
- Odoo ga XML-RPC orqali ulanadi
- Alohida port: 8000
- Cron: har kecha 02:00 da hisoblash

Buni keyingi bosqichlarda batafsil qilamiz.

---

## IMPORT TARTIBI — XULOSA

```
1-qadam: Server + Odoo o'rnatish ................. 2-3 soat
2-qadam: Dark mode tema o'rnatish ................ 30 daqiqa
3-qadam: Kompaniya sozlash ....................... 15 daqiqa
4-qadam: Bo'limlar yaratish (8 ta) ............... 20 daqiqa
5-qadam: Xodimlar import (23+ kishi) ............. 1 soat
6-qadam: Xodim rasmlari yuklash .................. 30 daqiqa
7-qadam: Klientlar import (19+ klient) ........... 30 daqiqa
8-qadam: Proektlar import (156 ta) ............... 1-2 soat
9-qadam: Vazifa bosqichlari sozlash .............. 30 daqiqa
10-qadam: Timesheet sozlash ...................... 15 daqiqa
11-qadam: Foydalanuvchi yaratish (23 kishi) ...... 1 soat
12-qadam: Dashboard (Metabase) ................... 2-3 soat
13-qadam: Sinov va tuzatish ...................... 1-2 soat
─────────────────────────────────────────────────────────
JAMI: 10-14 soat (2-3 ish kuni)
```

---

## MUHIM ESLATMALAR

1. **Avval sinov serverida** barcha ishlarni qiling, keyin production ga o'tkazing
2. **Har bosqichdan keyin backup** oling: `pg_dump mizan_db > backup_bosqich_N.sql`
3. **Xodimlarni 2-3 kishi** bilan sinab ko'ring, keyin hammasini import qiling
4. **Nizam ni to'xtatmang** — ikki tizim parallel ishlashi kerak, xodimlar o'rganguncha
5. **2-3 hafta parallel ishlash** — xodimlar ikki tizimda ham yozishadi, keyin Nizam o'chiriladi

---

*Tayyorlangan: 2026-03-01*  
*MIZAN Architecture ERP Loyihasi*  
*Keyingi bosqich: Server sotib olish va Odoo o'rnatish*
