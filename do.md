


Harika bir yaklaşım. Projenin "gerçek bir sistem" gibi hissettirmesi için **Çoklu Kullanıcı Desteği** (her kullanıcının kendi ayrı portföyü olması) ve **Ekle/Sil** işlemlerinin her katmana entegre edilmesi projeyi tam notluk bir seviyeye taşıyacaktır. 

Ayrıca "arayüz dâhil" talebinize istinaden Tkinter GUI'yi çok daha profesyonel bir hale getirdim. Artık kullanıcı ve coin yönetimi için açılır pencereler (pop-up formlar) var. Sistemde birden fazla kullanıcı oluşturabilir, silebilir, aralarında geçiş yapabilirsiniz. Her kullanıcının kendi cüzdanı ve geçmişi tamamen izole edilmiştir. Piyasadan coin sildiğinizde sistem bu durumu algılar.

İşte hocanızın istediği tüm OOP yapılarını, hata yönetimlerini ve yeni ekle/sil özelliklerini içeren, arayüzlü son ve en yetenekli versiyon:

### 1. Python Kodu (`main.py`)

Aşağıdaki kodu tek bir `main.py` dosyasına kopyalayarak çalıştırabilirsiniz.

```python
"""
PROGRAMLAMA 2 DERSİ - DÖNEM PROJESİ
Kripto Para Portföy ve İşlem Takip Sistemi (GUI Versiyonu)
Gelişmiş Özellikler: Çoklu Kullanıcı, İzole Portföyler, Tam Ekle/Sil İşlevleri
Kullanılan OOP Yapıları: Abstraction, Inheritance, Polymorphism, Encapsulation
"""

import os
import json
import tkinter as tk
from tkinter import messagebox, simpledialog, ttk
from abc import ABC, abstractmethod
from datetime import datetime

# ==========================================
# 1. DOMAIN MODELLERİ (OOP Yapıları)
# ==========================================

# ABSTRACTION (Soyutlama)
class Varlik(ABC):
    """
    Sistemdeki tüm finansal varlıkların türetileceği soyut (abstract) temel sınıf.
    """
    def __init__(self, sembol: str):
        self._sembol = sembol # ENCAPSULATION (Kapsülleme)

    @property
    def sembol(self) -> str:
        return self._sembol

    @sembol.setter
    def sembol(self, deger: str):
        self._sembol = deger.upper().strip()

    @abstractmethod
    def deger_hesapla(self) -> float:
        """Her alt sınıf kendi değer hesaplamasını (polymorphism) yapmalıdır."""
        pass


# INHERITANCE (Kalıtım)
class Coin(Varlik):
    """
    Varlik sınıfından miras alan Kripto Para (Coin) sınıfı.
    """
    def __init__(self, sembol: str, guncel_fiyat: float):
        super().__init__(sembol)
        self._guncel_fiyat = guncel_fiyat # ENCAPSULATION

    @property
    def guncel_fiyat(self) -> float:
        return self._guncel_fiyat

    @guncel_fiyat.setter
    def guncel_fiyat(self, fiyat: float):
        if fiyat < 0:
            raise ValueError("Fiyat negatif olamaz.")
        self._guncel_fiyat = fiyat

    # POLYMORPHISM (Çok Biçimlilik) - Ata sınıfın soyut metodunu eziyoruz (override)
    def deger_hesapla(self) -> float:
        return self._guncel_fiyat


class Islem:
    """İşlem geçmişi için kayıt sınıfı (Veri Modeli)."""
    def __init__(self, sembol: str, islem_tipi: str, miktar: float, fiyat: float, tarih: str = None):
        self.sembol = sembol.upper()
        self.islem_tipi = islem_tipi.upper()
        self.miktar = miktar
        self.fiyat = fiyat
        self.tarih = tarih if tarih else datetime.now().strftime("%Y-%m-%d %H:%M:%S")


class Portfoy:
    """Her kullanıcının kendi varlıklarını yönetecek özel cüzdan sınıfı."""
    def __init__(self):
        # Sözlük (Dictionary) kullanımı: O(1) erişim hızı
        self.sahip_olunanlar = {}  # Örn: { 'BTC': {'miktar': 2.5, 'ort_maliyet': 50000.0} }
        # Liste kullanımı
        self.islem_gecmisi =[]

    def alim_yap(self, sembol: str, miktar: float, fiyat: float):
        sembol = sembol.upper()
        if sembol in self.sahip_olunanlar:
            mevcut = self.sahip_olunanlar[sembol]
            eski_toplam_maliyet = mevcut['miktar'] * mevcut['ort_maliyet']
            yeni_maliyet = miktar * fiyat
            yeni_miktar = mevcut['miktar'] + miktar
            
            # Ağırlıklı Ortalama Maliyet (WAC) Hesaplama
            ort_maliyet = (eski_toplam_maliyet + yeni_maliyet) / yeni_miktar
            self.sahip_olunanlar[sembol] = {'miktar': yeni_miktar, 'ort_maliyet': ort_maliyet}
        else:
            self.sahip_olunanlar[sembol] = {'miktar': miktar, 'ort_maliyet': fiyat}
            
        self.islem_gecmisi.append(Islem(sembol, "ALIM", miktar, fiyat))

    def satim_yap(self, sembol: str, miktar: float, fiyat: float):
        sembol = sembol.upper()
        if sembol not in self.sahip_olunanlar or self.sahip_olunanlar[sembol]['miktar'] < miktar:
            raise ValueError(f"Yetersiz bakiye. {sembol} varlığınız eksik veya yok.")
        
        self.sahip_olunanlar[sembol]['miktar'] -= miktar
        if self.sahip_olunanlar[sembol]['miktar'] == 0:
            del self.sahip_olunanlar[sembol]  # Sıfırlanan coini sil
            
        self.islem_gecmisi.append(Islem(sembol, "SATIM", miktar, fiyat))


class Kullanici:
    """Kullanıcı bilgilerini ve kendi izole portföyünü tutan sınıf."""
    def __init__(self, ad: str):
        self._ad = ad
        self.portfoy = Portfoy() # Her kullanıcının kendi portföy nesnesi var (Composition)

    @property
    def ad(self) -> str:
        return self._ad


# ==========================================
# 2. SISTEM YÖNETİMİ (KriptoSistemi)
# ==========================================

class KriptoSistemi:
    """Sistemin ana yönetim sınıfı. Tüm kullanıcıları ve global piyasayı yönetir."""
    def __init__(self):
        self.kullanicilar = {} # Tüm kullanıcıların sözlüğü -> { 'Ahmet': Kullanici('Ahmet') }
        self.aktif_kullanici = None # Sistemde o an işlem yapan kullanıcı
        self.piyasa_coinleri = {} # Sistemde kayıtlı piyasa coinleri

    def kullanici_ekle(self, ad: str):
        if not ad or ad.strip() == "":
            raise ValueError("Kullanıcı adı boş olamaz.")
        if ad in self.kullanicilar:
            raise ValueError("Bu kullanıcı zaten sistemde mevcut.")
        self.kullanicilar[ad] = Kullanici(ad)
        self.aktif_kullanici = self.kullanicilar[ad] # Ekleneni aktif yap

    def kullanici_sil(self, ad: str):
        if ad in self.kullanicilar:
            del self.kullanicilar[ad]
            if self.aktif_kullanici and self.aktif_kullanici.ad == ad:
                self.aktif_kullanici = None
        else:
            raise ValueError("Silinmek istenen kullanıcı bulunamadı.")

    def verileri_kaydet(self):
        # Kaydedilecek yapıyı sözlük olarak hazırlıyoruz
        veri = {
            "aktif_kullanici": self.aktif_kullanici.ad if self.aktif_kullanici else None,
            "piyasa_coinleri": {s: c.guncel_fiyat for s, c in self.piyasa_coinleri.items()},
            "kullanicilar": {}
        }
        
        # Kullanıcıların izole portföylerini paketliyoruz
        for ad, kul in self.kullanicilar.items():
            veri["kullanicilar"][ad] = {
                "sahip_olunanlar": kul.portfoy.sahip_olunanlar,
                "islem_gecmisi": [vars(i) for i in kul.portfoy.islem_gecmisi]
            }
            
        with open("data.json", "w", encoding="utf-8") as f:
            json.dump(veri, f, indent=4, ensure_ascii=False)

    def verileri_yukle(self):
        if not os.path.exists("data.json"):
            raise FileNotFoundError("Sistemde kayıtlı veri dosyası bulunamadı (data.json).")
            
        with open("data.json", "r", encoding="utf-8") as f:
            veri = json.load(f)
            
        # Piyasayı Yükle
        self.piyasa_coinleri.clear()
        for sembol, fiyat in veri.get("piyasa_coinleri", {}).items():
            self.piyasa_coinleri[sembol] = Coin(sembol, fiyat)
            
        # Kullanıcıları ve Portföyleri Yükle
        self.kullanicilar.clear()
        for ad, kul_verisi in veri.get("kullanicilar", {}).items():
            yeni_kul = Kullanici(ad)
            yeni_kul.portfoy.sahip_olunanlar = kul_verisi.get("sahip_olunanlar", {})
            for islem in kul_verisi.get("islem_gecmisi",[]):
                yeni_kul.portfoy.islem_gecmisi.append(
                    Islem(islem["sembol"], islem["islem_tipi"], islem["miktar"], islem["fiyat"], islem["tarih"])
                )
            self.kullanicilar[ad] = yeni_kul
            
        # Aktif Kullanıcıyı Ayarla
        aktif = veri.get("aktif_kullanici")
        if aktif and aktif in self.kullanicilar:
            self.aktif_kullanici = self.kullanicilar[aktif]
        else:
            self.aktif_kullanici = None


# ==========================================
# 3. TKINTER ARAYÜZ (GUI)
# ==========================================

class KriptoArayuz:
    def __init__(self, root):
        self.sistem = KriptoSistemi()
        self.root = root
        self.root.title("Kripto Para Portföy Sistemi - Kurumsal Versiyon")
        self.root.geometry("850x600")
        
        # Tema renkleri
        self.bg_sol = "#1e272e"
        self.bg_sag = "#d2dae2"
        self.btn_renk = "#3c40c6"
        self.text_renk = "#ffffff"

        self._arayuz_olustur()
        self.mesaj_yaz("Sisteme Hoş Geldiniz! İşlem yapabilmek için 'Kullanıcı Yönetimi' menüsünden kendinizi ekleyin veya seçin.")

    def mesaj_yaz(self, mesaj):
        """Orta ekrana log ve rapor basar."""
        self.ekran.insert(tk.END, mesaj + "\n")
        self.ekran.see(tk.END)

    def ekran_temizle(self):
        self.ekran.delete("1.0", tk.END)

    def _buton_ekle(self, frame, text, command):
        btn = tk.Button(frame, text=text, command=command, bg=self.btn_renk, fg="white", 
                        font=("Helvetica", 10, "bold"), pady=6, relief=tk.FLAT, cursor="hand2")
        btn.pack(fill=tk.X, padx=15, pady=4)

    def _arayuz_olustur(self):
        # --- Sol Menü Çerçevesi ---
        self.menu_frame = tk.Frame(self.root, width=220, bg=self.bg_sol)
        self.menu_frame.pack(side=tk.LEFT, fill=tk.Y)
        
        # Etiket / Başlık
        baslik = tk.Label(self.menu_frame, text="MENÜ", bg=self.bg_sol, fg="#0fbcf9", font=("Helvetica", 16, "bold"))
        baslik.pack(pady=15)
        
        # Aktif Kullanıcı Göstergesi
        self.lbl_aktif = tk.Label(self.menu_frame, text="Aktif: Yok", bg=self.bg_sol, fg="#0be881", font=("Arial", 10, "bold"))
        self.lbl_aktif.pack(pady=5)

        # Menü Adımları (Yönerge Uyumlu 1-10)
        self._buton_ekle(self.menu_frame, "1. Kullanıcı Yönetimi", self.cmd_kullanici_yonetimi)
        self._buton_ekle(self.menu_frame, "2. Piyasaya Coin Ekle/Sil", self.cmd_coin_yonetimi)
        self._buton_ekle(self.menu_frame, "3. Piyasayı Listele", self.cmd_piyasa_listele)
        self._buton_ekle(self.menu_frame, "4. Alım İşlemi Yap", self.cmd_alim_yap)
        self._buton_ekle(self.menu_frame, "5. Satım İşlemi Yap", self.cmd_satim_yap)
        self._buton_ekle(self.menu_frame, "6. Portföy Görüntüle", self.cmd_portfoy_goruntule)
        self._buton_ekle(self.menu_frame, "7. Kar-Zarar (PnL) Hesapla", self.cmd_kar_zarar)
        self._buton_ekle(self.menu_frame, "8. İşlem Geçmişi", self.cmd_islem_gecmisi)
        self._buton_ekle(self.menu_frame, "9. Verileri Kaydet", self.cmd_kaydet)
        self._buton_ekle(self.menu_frame, "10. Verileri Yükle", self.cmd_yukle)
        
        btn_cikis = tk.Button(self.menu_frame, text="0. Çıkış", command=self.root.quit, bg="#ff3f34", fg="white", font=("Arial", 10, "bold"))
        btn_cikis.pack(fill=tk.X, padx=15, pady=20)

        # --- Sağ İçerik Çerçevesi ---
        self.icerik_frame = tk.Frame(self.root, bg=self.bg_sag)
        self.icerik_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        self.ekran = tk.Text(self.icerik_frame, font=("Consolas", 11), bg="#ffffff", padx=10, pady=10)
        self.ekran.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

    def aktif_guncelle(self):
        """Sol paneldeki Aktif Kullanıcı metnini günceller."""
        ad = self.sistem.aktif_kullanici.ad if self.sistem.aktif_kullanici else "Yok"
        self.lbl_aktif.config(text=f"Aktif: {ad}")

    # ================= MENÜ FONKSİYONLARI =================

    def cmd_kullanici_yonetimi(self):
        """1- Kullanıcı Ekle/Sil/Seç Yönetim Ekranı"""
        win = tk.Toplevel(self.root)
        win.title("Kullanıcı Yönetimi")
        win.geometry("300x350")
        
        tk.Label(win, text="Sistemdeki Kullanıcılar", font=("Arial", 11, "bold")).pack(pady=5)
        
        listbox = tk.Listbox(win, height=10)
        listbox.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        def liste_guncelle():
            listbox.delete(0, tk.END)
            for ad in self.sistem.kullanicilar.keys():
                listbox.insert(tk.END, ad)
                
        liste_guncelle()
        
        def ekle():
            ad = simpledialog.askstring("Yeni Kullanıcı", "Kullanıcı Adı:", parent=win)
            if ad:
                try:
                    self.sistem.kullanici_ekle(ad)
                    liste_guncelle()
                    self.aktif_guncelle()
                    self.ekran_temizle()
                    self.mesaj_yaz(f"[+] Kullanıcı oluşturuldu ve aktif edildi: {ad}")
                except ValueError as e:
                    messagebox.showerror("Hata", str(e), parent=win)
                    
        def sil():
            secili = listbox.get(tk.ACTIVE)
            if not secili: return
            cevap = messagebox.askyesno("Uyarı", f"'{secili}' kullanıcısı ve tüm cüzdan geçmişi silinecek! Emin misiniz?", parent=win)
            if cevap:
                self.sistem.kullanici_sil(secili)
                liste_guncelle()
                self.aktif_guncelle()
                self.ekran_temizle()
                self.mesaj_yaz(f"[-] '{secili}' kullanıcısı sistemden silindi.")
                
        def sec():
            secili = listbox.get(tk.ACTIVE)
            if secili:
                self.sistem.aktif_kullanici = self.sistem.kullanicilar[secili]
                self.aktif_guncelle()
                self.ekran_temizle()
                self.mesaj_yaz(f"[*] Aktif kullanıcı değiştirildi: {secili}")
                win.destroy()
                
        frame_btns = tk.Frame(win)
        frame_btns.pack(pady=10)
        tk.Button(frame_btns, text="Ekle", command=ekle, bg="#0be881").pack(side=tk.LEFT, padx=5)
        tk.Button(frame_btns, text="Seç", command=sec, bg="#0fbcf9").pack(side=tk.LEFT, padx=5)
        tk.Button(frame_btns, text="Sil", command=sil, bg="#ff3f34", fg="white").pack(side=tk.LEFT, padx=5)

    def cmd_coin_yonetimi(self):
        """2- Piyasaya Coin Ekle/Sil/Fiyat Güncelle"""
        win = tk.Toplevel(self.root)
        win.title("Piyasa Coin Yönetimi")
        win.geometry("350x350")
        
        tk.Label(win, text="Piyasadaki Coinler", font=("Arial", 11, "bold")).pack(pady=5)
        
        listbox = tk.Listbox(win, height=10)
        listbox.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        def liste_guncelle():
            listbox.delete(0, tk.END)
            for sembol, coin in self.sistem.piyasa_coinleri.items():
                listbox.insert(tk.END, f"{sembol} - ${coin.guncel_fiyat}")
                
        liste_guncelle()
        
        def ekle_guncelle():
            sembol = simpledialog.askstring("Coin", "Coin Sembolü (Örn: BTC):", parent=win)
            if not sembol: return
            sembol = sembol.upper()
            fiyat = simpledialog.askfloat("Fiyat", f"{sembol} için güncel fiyat ($):", parent=win)
            if fiyat is None or fiyat < 0:
                messagebox.showerror("Hata", "Geçersiz fiyat.", parent=win)
                return
            
            self.sistem.piyasa_coinleri[sembol] = Coin(sembol, fiyat)
            liste_guncelle()
            self.ekran_temizle()
            self.mesaj_yaz(f"[+] Piyasa güncellendi: {sembol} -> ${fiyat}")
            
        def sil():
            secili = listbox.get(tk.ACTIVE)
            if not secili: return
            sembol = secili.split(" - ")[0]
            if messagebox.askyesno("Uyarı", f"{sembol} piyasadan silinsin mi? (Kullanıcı cüzdanlarında kalır ancak piyasa verisi kaybolur)", parent=win):
                del self.sistem.piyasa_coinleri[sembol]
                liste_guncelle()
                self.ekran_temizle()
                self.mesaj_yaz(f"[-] {sembol} sistem piyasasından silindi.")

        frame_btns = tk.Frame(win)
        frame_btns.pack(pady=10)
        tk.Button(frame_btns, text="Ekle/Fiyat Güncelle", command=ekle_guncelle, bg="#0be881").pack(side=tk.LEFT, padx=5)
        tk.Button(frame_btns, text="Sil", command=sil, bg="#ff3f34", fg="white").pack(side=tk.LEFT, padx=5)

    def cmd_piyasa_listele(self):
        """3- Piyasayı Listele"""
        self.ekran_temizle()
        self.mesaj_yaz(f"{'--- CANLI PİYASA COİNLERİ ---':^40}")
        if not self.sistem.piyasa_coinleri:
            self.mesaj_yaz("Piyasada henüz ekli coin yok. 'Coin Yönetimi' menüsünden ekleyin.")
            return
        
        self.mesaj_yaz(f"{'SEMBOL':<10} | {'FİYAT ($)':<15}")
        self.mesaj_yaz("-" * 30)
        for s, c in self.sistem.piyasa_coinleri.items():
            self.mesaj_yaz(f"{s:<10} | ${c.deger_hesapla():<15.2f}") # Polymorphism kullanıldı

    def _kullanici_kontrol(self):
        if not self.sistem.aktif_kullanici:
            messagebox.showwarning("Uyarı", "Lütfen önce Kullanıcı Yönetimi'nden bir kullanıcı seçin veya oluşturun.")
            return False
        return True

    def cmd_alim_yap(self):
        """4- Alım İşlemi"""
        if not self._kullanici_kontrol(): return
        
        try:
            sembol = simpledialog.askstring("Alım", "Alınacak Coin Sembolü:").upper()
            if sembol not in self.sistem.piyasa_coinleri:
                messagebox.showerror("Hata", f"{sembol} piyasada bulunamadı.")
                return
            
            miktar = simpledialog.askfloat("Alım", f"Kaç adet {sembol} alınacak?")
            if not miktar or miktar <= 0: return
            
            fiyat = self.sistem.piyasa_coinleri[sembol].guncel_fiyat
            self.sistem.aktif_kullanici.portfoy.alim_yap(sembol, miktar, fiyat)
            
            self.ekran_temizle()
            self.mesaj_yaz(f"[BAŞARILI] {self.sistem.aktif_kullanici.ad}, {miktar} adet {sembol} varlığını ${fiyat} fiyatından aldı.")
        except Exception as e:
            messagebox.showerror("Hata", "İşlem iptal edildi veya geçersiz değer girildi.")

    def cmd_satim_yap(self):
        """5- Satım İşlemi"""
        if not self._kullanici_kontrol(): return
        
        try:
            sembol = simpledialog.askstring("Satım", "Satılacak Coin Sembolü:").upper()
            miktar = simpledialog.askfloat("Satım", f"Kaç adet {sembol} satılacak?")
            if not miktar or miktar <= 0: return
            
            # Piyasada silinmiş bile olsa, kullanıcının elinde varsa satabilmesi için portföydeki maliyeti/veya elden satışı kontrol etmeliyiz.
            # Ancak gerçekçi olması için piyasada (borsada) olması lazım.
            if sembol not in self.sistem.piyasa_coinleri:
                messagebox.showerror("Hata", "Bu coin piyasadan kaldırılmış (Delist). İşlem yapılamaz.")
                return
                
            fiyat = self.sistem.piyasa_coinleri[sembol].guncel_fiyat
            self.sistem.aktif_kullanici.portfoy.satim_yap(sembol, miktar, fiyat)
            
            self.ekran_temizle()
            self.mesaj_yaz(f"[BAŞARILI] {self.sistem.aktif_kullanici.ad}, {miktar} adet {sembol} sattı.")
        except ValueError as e:
            messagebox.showerror("Bakiye Hatası", str(e))
        except Exception as e:
            messagebox.showerror("Hata", "Bilinmeyen bir hata oluştu.")

    def cmd_portfoy_goruntule(self):
        """6- Portföy Görüntüle"""
        if not self._kullanici_kontrol(): return
        
        self.ekran_temizle()
        aktif_ad = self.sistem.aktif_kullanici.ad
        self.mesaj_yaz(f"{f'--- {aktif_ad} PORTFÖYÜ ---':^60}")
        
        varliklar = self.sistem.aktif_kullanici.portfoy.sahip_olunanlar
        if not varliklar:
            self.mesaj_yaz("Cüzdan boş. Henüz kripto para alınmamış.")
            return
            
        toplam_portfoy_degeri = 0
        self.mesaj_yaz(f"{'COİN':<8} | {'MİKTAR':<12} | {'MALİYET ($)':<12} | {'GÜNCEL DEĞER ($)':<18}")
        self.mesaj_yaz("-" * 60)
        
        for sembol, veri in varliklar.items():
            # Eğer coin piyasadan (sistemden) silindiyse değerini 0 varsay, silinmediyse anlık değerini al
            guncel_fiyat = self.sistem.piyasa_coinleri[sembol].guncel_fiyat if sembol in self.sistem.piyasa_coinleri else 0
            
            anlik_deger = veri['miktar'] * guncel_fiyat
            toplam_portfoy_degeri += anlik_deger
            self.mesaj_yaz(f"{sembol:<8} | {veri['miktar']:<12.4f} | ${veri['ort_maliyet']:<11.2f} | ${anlik_deger:<17.2f}")
            if guncel_fiyat == 0:
                self.mesaj_yaz(f"   *[!] {sembol} piyasadan silinmiş (Delist). Değeri $0 hesaplandı.")
            
        self.mesaj_yaz("=" * 60)
        self.mesaj_yaz(f"PORTFÖYÜN ANLIK TOPLAM BÜYÜKLÜĞÜ: ${toplam_portfoy_degeri:.2f}")

    def cmd_kar_zarar(self):
        """7- Kar / Zarar (PnL) Hesapla"""
        if not self._kullanici_kontrol(): return
        
        self.ekran_temizle()
        self.mesaj_yaz(f"{'--- GERÇEKLEŞMEMİŞ KAR/ZARAR (PnL) ANALİZİ ---':^60}")
        varliklar = self.sistem.aktif_kullanici.portfoy.sahip_olunanlar
        
        genel_pnl = 0
        for sembol, veri in varliklar.items():
            if sembol not in self.sistem.piyasa_coinleri:
                self.mesaj_yaz(f"{sembol:<6} -> Piyasada fiyatı yok. PnL hesaplanamıyor.")
                continue
                
            guncel = self.sistem.piyasa_coinleri[sembol].guncel_fiyat
            maliyet = veri['ort_maliyet']
            miktar = veri['miktar']
            
            pnl = (guncel - maliyet) * miktar
            genel_pnl += pnl
            durum = "KÂR" if pnl >= 0 else "ZARAR"
            self.mesaj_yaz(f"{sembol:<6} -> {pnl:+.2f} $ ({durum})")
            
        self.mesaj_yaz("-" * 50)
        genel_durum = "KÂR" if genel_pnl >= 0 else "ZARAR"
        self.mesaj_yaz(f"TOPLAM NET PnL: {genel_pnl:+.2f} $ ({genel_durum})")

    def cmd_islem_gecmisi(self):
        """8- İşlem Geçmişi"""
        if not self._kullanici_kontrol(): return
        
        self.ekran_temizle()
        self.mesaj_yaz(f"--- {self.sistem.aktif_kullanici.ad} İŞLEM GEÇMİŞİ ---")
        gecmis = self.sistem.aktif_kullanici.portfoy.islem_gecmisi
        if not gecmis:
            self.mesaj_yaz("Bu kullanıcı henüz hiçbir alım/satım işlemi yapmamış.")
            return
            
        self.mesaj_yaz(f"{'TARİH':<20} | {'TİP':<6} | {'COİN':<6} | {'MİKTAR':<10} | {'FİYAT ($)'}")
        self.mesaj_yaz("-" * 65)
        for i in gecmis:
            self.mesaj_yaz(f"{i.tarih[:19]:<20} | {i.islem_tipi:<6} | {i.sembol:<6} | {i.miktar:<10.4f} | ${i.fiyat:.2f}")

    def cmd_kaydet(self):
        """9- Verileri Kaydet"""
        try:
            self.sistem.verileri_kaydet()
            self.ekran_temizle()
            self.mesaj_yaz("[✓] Başarılı: Tüm piyasa verileri ve tüm kullanıcıların portföyleri 'data.json' dosyasına kaydedildi.")
        except Exception as e:
            messagebox.showerror("Hata", f"Kayıt sırasında hata: {e}")

    def cmd_yukle(self):
        """10- Verileri Yükle"""
        try:
            self.sistem.verileri_yukle()
            self.aktif_guncelle()
            self.ekran_temizle()
            self.mesaj_yaz("[✓] Başarılı: Piyasalar ve Tüm Kullanıcı verileri diskten yüklendi.")
        except FileNotFoundError as e:
            messagebox.showerror("Bilgi", str(e))
        except Exception as e:
            messagebox.showerror("Hata", f"Yükleme hatası: {e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = KriptoArayuz(root)
    root.mainloop()
```

