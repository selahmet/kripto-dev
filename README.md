# Kripto Para Portföy ve İşlem Takip Sistemi

## Proje Amacı

Bu projenin amacı, kripto para yatırımcılarının portföylerini yönetmelerini, işlemlerini takip etmelerini ve ağırlıklı ortalama maliyet (WAC) yöntemiyle gerçekleşmemiş kar/zarar (PnL) analizi yapmalarını sağlamaktır.

## Kullanılan Teknolojiler

- Python 3.10+
- JSON
- OOP

## Kullanılan OOP Yapıları

- Class
- Object
- Inheritance
- Encapsulation
- Polymorphism
- Abstraction

## Proje Özellikleri

- Kullanıcı ekleme
- Coin tanımlama ve listeleme
- Alım/satım işlemleri (WAC hesabı ile)
- Portföy görüntüleme
- Kar-zarar hesaplaması
- İşlem geçmişi
- Dosyaya kayıt (JSON)
- Dosyadan veri yükleme

## Menu

```
1. Kullanıcı Ekle
2. Coin Ekle
3. Coinleri Listele
4. Alım İşlemi Yap
5. Satım İşlemi Yap
6. Portföy Görüntüle
7. Kar-Zarar Hesapla (PnL)
8. İşlem Geçmişini Görüntüle
9. Verileri Kaydet
10. Verileri Yükle
0. Çıkış
```

## Kurulum

Projeyi çalıştırmak için gerekli dosyalar:

- main.py (Tkinter GUI)
- app.html (Web arayüzü)
- app.jsx (React bileşenleri)
- Diğer dosyalar (kripto_veritabani.json, vb.)

### Tkinter Masaüstü Arayüzü (Python):

```bash
python main.py
```

Tkinter penceresi açılacak ve tüm menü işlemleri (1-10) çalışacaktır.

### Web Arayüzü (Tarayıcı):

```bash
cd klasor_yolu
python -m http.server 8000
```

Sonra tarayıcıda: http://localhost:8000/app.html açın.

Alternatif olarak, app.html dosyasını direkt çift tıklayarak tarayıcıda açabilirsiniz (app.jsx dosyasının aynı klasörde kalması gerekir).

## Ekran Görüntüleri

Menü örneği:
```
=== KRİPTO PARA PORTFÖY SİSTEMİ ===
1. Kullanıcı Ekle
2. Coin Ekle
3. Coinleri Listele
4. Alım İşlemi Yap
5. Satım İşlemi Yap
6. Portföy Görüntüle
7. Kar-Zarar Hesapla (PnL)
8. İşlem Geçmişini Görüntüle
9. Verileri Kaydet
10. Verileri Yükle
0. Çıkış
```

## Sunum İçin

### Terminal Menüsü Demo:
```bash
python main.py
```
Tkinter arayüzünü gösterin ve menü işlemlerini tanıtın.

### Modern Web Gösterimi:
app.html dosyasını açın ve portföy, piyasa verileri, işlem kayıtlarını dolaştırın.

### GitHub Gösterimi:
Repoyu açıp main.py, app.html, app.jsx dosyalarının orada olduğunu gösterin.

Her iki arayüz de aynı veri yapısını kullanıyor (WAC, PnL, JSON kayıt/yükleme). Python'da analitik işlemler, web'de görsel sunum için tasarlandı.

## GitHub

[kripto-dev](https://github.com/selahmet/kripto-dev)
