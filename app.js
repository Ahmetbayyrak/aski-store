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

/* ---------- Raf ---------- */
function build() {
  const row = $("row"); row.innerHTML = "";
  $("empty").hidden = P.length > 0; $("hint").hidden = P.length === 0;
  P.forEach((p, i) => {
    const b = document.createElement("button"); b.className = "item"; b.setAttribute("aria-label", p.name);
    const im = new Image(); im.className = "pic"; im.alt = p.name; im.src = p.variants[0].img;
    b.append(im); b.onclick = () => show(i); row.append(b);
  });
}
function show(i) { cur = (i + P.length) % P.length; ci = 0; paint(); $("prod").classList.add("on"); document.body.classList.add("open"); }
function hide() { $("prod").classList.remove("on"); document.body.classList.remove("open"); }
function paint() {
  const p = P[cur], v = p.variants[ci], st = $("stage");
  $("pname").textContent = p.name; $("pprice").textContent = p.price || "";
  st.innerHTML = ""; const im = new Image(); im.className = "pic"; im.alt = p.name; im.src = v.img; st.append(im);
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
$("add").onclick = () => say(`${P[cur].name} · ${size} sepete eklendi`);

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
      x.putImageData(d, 0, 0); URL.revokeObjectURL(u);
      res({ img: c.toDataURL(rmbg ? "image/webp" : "image/jpeg", .85), hex, ink });
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
    await addDoc(collection(db, "products"), { name, price, variants, createdAt: serverTimestamp() });
    $("am").classList.remove("on"); $("fl").value = ""; $("nm").value = ""; $("pz").value = "";
    say("Askıya asıldı");
  } catch (e) { say("Kaydedilemedi: giriş ve Firestore kurallarını kontrol et"); }
};
$("del").onclick = async () => {
  if (!confirm("Bu ürün silinsin mi?")) return;
  try { await deleteDoc(doc(db, "products", P[cur].id)); } catch (e) { say("Silinemedi"); }
};
