Three Farm - 3D Tarım Oyunu (WASD)

Calistirma

1) Yerel dosyayi tarayici ile acin:
- `index.html` dosyasini Chrome/Edge/Firefox ile acin. Uyari: Bazi tarayicilar `file://` altinda module kaynaklarini engelleyebilir. Bu durumda 2. yontemi kullanin.

2) Basit http server ile calistirin:
- Python 3 ile:
  - `cd three-farm`
  - `python3 -m http.server 5173`
  - Tarayici: `http://localhost:5173`
- Node ile (kuruluysa):
  - `npx http-server -p 5173`
  - Tarayici: `http://localhost:5173`

Kontroller

- WASD: Hareket
- Fare: Etrafina bak (Tiklayip imleci kilitleyin)
- E: Ekim / Hasat
- Q veya 1-3: Tohum sec
- Esc: Kilidi cozer

Ozellikler

- 3D sahne, gunduz-gece dongusu
- 20x20 tarla kareleri, hedef vurgusu
- Ekim, buyume asamalari, hasat, envanter ve altin
- Yerel kayit / otomatik kayit

Notlar

- Bu surum CDN uzerinden Three.js kullanir ve npm kurulumuna gerek duymaz. Isterseniz Vite/TS yapisina gecilebilir.