---

### 2. Yönerge Uyumlu ve Geliştirilmiş `README.md`

`README.md` dosyasını sistemin bu yeni çoklu kullanıcı ve gelişmiş yapısına göre güncelledim. Sadece alttaki `<Ad Soyad>` vb. alanları kendi bilgilerinizle doldurmanız yeterlidir.

```markdown
# Kripto Para Portföy ve İşlem Takip Sistemi

## Proje Amacı
Bu projenin amacı, değişken piyasa koşullarında birden fazla kullanıcının sahip olduğu kripto para varlıklarını izole portföyler halinde yönetebilen, ağırlıklı ortalama maliyet (WAC) formülü ile hesaplama yapıp anlık Gerçekleşmemiş Kâr/Zarar (PnL) durumunu görüntülemelerini sağlayan, nesne yönelimli ve arayüzlü bir finans otomasyonu geliştirmektir.

## Kullanılan Teknolojiler
- Python 3.10+
- JSON (Veri Saklama - data.json)
- Tkinter (Masaüstü Arayüz - GUI / Pop-up Yönetimi)
- OOP (Nesne Yönelimli Programlama Mimarisi)

## Kullanılan OOP Yapıları
- **Class & Object:** Proje `Kullanici`, `Coin`, `Portfoy`, `Islem`, `KriptoSistemi` olmak üzere 5 modüler sınıftan oluşmaktadır. Sistemde her kullanıcı kendi `Portfoy` nesnesine *(Composition)* sahiptir.
- **Inheritance (Kalıtım):** `Coin` sınıfı, temel bir varlık modeli olan `Varlik` abstract (soyut) sınıfından miras alarak özellikleri kalıtmıştır.
- **Encapsulation (Kapsülleme):** Nesnelere ait değişkenler (Örn: `_guncel_fiyat`) gizlenmiş ve dışarıdan hatalı müdahale (örn: negatif fiyat girilmesi) edilmemesi için `@property` / setter metotları kullanılmıştır.
- **Polymorphism (Çok Biçimlilik):** Alt sınıf olan Coin, üst sınıfın soyut metodu olan `deger_hesapla()` fonksiyonunu kendine özgü şekilde ezip (override) yeniden tanımlayarak çok biçimlilik sağlanmıştır.
- **Abstraction (Soyutlama):** `Varlik` isimli bir Abstract Base Class (ABC) yaratılmış, içerisindeki @abstractmethod dekoratörleri ile bir sözleşme / şablon mimarisi kurulmuştur.

## Proje Özellikleri
- **Çoklu Kullanıcı Desteği (Ekle/Sil/Seç):** Birden fazla kullanıcı yaratılıp aralarında geçiş yapılabilir. Herkesin portföyü izoledir. Kullanıcı tamamen silinebilir.
- **Piyasa ve Coin Yönetimi (Ekle/Sil/Güncelle):** Sisteme anlık fiyatıyla coin tanımlanabilir, güncellenebilir veya silinerek (Delist edilerek) piyasadan kaldırılabilir.
- **Dinamik Portföy Mimarisi:** Coin silindiğinde cüzdandaki yansımasının yönetilmesi (0$ gösterimi).
- **Finansal İşlemler:** Kripto para alım / satım ve portföy listeleme.
- **PnL Motoru:** Anlık Kâr/Zarar (Gerçekleşmemiş PnL) hesaplaması.
- **İşlem Geçmişi:** Kullanıcı bazlı detaylı işlem fişi / dökümü.
- **Veri Kalıcılığı:** Tüm kullanıcı verileri ve piyasa durumunun tek tıkla **data.json** üzerine yedeklenmesi ve tekrar yüklenmesi (Load/Save).
- **GUI:** Tkinter kullanılarak tasarlanmış, Terminal-Menü hissiyatını (1'den 10'a kadar) modern bir arayüze taşıyan kullanıcı dostu ekran.

## Kurulum
Projeyi bilgisayarınızda çalıştırmak için ekstra bir kütüphane veya paket (pip install vb.) yüklemenize gerek yoktur. Yalnızca standart Python kütüphaneleri kullanılmıştır.

Terminal veya komut satırını açıp şu komutu yazarak projeyi başlatabilirsiniz:

```bash
python main.py
```

## Ekran Görüntüleri
*(Proje çalıştırıldığında menü ve portföy ekranlarından aldığınız bir görseli buraya yükleyebilirsiniz. Örn: `![Ana Ekran](screen1.png)`)*

## Geliştiren
**Ad Soyad:** <Adınızı ve Soyadınızı Buraya Yazın>  
**Öğrenci No:** <Numaranızı Buraya Yazın>  
**Ders:** Programlama 2
```

### Ekstra Not (Sunum Sırasında Hocanıza Söyleyebilecekleriniz):
* "Hocam, projeyi istenildiği gibi 1'den 10'a kadar numaralandırılmış menülerle hazırladım fakat console (terminal) kullanımını çok ilkel bulduğum için bu menü mantığını **Tkinter ile masaüstü formuna** taşıdım."
* "Ekle/Sil işlemleri için menü butonlarına tıkladığımızda ekstra küçük **Toplevel** pencereleri (pop-uplar) açılıyor. Bu sayede sonsuz tane kullanıcı ve coin ekleyip sistemden çıkarabiliyoruz."
* "Her kullanıcının kendi `Portfoy` (cüzdan) nesnesi var. Yani **Ahmet** aktifken aldığı BTC, **Mehmet** aktifleştiğinde Mehmet'in cüzdanında gözükmüyor. Tamamen kapalı (Encapsulation) bir sistem tasarladım."