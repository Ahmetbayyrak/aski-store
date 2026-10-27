import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const $ = (i) => document.getElementById(i);
let P = [], cur = 0, ci = 0, size = "M";

function say(m) { const t = $("toast"); t.textContent = m; t.classList.add("on"); setTimeout(() => t.classList.remove("on"), 2200); }

/* ---------- Askı + kıyafet ---------- */
const HANGER = '<svg class="hang" viewBox="0 0 200 60" aria-hidden="true"><path d="M100 24V13C100 2 114 1 114 11" fill="none" stroke="#c4c8cd" stroke-width="2.4" stroke-linecap="round"/><path d="M100 24L22 52Q15 55 23 55H177Q185 55 178 52Z" fill="none" stroke="#8a5c38" stroke-width="4.2" stroke-linejoin="round"/></svg>';
function piece(p, v) {
  const w = document.createElement("div"); w.className = "hg" + (p.hanger ? " on" : "");
  if (p.hanger) w.insertAdjacentHTML("beforeend", HANGER);
  const im = new Image(); im.className = "pic"; im.alt = p.name; im.src = v.img; w.append(im); return w;
}

/* ---------- Raf ---------- */
function build() {
  const row = $("row"); row.innerHTML = "";
  $("empty").hidden = P.length > 0; $("hint").hidden = P.length === 0;
  P.forEach((p, i) => {
    const b = document.createElement("button"); b.className = "item"; b.setAttribute("aria-label", p.name);
    b.append(piece(p, p.variants[0])); b.onclick = () => show(i); row.append(b);
  });
}
function show(i) { cur = (i + P.length) % P.length; ci = 0; paint(); $("prod").classList.add("on"); document.body.classList.add("open"); }
function hide() { $("prod").classList.remove("on"); document.body.classList.remove("open"); }
function paint() {
  const p = P[cur], v = p.variants[ci], st = $("stage");
  $("pname").textContent = p.name; $("pprice").textContent = p.price || "";
  st.innerHTML = ""; st.append(piece(p, v));
  if (p.variants.length > 1) {
    const tg = document.createElement("div"); tg.className = "tags";
    p.variants.forEach((x, k) => {
      const t = document.createElement("button"); t.className = "tag" + (k === ci ? " sel" : "");
      t.style.background = x.hex; t.style.color = x.ink;
      const s = document.createElement("span"); s.textContent = x.label; t.append(s);
      t.onclick = () => { ci = k; paint(); }; tg.append(t);
    });
    st.append(tg);
  }
}
$("close").onclick = hide;
$("prev").onclick = () => show(cur - 1); $("next").onclick = () => show(cur + 1);
document.addEventListener("keydown", (e) => {
  if (!$("prod").classList.contains("on")) return;
  if (e.key === "Escape") hide(); if (e.key === "ArrowLeft") show(cur - 1); if (e.key === "ArrowRight") show(cur + 1);
});
["S", "M", "L", "XL"].forEach((s) => { const b = document.createElement("button"); b.textContent = s; if (s === "M") b.className = "sel"; $("sizes").append(b); });
$("sizes").onclick = (e) => { if (e.target.tagName !== "BUTTON") return; size = e.target.textContent; [...$("sizes").children].forEach((b) => b.classList.toggle("sel", b === e.target)); };
$("add").onclick = () => addToCart();

/* ---------- Hakkında / İletişim / ticker ---------- */
const sheet = (h, t) => { $("sh").textContent = h; $("sp").textContent = t; $("sheet").classList.add("on"); };
$("about").onclick = () => sheet("Hakkında", "ASKI, parçaların rafta değil askıda yaşadığı küçük bir konsept mağaza. Her ürün tek tek asılır, tek tek seçilir.");
$("contact").onclick = () => sheet("İletişim", "hello@aski.store · Instagram @aski.store");
$("sc").onclick = () => $("sheet").classList.remove("on");
const tk = "&nbsp;&nbsp;SINIRLI KOLEKSİYON ✦ ÜCRETSİZ KARGO ✦ YENİ SEZON ASKIDA ✦ NUMARALI ÜRETİM ✦ ";
$("tk").innerHTML = `<span>${tk.repeat(6)}</span><span>${tk.repeat(6)}</span>`;

