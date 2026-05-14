/* Kripto Portföy Sistemi — Modern web arayüzü
   Python OOP modelini birebir karşılayan client-side state.
*/
const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ============ Helpers ============
const fmtNum = (n, d = 2) => {
  if (n === undefined || n === null || isNaN(n)) return '0.00';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmtUSD = (n, d = 2) => '$' + fmtNum(n, d);
const fmtSigned = (n, d = 2) => (n >= 0 ? '+' : '') + fmtNum(n, d);
const nowStr = () => {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const validSymbol = (s) => /^[A-Z0-9]{2,10}$/.test(s);
const validUsername = (s) => /^[A-Za-z0-9_]{3,30}$/.test(s);
const validEmail = (s) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s);

// ============ Seed data ============
const SEED = {
  aktif_kullanici: 'Selahmet',
  piyasa_coinleri: {
    BTC: { fiyat: 96420.5, aciklama: 'Bitcoin' },
    ETH: { fiyat: 3284.12, aciklama: 'Ethereum' },
    SOL: { fiyat: 178.45, aciklama: 'Solana' },
    AVAX: { fiyat: 34.7, aciklama: 'Avalanche' },
    LINK: { fiyat: 18.92, aciklama: 'Chainlink' },
    DOGE: { fiyat: 0.412, aciklama: 'Dogecoin' },
    XRP: { fiyat: 2.34, aciklama: 'Ripple' },
    ARB: { fiyat: 0.78, aciklama: 'Arbitrum' },
  },
  kullanicilar: {
    Selahmet: {
      kullanici_adi: 'Selahmet',
      eposta: 'selahmet@ornek.com',
      portfoy: {
        varliklar: [
          { sembol: 'BTC', miktar: 0.245, ortalama_maliyet: 71200 },
          { sembol: 'ETH', miktar: 4.5, ortalama_maliyet: 2840 },
          { sembol: 'SOL', miktar: 22, ortalama_maliyet: 142.5 },
          { sembol: 'LINK', miktar: 80, ortalama_maliyet: 21.4 },
        ],
        islemler: [
          { sembol: 'BTC', miktar: 0.1, fiyat: 68500, islem_tipi: 'ALIM', tarih: '2025-09-12 10:34:21' },
          { sembol: 'ETH', miktar: 2.0, fiyat: 2640, islem_tipi: 'ALIM', tarih: '2025-09-22 14:02:08' },
          { sembol: 'BTC', miktar: 0.145, fiyat: 73200, islem_tipi: 'ALIM', tarih: '2025-11-04 09:18:55' },
          { sembol: 'SOL', miktar: 30, fiyat: 138, islem_tipi: 'ALIM', tarih: '2025-12-01 16:41:30' },
          { sembol: 'SOL', miktar: 8, fiyat: 165, islem_tipi: 'SATIM', tarih: '2026-01-15 11:22:14' },
          { sembol: 'ETH', miktar: 2.5, fiyat: 3010, islem_tipi: 'ALIM', tarih: '2026-02-08 13:55:01' },
          { sembol: 'LINK', miktar: 80, fiyat: 21.4, islem_tipi: 'ALIM', tarih: '2026-03-19 19:07:43' },
        ],
      },
    },
    Mehmet: {
      kullanici_adi: 'Mehmet',
      eposta: 'mehmet@ornek.com',
      portfoy: {
        varliklar: [
          { sembol: 'DOGE', miktar: 5000, ortalama_maliyet: 0.32 },
          { sembol: 'AVAX', miktar: 12, ortalama_maliyet: 42.8 },
        ],
        islemler: [
          { sembol: 'DOGE', miktar: 5000, fiyat: 0.32, islem_tipi: 'ALIM', tarih: '2026-01-22 08:11:30' },
          { sembol: 'AVAX', miktar: 12, fiyat: 42.8, islem_tipi: 'ALIM', tarih: '2026-02-14 17:09:22' },
        ],
      },
    },
  },
};

// ============ Toast ============
const ToastCtx = React.createContext(null);
function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setList((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setList((x) => x.filter((t) => t.id !== id)), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-host">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span className="dot"></span><span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => React.useContext(ToastCtx);

// ============ Icons (line, minimal) ============
const Ic = {
  wallet: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7H6a2 2 0 1 1 0-4h13V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><circle cx="17" cy="13" r="1.2" fill="currentColor"/></svg>),
  market: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 17 9 11 13 15 21 6"/><path d="M15 6h6v6"/></svg>),
  list: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>),
  buy: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 4v16M4 12h16"/></svg>),
  sell: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 12h16"/></svg>),
  pie: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 12A9 9 0 1 1 12 3v9z"/></svg>),
  chart: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>),
  history: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 8v4l3 2"/><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>),
  save: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>),
  load: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>),
  user: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>),
  plus: () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>),
  trash: () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>),
  edit: () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>),
};

