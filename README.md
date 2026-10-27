# ASKI — Concept Store

Askıda duran kıyafetler. Ürünler Firebase Firestore'da, yönetici girişi Firebase Auth ile.
Dosyalar: `index.html`, `style.css`, `app.js`, `firebase-config.js`, `firestore.rules`.

## 1. Firebase kurulumu
1. https://console.firebase.google.com → **Proje ekle**.
2. **Proje ayarları → Uygulamalarınız → Web (</>)** ile bir web uygulaması ekle, çıkan `firebaseConfig` değerlerini `firebase-config.js` içine yapıştır.
3. **Build → Firestore Database → Veritabanı oluştur** (production mode).
4. **Build → Authentication → Sign-in method → E-posta/Şifre**'yi aç.
5. **Authentication → Users → Add user** ile kendine yönetici hesabı aç, oluşan **User UID**'yi kopyala.
6. **Firestore → Rules** sekmesine `firestore.rules` içeriğini yapıştır, `ADMIN_UID_BURAYA` yerine UID'ni yaz, **Publish** de.
   (Herkes ürünleri okur, sadece sen yazar/silersin.)

## 2. GitHub'a yükle
```
git init
git add .
git commit -m "ASKI store"
git branch -M main
git remote add origin https://github.com/KULLANICI/aski-store.git
git push -u origin main
```
Repo → **Settings → Pages → Branch: main / root** → Save. Birkaç dakika sonra `https://KULLANICI.github.io/aski-store/` açılır.

> Dosyayı çift tıklayıp açarsan çalışmaz (ES modül kullanıyor). GitHub Pages ya da yerelde `python3 -m http.server` ile aç.

## 3. Kullanım
Sağ alttaki **Yönetici** → giriş yap → sol altta **+ Ürün ekle**. Fotoğraflar küçültülüp (beyaz arka plan kaldırılarak) Firestore'a kaydedilir; ürün başına yaklaşık 900 KB sınırı var. Çok sayıda/büyük fotoğraf için Firebase Storage'a geçilebilir (Blaze planı gerekir).

`apiKey` herkese açık olabilir; güvenliği Firestore kuralları sağlar, o yüzden 6. adımı atlama.