/* ---------- Firestore (canlı) ---------- */
onSnapshot(query(collection(db, "products"), orderBy("createdAt")), (s) => {
  P = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.variants && p.variants.length);
  build();
  if ($("prod").classList.contains("on")) { if (!P.length) hide(); else { cur = Math.min(cur, P.length - 1); ci = 0; paint(); } }
}, () => say("Ürünler okunamadı: Firestore kurallarını ve config'i kontrol et"));

/* ---------- Giriş ---------- */
onAuthStateChanged(auth, (u) => document.body.classList.toggle("admin", !!u));
$("lgb").onclick = () => $("lm").classList.add("on");
$("lc").onclick = () => $("lm").classList.remove("on");
$("li").onclick = () => signInWithEmailAndPassword(auth, $("em").value.trim(), $("pw").value)
  .then(() => { $("lm").classList.remove("on"); $("pw").value = ""; })
  .catch(() => say("Giriş başarısız"));
$("out").onclick = () => signOut(auth);

/* ---------- Fotoğraf işleme: küçült + beyaz arka planı kaldır ---------- */
function proc(file, rmbg, maxH) {
  return new Promise((res, rej) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onerror = rej;
    im.onload = () => {
      const s = Math.min(1, maxH / im.height), w = Math.round(im.width * s), h = Math.round(im.height * s);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h), a = d.data;
      if (rmbg) {
        const seen = new Uint8Array(w * h), st = [], T = 232;
        const bg = (p) => { const q = p * 4; return (a[q] > T && a[q + 1] > T && a[q + 2] > T) || a[q + 3] < 10; };
        for (let i = 0; i < w; i++) st.push(i, (h - 1) * w + i);
        for (let i = 0; i < h; i++) st.push(i * w, i * w + w - 1);
        while (st.length) {
          const p = st.pop(); if (seen[p] || !bg(p)) continue;
          seen[p] = 1; a[p * 4 + 3] = 0; const px = p % w;
          if (px > 0) st.push(p - 1); if (px < w - 1) st.push(p + 1); if (p >= w) st.push(p - w); if (p < w * (h - 1)) st.push(p + w);
        }
      }
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < w * h; i += 7) { const q = i * 4; if (a[q + 3] > 200) { r += a[q]; g += a[q + 1]; b += a[q + 2]; n++; } }
      let hex = "#888888", ink = "#000";
      if (n) { r /= n; g /= n; b /= n; hex = "#" + [r, g, b].map((v) => ("0" + Math.round(v).toString(16)).slice(-2)).join(""); ink = (r * .3 + g * .59 + b * .11) < 110 ? "#fff" : "#000"; }
      let x0 = w, y0 = h, x1 = 0, y1 = 0, hasA = false;       // kıyafetin sınırlarını bul, boşlukları kırp
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const al = a[(yy * w + xx) * 4 + 3]; if (al < 250) hasA = true;
        if (al > 16) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      }
      if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
      x.putImageData(d, 0, 0); URL.revokeObjectURL(u);
      const c2 = document.createElement("canvas"); c2.width = x1 - x0 + 1; c2.height = y1 - y0 + 1;
      c2.getContext("2d").drawImage(c, x0, y0, c2.width, c2.height, 0, 0, c2.width, c2.height);
      res({ img: c2.toDataURL(hasA ? "image/webp" : "image/jpeg", .85), hex, ink });
    };
    im.src = u;
  });
}

