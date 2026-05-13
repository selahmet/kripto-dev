"""
PROGRAMLAMA 2 DERSİ - DÖNEM PROJESİ
Kripto Para Portföy ve İşlem Takip Sistemi (Gelişmiş Masaüstü Arayüzlü - GUI)
Özellikler: Çoklu Kullanıcı, İzole Portföyler, Tam Ekle/Sil İşlevleri, WAC ve PnL Hesaplamaları
"""

# AÇIKLAMA: Gerekli kütüphaneler projeye dahil ediliyor.
import json
import os
import re
import tkinter as tk
from tkinter import messagebox, simpledialog
from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_EVEN, getcontext
from json import JSONEncoder
from typing import Dict, List, Optional

# AÇIKLAMA: Finansal hesaplamalarda IEEE 754 (float) yuvarlama hatalarını önlemek için Decimal ayarları.
getcontext().prec = 28
getcontext().rounding = ROUND_HALF_EVEN

# ==============================================================================
# 1. DOMAIN MODELLERİ (VERİ YAPILARI VE OOP KAVRAMLARI)
# ==============================================================================

# OOP: Abstraction (Soyutlama) 
# Varlik sınıfı 'ABC' (Abstract Base Class) modülünden miras alır. Doğrudan nesnesi üretilemez, şablon görevi görür.
class Varlik(ABC):
    """Sistemdeki tüm finansal varlıkların ortak özelliklerini tutan soyut temel sınıf."""

    # OOP: Bellek Optimizasyonu - __slots__ kullanılarak RAM'de gereksiz dict oluşturulması engellenir.
    __slots__ = ("_sembol", "_miktar")

    # OOP: Constructor (Yapıcı Metot)
    def __init__(self, sembol: str, miktar: Decimal):
        self.sembol = sembol
        self.miktar = miktar

    # OOP: Encapsulation (Kapsülleme) - Özellikler (attributes) dışarıdan doğrudan değiştirilemez. 
    # @property dekoratörü ile güvenli okuma sağlanır.
    @property
    def sembol(self) -> str:
        return self._sembol

    # OOP: Encapsulation - Setter metodu ile dışarıdan gelen veri kontrol edilip (Regex) içeri alınır.
    @sembol.setter
    def sembol(self, deger: str) -> None:
        deger_str = str(deger).strip().upper()
        if not re.fullmatch(r"[A-Z0-9]{2,10}", deger_str):
            raise ValueError("Sembol sadece BÜYÜK HARF ve RAKAM içermelidir.")
        self._sembol = deger_str

    @property
    def miktar(self) -> Decimal:
        return self._miktar

    @miktar.setter
    def miktar(self, deger: Decimal) -> None:
        try:
            miktar_dec = Decimal(str(deger))
        except (InvalidOperation, ValueError):
            raise ValueError("Miktar geçerli bir ondalık sayı olmalıdır.")
        if miktar_dec < Decimal("0"):
            raise ValueError("Miktar negatif olamaz.")
        self._miktar = miktar_dec

    # OOP: Abstract Method (Soyut Metot) - Alt sınıfların bu metodu kendilerine göre doldurması zorunlu kılınmıştır.
    @abstractmethod
    def toplam_deger_hesapla(self, guncel_fiyat: Decimal) -> Decimal:
        """Varlığın anlık değere göre toplam değerini hesaplar."""
        pass


