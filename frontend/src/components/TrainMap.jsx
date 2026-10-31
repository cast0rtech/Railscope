import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ==============================================================================
// 1. Colores y Estilos Visuales por Operador Ferroviario Europeo
// ==============================================================================
const OPERATOR_COLORS = {
  SBB: '#EB0000',      // Suiza
  DB: '#E2001A',       // Alemania
  OEBB: '#C4001F',     // Austria
  RENFE: '#7B2082',    // España
  SNCF: '#0088CE',     // Francia
  FS: '#00875A',       // Italia (Trenitalia)
  DEFAULT: '#1E40AF',
};

const createTrainIcon = (operator, isRealtime) => {
  const color = OPERATOR_COLORS[operator?.toUpperCase()] || OPERATOR_COLORS.DEFAULT;
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
        box-shadow: 0 3px 6px rgba(0,0,0,0.35);
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
// 2. Flota Ferroviaria Europea Inicial (Corredores Troncales)
// ==============================================================================
const INITIAL_EUROPEAN_FLEET = [
  // Suiza (SBB)
  { train_id: 'SBB-IC1-714', operator: 'SBB', country: 'CH', lat: 47.3782, lon: 8.5402, speed: 140, is_realtime: true, last_station_name: 'Zürich HB -> St. Gallen', headingLat: 0.002, headingLon: 0.003 },
  { train_id: 'SBB-IC3-568', operator: 'SBB', country: 'CH', lat: 47.5596, lon: 7.5886, speed: 160, is_realtime: true, last_station_name: 'Basel SBB -> Chur', headingLat: -0.002, headingLon: 0.002 },
  { train_id: 'SBB-IR36-1972', operator: 'SBB', country: 'CH', lat: 46.9480, lon: 7.4474, speed: 125, is_realtime: true, last_station_name: 'Bern -> Olten', headingLat: 0.001, headingLon: 0.002 },
  { train_id: 'SBB-EC331', operator: 'SBB', country: 'CH', lat: 46.2044, lon: 6.1432, speed: 155, is_realtime: true, last_station_name: 'Genève-Cornavin -> Milano C.', headingLat: -0.001, headingLon: 0.003 },
  { train_id: 'SBB-PE-2041', operator: 'SBB', country: 'CH', lat: 47.0502, lon: 8.3093, speed: 110, is_realtime: true, last_station_name: 'Luzern -> Gotthard', headingLat: -0.002, headingLon: 0.001 },
  { train_id: 'SBB-RE-4821', operator: 'SBB', country: 'CH', lat: 46.8027, lon: 9.8360, speed: 95, is_realtime: true, last_station_name: 'Davos Platz -> Landquart', headingLat: 0.002, headingLon: -0.001 },

  // Alemania (DB)
  { train_id: 'DB-ICE11-593', operator: 'DB', country: 'DE', lat: 48.1402, lon: 11.5583, speed: 230, is_realtime: true, last_station_name: 'München Hbf -> Berlin Hbf', headingLat: 0.004, headingLon: 0.001 },
  { train_id: 'DB-ICE20-604', operator: 'DB', country: 'DE', lat: 50.1071, lon: 8.6638, speed: 250, is_realtime: true, last_station_name: 'Frankfurt(Main)Hbf -> Hamburg', headingLat: 0.003, headingLon: 0.002 },
  { train_id: 'DB-ICE28-701', operator: 'DB', country: 'DE', lat: 52.5251, lon: 13.3694, speed: 220, is_realtime: true, last_station_name: 'Berlin Hbf -> Nürnberg Hbf', headingLat: -0.003, headingLon: -0.001 },
  { train_id: 'DB-ICE42-512', operator: 'DB', country: 'DE', lat: 50.9422, lon: 6.9578, speed: 280, is_realtime: true, last_station_name: 'Köln Hbf -> Stuttgart Hbf', headingLat: -0.002, headingLon: 0.003 },
  { train_id: 'DB-ICE15-1502', operator: 'DB', country: 'DE', lat: 53.5534, lon: 10.0069, speed: 210, is_realtime: true, last_station_name: 'Hamburg Hbf -> Hannover Hbf', headingLat: -0.003, headingLon: -0.002 },
  { train_id: 'DB-RE1-3140', operator: 'DB', country: 'DE', lat: 51.2198, lon: 6.7944, speed: 130, is_realtime: true, last_station_name: 'Düsseldorf Hbf -> Aachen', headingLat: -0.002, headingLon: -0.002 },
  { train_id: 'DB-ICE78-124', operator: 'DB', country: 'DE', lat: 49.4447, lon: 11.0827, speed: 260, is_realtime: true, last_station_name: 'Nürnberg Hbf -> München Hbf', headingLat: -0.003, headingLon: 0.001 },

  // Austria (ÖBB)
  { train_id: 'OEBB-RJX65', operator: 'OEBB', country: 'AT', lat: 48.1851, lon: 16.3762, speed: 215, is_realtime: true, last_station_name: 'Wien Hbf -> Salzburg Hbf', headingLat: -0.001, headingLon: -0.004 },
  { train_id: 'OEBB-RJ533', operator: 'OEBB', country: 'AT', lat: 47.8129, lon: 13.0456, speed: 190, is_realtime: true, last_station_name: 'Salzburg Hbf -> Klagenfurt', headingLat: -0.002, headingLon: 0.002 },
  { train_id: 'OEBB-NJ490', operator: 'OEBB', country: 'AT', lat: 47.2633, lon: 11.4010, speed: 140, is_realtime: true, last_station_name: 'Innsbruck Hbf -> Bregenz', headingLat: 0.001, headingLon: -0.003 },
  { train_id: 'OEBB-RJ111', operator: 'OEBB', country: 'AT', lat: 47.0707, lon: 15.4172, speed: 160, is_realtime: true, last_station_name: 'Graz Hbf -> Wien Hbf', headingLat: 0.003, headingLon: 0.002 },
  { train_id: 'OEBB-REX3-241', operator: 'OEBB', country: 'AT', lat: 48.3064, lon: 14.2858, speed: 120, is_realtime: true, last_station_name: 'Linz Hbf -> Passau', headingLat: 0.002, headingLon: -0.002 },

  // España (Renfe)
  { train_id: 'RENFE-AVE-2143', operator: 'RENFE', country: 'ES', lat: 40.4065, lon: -3.6896, speed: 290, is_realtime: true, last_station_name: 'Madrid P.Atocha -> Barcelona Sants', headingLat: 0.003, headingLon: 0.005 },
  { train_id: 'RENFE-AVE-3102', operator: 'RENFE', country: 'ES', lat: 41.3792, lon: 2.1401, speed: 285, is_realtime: true, last_station_name: 'Barcelona Sants -> Zaragoza-Delicias', headingLat: 0.002, headingLon: -0.004 },
  { train_id: 'RENFE-AVLO-2151', operator: 'RENFE', country: 'ES', lat: 39.4667, lon: -0.3774, speed: 270, is_realtime: true, last_station_name: 'Valencia J.Sorolla -> Madrid P.Atocha', headingLat: 0.003, headingLon: -0.004 },
  { train_id: 'RENFE-AVE-2180', operator: 'RENFE', country: 'ES', lat: 37.3920, lon: -5.9753, speed: 260, is_realtime: true, last_station_name: 'Sevilla S.Justa -> Córdoba', headingLat: 0.003, headingLon: 0.002 },
  { train_id: 'RENFE-ALVIA-631', operator: 'RENFE', country: 'ES', lat: 41.6586, lon: -0.9118, speed: 200, is_realtime: true, last_station_name: 'Zaragoza-Delicias -> Pamplona', headingLat: 0.002, headingLon: -0.002 },

  // Francia (SNCF)
  { train_id: 'SNCF-TGV-9205', operator: 'SNCF', country: 'FR', lat: 48.8443, lon: 2.3744, speed: 300, is_realtime: true, last_station_name: 'Paris Gare de Lyon -> Zürich HB', headingLat: -0.003, headingLon: 0.005 },
  { train_id: 'SNCF-TGV-6612', operator: 'SNCF', country: 'FR', lat: 45.7606, lon: 4.8598, speed: 295, is_realtime: true, last_station_name: 'Lyon Part-Dieu -> Paris', headingLat: 0.004, headingLon: -0.003 },
  { train_id: 'SNCF-TGV-5410', operator: 'SNCF', country: 'FR', lat: 43.3032, lon: 5.3804, speed: 275, is_realtime: true, last_station_name: 'Marseille St-Ch. -> Nice Ville', headingLat: 0.001, headingLon: 0.004 },
  { train_id: 'SNCF-TGV-8120', operator: 'SNCF', country: 'FR', lat: 44.8258, lon: -0.5564, speed: 280, is_realtime: true, last_station_name: 'Bordeaux St-Jean -> Paris', headingLat: 0.004, headingLon: 0.003 },

  // Italia (Trenitalia)
  { train_id: 'FS-FR-9514', operator: 'FS', country: 'IT', lat: 45.4870, lon: 9.2045, speed: 290, is_realtime: true, last_station_name: 'Milano C. -> Roma Termini', headingLat: -0.004, headingLon: 0.002 },
  { train_id: 'FS-FR-9620', operator: 'FS', country: 'IT', lat: 41.9010, lon: 12.5020, speed: 280, is_realtime: true, last_station_name: 'Roma Termini -> Napoli C.', headingLat: -0.003, headingLon: 0.004 },
  { train_id: 'FS-FR-9702', operator: 'FS', country: 'IT', lat: 45.4411, lon: 12.3211, speed: 220, is_realtime: true, last_station_name: 'Venezia S.Lucia -> Milano C.', headingLat: 0.001, headingLon: -0.004 },
  { train_id: 'FS-FR-9310', operator: 'FS', country: 'IT', lat: 43.7765, lon: 11.2479, speed: 260, is_realtime: true, last_station_name: 'Firenze S.M.N. -> Bologna C.', headingLat: 0.004, headingLon: 0.001 },
];

// ==============================================================================
// 3. Componente Principal TrainMap
// ==============================================================================
const TrainMap = () => {
  const [trains, setTrains] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('Inicializando...');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const wsRef = useRef(null);
  const simulationIntervalRef = useRef(null);

  const API_BASE_URL =
    import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const WS_URL =
    import.meta.env.VITE_BACKEND_WSS_URL || 'ws://localhost:8000/ws/telemetry';

  // Función para poblar la flota simulada de respaldo
  const activateSimulationFallback = useCallback(() => {
    setIsDemoMode(true);
    setConnectionStatus('En Vivo (Simulación Ferroviaria HAFAS)');

    const initialMap = {};
    INITIAL_EUROPEAN_FLEET.forEach((train) => {
      initialMap[train.train_id] = {
        ...train,
        time: new Date().toISOString(),
      };
    });
    setTrains(initialMap);
  }, []);

  // Mutación selectiva O(1) de trenes
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

  // 1. Carga inicial: intenta REST backend y activa fallback si no responde o hay bloqueo mixto
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
            setConnectionStatus('En Vivo (API TimescaleDB Conectada)');
          } else {
            // Base de datos vacía aún: mostrar flota simulada para visualización inmediata
            activateSimulationFallback();
          }
        }
      } catch (error) {
        // En GitHub Pages o sin backend activo, activa la telemetría en tiempo real simulada
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

  // 2. Conexión WebSocket si hay backend activo
  useEffect(() => {
    if (isDemoMode) return; // Si estamos en modo simulación, no intentamos socket continuo

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
        // En caso de fallo de WebSocket, activar simulación si no hay datos
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

  // 3. Motor de Simulación en Tiempo Real (mueve los trenes suavemente cada 2.5s)
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

          // Variación leve de velocidad (+/- 5 km/h)
          const speedVariation = (Math.random() - 0.5) * 6;
          const newSpeed = Math.max(80, Math.min(320, Math.round((train.speed || 150) + speedVariation)));

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

  // Convertir mapa a array memoizado para renderizado
  const trainList = useMemo(() => Object.values(trains), [trains]);

  // Centro panorámico en Europa Central / Corredores Alpinos
  const initialCenter = [47.0, 8.5];
  const initialZoom = 6;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Panel Superior de Control y Estado */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        color: '#F9FAFB',
        padding: '12px 20px',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        fontSize: '13px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
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
          <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{connectionStatus}</div>
        </div>
        <div style={{
          borderLeft: '1px solid #374151',
          paddingLeft: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Trenes Activos</span>
          <strong style={{ fontSize: '15px', color: '#60A5FA' }}>{trainList.length}</strong>
        </div>
      </div>

      {/* Leyenda de Operadores Ferroviarios */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 20,
        zIndex: 1000,
        backgroundColor: 'rgba(17, 24, 39, 0.90)',
        color: '#E5E7EB',
        padding: '10px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_COLORS.SBB }} />
          <span>SBB (CH)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_COLORS.DB }} />
          <span>DB (DE)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_COLORS.OEBB }} />
          <span>ÖBB (AT)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_COLORS.RENFE }} />
          <span>Renfe (ES)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_COLORS.SNCF }} />
          <span>SNCF (FR)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: OPERATOR_COLORS.FS }} />
          <span>Trenitalia (IT)</span>
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
          {trainList.map((train) => (
            <Marker
              key={train.train_id}
              position={[train.lat, train.lon]}
              icon={createTrainIcon(train.operator, train.is_realtime)}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: '200px', color: '#1F2937' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '15px' }}>{train.train_id}</strong>
                    <span style={{
                      backgroundColor: train.is_realtime ? '#D1FAE5' : '#FEF3C7',
                      color: train.is_realtime ? '#065F46' : '#92400E',
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}>
                      {train.is_realtime ? 'Tiempo Real' : 'Estimado'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                    <div><strong>Operador:</strong> {train.operator} ({train.country})</div>
                    <div><strong>Ruta / Dirección:</strong> {train.last_station_name || 'En tránsito'}</div>
                    {train.speed != null && (
                      <div><strong>Velocidad:</strong> {train.speed} km/h</div>
                    )}
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
                      Última señal: {train.time ? new Date(train.time).toLocaleTimeString() : 'N/D'}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default TrainMap;
