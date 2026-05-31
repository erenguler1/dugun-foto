# dugun-foto

Tek bir düğün günü için kullanılan statik fotoğraf toplama sitesi. Davetliler mekândaki QR'ı okutur, `+` butonuna basar, çektikleri fotoğraflar doğrudan çiftin Google Drive klasörüne yüklenir. Frontend statik (HTML/CSS/JS), backend ise Google Apps Script web app.

## Apps Script kurulumu

1. https://script.google.com adresine git ve **New project** ile yeni bir proje oluştur.
2. Varsayılan `Code.gs` içeriğini sil, bu repodaki `apps-script/Code.gs` dosyasının içeriğini yapıştır.
3. Üst kısımdaki `FOLDER_ID` sabitini, fotoğrafların yükleneceği Drive klasörünün ID'siyle değiştir. (Klasör ID'si, Drive'da klasörü açtığında URL'in sonundaki `https://drive.google.com/drive/folders/<BURASI>` kısmıdır.)
4. **Deploy → New deployment** menüsünü aç, deployment türü olarak **Web app** seç.
5. Aşağıdaki ayarlarla deploy et:
   - **Execute as:** `Me` (klasörün sahibi olan hesap)
   - **Who has access:** `Anyone`
6. Deploy sonrası verilen web app URL'sini kopyala. Bu URL daha sonra `app.js` içindeki `APPS_SCRIPT_URL` sabitine yazılacak.
7. Apps Script'i güncellediğinde **Manage deployments → Edit → New version** akışını kullan; yoksa URL değişir ve frontend'deki bağlantı kırılır.

## curl ile test

Küçük bir PNG'yi base64'e çevirip aşağıdaki komutla deploy URL'ine POST atabilirsin. `Content-Type` bilinçli olarak `text/plain` — Apps Script CORS preflight'ı düzgün işlemediği için "simple request" tutuyoruz.

```bash
DATA=$(base64 -i test.png)
curl -L -X POST \
  -H "Content-Type: text/plain" \
  -d "{\"filename\":\"test.png\",\"mimeType\":\"image/png\",\"data\":\"$DATA\"}" \
  "https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec"
```

Başarılı yanıt: `{"success":true,"fileId":"..."}`. Dosya, `FOLDER_ID` ile belirtilen Drive klasöründe görünmelidir.
