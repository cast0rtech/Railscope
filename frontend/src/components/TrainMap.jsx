import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ==============================================================================
// Generador de Iconos SVG Dinámicos para Marcadores Ferroviarios
// ==============================================================================
const OPERATOR_COLORS = {
  SBB: '#EB0000',
  DB: '#E2001A',
  OEBB: '#C4001F',
  RENFE: '#7B2082',
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
// Componente Principal TrainMap
// ==============================================================================
const TrainMap = () => {
  // Estado en forma de diccionario (Map de objetos indexado por train_id) para O(1) en updates
  const [trains, setTrains] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  const wsRef = useRef(null);

  // URLs de configuración leídas desde entorno o defaults de desarrollo local
  const API_BASE_URL =
    import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const WS_URL =
    import.meta.env.VITE_BACKEND_WSS_URL || 'ws://localhost:8000/ws/telemetry';

  // 1. Fetch Inicial al REST API para cargar el estado global de todos los trenes
  useEffect(() => {
    let isMounted = true;

    const fetchInitialTelemetry = async () => {
      try {
        setConnectionStatus('Cargando estado inicial...');
        const response = await fetch(`${API_BASE_URL}/api/telemetry/latest`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (isMounted && Array.isArray(data)) {
          const initialMap = {};
          data.forEach((train) => {
            if (train?.train_id && train?.lat != null && train?.lon != null) {
              initialMap[train.train_id] = train;
            }
          });
          setTrains(initialMap);
          setConnectionStatus('Conectando a WebSocket...');
        }
      } catch (error) {
        console.error('Error cargando estado inicial de telemetría:', error);
        if (isMounted) {
          setConnectionStatus('Error al cargar datos REST');
        }
      }
    };

    fetchInitialTelemetry();

    return () => {
      isMounted = false;
    };
  }, [API_BASE_URL]);

  // 2. Conexión WebSocket para actualizaciones en tiempo real de alto rendimiento
  // Mutando únicamente el tren específico para evitar re-renderizados innecesarios del mapa
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
        // Verificar si hay cambio real de coordenadas o estado
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

      ws.onerror = (err) => {
        console.warn('Alerta WebSocket:', err);
      };

      ws.onclose = () => {
        setConnectionStatus('Reconectando...');
        reconnectTimeout = setTimeout(connectWebSocket, 4000);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Evitar reconexión al desmontar
        wsRef.current.close();
      }
    };
  }, [WS_URL, handleBatchUpdate]);

  // Convertir diccionario a array memoizado para la renderización de marcadores
  const trainList = useMemo(() => Object.values(trains), [trains]);

  // Centro inicial del mapa centrado en los Alpes / Corredor Centroeuropeo (Suiza / Alemania / Austria)
  const initialCenter = [47.5, 9.5];
  const initialZoom = 7;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Banner de Estado Flotante */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        backgroundColor: 'rgba(17, 24, 39, 0.90)',
        color: '#F9FAFB',
        padding: '10px 18px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        fontSize: '13px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backdropFilter: 'blur(6px)',
      }}>
        <span style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          backgroundColor: connectionStatus.includes('En Vivo') ? '#10B981' : '#F59E0B',
          boxShadow: connectionStatus.includes('En Vivo') ? '0 0 8px #10B981' : 'none',
        }} />
        <span><strong>RailScope:</strong> {connectionStatus}</span>
        <span style={{ borderLeft: '1px solid #374151', paddingLeft: '8px' }}>
          Trenes: <strong>{trainList.length}</strong>
        </span>
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

        {/* 3. Agrupación Visual Inteligente de Marcadores al Alejar el Zoom */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={13}
        >
          {trainList.map((train) => (
            <Marker
              key={train.train_id}
              position={[train.lat, train.lon]}
              icon={createTrainIcon(train.operator, train.is_realtime)}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: '180px', color: '#1F2937' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '15px' }}>{train.train_id}</strong>
                    <span style={{
                      backgroundColor: train.is_realtime ? '#D1FAE5' : '#FEF3C7',
                      color: train.is_realtime ? '#065F46' : '#92400E',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}>
                      {train.is_realtime ? 'Tiempo Real' : 'Estimado'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                    <div><strong>Operador:</strong> {train.operator} ({train.country})</div>
                    <div><strong>Dirección:</strong> {train.last_station_name || 'En tránsito'}</div>
                    {train.speed != null && (
                      <div><strong>Velocidad:</strong> {train.speed} km/h</div>
                    )}
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
                      Última actualización: {train.time ? new Date(train.time).toLocaleTimeString() : 'N/D'}
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