# OOP: Inheritance (Kalıtım) - Coin sınıfı, Varlik soyut sınıfının tüm özelliklerini miras alır.
class Coin(Varlik):
    """Kripto varlıkları temsil eden, maliyet takibi yapan sınıf."""

    __slots__ = ("_ortalama_maliyet",)

    def __init__(self, sembol: str, miktar: Decimal, ortalama_maliyet: Decimal):
        super().__init__(sembol, miktar) # Üst sınıfın (Varlik) yapıcısına veriler gönderilir.
        self.ortalama_maliyet = ortalama_maliyet

    @property
    def ortalama_maliyet(self) -> Decimal:
        return self._ortalama_maliyet

    @ortalama_maliyet.setter
    def ortalama_maliyet(self, deger: Decimal) -> None:
        try:
            maliyet_dec = Decimal(str(deger))
        except (InvalidOperation, ValueError):
            raise ValueError("Ortalama maliyet geçerli bir ondalık sayı olmalıdır.")
        if maliyet_dec < Decimal("0"):
            raise ValueError("Maliyet negatif olamaz.")
        self._ortalama_maliyet = maliyet_dec

    # OOP: Polymorphism (Çok Biçimlilik) - Üst sınıftaki soyut metot ezilerek (override) bu sınıfa özel hesaplama yapıldı.
    def toplam_deger_hesapla(self, guncel_fiyat: Decimal) -> Decimal:
        return self.miktar * guncel_fiyat

    def to_dict(self) -> Dict[str, str]:
        """JSON kaydı için nesneyi sözlüğe dönüştürür."""
        return {
            "sembol": self.sembol,
            "miktar": str(self.miktar),
            "ortalama_maliyet": str(self.ortalama_maliyet),
        }

class Islem:
    """Yapılan finansal alım-satım işlemlerinin geçmişini tutan kayıt sınıfı."""

    __slots__ = ("_sembol", "_miktar", "_fiyat", "_islem_tipi", "_tarih")

    def __init__(self, sembol: str, miktar: Decimal, fiyat: Decimal, islem_tipi: str, tarih: Optional[str] = None):
        self._sembol = str(sembol).strip().upper()
        self._miktar = Decimal(str(miktar))
        self._fiyat = Decimal(str(fiyat))
        self._islem_tipi = str(islem_tipi).strip().upper()
        self._tarih = tarih or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    @property
    def sembol(self) -> str: return self._sembol
    @property
    def miktar(self) -> Decimal: return self._miktar
    @property
    def fiyat(self) -> Decimal: return self._fiyat
    @property
    def islem_tipi(self) -> str: return self._islem_tipi
    @property
    def tarih(self) -> str: return self._tarih

    def to_dict(self) -> Dict[str, str]:
        return {"sembol": self.sembol, "miktar": str(self.miktar), "fiyat": str(self.fiyat), "islem_tipi": self.islem_tipi, "tarih": self.tarih}