// ============ Spark line ============
function Spark({ seed }) {
  // deterministic small chart
  const pts = useMemo(() => {
    const n = 16;
    let v = 50;
    const rand = (() => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
    const arr = [];
    for (let i = 0; i < n; i++) { v += (rand() - 0.5) * 14; arr.push(Math.max(10, Math.min(90, v))); }
    return arr;
  }, [seed]);
  const path = pts.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts.length - 1)) * 64} ${y * 0.18 + 1}`).join(' ');
  const up = pts[pts.length - 1] >= pts[0];
  return (
    <svg className="spark" viewBox="0 0 64 18" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={up ? 'oklch(0.72 0.16 152)' : 'oklch(0.66 0.20 25)'} strokeWidth="1.2" />
    </svg>
  );
}

// ============ Domain ops ============
function wacBuy(varlik, miktar, fiyat) {
  if (!varlik) return { miktar, ortalama_maliyet: fiyat };
  const yeniMiktar = varlik.miktar + miktar;
  const ort = (varlik.miktar * varlik.ortalama_maliyet + miktar * fiyat) / yeniMiktar;
  return { miktar: yeniMiktar, ortalama_maliyet: ort };
}

// ============ Modal ============
function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ============ Page: Portfolio ============
function PortfolioPage({ state, setView, openTrade }) {
  const user = state.kullanicilar[state.aktif_kullanici];
  if (!user) return <NoUser onGo={() => setView('users')} />;

  const varliklar = user.portfoy.varliklar;
  const totals = useMemo(() => {
    let value = 0, cost = 0;
    varliklar.forEach((v) => {
      const px = state.piyasa_coinleri[v.sembol]?.fiyat ?? 0;
      value += v.miktar * px;
      cost += v.miktar * v.ortalama_maliyet;
    });
    return { value, cost, pnl: value - cost, pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0 };
  }, [varliklar, state.piyasa_coinleri]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Portföy</h1>
          <div className="sub">Aktif kullanıcı: <b style={{ color: 'var(--text)' }}>{user.kullanici_adi}</b> · Ağırlıklı ortalama maliyet (WAC) yöntemi</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn success" onClick={() => openTrade('ALIM')}><Ic.buy /> Alım</button>
          <button className="btn danger" onClick={() => openTrade('SATIM')}><Ic.sell /> Satım</button>
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Portföy Değeri" value={fmtUSD(totals.value)} />
        <Kpi label="Toplam Maliyet" value={fmtUSD(totals.cost)} sub="WAC tabanlı" />
        <Kpi label="Gerçekleşmemiş PnL" value={fmtSigned(totals.pnl) + ' $'} delta={fmtSigned(totals.pnlPct, 2) + '%'} positive={totals.pnl >= 0} />
        <Kpi label="Varlık Sayısı" value={varliklar.length} sub={state.kullanicilar[state.aktif_kullanici].portfoy.islemler.length + ' işlem'} />
      </div>

      <div className="row-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Sahip Olunan Varlıklar</h3>
            <span className="desc">{varliklar.length} pozisyon</span>
            <div className="actions">
              <button className="btn sm" onClick={() => openTrade('ALIM')}><Ic.plus /> Pozisyon Aç</button>
            </div>
          </div>
          {varliklar.length === 0 ? (
            <div className="empty">
              <div className="ic">∅</div>
              <h4>Cüzdan boş</h4>
              <p>Bir alım işlemi yaparak ilk pozisyonunuzu açın. WAC otomatik hesaplanır.</p>
            </div>
          ) : (
            <table className="t">
              <thead>
                <tr>
                  <th>Coin</th>
                  <th style={{ textAlign: 'right' }}>Miktar</th>
                  <th style={{ textAlign: 'right' }}>Ort. Maliyet</th>
                  <th style={{ textAlign: 'right' }}>Güncel Fiyat</th>
                  <th style={{ textAlign: 'right' }}>Değer</th>
                  <th style={{ textAlign: 'right' }}>PnL</th>
                </tr>
              </thead>
              <tbody>
                {varliklar.map((v) => {
                  const px = state.piyasa_coinleri[v.sembol]?.fiyat ?? 0;
                  const delisted = !(v.sembol in state.piyasa_coinleri);
                  const value = v.miktar * px;
                  const cost = v.miktar * v.ortalama_maliyet;
                  const pnl = value - cost;
                  const pct = cost > 0 ? (pnl / cost) * 100 : 0;
                  return (
                    <tr key={v.sembol}>
                      <td>
                        <div className="sym">
                          <span className="ic">{v.sembol.slice(0, 3)}</span>
                          <div>
                            <div>{v.sembol}</div>
                            {delisted && <span className="pill delist" style={{ marginTop: 2 }}>DELIST</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }} className="num">{fmtNum(v.miktar, 4)}</td>
                      <td style={{ textAlign: 'right' }} className="num muted">{fmtUSD(v.ortalama_maliyet)}</td>
                      <td style={{ textAlign: 'right' }} className="num">{delisted ? '—' : fmtUSD(px)}</td>
                      <td style={{ textAlign: 'right' }} className="num">{fmtUSD(value)}</td>
                      <td style={{ textAlign: 'right' }} className={`num ${pnl >= 0 ? 'pos' : 'neg'}`}>
                        {fmtSigned(pnl)} <span style={{ color: 'var(--text-mute)', marginLeft: 4 }}>({fmtSigned(pct, 2)}%)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Dağılım</h3><span className="desc">Anlık değere göre</span></div>
          <Donut data={varliklar.map((v) => ({ label: v.sembol, value: v.miktar * (state.piyasa_coinleri[v.sembol]?.fiyat ?? 0) }))} total={totals.value} />
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, delta, sub, positive }) {
  return (
    <div className="kpi">
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      {delta !== undefined && <div className={`delta ${positive ? 'up' : 'down'}`}>{delta}</div>}
      {sub && <div className="delta">{sub}</div>}
    </div>
  );
}

function NoUser({ onGo }) {
  return (
    <div className="panel" style={{ marginTop: 80 }}>
      <div className="empty">
        <div className="ic">👤</div>
        <h4>Aktif kullanıcı yok</h4>
        <p style={{ marginBottom: 14 }}>İşlem yapabilmek için lütfen "Kullanıcılar" sekmesinden bir kullanıcı oluşturun veya seçin.</p>
        <button className="btn primary" onClick={onGo}>Kullanıcı Yönetimine Git</button>
      </div>
    </div>
  );
}

function Donut({ data, total }) {
  const filtered = data.filter((d) => d.value > 0);
  const sum = filtered.reduce((a, b) => a + b.value, 0);
  if (sum === 0) return <div className="empty"><h4>Veri yok</h4><p>Pozisyon açıldıktan sonra dağılım grafiği burada görünür.</p></div>;
  const palette = ['#E6B144', '#7BC596', '#6FA8DC', '#C792EA', '#E89B6B', '#7DD3C0', '#D17C8F', '#A0A8BD'];
  let cum = 0;
  const radius = 64, cx = 90, cy = 90;
  const arcs = filtered.map((d, i) => {
    const start = (cum / sum) * Math.PI * 2 - Math.PI / 2;
    cum += d.value;
    const end = (cum / sum) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + Math.cos(start) * radius, y1 = cy + Math.sin(start) * radius;
    const x2 = cx + Math.cos(end) * radius, y2 = cy + Math.sin(end) * radius;
    return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`, color: palette[i % palette.length], label: d.label, value: d.value, pct: (d.value / sum) * 100 };
  });
  return (
    <div style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg viewBox="0 0 180 180" width="180" height="180" style={{ flexShrink: 0 }}>
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} />)}
        <circle cx="90" cy="90" r="38" fill="var(--panel)" />
        <text x="90" y="86" textAnchor="middle" fontSize="9" fill="var(--text-mute)" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Toplam</text>
        <text x="90" y="102" textAnchor="middle" fontSize="13" fill="var(--text)" fontFamily="JetBrains Mono" fontWeight="600">{fmtUSD(total, 0)}</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: a.color }}></span>
            <span style={{ flex: 1 }}>{a.label}</span>
            <span className="mono muted">{fmtNum(a.pct, 1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Page: Market ============
function MarketPage({ state, setState, openTrade }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editCoin, setEditCoin] = useState(null);
  const toast = useToast();
  const coins = Object.entries(state.piyasa_coinleri);

  const del = (s) => {
    if (!confirm(`${s} piyasadan silinsin mi? Kullanıcı cüzdanlarındaki kayıtlar korunur.`)) return;
    setState((st) => {
      const cp = { ...st.piyasa_coinleri };
      delete cp[s];
      return { ...st, piyasa_coinleri: cp };
    });
    toast(`${s} piyasadan silindi`, 'info');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Piyasa</h1>
          <div className="sub">Borsadaki coinler — fiyat güncelle, ekle veya delist et</div>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}><Ic.plus /> Coin Ekle</button>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Tüm Coinler</h3>
          <span className="desc">{coins.length} coin listelendi</span>
        </div>
        {coins.length === 0 ? (
          <div className="empty"><div className="ic">∅</div><h4>Piyasada coin yok</h4><p>İşlem yapabilmek için önce piyasaya en az bir coin tanımlayın.</p></div>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Sembol</th>
                <th>Açıklama</th>
                <th style={{ textAlign: 'right' }}>Fiyat</th>
                <th>30g Trend</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {coins.map(([s, c]) => (
                <tr key={s}>
                  <td><div className="sym"><span className="ic">{s.slice(0, 3)}</span><span>{s}</span></div></td>
                  <td className="muted">{c.aciklama || '—'}</td>
                  <td style={{ textAlign: 'right' }} className="num">{fmtUSD(c.fiyat, c.fiyat < 1 ? 4 : 2)}</td>
                  <td><Spark seed={s.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) * 17} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn sm success" onClick={() => openTrade('ALIM', s)}>Al</button>
                      <button className="btn sm" onClick={() => setEditCoin({ sembol: s, fiyat: c.fiyat, aciklama: c.aciklama })}><Ic.edit /></button>
                      <button className="btn sm danger" onClick={() => del(s)}><Ic.trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showAdd || editCoin) && (
        <CoinFormModal
          initial={editCoin}
          existing={state.piyasa_coinleri}
          onClose={() => { setShowAdd(false); setEditCoin(null); }}
          onSubmit={(c) => {
            setState((st) => ({ ...st, piyasa_coinleri: { ...st.piyasa_coinleri, [c.sembol]: { fiyat: c.fiyat, aciklama: c.aciklama } } }));
            toast(`${c.sembol} ${editCoin ? 'güncellendi' : 'eklendi'}`, 'ok');
            setShowAdd(false); setEditCoin(null);
          }}
        />
      )}
    </>
  );
}

function CoinFormModal({ initial, existing, onClose, onSubmit }) {
  const [sembol, setSembol] = useState(initial?.sembol || '');
  const [fiyat, setFiyat] = useState(initial?.fiyat || '');
  const [aciklama, setAciklama] = useState(initial?.aciklama || '');
  const [err, setErr] = useState('');
  const isEdit = !!initial;

  const submit = () => {
    const s = sembol.trim().toUpperCase();
    if (!validSymbol(s)) return setErr('Sembol 2-10 karakter, sadece BÜYÜK HARF ve rakam içermelidir.');
    const f = parseFloat(fiyat);
    if (!Number.isFinite(f) || f <= 0) return setErr('Fiyat pozitif bir sayı olmalıdır.');
    onSubmit({ sembol: s, fiyat: f, aciklama });
  };

  return (
    <Modal title={isEdit ? `${initial.sembol} Güncelle` : 'Piyasaya Coin Ekle'} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Vazgeç</button><button className="btn primary" onClick={submit}>{isEdit ? 'Güncelle' : 'Ekle'}</button></>}>
      <div className="field">
        <label>Sembol</label>
        <input value={sembol} disabled={isEdit} onChange={(e) => setSembol(e.target.value.toUpperCase())} placeholder="BTC" />
        <div className="hint">Örn: BTC, ETH, SOL — 2-10 karakter, harf ve rakam.</div>
      </div>
      <div className="field">
        <label>Güncel Fiyat ($)</label>
        <input type="number" step="0.0001" value={fiyat} onChange={(e) => setFiyat(e.target.value)} placeholder="96420.50" />
      </div>
      <div className="field">
        <label>Açıklama (opsiyonel)</label>
        <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Bitcoin" />
      </div>
      {err && <div className="err" style={{ color: 'var(--loss)', fontSize: 12.5 }}>{err}</div>}
    </Modal>
  );
}

// ============ Page: Users ============
function UsersPage({ state, setState }) {
  const [showAdd, setShowAdd] = useState(false);
  const toast = useToast();
  const users = Object.values(state.kullanicilar);

  const select = (ad) => {
    setState((st) => ({ ...st, aktif_kullanici: ad }));
    toast(`Aktif kullanıcı: ${ad}`, 'info');
  };
  const del = (ad) => {
    if (!confirm(`${ad} ve cüzdan geçmişi tamamen silinecek. Emin misiniz?`)) return;
    setState((st) => {
      const cp = { ...st.kullanicilar };
      delete cp[ad];
      const nextActive = st.aktif_kullanici === ad ? (Object.keys(cp)[0] || null) : st.aktif_kullanici;
      return { ...st, kullanicilar: cp, aktif_kullanici: nextActive };
    });
    toast(`${ad} silindi`, 'err');
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Kullanıcılar</h1><div className="sub">Çoklu kullanıcı — her cüzdan tamamen izoledir</div></div>
        <button className="btn primary" onClick={() => setShowAdd(true)}><Ic.plus /> Yeni Kullanıcı</button>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Sistemdeki Kullanıcılar</h3><span className="desc">{users.length} kullanıcı</span></div>
        {users.length === 0 ? (
          <div className="empty"><div className="ic">👤</div><h4>Henüz kullanıcı yok</h4><p>Sisteme ilk kullanıcıyı ekleyerek başlayın.</p></div>
        ) : (
          <table className="t">
            <thead>
              <tr><th>Kullanıcı</th><th>E-posta</th><th style={{ textAlign: 'right' }}>Varlık</th><th style={{ textAlign: 'right' }}>İşlem</th><th>Durum</th><th style={{ textAlign: 'right' }}></th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const aktif = state.aktif_kullanici === u.kullanici_adi;
                return (
                  <tr key={u.kullanici_adi}>
                    <td>
                      <div className="sym">
                        <span className="avatar">{u.kullanici_adi[0].toUpperCase()}</span>
                        <span>{u.kullanici_adi}</span>
                      </div>
                    </td>
                    <td className="muted">{u.eposta}</td>
                    <td style={{ textAlign: 'right' }} className="num">{u.portfoy.varliklar.length}</td>
                    <td style={{ textAlign: 'right' }} className="num">{u.portfoy.islemler.length}</td>
                    <td>{aktif ? <span className="pill buy">AKTİF</span> : <span className="pill" style={{ background: 'var(--chip)', color: 'var(--text-dim)' }}>PASİF</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {!aktif && <button className="btn sm" onClick={() => select(u.kullanici_adi)}>Seç</button>}
                        <button className="btn sm danger" onClick={() => del(u.kullanici_adi)}><Ic.trash /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <UserFormModal
          existing={state.kullanicilar}
          onClose={() => setShowAdd(false)}
          onSubmit={(u) => {
            setState((st) => ({
              ...st,
              kullanicilar: { ...st.kullanicilar, [u.kullanici_adi]: { kullanici_adi: u.kullanici_adi, eposta: u.eposta, portfoy: { varliklar: [], islemler: [] } } },
              aktif_kullanici: u.kullanici_adi,
            }));
            toast(`${u.kullanici_adi} oluşturuldu ve aktif edildi`, 'ok');
            setShowAdd(false);
          }}
        />
      )}
    </>
  );
}

function UserFormModal({ existing, onClose, onSubmit }) {
  const [ad, setAd] = useState('');
  const [eposta, setEposta] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    if (!validUsername(ad)) return setErr('Kullanıcı adı 3-30 karakter, sadece harf/rakam/altçizgi içermelidir.');
    if (existing[ad]) return setErr('Bu kullanıcı zaten mevcut.');
    if (!validEmail(eposta)) return setErr('Geçerli bir e-posta adresi giriniz.');
    onSubmit({ kullanici_adi: ad, eposta });
  };
  return (
    <Modal title="Yeni Kullanıcı" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Vazgeç</button><button className="btn primary" onClick={submit}>Oluştur ve Aktif Et</button></>}>
      <div className="field"><label>Kullanıcı Adı</label><input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="ahmet_yilmaz" /></div>
      <div className="field"><label>E-posta</label><input type="email" value={eposta} onChange={(e) => setEposta(e.target.value)} placeholder="ahmet@ornek.com" /></div>
      {err && <div className="err" style={{ color: 'var(--loss)', fontSize: 12.5 }}>{err}</div>}
    </Modal>
  );
}

// ============ Page: Trade ============
function TradePage({ state, setState, initialSide, initialSymbol, clearInitial }) {
  const [tab, setTab] = useState(initialSide || 'ALIM');
  const [sembol, setSembol] = useState(initialSymbol || '');
  const [miktar, setMiktar] = useState('');
  const [err, setErr] = useState('');
  const toast = useToast();

  useEffect(() => { if (initialSide) setTab(initialSide); if (initialSymbol) setSembol(initialSymbol); }, [initialSide, initialSymbol]);

  const user = state.kullanicilar[state.aktif_kullanici];
  const market = state.piyasa_coinleri;
  if (!user) return <NoUser onGo={() => {}} />;

  const px = market[sembol]?.fiyat ?? 0;
  const m = parseFloat(miktar);
  const total = (Number.isFinite(m) && m > 0) ? m * px : 0;
  const holding = user.portfoy.varliklar.find((v) => v.sembol === sembol);

  const submit = () => {
    setErr('');
    if (!sembol || !(sembol in market)) return setErr('Geçerli bir coin seçin.');
    if (!Number.isFinite(m) || m <= 0) return setErr('Miktar pozitif bir sayı olmalıdır.');
    if (tab === 'SATIM') {
      if (!holding) return setErr('Bu coine sahip değilsiniz.');
      if (holding.miktar < m) return setErr(`Yetersiz bakiye. Mevcut: ${fmtNum(holding.miktar, 4)} ${sembol}`);
    }
    setState((st) => {
      const u = st.kullanicilar[st.aktif_kullanici];
      const cp = { ...u, portfoy: { varliklar: [...u.portfoy.varliklar], islemler: [...u.portfoy.islemler] } };
      const idx = cp.portfoy.varliklar.findIndex((v) => v.sembol === sembol);
      if (tab === 'ALIM') {
        if (idx === -1) cp.portfoy.varliklar.push({ sembol, miktar: m, ortalama_maliyet: px });
        else {
          const merged = wacBuy(cp.portfoy.varliklar[idx], m, px);
          cp.portfoy.varliklar[idx] = { sembol, ...merged };
        }
      } else {
        cp.portfoy.varliklar[idx] = { ...cp.portfoy.varliklar[idx], miktar: cp.portfoy.varliklar[idx].miktar - m };
        if (cp.portfoy.varliklar[idx].miktar <= 1e-12) cp.portfoy.varliklar.splice(idx, 1);
      }
      cp.portfoy.islemler.push({ sembol, miktar: m, fiyat: px, islem_tipi: tab, tarih: nowStr() });
      return { ...st, kullanicilar: { ...st.kullanicilar, [st.aktif_kullanici]: cp } };
    });
    toast(`${tab === 'ALIM' ? 'Alım' : 'Satım'} başarılı: ${fmtNum(m, 4)} ${sembol} @ ${fmtUSD(px)}`, 'ok');
    setMiktar(''); if (clearInitial) clearInitial();
  };

  const newWac = (() => {
    if (tab !== 'ALIM' || !holding || !(m > 0)) return null;
    return wacBuy(holding, m, px).ortalama_maliyet;
  })();

  return (
    <>
      <div className="page-head"><div><h1>İşlem</h1><div className="sub">Anlık piyasa fiyatından alım veya satım. WAC otomatik güncellenir.</div></div></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="row-grid">
        <div className="panel">
          <div className="panel-head"><h3>{tab === 'ALIM' ? 'Coin Al' : 'Coin Sat'}</h3></div>
          <div className="trade-form">
            <div className="full">
              <div className="trade-tabs">
                <button className={`buy ${tab === 'ALIM' ? 'active' : ''}`} onClick={() => setTab('ALIM')}>ALIM</button>
                <button className={`sell ${tab === 'SATIM' ? 'active' : ''}`} onClick={() => setTab('SATIM')}>SATIM</button>
              </div>
            </div>
            <div className="field full">
              <label>Coin</label>
              <select value={sembol} onChange={(e) => setSembol(e.target.value)}>
                <option value="">— Coin seçin —</option>
                {Object.entries(market).map(([s, c]) => <option key={s} value={s}>{s} — {fmtUSD(c.fiyat, c.fiyat < 1 ? 4 : 2)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Miktar</label>
              <input type="number" step="any" value={miktar} onChange={(e) => setMiktar(e.target.value)} placeholder="0.0000" />
              {tab === 'SATIM' && holding && <div className="hint">Bakiye: <span className="mono">{fmtNum(holding.miktar, 6)} {sembol}</span></div>}
            </div>
            <div className="field">
              <label>Birim Fiyat ($)</label>
              <input value={sembol ? fmtNum(px, px < 1 ? 4 : 2) : ''} disabled />
              <div className="hint">Piyasa fiyatı (anlık)</div>
            </div>
            <div className="full">
              <div className="summary">
                <div className="row"><span>Toplam</span><b>{fmtUSD(total)}</b></div>
                {tab === 'ALIM' && holding && (
                  <div className="row"><span>Mevcut WAC</span><b>{fmtUSD(holding.ortalama_maliyet)}</b></div>
                )}
                {newWac !== null && (
                  <div className="row total"><span>İşlem sonrası WAC</span><b>{fmtUSD(newWac)}</b></div>
                )}
                {tab === 'SATIM' && holding && Number.isFinite(m) && m > 0 && (
                  <div className="row total"><span>Gerçekleşen K/Z</span><b className={(px - holding.ortalama_maliyet) >= 0 ? 'pos' : 'neg'} style={{ color: (px - holding.ortalama_maliyet) >= 0 ? 'var(--gain)' : 'var(--loss)' }}>{fmtSigned((px - holding.ortalama_maliyet) * m)} $</b></div>
                )}
              </div>
              {err && <div style={{ color: 'var(--loss)', fontSize: 12.5, marginTop: 10 }}>{err}</div>}
              <button className={`btn ${tab === 'ALIM' ? 'success' : 'danger'}`} style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 12, fontSize: 13, fontWeight: 600 }} onClick={submit}>
                {tab === 'ALIM' ? 'Alım Onayla' : 'Satım Onayla'}
              </button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Hızlı Seçim</h3><span className="desc">Piyasadaki coinler</span></div>
          <div className="coin-list" style={{ border: 'none', borderRadius: 0, maxHeight: 'none' }}>
            {Object.entries(market).map(([s, c]) => (
              <div key={s} className={`item ${sembol === s ? 'active' : ''}`} onClick={() => setSembol(s)}>
                <span className="ic" style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--chip)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)' }}>{s.slice(0, 3)}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{s}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{c.aciklama}</div>
                </div>
                <span className="right">{fmtUSD(c.fiyat, c.fiyat < 1 ? 4 : 2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ============ Page: PnL ============
function PnlPage({ state }) {
  const user = state.kullanicilar[state.aktif_kullanici];
  if (!user) return <NoUser />;
  const rows = user.portfoy.varliklar.map((v) => {
    const px = state.piyasa_coinleri[v.sembol]?.fiyat ?? 0;
    const value = v.miktar * px;
    const cost = v.miktar * v.ortalama_maliyet;
    const pnl = value - cost;
    const pct = cost > 0 ? (pnl / cost) * 100 : 0;
    return { sembol: v.sembol, value, cost, pnl, pct, delisted: !(v.sembol in state.piyasa_coinleri) };
  });
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  const realized = useMemo(() => {
    // realized = sum over SATIM of (price - simulated WAC at that time) * qty
    // Simplification: approximate by recomputing WAC chronologically
    const positions = {};
    let total = 0;
    [...user.portfoy.islemler]
      .sort((a, b) => (a.tarih < b.tarih ? -1 : 1))
      .forEach((i) => {
        const p = positions[i.sembol] || { miktar: 0, ort: 0 };
        if (i.islem_tipi === 'ALIM') {
          const nm = p.miktar + i.miktar;
          p.ort = nm > 0 ? (p.miktar * p.ort + i.miktar * i.fiyat) / nm : 0;
          p.miktar = nm;
        } else {
          total += (i.fiyat - p.ort) * i.miktar;
          p.miktar = Math.max(0, p.miktar - i.miktar);
        }
        positions[i.sembol] = p;
      });
    return total;
  }, [user.portfoy.islemler]);
  const totalPnl = rows.reduce((a, r) => a + r.pnl, 0);
  const totalCost = rows.reduce((a, r) => a + r.cost, 0);
  const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <>
      <div className="page-head"><div><h1>Kâr / Zarar (PnL)</h1><div className="sub">{user.kullanici_adi} — Gerçekleşmemiş PnL anlık piyasa fiyatlarına göre hesaplanır.</div></div></div>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <Kpi label="Gerçekleşmemiş PnL" value={fmtSigned(totalPnl) + ' $'} delta={fmtSigned(totalPct, 2) + '%'} positive={totalPnl >= 0} />
        <Kpi label="Gerçekleşmiş PnL" value={fmtSigned(realized) + ' $'} sub="Tamamlanan satımlardan" />
        <Kpi label="Toplam Net" value={fmtSigned(totalPnl + realized) + ' $'} positive={(totalPnl + realized) >= 0} delta={totalPnl + realized >= 0 ? 'KÂR' : 'ZARAR'} />
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Pozisyon Bazlı PnL</h3><span className="desc">{rows.length} varlık</span></div>
        {rows.length === 0 ? (
          <div className="empty"><div className="ic">📊</div><h4>Açık pozisyon yok</h4><p>Önce bir alım işlemi yapın.</p></div>
        ) : (
          <div className="pnl-list">
            {rows.map((r) => {
              const w = Math.abs(r.pnl) / max * 50;
              return (
                <div key={r.sembol} className="pnl-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ic" style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--chip)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono' }}>{r.sembol.slice(0, 3)}</span>
                    <b style={{ fontSize: 12.5 }}>{r.sembol}</b>
                  </div>
                  <div className="bar">
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex' }}>
                      <div style={{ flex: 1, borderRight: '1px solid var(--line-2)' }}></div>
                      <div style={{ flex: 1 }}></div>
                    </div>
                    {r.pnl >= 0
                      ? <div className="fill" style={{ width: `${w}%` }}></div>
                      : <div className="fill neg" style={{ width: `${w}%`, left: 'auto', right: '50%' }}></div>}
                  </div>
                  <div className={`amt ${r.pnl >= 0 ? 'pos' : 'neg'}`} style={{ color: r.pnl >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                    {fmtSigned(r.pnl)}
                    <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{fmtSigned(r.pct, 2)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ============ Page: History ============
function HistoryPage({ state }) {
  const user = state.kullanicilar[state.aktif_kullanici];
  const [filter, setFilter] = useState('ALL');
  if (!user) return <NoUser />;
  const items = [...user.portfoy.islemler].reverse().filter((i) => filter === 'ALL' || i.islem_tipi === filter);
  return (
    <>
      <div className="page-head">
        <div><h1>İşlem Geçmişi</h1><div className="sub">{user.kullanici_adi} — Tüm alım ve satım kayıtları</div></div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn sm ${filter === 'ALL' ? 'primary' : ''}`} onClick={() => setFilter('ALL')}>Tümü</button>
          <button className={`btn sm ${filter === 'ALIM' ? 'success' : ''}`} onClick={() => setFilter('ALIM')}>Alım</button>
          <button className={`btn sm ${filter === 'SATIM' ? 'danger' : ''}`} onClick={() => setFilter('SATIM')}>Satım</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Kayıtlar</h3><span className="desc">{items.length} işlem</span></div>
        {items.length === 0 ? (
          <div className="empty"><div className="ic">🗒</div><h4>İşlem yok</h4><p>Yapılan ilk işlem burada listelenir.</p></div>
        ) : (
          <table className="t">
            <thead>
              <tr><th>Tarih</th><th>Tip</th><th>Coin</th><th style={{ textAlign: 'right' }}>Miktar</th><th style={{ textAlign: 'right' }}>Fiyat</th><th style={{ textAlign: 'right' }}>Tutar</th></tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={idx}>
                  <td className="muted mono" style={{ fontSize: 12 }}>{i.tarih}</td>
                  <td><span className={`pill ${i.islem_tipi === 'ALIM' ? 'buy' : 'sell'}`}>{i.islem_tipi}</span></td>
                  <td><div className="sym"><span className="ic">{i.sembol.slice(0, 3)}</span><span>{i.sembol}</span></div></td>
                  <td style={{ textAlign: 'right' }} className="num">{fmtNum(i.miktar, 4)}</td>
                  <td style={{ textAlign: 'right' }} className="num muted">{fmtUSD(i.fiyat)}</td>
                  <td style={{ textAlign: 'right' }} className="num">{fmtUSD(i.miktar * i.fiyat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ============ App shell ============
const MENU = [
  { id: 'users', label: 'Kullanıcı Yönetimi', idx: '01', icon: Ic.user },
  { id: 'market', label: 'Piyasa & Coinler', idx: '02', icon: Ic.market },
  { id: 'list', label: 'Coin Listesi', idx: '03', icon: Ic.list },
  { id: 'trade', label: 'İşlem (Alım/Satım)', idx: '04', icon: Ic.buy },
  { id: 'portfolio', label: 'Portföy', idx: '06', icon: Ic.pie },
  { id: 'pnl', label: 'Kâr / Zarar (PnL)', idx: '07', icon: Ic.chart },
  { id: 'history', label: 'İşlem Geçmişi', idx: '08', icon: Ic.history },
];

function App() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem('kripto_db_v1');
      if (raw) return JSON.parse(raw);
    } catch {}
    return SEED;
  });
  const [view, setView] = useState('portfolio');
  const [tradeIntent, setTradeIntent] = useState({ side: null, symbol: null });
  const toastRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('kripto_db_v1', JSON.stringify(state));
  }, [state]);

  const openTrade = (side, symbol) => { setTradeIntent({ side, symbol }); setView('trade'); };

  // Save / Load JSON like Python's DosyaYoneticisi
  const saveJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kripto_veritabani.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const loadJson = (file) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        setState(data);
      } catch (e) {
        alert('Geçersiz JSON dosyası');
      }
    };
    r.readAsText(file);
  };

  return (
    <ToastProvider>
      <ShellInner
        state={state} setState={setState} view={view} setView={setView}
        tradeIntent={tradeIntent} setTradeIntent={setTradeIntent}
        openTrade={openTrade} saveJson={saveJson} loadJson={loadJson} fileRef={fileRef}
      />
    </ToastProvider>
  );
}

function ShellInner({ state, setState, view, setView, tradeIntent, setTradeIntent, openTrade, saveJson, loadJson, fileRef }) {
  const toast = useToast();
  const user = state.aktif_kullanici ? state.kullanicilar[state.aktif_kullanici] : null;
  const pageName = (MENU.find((m) => m.id === view) || { label: 'Portföy' }).label;

  const onSave = () => { saveJson(); toast('Veriler kripto_veritabani.json olarak indirildi', 'ok'); };
  const onLoad = () => fileRef.current?.click();
  const onFile = (e) => { const f = e.target.files?.[0]; if (f) { loadJson(f); toast('Veriler yüklendi', 'ok'); } e.target.value = ''; };

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="brand-mark">₿</div>
          <div>
            <div className="brand-name">Kripto Portföy</div>
            <div className="brand-sub">Programlama 2 · OOP</div>
          </div>
        </div>

        <div className="user-card">
          <div className="lbl">Aktif Kullanıcı</div>
          {user ? (
            <>
              <div className="name"><span className="avatar">{user.kullanici_adi[0].toUpperCase()}</span>{user.kullanici_adi}</div>
              <div className="email">{user.eposta}</div>
              <button className="switch" onClick={() => setView('users')}>Değiştir / Yönet →</button>
            </>
          ) : (
            <>
              <div className="name" style={{ color: 'var(--text-dim)' }}>Seçili değil</div>
              <button className="switch" onClick={() => setView('users')}>Kullanıcı Seç →</button>
            </>
          )}
        </div>

        <nav className="nav">
          <div className="nav-section">Yönetim</div>
          {MENU.slice(0, 3).map((m) => <NavItem key={m.id} m={m} active={view === m.id} onClick={() => setView(m.id)} />)}
          <div className="nav-section">İşlem</div>
          {MENU.slice(3, 4).map((m) => <NavItem key={m.id} m={m} active={view === m.id} onClick={() => { setTradeIntent({ side: null, symbol: null }); setView(m.id); }} />)}
          <div className="nav-section">Raporlama</div>
          {MENU.slice(4).map((m) => <NavItem key={m.id} m={m} active={view === m.id} onClick={() => setView(m.id)} />)}
        </nav>

        <div className="side-foot">
          <button onClick={onLoad} title="Verileri Yükle (10)"><Ic.load /> Yükle</button>
          <button onClick={onSave} title="Verileri Kaydet (9)"><Ic.save /> Kaydet</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onFile} />
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="crumbs">Sistem · <b>{pageName}</b></div>
          <div className="grow"></div>
          <div className="market-pill"><span className="dot"></span>Piyasa açık · {Object.keys(state.piyasa_coinleri).length} coin listeli</div>
          <button className="ghost btn" onClick={onLoad}><Ic.load /> Yükle</button>
          <button className="save-btn" onClick={onSave}><Ic.save style={{ marginRight: 4 }} /> Kaydet</button>
        </div>

        <div className="content">
          {view === 'portfolio' && <PortfolioPage state={state} setView={setView} openTrade={openTrade} />}
          {view === 'market' && <MarketPage state={state} setState={setState} openTrade={openTrade} />}
          {view === 'list' && <MarketPage state={state} setState={setState} openTrade={openTrade} />}
          {view === 'users' && <UsersPage state={state} setState={setState} />}
          {view === 'trade' && <TradePage state={state} setState={setState} initialSide={tradeIntent.side} initialSymbol={tradeIntent.symbol} clearInitial={() => setTradeIntent({ side: null, symbol: null })} />}
          {view === 'pnl' && <PnlPage state={state} />}
          {view === 'history' && <HistoryPage state={state} />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ m, active, onClick }) {
  const Icon = m.icon;
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="idx">{m.idx}</span>
      <Icon />
      <span>{m.label}</span>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
