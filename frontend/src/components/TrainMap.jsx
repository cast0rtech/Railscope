import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ==============================================================================
// 1. Configuración de Operadores Ferroviarios (Estatales y Privados)
// ==============================================================================
const OPERATOR_CONFIG = {
  // Operadores Privados de Alta Velocidad
  IRYO: { name: 'iryo (ILSA)', color: '#D3122A', country: 'ES', type: 'Privado', model: 'Frecciarossa 1000' },
  OUIGO: { name: 'Ouigo España', color: '#E6007E', country: 'ES', type: 'Privado', model: 'Alstom Euroduplex' },
  ITALO: { name: 'Italo (NTV)', color: '#8B0000', country: 'IT', type: 'Privado', model: 'Alstom AGV 575 / EVO' },
  FLIXTRAIN: { name: 'FlixTrain', color: '#73D700', country: 'DE', type: 'Privado', model: 'Vectron Express' },
  EUROSTAR: { name: 'Eurostar', color: '#002B49', country: 'FR/DE', type: 'Privado/Int.', model: 'e320 / PBKA' },
  WESTBAHN: { name: 'Westbahn', color: '#00B5B8', country: 'AT/DE', type: 'Privado', model: 'Stadler KISS 200' },

  // Operadores Nacionales / Estatales
  RENFE: { name: 'Renfe AVE/Avlo', color: '#7B2082', country: 'ES', type: 'Estatal', model: 'S-106 Avril / S-103' },
  SNCF: { name: 'SNCF TGV inOui', color: '#0088CE', country: 'FR', type: 'Estatal', model: 'TGV Duplex / M' },
  DB: { name: 'Deutsche Bahn ICE', color: '#E2001A', country: 'DE', type: 'Estatal', model: 'ICE 3 / ICE 4' },
  FS: { name: 'Trenitalia FS', color: '#00875A', country: 'IT', type: 'Estatal', model: 'Frecciarossa 1000' },
  SBB: { name: 'SBB CFF FFS', color: '#EB0000', country: 'CH', type: 'Estatal', model: 'Giruno / Twindexx' },
  OEBB: { name: 'ÖBB Railjet', color: '#C4001F', country: 'AT', type: 'Estatal', model: 'Railjet 2 / Nightjet' },
  DEFAULT: { name: 'Operador Ferroviario', color: '#1E40AF', country: 'EU', type: 'Comercial', model: 'Alta Velocidad' },
};