class Portfoy:
    """Kullanıcının sahip olduğu cüzdanı, kripto varlıklarını ve hesaplama mantıklarını tutar."""

    def __init__(self):
        # AÇIKLAMA: Varlıkları hızlı aramak O(1) için Sözlük (Dict), işlem geçmişi sıralı olduğu için Liste (List) kullanılmıştır.
        self._varliklar: Dict[str, Coin] = {}
        self._islem_gecmisi: List[Islem] =[]

    def alim_yap(self, sembol: str, miktar: Decimal, fiyat: Decimal) -> None:
        sembol = str(sembol).strip().upper()
        if miktar <= Decimal("0") or fiyat <= Decimal("0"):
            raise ValueError("Miktar ve fiyat pozitif olmalıdır.")
        
        if sembol in self._varliklar:
            mevcut = self._varliklar[sembol]
            yeni_miktar = mevcut.miktar + miktar
            # AÇIKLAMA: Ağırlıklı Ortalama Maliyet (WAC) Hesaplama Algoritması
            toplam_maliyet = (mevcut.miktar * mevcut.ortalama_maliyet) + (miktar * fiyat)
            mevcut.ortalama_maliyet = toplam_maliyet / yeni_miktar
            mevcut.miktar = yeni_miktar
        else:
            self._varliklar[sembol] = Coin(sembol, miktar, fiyat)
            
        self._islem_gecmisi.append(Islem(sembol, miktar, fiyat, "ALIM"))

    def satim_yap(self, sembol: str, miktar: Decimal, fiyat: Decimal) -> None:
        sembol = str(sembol).strip().upper()
        if miktar <= Decimal("0") or fiyat <= Decimal("0"):
            raise ValueError("Miktar ve fiyat pozitif olmalıdır.")
        if sembol not in self._varliklar:
            raise ValueError(f"Portföyünüzde {sembol} bulunamadı.")
            
        mevcut = self._varliklar[sembol]
        if mevcut.miktar < miktar:
            raise ValueError(f"Yetersiz {sembol} bakiyesi. Mevcut: {mevcut.miktar}")
            
        mevcut.miktar -= miktar
        if mevcut.miktar == Decimal("0"):
            del self._varliklar[sembol] # Coin bakiyesi sıfırlanırsa sistemden silinir
            
        self._islem_gecmisi.append(Islem(sembol, miktar, fiyat, "SATIM"))

    def pnl_hesapla(self, piyasa_fiyatlari: Dict[str, dict]) -> Decimal:
        """Gerçekleşmemiş Kâr/Zarar (PnL) oranını hesaplar."""
        toplam_pnl = Decimal("0")
        for sembol, coin in self._varliklar.items():
            guncel_fiyat = piyasa_fiyatlari.get(sembol, {}).get("fiyat", Decimal("0"))
            fark = guncel_fiyat - coin.ortalama_maliyet
            toplam_pnl += fark * coin.miktar
        return toplam_pnl

    def portfoy_deger(self, piyasa_fiyatlari: Dict[str, dict]) -> Decimal:
        """Portföyün güncel kura göre anlık toplam parasal değerini döndürür."""
        toplam = Decimal("0")
        for sembol, coin in self._varliklar.items():
            guncel_fiyat = piyasa_fiyatlari.get(sembol, {}).get("fiyat", Decimal("0"))
            toplam += coin.toplam_deger_hesapla(guncel_fiyat) # Polymorphism kullanımı
        return toplam

    @property
    def varliklar(self) -> Dict[str, Coin]: return self._varliklar.copy()

    @property
    def islem_gecmisi(self) -> List[Islem]: return list(self._islem_gecmisi)

    def to_dict(self) -> Dict[str, object]:
        return {
            "varliklar": [coin.to_dict() for coin in self._varliklar.values()],
            "islemler": [islem.to_dict() for islem in self._islem_gecmisi]
        }

    def yukle(self, veri: Dict[str, object]) -> None:
        self._varliklar.clear()
        self._islem_gecmisi.clear()
        for coin_veri in veri.get("varliklar", []):
            sembol = coin_veri["sembol"]
            self._varliklar[sembol] = Coin(sembol, Decimal(str(coin_veri["miktar"])), Decimal(str(coin_veri["ortalama_maliyet"])))
        for islem_veri in veri.get("islemler",[]):
            self._islem_gecmisi.append(Islem(islem_veri["sembol"], Decimal(str(islem_veri["miktar"])), Decimal(str(islem_veri["fiyat"])), islem_veri["islem_tipi"], islem_veri.get("tarih")))


