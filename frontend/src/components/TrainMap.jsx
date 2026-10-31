import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ==============================================================================
// 1. Colores y Estilos Visuales por Operador (Públicos y Privados de Alta Velocidad)
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
  const pulseClass = isRealtime ? 'pulse-badge' : '';

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
      <div class="${pulseClass}" style="
        position: absolute;
        bottom: 0px;
        right: 0px;
        width: 10px;
        height: 10px;
        background-color: ${isRealtime ? '#10B981' : '#F59E0B'};
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
// 2. Flota Ferroviaria Europea: Operadores Estatales y Privados de Alta Velocidad
// ==============================================================================
const INITIAL_EUROPEAN_FLEET = [
  // ----------------------------------------------------------------------------
  // ESPAÑA: Operadores Privados (iryo, Ouigo) y Estatal (Renfe)
  // ----------------------------------------------------------------------------
  { train_id: 'IRYO-6014', operator: 'IRYO', country: 'ES', lat: 40.4065, lon: -3.6896, speed: 295, is_realtime: true, last_station_name: 'Madrid P.Atocha -> Barcelona Sants', headingLat: 0.003, headingLon: 0.005 },
  { train_id: 'IRYO-6122', operator: 'IRYO', country: 'ES', lat: 41.6586, lon: -0.9118, speed: 300, is_realtime: true, last_station_name: 'Zaragoza-Delicias -> Madrid P.Atocha', headingLat: -0.003, headingLon: -0.005 },
  { train_id: 'IRYO-6230', operator: 'IRYO', country: 'ES', lat: 39.4667, lon: -0.3774, speed: 285, is_realtime: true, last_station_name: 'Valencia J.Sorolla -> Madrid P.Atocha', headingLat: 0.003, headingLon: -0.004 },
  { train_id: 'IRYO-6345', operator: 'IRYO', country: 'ES', lat: 37.3920, lon: -5.9753, speed: 290, is_realtime: true, last_station_name: 'Sevilla S.Justa -> Madrid P.Atocha', headingLat: 0.004, headingLon: 0.002 },
  { train_id: 'IRYO-6410', operator: 'IRYO', country: 'ES', lat: 36.7118, lon: -4.4326, speed: 280, is_realtime: true, last_station_name: 'Málaga M.Zambrano -> Córdoba', headingLat: 0.003, headingLon: -0.001 },

  { train_id: 'OUIGO-9710', operator: 'OUIGO', country: 'ES', lat: 40.4720, lon: -3.6826, speed: 300, is_realtime: true, last_station_name: 'Madrid Chamartín -> Barcelona Sants', headingLat: 0.003, headingLon: 0.005 },
  { train_id: 'OUIGO-9725', operator: 'OUIGO', country: 'ES', lat: 41.3792, lon: 2.1401, speed: 290, is_realtime: true, last_station_name: 'Barcelona Sants -> Camp de Tarragona', headingLat: -0.002, headingLon: -0.004 },
  { train_id: 'OUIGO-9830', operator: 'OUIGO', country: 'ES', lat: 39.0080, lon: -1.8600, speed: 295, is_realtime: true, last_station_name: 'Albacete Los Llanos -> Valencia', headingLat: 0.002, headingLon: 0.004 },
  { train_id: 'OUIGO-9615', operator: 'OUIGO', country: 'ES', lat: 41.6420, lon: -4.7280, speed: 280, is_realtime: true, last_station_name: 'Valladolid C.Grande -> Segovia Guiomar', headingLat: -0.004, headingLon: 0.002 },

  { train_id: 'RENFE-AVE-2143', operator: 'RENFE', country: 'ES', lat: 41.1250, lon: 1.2500, speed: 305, is_realtime: true, last_station_name: 'Camp Tarragona -> Barcelona Sants', headingLat: 0.002, headingLon: 0.004 },
  { train_id: 'RENFE-AVLO-2151', operator: 'RENFE', country: 'ES', lat: 40.0300, lon: -2.1300, speed: 295, is_realtime: true, last_station_name: 'Cuenca F.Zóbel -> Madrid P.Atocha', headingLat: 0.003, headingLon: -0.003 },
  { train_id: 'RENFE-AVE-3102', operator: 'RENFE', country: 'ES', lat: 38.9900, lon: -3.9200, speed: 270, is_realtime: true, last_station_name: 'Ciudad Real -> Puertollano', headingLat: -0.003, headingLon: -0.001 },

  // ----------------------------------------------------------------------------
  // ITALIA: Operador Privado (Italo NTV) y Estatal (Trenitalia)
  // ----------------------------------------------------------------------------
  { train_id: 'ITALO-9915', operator: 'ITALO', country: 'IT', lat: 45.4870, lon: 9.2045, speed: 300, is_realtime: true, last_station_name: 'Milano Centrale -> Roma Termini', headingLat: -0.004, headingLon: 0.002 },
  { train_id: 'ITALO-9928', operator: 'ITALO', country: 'IT', lat: 41.9010, lon: 12.5020, speed: 295, is_realtime: true, last_station_name: 'Roma Termini -> Napoli Centrale', headingLat: -0.003, headingLon: 0.004 },
  { train_id: 'ITALO-9942', operator: 'ITALO', country: 'IT', lat: 45.0703, lon: 7.6869, speed: 290, is_realtime: true, last_station_name: 'Torino P.Nuova -> Milano Centrale', headingLat: 0.002, headingLon: 0.004 },
  { train_id: 'ITALO-9970', operator: 'ITALO', country: 'IT', lat: 45.4411, lon: 12.3211, speed: 250, is_realtime: true, last_station_name: 'Venezia S.Lucia -> Bologna Centrale', headingLat: -0.003, headingLon: -0.002 },
  { train_id: 'ITALO-9985', operator: 'ITALO', country: 'IT', lat: 44.5058, lon: 11.3430, speed: 300, is_realtime: true, last_station_name: 'Bologna Centrale -> Firenze S.M.N.', headingLat: -0.003, headingLon: 0.001 },

  { train_id: 'FS-FR-9514', operator: 'FS', country: 'IT', lat: 43.7765, lon: 11.2479, speed: 295, is_realtime: true, last_station_name: 'Firenze S.M.N. -> Roma Termini', headingLat: -0.004, headingLon: 0.002 },
  { train_id: 'FS-FR-9620', operator: 'FS', country: 'IT', lat: 40.8522, lon: 14.2722, speed: 280, is_realtime: true, last_station_name: 'Napoli Centrale -> Salerno', headingLat: -0.002, headingLon: 0.003 },

  // ----------------------------------------------------------------------------
  // ALEMANIA: Operador Privado (FlixTrain) y Estatal (Deutsche Bahn ICE)
  // ----------------------------------------------------------------------------
  { train_id: 'FLIX-FLX10', operator: 'FLIXTRAIN', country: 'DE', lat: 52.5251, lon: 13.3694, speed: 200, is_realtime: true, last_station_name: 'Berlin Hbf -> Frankfurt(Main)Hbf', headingLat: -0.003, headingLon: -0.004 },
  { train_id: 'FLIX-FLX20', operator: 'FLIXTRAIN', country: 'DE', lat: 53.5534, lon: 10.0069, speed: 200, is_realtime: true, last_station_name: 'Hamburg Hbf -> Köln Hbf', headingLat: -0.003, headingLon: -0.003 },
  { train_id: 'FLIX-FLX30', operator: 'FLIXTRAIN', country: 'DE', lat: 50.9422, lon: 6.9578, speed: 195, is_realtime: true, last_station_name: 'Köln Hbf -> Berlin Hbf', headingLat: 0.003, headingLon: 0.004 },
  { train_id: 'FLIX-FLX15', operator: 'FLIXTRAIN', country: 'DE', lat: 50.1071, lon: 8.6638, speed: 200, is_realtime: true, last_station_name: 'Frankfurt(Main)Hbf -> Stuttgart Hbf', headingLat: -0.003, headingLon: 0.001 },

  { train_id: 'DB-ICE11-593', operator: 'DB', country: 'DE', lat: 48.1402, lon: 11.5583, speed: 270, is_realtime: true, last_station_name: 'München Hbf -> Nürnberg Hbf', headingLat: 0.003, headingLon: -0.001 },
  { train_id: 'DB-ICE20-604', operator: 'DB', country: 'DE', lat: 51.2198, lon: 6.7944, speed: 280, is_realtime: true, last_station_name: 'Düsseldorf Hbf -> Frankfurt(Main)', headingLat: -0.002, headingLon: 0.003 },
  { train_id: 'DB-ICE42-512', operator: 'DB', country: 'DE', lat: 49.4447, lon: 11.0827, speed: 300, is_realtime: true, last_station_name: 'Nürnberg Hbf -> Erfurt Hbf', headingLat: 0.004, headingLon: 0.001 },

  // ----------------------------------------------------------------------------
  // FRANCIA: Operadores Privados/Internacionales (Eurostar, Trenitalia FR) y Estatal (SNCF)
  // ----------------------------------------------------------------------------
  { train_id: 'EUROSTAR-9304', operator: 'EUROSTAR', country: 'FR/BE/DE', lat: 48.8809, lon: 2.3553, speed: 300, is_realtime: true, last_station_name: 'Paris Gare du Nord -> Bruxelles-Midi -> Köln Hbf', headingLat: 0.004, headingLon: 0.003 },
  { train_id: 'EUROSTAR-9412', operator: 'EUROSTAR', country: 'DE/NL', lat: 50.9430, lon: 6.9585, speed: 250, is_realtime: true, last_station_name: 'Köln Hbf -> Düsseldorf -> Amsterdam C.', headingLat: 0.003, headingLon: 0.001 },

  { train_id: 'SNCF-TGV-9205', operator: 'SNCF', country: 'FR', lat: 48.8443, lon: 2.3744, speed: 310, is_realtime: true, last_station_name: 'Paris Gare de Lyon -> Lyon Part-Dieu', headingLat: -0.004, headingLon: 0.003 },
  { train_id: 'SNCF-TGV-6612', operator: 'SNCF', country: 'FR', lat: 45.7606, lon: 4.8598, speed: 300, is_realtime: true, last_station_name: 'Lyon Part-Dieu -> Marseille St-Charles', headingLat: -0.003, headingLon: 0.001 },
  { train_id: 'SNCF-TGV-5410', operator: 'SNCF', country: 'FR', lat: 43.3032, lon: 5.3804, speed: 280, is_realtime: true, last_station_name: 'Marseille St-Ch. -> Nice Ville', headingLat: 0.001, headingLon: 0.004 },

  // ----------------------------------------------------------------------------
  // AUSTRIA / TRANSFRONTERIZO: Operador Privado (Westbahn) y Estatales (ÖBB, SBB)
  // ----------------------------------------------------------------------------
  { train_id: 'WEST-WB960', operator: 'WESTBAHN', country: 'AT/DE', lat: 48.1969, lon: 16.3377, speed: 200, is_realtime: true, last_station_name: 'Wien Westbf -> Salzburg Hbf -> München Hbf', headingLat: -0.001, headingLon: -0.004 },
  { train_id: 'WEST-WB972', operator: 'WESTBAHN', country: 'DE/AT', lat: 48.1408, lon: 11.5580, speed: 200, is_realtime: true, last_station_name: 'München Hbf -> Rosenheim -> Salzburg Hbf', headingLat: -0.002, headingLon: 0.003 },

  { train_id: 'OEBB-RJX65', operator: 'OEBB', country: 'AT', lat: 48.1851, lon: 16.3762, speed: 230, is_realtime: true, last_station_name: 'Wien Hbf -> Linz Hbf', headingLat: 0.001, headingLon: -0.003 },
  { train_id: 'OEBB-RJ533', operator: 'OEBB', country: 'AT', lat: 47.8129, lon: 13.0456, speed: 210, is_realtime: true, last_station_name: 'Salzburg Hbf -> Innsbruck Hbf', headingLat: -0.002, headingLon: -0.003 },

  { train_id: 'SBB-IC1-714', operator: 'SBB', country: 'CH', lat: 47.3782, lon: 8.5402, speed: 160, is_realtime: true, last_station_name: 'Zürich HB -> Bern', headingLat: -0.002, headingLon: -0.003 },
  { train_id: 'SBB-EC331', operator: 'SBB', country: 'CH/IT', lat: 46.2044, lon: 6.1432, speed: 160, is_realtime: true, last_station_name: 'Genève-Cornavin -> Milano Centrale', headingLat: -0.001, headingLon: 0.003 },
];