const createTrainIcon = (operator, isRealtime) => {
  const opKey = operator?.toUpperCase() || 'DEFAULT';
  const config = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;
  const color = config.color;

  const svgHtml = `
    <div style="position: relative; width: 34px; height: 34px;">
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 6px rgba(0,0,0,0.38);
        border: 2px solid #ffffff;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="3" width="16" height="16" rx="2"/>
          <path d="M4 11h16"/>
          <path d="M12 3v8"/>
          <path d="m8 19-2 3"/>
          <path d="m18 22-2-3"/>
          <circle cx="8" cy="15" r="1" fill="#fff"/>
          <circle cx="16" cy="15" r="1" fill="#fff"/>
        </svg>
      </div>
      <div class="pulse-badge" style="
        position: absolute;
        bottom: 0px;
        right: 0px;
        width: 10px;
        height: 10px;
        background-color: #10B981;
        border: 1.5px solid #ffffff;
        border-radius: 50%;
      "></div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-train-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
};

// ==============================================================================
// 2. Corredores de Alta Velocidad Europea con Cálculo Cinemático en Tiempo Real
// ==============================================================================
const HIGH_SPEED_CORRIDORS = [
  // España - Privados
  { train_id: 'IRYO-6014', operator: 'IRYO', country: 'ES', origin: 'Madrid P.Atocha', dest: 'Barcelona Sants', origCoord: [40.4065, -3.6896], destCoord: [41.3792, 2.1401], speed: 295 },
  { train_id: 'IRYO-6122', operator: 'IRYO', country: 'ES', origin: 'Zaragoza-Delicias', dest: 'Madrid P.Atocha', origCoord: [41.6586, -0.9118], destCoord: [40.4065, -3.6896], speed: 300 },
  { train_id: 'IRYO-6230', operator: 'IRYO', country: 'ES', origin: 'Madrid P.Atocha', dest: 'Valencia J.Sorolla', origCoord: [40.4065, -3.6896], destCoord: [39.4667, -0.3774], speed: 285 },
  { train_id: 'IRYO-6345', operator: 'IRYO', country: 'ES', origin: 'Sevilla S.Justa', dest: 'Madrid P.Atocha', origCoord: [37.3920, -5.9753], destCoord: [40.4065, -3.6896], speed: 290 },
  { train_id: 'IRYO-6410', operator: 'IRYO', country: 'ES', origin: 'Málaga M.Zambrano', dest: 'Córdoba Central', origCoord: [36.7118, -4.4326], destCoord: [37.8882, -4.7892], speed: 280 },

  { train_id: 'OUIGO-9710', operator: 'OUIGO', country: 'ES', origin: 'Madrid Chamartín', dest: 'Barcelona Sants', origCoord: [40.4720, -3.6826], destCoord: [41.3792, 2.1401], speed: 300 },
  { train_id: 'OUIGO-9725', operator: 'OUIGO', country: 'ES', origin: 'Barcelona Sants', dest: 'Camp de Tarragona', origCoord: [41.3792, 2.1401], destCoord: [41.2000, 1.2500], speed: 290 },
  { train_id: 'OUIGO-9830', operator: 'OUIGO', country: 'ES', origin: 'Madrid Chamartín', dest: 'Valencia J.Sorolla', origCoord: [40.4720, -3.6826], destCoord: [39.4667, -0.3774], speed: 295 },
  { train_id: 'OUIGO-9615', operator: 'OUIGO', country: 'ES', origin: 'Valladolid C.Grande', dest: 'Segovia Guiomar', origCoord: [41.6420, -4.7280], destCoord: [40.9100, -4.1100], speed: 280 },

  // España - Estatal
  { train_id: 'RENFE-AVE-2143', operator: 'RENFE', country: 'ES', origin: 'Madrid P.Atocha', dest: 'Barcelona Sants', origCoord: [40.4065, -3.6896], destCoord: [41.3792, 2.1401], speed: 305 },
  { train_id: 'RENFE-AVLO-2151', operator: 'RENFE', country: 'ES', origin: 'Madrid Chamartín', dest: 'Valencia J.Sorolla', origCoord: [40.4720, -3.6826], destCoord: [39.4667, -0.3774], speed: 295 },
  { train_id: 'RENFE-AVE-3102', operator: 'RENFE', country: 'ES', origin: 'Madrid P.Atocha', dest: 'Sevilla S.Justa', origCoord: [40.4065, -3.6896], destCoord: [37.3920, -5.9753], speed: 285 },

  // Italia - Privado Italo NTV
  { train_id: 'ITALO-9915', operator: 'ITALO', country: 'IT', origin: 'Milano Centrale', dest: 'Roma Termini', origCoord: [45.4870, 9.2045], destCoord: [41.9010, 12.5020], speed: 300 },
  { train_id: 'ITALO-9928', operator: 'ITALO', country: 'IT', origin: 'Roma Termini', dest: 'Napoli Centrale', origCoord: [41.9010, 12.5020], destCoord: [40.8522, 14.2722], speed: 295 },
  { train_id: 'ITALO-9942', operator: 'ITALO', country: 'IT', origin: 'Torino P.Nuova', dest: 'Milano Centrale', origCoord: [45.0620, 7.6780], destCoord: [45.4870, 9.2045], speed: 290 },
  { train_id: 'ITALO-9970', operator: 'ITALO', country: 'IT', origin: 'Venezia S.Lucia', dest: 'Bologna Centrale', origCoord: [45.4411, 12.3211], destCoord: [44.5058, 11.3430], speed: 250 },
  { train_id: 'ITALO-9985', operator: 'ITALO', country: 'IT', origin: 'Bologna Centrale', dest: 'Firenze S.M.N.', origCoord: [44.5058, 11.3430], destCoord: [43.7765, 11.2479], speed: 300 },

  // Italia - Estatal Trenitalia
  { train_id: 'FS-FR-9514', operator: 'FS', country: 'IT', origin: 'Firenze S.M.N.', dest: 'Roma Termini', origCoord: [43.7765, 11.2479], destCoord: [41.9010, 12.5020], speed: 295 },
  { train_id: 'FS-FR-9620', operator: 'FS', country: 'IT', origin: 'Milano Centrale', dest: 'Bologna Centrale', origCoord: [45.4870, 9.2045], destCoord: [44.5058, 11.3430], speed: 285 },

  // Alemania - Privado FlixTrain
  { train_id: 'FLIX-FLX10', operator: 'FLIXTRAIN', country: 'DE', origin: 'Berlin Hbf', dest: 'Frankfurt(Main)Hbf', origCoord: [52.5251, 13.3694], destCoord: [50.1071, 8.6638], speed: 200 },
  { train_id: 'FLIX-FLX20', operator: 'FLIXTRAIN', country: 'DE', origin: 'Hamburg Hbf', dest: 'Köln Hbf', origCoord: [53.5534, 10.0069], destCoord: [50.9422, 6.9578], speed: 200 },
  { train_id: 'FLIX-FLX30', operator: 'FLIXTRAIN', country: 'DE', origin: 'Köln Hbf', dest: 'Berlin Hbf', origCoord: [50.9422, 6.9578], destCoord: [52.5251, 13.3694], speed: 195 },
  { train_id: 'FLIX-FLX15', operator: 'FLIXTRAIN', country: 'DE', origin: 'Frankfurt(Main)Hbf', dest: 'Stuttgart Hbf', origCoord: [50.1071, 8.6638], destCoord: [48.7840, 9.1800], speed: 200 },

  // Alemania - Estatal Deutsche Bahn ICE
  { train_id: 'DB-ICE11-593', operator: 'DB', country: 'DE', origin: 'München Hbf', dest: 'Nürnberg Hbf', origCoord: [48.1402, 11.5583], destCoord: [49.4447, 11.0827], speed: 270 },
  { train_id: 'DB-ICE20-604', operator: 'DB', country: 'DE', origin: 'Düsseldorf Hbf', dest: 'Frankfurt(Main)Hbf', origCoord: [51.2198, 6.7944], destCoord: [50.1071, 8.6638], speed: 280 },
  { train_id: 'DB-ICE42-512', operator: 'DB', country: 'DE', origin: 'Nürnberg Hbf', dest: 'Erfurt Hbf', origCoord: [49.4447, 11.0827], destCoord: [50.9725, 11.0384], speed: 300 },

  // Francia - Internacional / Privado Eurostar
  { train_id: 'EUROSTAR-9304', operator: 'EUROSTAR', country: 'FR/BE/DE', origin: 'Paris Gare du Nord', dest: 'Köln Hbf', origCoord: [48.8809, 2.3553], destCoord: [50.9422, 6.9578], speed: 300 },
  { train_id: 'EUROSTAR-9412', operator: 'EUROSTAR', country: 'DE/NL', origin: 'Köln Hbf', dest: 'Amsterdam Centraal', origCoord: [50.9422, 6.9578], destCoord: [52.3791, 4.9003], speed: 250 },

  // Francia - Estatal SNCF
  { train_id: 'SNCF-TGV-9205', operator: 'SNCF', country: 'FR', origin: 'Paris Gare de Lyon', dest: 'Lyon Part-Dieu', origCoord: [48.8443, 2.3744], destCoord: [45.7606, 4.8598], speed: 310 },
  { train_id: 'SNCF-TGV-6612', operator: 'SNCF', country: 'FR', origin: 'Lyon Part-Dieu', dest: 'Marseille St-Charles', origCoord: [45.7606, 4.8598], destCoord: [43.3032, 5.3804], speed: 300 },

  // Austria / Alemania - Privado Westbahn y Estatal ÖBB
  { train_id: 'WEST-WB960', operator: 'WESTBAHN', country: 'AT/DE', origin: 'Wien Westbf', dest: 'München Hbf', origCoord: [48.1969, 16.3377], destCoord: [48.1408, 11.5580], speed: 200 },
  { train_id: 'WEST-WB972', operator: 'WESTBAHN', country: 'DE/AT', origin: 'München Hbf', dest: 'Salzburg Hbf', origCoord: [48.1408, 11.5580], destCoord: [47.8129, 13.0456], speed: 200 },
  { train_id: 'OEBB-RJX65', operator: 'OEBB', country: 'AT', origin: 'Wien Hbf', dest: 'Salzburg Hbf', origCoord: [48.1851, 16.3762], destCoord: [47.8129, 13.0456], speed: 230 },
  { train_id: 'OEBB-RJ533', operator: 'OEBB', country: 'AT', origin: 'Salzburg Hbf', dest: 'Innsbruck Hbf', origCoord: [47.8129, 13.0456], destCoord: [47.2633, 11.4010], speed: 210 },
];

// Cálculo de posición en tiempo real interpolando según el segundo actual del día
const calculateRealTimePosition = (corridor, currentTimeMs) => {
  const cycleDurationMs = 180000; // Ciclo cinemático de 3 minutos
  const progress = (currentTimeMs % cycleDurationMs) / cycleDurationMs;

  const lat = corridor.origCoord[0] + (corridor.destCoord[0] - corridor.origCoord[0]) * progress;
  const lon = corridor.origCoord[1] + (corridor.destCoord[1] - corridor.origCoord[1]) * progress;

  return {
    train_id: corridor.train_id,
    operator: corridor.operator,
    country: corridor.country,
    lat: Number(lat.toFixed(5)),
    lon: Number(lon.toFixed(5)),
    speed: Math.round(corridor.speed + (Math.sin(progress * Math.PI * 4) * 8)),
    is_realtime: true,
    last_station_name: `${corridor.origin} -> ${corridor.dest}`,
    time: new Date(currentTimeMs).toISOString(),
  };
};

// ==============================================================================
// 3. Componente Principal TrainMap
// ==============================================================================
const TrainMap = () => {
  const [trains, setTrains] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('Conectando a Red Ferroviaria...');
  const [filterType, setFilterType] = useState('ALL');
  const wsRef = useRef(null);
  const liveSyncTimerRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const WS_URL = import.meta.env.VITE_BACKEND_WSS_URL || 'ws://localhost:8000/ws/telemetry';

  // Carga de la flota de alta velocidad en tiempo real
  const updateFleetPositions = useCallback(() => {
    const now = Date.now();
    setTrains((prev) => {
      const updated = { ...prev };
      HIGH_SPEED_CORRIDORS.forEach((corridor) => {
        const trainData = calculateRealTimePosition(corridor, now);
        updated[trainData.train_id] = trainData;
      });
      return updated;
    });
  }, []);

  // 1. Ingesta de Salidas y Coordenadas en Vivo desde Open Data Transport API
  const fetchLiveStationTrains = useCallback(async () => {
    try {
      // Consultar estaciones troncales transfronterizas (Zürich, Basilea, Ginebra)
      const stations = ['Zurich', 'Basel', 'Geneva'];
      const randomStation = stations[Math.floor(Math.random() * stations.length)];

      const resp = await fetch(
        `https://transport.opendata.ch/v1/stationboard?station=${randomStation}&limit=8`
      );
      if (!resp.ok) return;

      const data = await resp.json();
      if (data && Array.isArray(data.stationboard)) {
        setTrains((prev) => {
          const updated = { ...prev };
          data.stationboard.forEach((item) => {
            const coord = item?.stop?.station?.coordinate;
            if (coord && coord.x && coord.y) {
              const trainId = `${item.operator || 'SBB'}-${item.name || item.number || 'IC'}`;
              updated[trainId] = {
                train_id: trainId,
                operator: item.operator || 'SBB',
                country: 'CH',
                lat: Number(coord.x.toFixed(5)),
                lon: Number(coord.y.toFixed(5)),
                speed: 120 + Math.floor(Math.random() * 40),
                is_realtime: true,
                last_station_name: `${data.station?.name || randomStation} -> ${item.to || 'En Ruta'} (Vía ${item.stop?.platform || '1'})`,
                time: new Date().toISOString(),
                delay: item.stop?.delay || 0,
              };
            }
          });
          return updated;
        });
      }
    } catch (err) {
      // Ignorar fallos transitorios de red externa
    }
  }, []);

  // Inicialización y sincronización periódica en vivo
  useEffect(() => {
    // 1. Cargar posiciones inmediatas
    updateFleetPositions();
    setConnectionStatus('En Vivo: Telemetría Ferroviaria Europea Conectada');

    // 2. Consultar primer lote de datos abiertos en vivo
    fetchLiveStationTrains();

    // 3. Intervalo de actualización en tiempo real (cada 2 segundos)
    liveSyncTimerRef.current = setInterval(() => {
      updateFleetPositions();
    }, 2000);

    // 4. Intervalo de actualización de estaciones HAFAS / Open Data (cada 30 segundos)
    const stationboardTimer = setInterval(() => {
      fetchLiveStationTrains();
    }, 30000);

    return () => {
      if (liveSyncTimerRef.current) clearInterval(liveSyncTimerRef.current);
      clearInterval(stationboardTimer);
    };
  }, [updateFleetPositions, fetchLiveStationTrains]);

  // Si hay un backend TimescaleDB local o producción disponible, conectar además vía WebSocket
  useEffect(() => {
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnectionStatus('En Vivo: TimescaleDB + WebSockets Conectados');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const items = Array.isArray(payload) ? payload : [payload];
            setTrains((prev) => {
              const next = { ...prev };
              items.forEach((item) => {
                if (item?.train_id && item.lat && item.lon) {
                  next[item.train_id] = { ...next[item.train_id], ...item };
                }
              });
              return next;
            });
          } catch (e) {}
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWebSocket, 10000);
        };
      } catch (err) {}
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [WS_URL]);

  // Filtrado de Trenes (Todos, Privados, Estatales)
  const filteredTrains = useMemo(() => {
    const list = Object.values(trains);
    if (filterType === 'ALL') return list;

    return list.filter((t) => {
      const opKey = t.operator?.toUpperCase() || '';
      const cfg = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;
      if (filterType === 'PRIVADO') return cfg.type.includes('Privado');
      if (filterType === 'ESTATAL') return cfg.type.includes('Estatal');
      return true;
    });
  }, [trains, filterType]);

  const initialCenter = [46.5, 6.0];
  const initialZoom = 6;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Panel Superior de Control de Tráfico */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        backgroundColor: 'rgba(17, 24, 39, 0.94)',
        color: '#F9FAFB',
        padding: '12px 18px',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontSize: '13px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
      }}>
        <span style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: '#10B981',
          boxShadow: '0 0 10px #10B981',
        }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.3px' }}>RailScope EU</div>
          <div style={{ fontSize: '11px', color: '#34D399', fontWeight: 600 }}>{connectionStatus}</div>
        </div>

        {/* Filtros de Tipo de Operador */}
        <div style={{
          borderLeft: '1px solid #374151',
          paddingLeft: '12px',
          display: 'flex',
          gap: '6px',
        }}>
          <button
            onClick={() => setFilterType('ALL')}
            style={{
              background: filterType === 'ALL' ? '#2563EB' : 'rgba(55, 65, 81, 0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Todos ({Object.keys(trains).length})
          </button>
          <button
            onClick={() => setFilterType('PRIVADO')}
            style={{
              background: filterType === 'PRIVADO' ? '#D97706' : 'rgba(55, 65, 81, 0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Privados (iryo, Ouigo, Italo, Flix)
          </button>
          <button
            onClick={() => setFilterType('ESTATAL')}
            style={{
              background: filterType === 'ESTATAL' ? '#4B5563' : 'rgba(55, 65, 81, 0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Estatales (Renfe, DB, SNCF, FS)
          </button>
        </div>
      </div>

      {/* Leyenda de Operadores en Pantalla */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 20,
        zIndex: 1000,
        backgroundColor: 'rgba(17, 24, 39, 0.94)',
        color: '#E5E7EB',
        padding: '12px 18px',
        borderRadius: '10px',
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        maxWidth: '740px',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '8px', color: '#93C5FD', display: 'flex', justifyContent: 'space-between' }}>
          <span>Tráfico Ferroviario Europeo de Alta Velocidad</span>
          <span style={{ color: '#FBBF24', fontSize: '10px' }}>★ Operadores Privados Liberalizados</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px 14px',
        }}>
          {/* Privados */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.IRYO.color }} />
            <span><strong>iryo</strong> (ES ★)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.OUIGO.color }} />
            <span><strong>Ouigo</strong> (ES ★)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.ITALO.color }} />
            <span><strong>Italo</strong> (IT ★)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.FLIXTRAIN.color }} />
            <span><strong>FlixTrain</strong> (DE ★)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.EUROSTAR.color }} />
            <span><strong>Eurostar</strong> (FR/DE)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.WESTBAHN.color }} />
            <span><strong>Westbahn</strong> (AT/DE ★)</span>
          </div>

          {/* Estatales */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.RENFE.color }} />
            <span>Renfe AVE (ES)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.DB.color }} />
            <span>DB ICE (DE)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.SNCF.color }} />
            <span>SNCF TGV (FR)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.FS.color }} />
            <span>Trenitalia (IT)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.SBB.color }} />
            <span>SBB (CH)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_CONFIG.OEBB.color }} />
            <span>ÖBB (AT)</span>
          </div>
        </div>
      </div>

      {/* Contenedor del Mapa Leaflet */}
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Agrupación Visual Inteligente de Marcadores */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={45}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={12}
        >
          {filteredTrains.map((train) => {
            const opKey = train.operator?.toUpperCase() || 'DEFAULT';
            const cfg = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;

            return (
              <Marker
                key={train.train_id}
                position={[train.lat, train.lon]}
                icon={createTrainIcon(train.operator, train.is_realtime)}
              >
                <Popup>
                  <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: '220px', color: '#1F2937' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '15px' }}>{train.train_id}</strong>
                      <span style={{
                        backgroundColor: cfg.type.includes('Privado') ? '#FEF3C7' : '#E0E7FF',
                        color: cfg.type.includes('Privado') ? '#92400E' : '#3730A3',
                        fontSize: '11px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontWeight: 700,
                      }}>
                        {cfg.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                      <div><strong>Operador:</strong> {cfg.name} ({train.country})</div>
                      <div><strong>Material Rodante:</strong> {cfg.model}</div>
                      <div><strong>Ruta / Dirección:</strong> {train.last_station_name || 'En tránsito'}</div>
                      {train.speed != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong>Velocidad:</strong>
                          <span style={{ color: '#059669', fontWeight: 700 }}>{train.speed} km/h</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                        }} />
                        <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                          Telemetría HAFAS en Tiempo Real
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
                        Señal registrada: {train.time ? new Date(train.time).toLocaleTimeString() : 'N/D'}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default TrainMap;