class Kullanici:
    """Kullanıcı bilgilerini ve o kullanıcıya ait portföy nesnesini barındırır."""

    # OOP: Composition (Bileştirme) - Her kullanıcının içinde Portfoy sınıfından oluşturulmuş bir nesne barınır.
    __slots__ = ("_kullanici_adi", "_eposta", "portfoy")

    def __init__(self, kullanici_adi: str, eposta: str):
        self.kullanici_adi = kullanici_adi
        self.eposta = eposta
        self.portfoy = Portfoy() # Her kullanıcı yepyeni ve bağımsız bir cüzdana sahip olur.

    @property
    def kullanici_adi(self) -> str: return self._kullanici_adi

    @kullanici_adi.setter
    def kullanici_adi(self, deger: str) -> None:
        deger_str = str(deger).strip()
        if not re.fullmatch(r"[A-Za-z0-9_]{3,30}", deger_str):
            raise ValueError("Kullanıcı adı 3-30 karakter arası, sadece harf/rakam/altçizgi içermelidir.")
        self._kullanici_adi = deger_str

    @property
    def eposta(self) -> str: return self._eposta

    @eposta.setter
    def eposta(self, deger: str) -> None:
        deger_str = str(deger).strip()
        if not re.fullmatch(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", deger_str):
            raise ValueError("Lütfen geçerli bir e-posta adresi giriniz.")
        self._eposta = deger_str

    def to_dict(self) -> Dict[str, object]:
        return {"kullanici_adi": self.kullanici_adi, "eposta": self.eposta, "portfoy": self.portfoy.to_dict()}


# ==============================================================================
# 2. SISTEM KONTROLCÜSÜ VE DOSYA YÖNETİMİ
# ==============================================================================

class DecimalEncoder(JSONEncoder):
    """AÇIKLAMA: Decimal ve DateTime nesnelerini JSON'a çevirebilmek için varsayılan Encoder ezilmiştir (Override)."""
    def default(self, obj):
        if isinstance(obj, Decimal): return str(obj)
        if isinstance(obj, datetime): return obj.isoformat()
        return super().default(obj)


class KriptoSistemi:
    """Tüm kullanıcıları ve piyasayı yöneten Ana Kontrolcü (Facade/Controller) sınıfı."""
    
    def __init__(self):
        self.kullanicilar: Dict[str, Kullanici] = {} # Sistemdeki tüm kullanıcıları depolar
        self.aktif_kullanici: Optional[Kullanici] = None # Arayüzde o an işlem yapan kullanıcı
        self.piyasa_coinleri: Dict[str, dict] = {} # Borsada tanımlı (Eklenebilir/Silinebilir) coinler

    def kullanici_ekle(self, adi: str, eposta: str):
        if adi in self.kullanicilar:
            raise ValueError("Bu kullanıcı zaten mevcut.")
        yeni_kullanici = Kullanici(adi, eposta)
        self.kullanicilar[adi] = yeni_kullanici
        self.aktif_kullanici = yeni_kullanici

    def kullanici_sil(self, adi: str):
        if adi in self.kullanicilar:
            del self.kullanicilar[adi]
            if self.aktif_kullanici and self.aktif_kullanici.kullanici_adi == adi:
                self.aktif_kullanici = None
        else:
            raise ValueError("Kullanıcı bulunamadı.")

    def piyasa_coin_ekle_guncelle(self, sembol: str, fiyat: Decimal, aciklama: str = ""):
        sembol = sembol.upper()
        if fiyat <= Decimal("0"):
            raise ValueError("Piyasa fiyatı pozitif olmalıdır.")
        self.piyasa_coinleri[sembol] = {"fiyat": fiyat, "aciklama": aciklama}

    def piyasa_coin_sil(self, sembol: str):
        sembol = sembol.upper()
        if sembol in self.piyasa_coinleri:
            del self.piyasa_coinleri[sembol]
        else:
            raise ValueError("Coin piyasada bulunamadı.")


class DosyaYoneticisi:
    """Verilerin diske (JSON) güvenli şekilde kaydedilmesi ve okunmasından sorumlu sınıf."""

    _DOSYA_ADI = "kripto_veritabani.json"

    def kaydet(self, sistem: KriptoSistemi) -> None:
        """AÇIKLAMA: Tüm sistemin anlık durumunu paketleyip JSON olarak yazar."""
        veri = {
            "aktif_kullanici": sistem.aktif_kullanici.kullanici_adi if sistem.aktif_kullanici else None,
            "piyasa_coinleri": {s: {"fiyat": str(d["fiyat"]), "aciklama": d["aciklama"]} for s, d in sistem.piyasa_coinleri.items()},
            "kullanicilar": {ad: kul.to_dict() for ad, kul in sistem.kullanicilar.items()}
        }
        with open(self._DOSYA_ADI, "w", encoding="utf-8") as dosya:
            json.dump(veri, dosya, cls=DecimalEncoder, ensure_ascii=False, indent=4)

    def yukle(self, sistem: KriptoSistemi) -> None:
        """AÇIKLAMA: JSON dosyasını okuyup sistem nesnesini baştan ayağa kaldırır."""
        if not os.path.exists(self._DOSYA_ADI):
            raise FileNotFoundError("Sistemde önceden kaydedilmiş veritabanı bulunamadı.")
            
        with open(self._DOSYA_ADI, "r", encoding="utf-8") as dosya:
            veri = json.load(dosya)

        sistem.kullanicilar.clear()
        sistem.piyasa_coinleri.clear()

        # Piyasayı yükle
        for s, d in veri.get("piyasa_coinleri", {}).items():
            sistem.piyasa_coinleri[s] = {"fiyat": Decimal(d["fiyat"]), "aciklama": d.get("aciklama", "")}

        # Kullanıcıları ve cüzdanları yükle
        for ad, kul_verisi in veri.get("kullanicilar", {}).items():
            yeni_kul = Kullanici(kul_verisi["kullanici_adi"], kul_verisi["eposta"])
            yeni_kul.portfoy.yukle(kul_verisi.get("portfoy", {}))
            sistem.kullanicilar[ad] = yeni_kul

        # Aktif kullanıcıyı ayarla
        aktif_ad = veri.get("aktif_kullanici")
        if aktif_ad and aktif_ad in sistem.kullanicilar:
            sistem.aktif_kullanici = sistem.kullanicilar[aktif_ad]
        else:
            sistem.aktif_kullanici = None


# ==============================================================================
# 3. TKINTER MASAÜSTÜ ARAYÜZÜ (GUI)
# ==============================================================================

# OOP: Sınıf Kullanımı - Kullanıcı etkileşimlerini yönetmek için görsel arayüz sınıfı
class KriptoArayuz:
    """Tüm sistemi görsel bir ekranda yönetmemizi sağlayan Tkinter arayüz sınıfı."""

    def __init__(self, root: tk.Tk):
        self.sistem = KriptoSistemi()
        self.dosya_yoneticisi = DosyaYoneticisi()
        self.root = root
        self.root.title("Kripto Para Portföy ve İşlem Takip Sistemi")
        self.root.geometry("900x650")
        self.root.configure(bg="#2d3436")

        self._arayuz_ciz()
        self.mesaj_yaz("Sisteme Hoş Geldiniz!\nLütfen sol menüden önce Kullanıcı oluşturun, ardından Piyasa'ya Coin ekleyin.")

    def _arayuz_ciz(self):
        """AÇIKLAMA: Ana pencereyi sol menü ve sağ log ekranı olmak üzere ikiye böler."""
        # --- Sol Menü Çerçevesi ---
        self.menu_frame = tk.Frame(self.root, width=250, bg="#2d3436")
        self.menu_frame.pack(side=tk.LEFT, fill=tk.Y, padx=10, pady=10)

        tk.Label(self.menu_frame, text="MENÜ KONTROLÜ", bg="#2d3436", fg="#00cec9", font=("Arial", 14, "bold")).pack(pady=10)
        
        self.lbl_aktif = tk.Label(self.menu_frame, text="Aktif Kullanıcı: YOK", bg="#2d3436", fg="#ffeaa7", font=("Arial", 10, "bold"))
        self.lbl_aktif.pack(pady=5)

        # Menü Butonları (Yönergedeki Sıralamaya Birebir Uygun)
        self._buton_ekle("1. Kullanıcı Ekle/Sil/Seç", self.cmd_kullanici_yonet)
        self._buton_ekle("2. Piyasaya Coin Ekle/Sil", self.cmd_coin_yonet)
        self._buton_ekle("3. Piyasa Coinlerini Listele", self.cmd_piyasa_listele)
        self._buton_ekle("4. Alım İşlemi Yap", self.cmd_alim)
        self._buton_ekle("5. Satım İşlemi Yap", self.cmd_satim)
        self._buton_ekle("6. Portföy Görüntüle", self.cmd_portfoy)
        self._buton_ekle("7. Kar-Zarar (PnL) Hesapla", self.cmd_kar_zarar)
        self._buton_ekle("8. İşlem Geçmişi", self.cmd_gecmis)
        self._buton_ekle("9. Verileri Kaydet", self.cmd_kaydet)
        self._buton_ekle("10. Verileri Yükle", self.cmd_yukle)
        
        tk.Button(self.menu_frame, text="0. Güvenli Çıkış", command=self.root.quit, bg="#d63031", fg="white", font=("Arial", 10, "bold")).pack(fill=tk.X, pady=15)

        # --- Sağ Çıktı Çerçevesi ---
        self.icerik_frame = tk.Frame(self.root, bg="#dfe6e9")
        self.icerik_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        self.ekran = tk.Text(self.icerik_frame, font=("Consolas", 11), bg="#ffffff", fg="#2d3436")
        self.ekran.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

    def _buton_ekle(self, metin: str, komut):
        btn = tk.Button(self.menu_frame, text=metin, command=komut, bg="#0984e3", fg="white", font=("Arial", 10, "bold"), pady=4, cursor="hand2")
        btn.pack(fill=tk.X, pady=4)

    def mesaj_yaz(self, mesaj: str):
        self.ekran.insert(tk.END, mesaj + "\n")
        self.ekran.see(tk.END)

    def temizle(self):
        self.ekran.delete("1.0", tk.END)

    def aktif_guncelle(self):
        ad = self.sistem.aktif_kullanici.kullanici_adi if self.sistem.aktif_kullanici else "YOK"
        self.lbl_aktif.config(text=f"Aktif Kullanıcı: {ad}")

    # ================= GUI MENÜ FONKSİYONLARI =================

    def cmd_kullanici_yonet(self):
        """Kullanıcı Ekle/Sil işlemleri için Pop-up pencere açar."""
        win = tk.Toplevel(self.root)
        win.title("Kullanıcı Yönetimi")
        win.geometry("300x350")
        
        listbox = tk.Listbox(win, height=10)
        listbox.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        def guncelle():
            listbox.delete(0, tk.END)
            for k in self.sistem.kullanicilar.keys(): listbox.insert(tk.END, k)
        guncelle()

        def ekle():
            ad = simpledialog.askstring("Yeni Kullanıcı", "Kullanıcı Adı:", parent=win)
            eposta = simpledialog.askstring("Yeni Kullanıcı", "E-posta Adresi:", parent=win)
            if ad and eposta:
                # OOP: Hata Yönetimi (Try-except blokları ile çökme engellenir)
                try:
                    self.sistem.kullanici_ekle(ad, eposta)
                    guncelle()
                    self.aktif_guncelle()
                    self.temizle()
                    self.mesaj_yaz(f"[+] Kullanıcı oluşturuldu ve aktif edildi: {ad}")
                except ValueError as e:
                    messagebox.showerror("Hata", str(e), parent=win)

        def sil():
            secili = listbox.get(tk.ACTIVE)
            if secili and messagebox.askyesno("Onay", f"{secili} silinecek. Emin misiniz?", parent=win):
                self.sistem.kullanici_sil(secili)
                guncelle()
                self.aktif_guncelle()
                self.temizle()
                self.mesaj_yaz(f"[-] Kullanıcı silindi: {secili}")

        def sec():
            secili = listbox.get(tk.ACTIVE)
            if secili:
                self.sistem.aktif_kullanici = self.sistem.kullanicilar[secili]
                self.aktif_guncelle()
                self.temizle()
                self.mesaj_yaz(f"[*] Aktif kullanıcı değiştirildi: {secili}")

        f = tk.Frame(win)
        f.pack(pady=5)
        tk.Button(f, text="Ekle", command=ekle, bg="#00b894").pack(side=tk.LEFT, padx=5)
        tk.Button(f, text="Sil", command=sil, bg="#d63031", fg="white").pack(side=tk.LEFT, padx=5)
        tk.Button(f, text="Seç", command=sec, bg="#0984e3", fg="white").pack(side=tk.LEFT, padx=5)

    def cmd_coin_yonet(self):
        """Piyasa Coin Ekle/Sil işlemleri için Pop-up."""
        win = tk.Toplevel(self.root)
        win.title("Piyasa Yönetimi")
        win.geometry("300x350")
        
        listbox = tk.Listbox(win, height=10)
        listbox.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        def guncelle():
            listbox.delete(0, tk.END)
            for s, v in self.sistem.piyasa_coinleri.items(): listbox.insert(tk.END, f"{s} - ${v['fiyat']}")
        guncelle()

        def ekle():
            sembol = simpledialog.askstring("Coin", "Sembol (Örn: BTC):", parent=win)
            if not sembol: return
            fiyat_str = simpledialog.askstring("Coin", f"{sembol.upper()} Fiyatı:", parent=win)
            try:
                self.sistem.piyasa_coin_ekle_guncelle(sembol, Decimal(str(fiyat_str)))
                guncelle()
                self.temizle()
                self.mesaj_yaz(f"[+] Piyasa güncellendi: {sembol.upper()} -> ${fiyat_str}")
            except Exception as e:
                messagebox.showerror("Hata", f"Geçersiz değer: {e}", parent=win)

        def sil():
            secili = listbox.get(tk.ACTIVE)
            if secili:
                sembol = secili.split(" - ")[0]
                self.sistem.piyasa_coin_sil(sembol)
                guncelle()
                self.temizle()
                self.mesaj_yaz(f"[-] Coin piyasadan silindi: {sembol}")

        f = tk.Frame(win)
        f.pack(pady=5)
        tk.Button(f, text="Ekle/Güncelle", command=ekle, bg="#00b894").pack(side=tk.LEFT, padx=5)
        tk.Button(f, text="Piyasadan Sil", command=sil, bg="#d63031", fg="white").pack(side=tk.LEFT, padx=5)

    def cmd_piyasa_listele(self):
        self.temizle()
        self.mesaj_yaz(f"{'--- CANLI PİYASA ---':^40}")
        if not self.sistem.piyasa_coinleri:
            self.mesaj_yaz("Sistemde/Piyasada tanımlı coin yok.")
            return
        for s, v in self.sistem.piyasa_coinleri.items():
            self.mesaj_yaz(f"{s:<8} | Fiyat: ${v['fiyat']:<10.2f}")

    def _kullanici_kontrol(self):
        if not self.sistem.aktif_kullanici:
            messagebox.showwarning("Uyarı", "İşlem yapabilmek için lütfen bir kullanıcı seçin.")
            return False
        return True

    def cmd_alim(self):
        if not self._kullanici_kontrol(): return
        try:
            sembol = simpledialog.askstring("Alım", "Coin Sembolü:").upper()
            if sembol not in self.sistem.piyasa_coinleri:
                messagebox.showerror("Hata", "Bu coin piyasada yok. Önce piyasaya ekleyin.")
                return
            miktar_str = simpledialog.askstring("Alım", f"Kaç adet {sembol} alınacak?")
            fiyat = self.sistem.piyasa_coinleri[sembol]["fiyat"]
            self.sistem.aktif_kullanici.portfoy.alim_yap(sembol, Decimal(miktar_str), fiyat)
            self.temizle()
            self.mesaj_yaz(f"[BAŞARILI] {self.sistem.aktif_kullanici.kullanici_adi}, {miktar_str} adet {sembol} aldı.")
        except Exception as e:
            messagebox.showerror("Hata", f"İşlem Başarısız: {e}")

    def cmd_satim(self):
        if not self._kullanici_kontrol(): return
        try:
            sembol = simpledialog.askstring("Satım", "Coin Sembolü:").upper()
            miktar_str = simpledialog.askstring("Satım", f"Kaç adet {sembol} satılacak?")
            
            # Güncel fiyat piyasadan çekilir (Eğer coin piyasadan silindiyse satılamaz kuralı)
            if sembol not in self.sistem.piyasa_coinleri:
                messagebox.showerror("Hata", "Bu coin piyasadan (borsadan) kaldırılmış. Satılamaz.")
                return
                
            fiyat = self.sistem.piyasa_coinleri[sembol]["fiyat"]
            self.sistem.aktif_kullanici.portfoy.satim_yap(sembol, Decimal(miktar_str), fiyat)
            self.temizle()
            self.mesaj_yaz(f"[BAŞARILI] {miktar_str} adet {sembol} satıldı.")
        except Exception as e:
            messagebox.showerror("Hata", f"İşlem Başarısız: {e}")

    def cmd_portfoy(self):
        if not self._kullanici_kontrol(): return
        self.temizle()
        aktif_k = self.sistem.aktif_kullanici
        self.mesaj_yaz(f"{f'--- {aktif_k.kullanici_adi.upper()} PORTFÖYÜ ---':^60}")
        varliklar = aktif_k.portfoy.varliklar
        if not varliklar:
            self.mesaj_yaz("Cüzdanınız boş.")
            return
            
        self.mesaj_yaz(f"{'COİN':<8} | {'MİKTAR':<12} | {'MALİYET':<12} | {'GÜNCEL DEĞER'}")
        self.mesaj_yaz("-" * 60)
        for s, c in varliklar.items():
            fiyat = self.sistem.piyasa_coinleri.get(s, {}).get("fiyat", Decimal("0"))
            anlik_deger = c.toplam_deger_hesapla(fiyat)
            self.mesaj_yaz(f"{s:<8} | {c.miktar:<12.4f} | ${c.ortalama_maliyet:<11.2f} | ${anlik_deger:.2f}")
            if fiyat == Decimal("0"): self.mesaj_yaz(f"  *[!] {s} piyasadan silinmiş. Değeri $0.")
            
        toplam = aktif_k.portfoy.portfoy_deger(self.sistem.piyasa_coinleri)
        self.mesaj_yaz("=" * 60)
        self.mesaj_yaz(f"PORTFÖY TOPLAM DEĞERİ: ${toplam:.2f}")

    def cmd_kar_zarar(self):
        if not self._kullanici_kontrol(): return
        self.temizle()
        self.mesaj_yaz(f"{'--- GERÇEKLEŞMEMİŞ KAR/ZARAR (PnL) ---':^60}")
        pnl = self.sistem.aktif_kullanici.portfoy.pnl_hesapla(self.sistem.piyasa_coinleri)
        durum = "KÂR" if pnl >= 0 else "ZARAR"
        self.mesaj_yaz(f"Kullanıcı: {self.sistem.aktif_kullanici.kullanici_adi}")
        self.mesaj_yaz(f"TOPLAM NET PnL: ${pnl:.2f} ({durum})")

    def cmd_gecmis(self):
        if not self._kullanici_kontrol(): return
        self.temizle()
        self.mesaj_yaz(f"--- {self.sistem.aktif_kullanici.kullanici_adi} İŞLEM GEÇMİŞİ ---")
        gecmis = self.sistem.aktif_kullanici.portfoy.islem_gecmisi
        if not gecmis:
            self.mesaj_yaz("Henüz işlem yapılmamış.")
            return
        for i in gecmis:
            self.mesaj_yaz(f"[{i.tarih}] {i.islem_tipi:<5} | {i.sembol:<5} | Miktar: {i.miktar:<8.4f} | Fiyat: ${i.fiyat:.2f}")

    def cmd_kaydet(self):
        try:
            self.dosya_yoneticisi.kaydet(self.sistem)
            self.temizle()
            self.mesaj_yaz("[✓] BAŞARILI: Veriler (Tüm Kullanıcılar ve Piyasa) 'kripto_veritabani.json' dosyasına kaydedildi.")
        except Exception as e:
            messagebox.showerror("Kayıt Hatası", str(e))

    def cmd_yukle(self):
        try:
            self.dosya_yoneticisi.yukle(self.sistem)
            self.aktif_guncelle()
            self.temizle()
            self.mesaj_yaz("[✓] BAŞARILI: Veriler 'kripto_veritabani.json' dosyasından yüklendi.")
        except Exception as e:
            messagebox.showerror("Yükleme Hatası", str(e))


# ==============================================================================
# PROGRAMIN BAŞLATILMASI
# ==============================================================================
if __name__ == "__main__":
    root = tk.Tk()
    app = KriptoArayuz(root)
    root.mainloop()