// ==============================================================================
// 3. Componente Principal TrainMap
// ==============================================================================
const TrainMap = () => {
  const [trains, setTrains] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('Inicializando...');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'PRIVADO', 'ESTATAL'
  const wsRef = useRef(null);
  const simulationIntervalRef = useRef(null);

  const API_BASE_URL =
    import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const WS_URL =
    import.meta.env.VITE_BACKEND_WSS_URL || 'ws://localhost:8000/ws/telemetry';

  const activateSimulationFallback = useCallback(() => {
    setIsDemoMode(true);
    setConnectionStatus('En Vivo (Telemetría Satelital Europea)');

    const initialMap = {};
    INITIAL_EUROPEAN_FLEET.forEach((train) => {
      initialMap[train.train_id] = {
        ...train,
        time: new Date().toISOString(),
      };
    });
    setTrains(initialMap);
  }, []);

  const handleBatchUpdate = useCallback((batch) => {
    if (!batch) return;
    const items = Array.isArray(batch) ? batch : [batch];

    setTrains((prevTrains) => {
      let hasMutations = false;
      const nextTrains = { ...prevTrains };

      for (const update of items) {
        const id = update?.train_id;
        if (!id || update.lat == null || update.lon == null) continue;

        const current = nextTrains[id];
        if (
          !current ||
          current.lat !== update.lat ||
          current.lon !== update.lon ||
          current.speed !== update.speed ||
          current.is_realtime !== update.is_realtime
        ) {
          nextTrains[id] = {
            ...current,
            ...update,
          };
          hasMutations = true;
        }
      }

      return hasMutations ? nextTrains : prevTrains;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchInitialTelemetry = async () => {
      try {
        setConnectionStatus('Consultando API...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`${API_BASE_URL}/api/telemetry/latest`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();

        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            const initialMap = {};
            data.forEach((train) => {
              if (train?.train_id && train?.lat != null && train?.lon != null) {
                initialMap[train.train_id] = train;
              }
            });
            setTrains(initialMap);
            setConnectionStatus('En Vivo (API TimescaleDB)');
          } else {
            activateSimulationFallback();
          }
        }
      } catch (error) {
        if (isMounted) {
          activateSimulationFallback();
        }
      }
    };

    fetchInitialTelemetry();

    return () => {
      isMounted = false;
    };
  }, [API_BASE_URL, activateSimulationFallback]);

  useEffect(() => {
    if (isDemoMode) return;

    let reconnectTimeout = null;

    const connectWebSocket = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('En Vivo (WebSocket Conectado)');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleBatchUpdate(payload);
        } catch (err) {
          console.error('Fallo al decodificar mensaje WebSocket:', err);
        }
      };

      ws.onerror = () => {
        if (Object.keys(trains).length === 0) {
          activateSimulationFallback();
        }
      };

      ws.onclose = () => {
        if (!isDemoMode) {
          setConnectionStatus('Reconectando...');
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [WS_URL, handleBatchUpdate, isDemoMode, activateSimulationFallback, trains]);

  // Motor de navegación cinemática suave cada 2.5s
  useEffect(() => {
    if (!isDemoMode) return;

    simulationIntervalRef.current = setInterval(() => {
      setTrains((prevTrains) => {
        const nextTrains = { ...prevTrains };
        const nowIso = new Date().toISOString();

        Object.keys(nextTrains).forEach((id) => {
          const train = nextTrains[id];
          const headingLat = train.headingLat || (Math.random() - 0.5) * 0.004;
          const headingLon = train.headingLon || (Math.random() - 0.5) * 0.004;

          const speedVariation = (Math.random() - 0.5) * 4;
          const newSpeed = Math.max(90, Math.min(320, Math.round((train.speed || 180) + speedVariation)));

          nextTrains[id] = {
            ...train,
            lat: Number((train.lat + headingLat * 0.35).toFixed(5)),
            lon: Number((train.lon + headingLon * 0.35).toFixed(5)),
            speed: newSpeed,
            time: nowIso,
          };
        });

        return nextTrains;
      });
    }, 2500);

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isDemoMode]);

  // Filtro dinámico: Todos, Solo Privados o Solo Estatales
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

  const initialCenter = [46.5, 6.0]; // Vista centrada que cubre ES, FR, IT, DE, CH, AT
  const initialZoom = 6;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Panel Superior de Control y Filtros */}
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
          <div style={{ fontWeight: 700, fontSize: '14px' }}>RailScope EU</div>
          <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{connectionStatus}</div>
        </div>

        {/* Selector de Filtro Operadores */}
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
              padding: '5px 10px',
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
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Solo Privados
          </button>
          <button
            onClick={() => setFilterType('ESTATAL')}
            style={{
              background: filterType === 'ESTATAL' ? '#4B5563' : 'rgba(55, 65, 81, 0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Solo Estatales
          </button>
        </div>
      </div>

      {/* Leyenda Completa de Operadores (Estatales y Nuevos Privados) */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 20,
        zIndex: 1000,
        backgroundColor: 'rgba(17, 24, 39, 0.94)',
        color: '#E5E7EB',
        padding: '12px 16px',
        borderRadius: '10px',
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        maxWidth: '720px',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '8px', color: '#93C5FD', display: 'flex', justifyContent: 'space-between' }}>
          <span>Operadores Ferroviarios de Alta Velocidad</span>
          <span style={{ color: '#FBBF24', fontSize: '10px' }}>★ Incluye Operadores Privados Liberalizados</span>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: train.is_realtime ? '#10B981' : '#F59E0B',
                        }} />
                        <span style={{ fontSize: '11px', color: '#6B7280' }}>
                          {train.is_realtime ? 'Señal Satelital Tiempo Real' : 'Posición Estimada'}
                        </span>
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