/* ---------- Ürün ekle / sil (sadece giriş yapmış yönetici) ---------- */
$("addb").onclick = () => $("am").classList.add("on");
$("cn").onclick = () => $("am").classList.remove("on");
$("sv").onclick = async () => {
  const fs = [...$("fl").files]; if (!fs.length) return say("Önce fotoğraf seç");
  const name = $("nm").value.trim() || "Yeni ürün", price = $("pz").value.trim();
  say("Hazırlanıyor…");
  try {
    let variants = [];
    for (const H of [900, 700, 520, 380]) {          // Firestore belge sınırı 1 MB: sığana kadar küçült
      const rs = await Promise.all(fs.map((f) => proc(f, $("rb").checked, H)));
      variants = rs.map((o, k) => ({ label: fs[k].name.replace(/\.[^.]+$/, "").toUpperCase().slice(0, 10), ...o }));
      if (JSON.stringify(variants).length < 900000) break;
    }
    if (JSON.stringify(variants).length >= 900000) return say("Fotoğraflar çok büyük, daha az renk seç");
    await addDoc(collection(db, "products"), { name, price, variants, hanger: $("hg").checked, createdAt: serverTimestamp() });
    $("am").classList.remove("on"); $("fl").value = ""; $("nm").value = ""; $("pz").value = "";
    say("Askıya asıldı");
  } catch (e) { say("Kaydedilemedi: giriş ve Firestore kurallarını kontrol et"); }
};
$("del").onclick = async () => {
  if (!confirm("Bu ürün silinsin mi?")) return;
  try { await deleteDoc(doc(db, "products", P[cur].id)); } catch (e) { say("Silinemedi"); }
};

/* ---------- Sepet ---------- */
const WHATSAPP = "";   // Siparişlerin gideceği numara, ülke koduyla ve + olmadan. Örn: "905551234567"
let cart = []; try { cart = JSON.parse(localStorage.getItem("aski-cart") || "[]"); } catch (e) {}
const saveCart = () => { try { localStorage.setItem("aski-cart", JSON.stringify(cart)); } catch (e) {} };
const num = (s) => { s = String(s || "").replace(/[^\d,.]/g, ""); if (!s) return 0; if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); return parseFloat(s) || 0; };
const tl = (n) => n.toLocaleString("tr-TR") + " ₺";
function addToCart() {
  const p = P[cur], v = p.variants[ci], key = p.id + "|" + v.label + "|" + size, f = cart.find((c) => c.key === key);
  if (f) f.qty++; else cart.push({ key, name: p.name, label: v.label, size, price: p.price || "", img: v.img, qty: 1 });
  saveCart(); drawCart(); say(`${p.name} · ${size} sepete eklendi`);
}
function chg(i, d) { cart[i].qty += d; if (cart[i].qty < 1) cart.splice(i, 1); saveCart(); drawCart(); }
function drawCart() {
  const l = $("cl"); l.innerHTML = ""; let n = 0, t = 0;
  cart.forEach((c, i) => {
    n += c.qty; t += num(c.price) * c.qty;
    const r = document.createElement("div"); r.className = "ci";
    const im = new Image(); im.src = c.img; im.alt = c.name;
    const d = document.createElement("div"), a = document.createElement("b"), m = document.createElement("small"), q = document.createElement("div");
    a.textContent = c.name; m.textContent = `${c.label} · ${c.size} · ${c.price}`; q.className = "qty";
    const mk = (txt, fn, cls) => { const b = document.createElement("button"); b.textContent = txt; if (cls) b.className = cls; b.onclick = fn; return b; };
    const sp = document.createElement("span"); sp.textContent = c.qty;
    q.append(mk("−", () => chg(i, -1)), sp, mk("+", () => chg(i, 1)), mk("Kaldır", () => chg(i, -99), "rm"));
    d.append(a, m, q); r.append(im, d); l.append(r);
  });
  $("cn2").textContent = n; $("vcn").textContent = n; $("ct").textContent = tl(t); $("cempty").hidden = cart.length > 0;
}
$("cartb").onclick = () => $("cart").classList.add("on");
$("vc").onclick = () => $("cart").classList.add("on");
$("cx").onclick = () => $("cart").classList.remove("on");
$("wa").onclick = () => {
  if (!cart.length) return say("Sepetin boş");
  const t = cart.reduce((s, c) => s + num(c.price) * c.qty, 0);
  const text = "Merhaba, sipariş vermek istiyorum:\n" + cart.map((c) => `- ${c.name} (${c.label}, ${c.size}) x${c.qty} — ${c.price}`).join("\n") + `\nToplam: ${tl(t)}`;
  if (WHATSAPP) window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text), "_blank");
  else navigator.clipboard.writeText(text).then(() => say("Sipariş metni kopyalandı (app.js içine WhatsApp numarası yaz)"), () => say("Kopyalanamadı"));
};
drawCart();
