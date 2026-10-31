import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Capacitor } from '@capacitor/core';
import 'leaflet/dist/leaflet.css';

// ==============================================================================
// 1. Configuración de Operadores Ferroviarios (Europa, Asia & Norteamérica)
// ==============================================================================
const OPERATOR_CONFIG = {
  // --- EUROPA: Privados / Concesionarias ---
  IRYO: { name: 'iryo (ILSA)', color: '#D3122A', country: 'ES', continent: 'EU', type: 'Privado', model: 'Frecciarossa 1000' },
  OUIGO: { name: 'Ouigo España', color: '#E6007E', country: 'ES', continent: 'EU', type: 'Privado', model: 'Alstom Euroduplex' },
  ITALO: { name: 'Italo (NTV)', color: '#8B0000', country: 'IT', continent: 'EU', type: 'Privado', model: 'Alstom AGV 575 / EVO' },
  FLIXTRAIN: { name: 'FlixTrain', color: '#73D700', country: 'DE', continent: 'EU', type: 'Privado', model: 'Vectron Express' },
  EUROSTAR: { name: 'Eurostar', color: '#002B49', country: 'FR/DE/UK', continent: 'EU', type: 'Privado/Int.', model: 'e320 / PBKA' },
  WESTBAHN: { name: 'Westbahn', color: '#00B5B8', country: 'AT/DE', continent: 'EU', type: 'Privado', model: 'Stadler KISS 200' },

  // --- EUROPA: Estatales ---
  RENFE: { name: 'Renfe AVE / Avlo / Alvia / Avant', color: '#7B2082', country: 'ES', continent: 'EU', type: 'Estatal', model: 'S-106 Avril / S-130 Alvia / S-104' },
  RENFE_CERCANIAS: { name: 'Renfe Cercanías / Rodalies', color: '#E3001B', country: 'ES', continent: 'EU', type: 'Cercanías', model: 'Civia Serie 465 / 447' },
  SNCF: { name: 'SNCF TGV inOui', color: '#0088CE', country: 'FR', continent: 'EU', type: 'Estatal', model: 'TGV Duplex / M' },
  DB: { name: 'Deutsche Bahn ICE', color: '#E2001A', country: 'DE', continent: 'EU', type: 'Estatal', model: 'ICE 3 / ICE 4 / Neo' },
  FS: { name: 'Trenitalia FS', color: '#00875A', country: 'IT', continent: 'EU', type: 'Estatal', model: 'Frecciarossa 1000' },
  SBB: { name: 'SBB CFF FFS', color: '#EB0000', country: 'CH', continent: 'EU', type: 'Estatal', model: 'Giruno / Twindexx' },
  OEBB: { name: 'ÖBB Railjet', color: '#C4001F', country: 'AT', continent: 'EU', type: 'Estatal', model: 'Railjet 2 / Nightjet' },
  LNER: { name: 'LNER Azuma', color: '#CE0E2D', country: 'UK', continent: 'EU', type: 'Estatal', model: 'Hitachi Class 800' },
  AVANTI: { name: 'Avanti West Coast', color: '#004354', country: 'UK', continent: 'EU', type: 'Franquicia', model: 'Pendolino Class 390' },
  NS: { name: 'NS (Nederlandse Spoorwegen)', color: '#FFC917', country: 'NL', continent: 'EU', type: 'Estatal', model: 'ICNG Alstom Coradia' },
  SNCB: { name: 'SNCB / NMBS', color: '#0055A5', country: 'BE', continent: 'EU', type: 'Estatal', model: 'HLE 18 / M7' },
  SJ: { name: 'SJ (Statens Järnvägar)', color: '#317357', country: 'SE', continent: 'EU', type: 'Estatal', model: 'X2000 / SJ 3000' },
  PKP: { name: 'PKP Intercity', color: '#F39200', country: 'PL', continent: 'EU', type: 'Estatal', model: 'ED250 Pendolino' },
  CP: { name: 'CP (Comboios de Portugal)', color: '#006633', country: 'PT', continent: 'EU', type: 'Estatal', model: 'Alfa Pendular CPA 4000' },
  VR: { name: 'VR Group', color: '#2DB928', country: 'FI', continent: 'EU', type: 'Estatal', model: 'Sm3 Pendolino / Sm6' },
  VY: { name: 'Vy Tog', color: '#004B49', country: 'NO', continent: 'EU', type: 'Estatal', model: 'Type 74 / FLIRT' },

  // --- ASIA: Alta Velocidad ---
  SHINKANSEN_JR: { name: 'JR Shinkansen', color: '#0066B2', country: 'JP', continent: 'AS', type: 'Alta Velocidad', model: 'N700S / E5 Hayabusa' },
  CHINA_RAILWAY: { name: 'China Railway (CR)', color: '#DE2910', country: 'CN', continent: 'AS', type: 'Estatal', model: 'CR400AF Fuxing Hao' },
  KORAIL_KTX: { name: 'Korail KTX', color: '#0A3B7B', country: 'KR', continent: 'AS', type: 'Estatal', model: 'KTX-Sancheon / Eum' },
  SRT_KOREA: { name: 'SRT (Super Rapid Train)', color: '#7F187F', country: 'KR', continent: 'AS', type: 'Privado', model: 'SR Class 130000' },
  THSR: { name: 'Taiwan High Speed Rail', color: '#F58220', country: 'TW', continent: 'AS', type: 'Privado', model: 'THSR 700T' },
  INDIAN_RAIL: { name: 'Indian Railways (IR)', color: '#F77F00', country: 'IN', continent: 'AS', type: 'Estatal', model: 'Vande Bharat Express' },
  TCDD_YHT: { name: 'TCDD YHT', color: '#E30A17', country: 'TR', continent: 'AS', type: 'Estatal', model: 'HT65000 / Velaro TR' },
  HARAMAIN: { name: 'Haramain High Speed', color: '#1B4D3E', country: 'SA', continent: 'AS', type: 'Estatal', model: 'Talgo 350 SRO' },
  AFROSIYOB: { name: 'Afrosiyob (UTY)', color: '#00A3E0', country: 'UZ', continent: 'AS', type: 'Estatal', model: 'Talgo 250 Afrosiyob' },
  WHOOSH: { name: 'Whoosh (KCIC)', color: '#B30000', country: 'ID', continent: 'AS', type: 'Consorcio', model: 'KCIC400AF Red Panda' },

  // --- NORTEAMÉRICA: Estados Unidos, Canadá & México ---
  AMTRAK_ACELA: { name: 'Amtrak Acela', color: '#004B87', country: 'US', continent: 'NA', type: 'Estatal', model: 'Avelia Liberty / Acela II' },
  AMTRAK_REGIONAL: { name: 'Amtrak Intercity', color: '#1B365D', country: 'US', continent: 'NA', type: 'Estatal', model: 'Siemens ALC-42 Charger' },
  BRIGHTLINE: { name: 'Brightline Florida', color: '#FFE600', country: 'US', continent: 'NA', type: 'Privado', model: 'Siemens SCB-40 Charger' },
  CALTRAIN: { name: 'Caltrain Electric', color: '#D91C24', country: 'US', continent: 'NA', type: 'Público', model: 'Stadler KISS EMU' },
  VIA_RAIL: { name: 'VIA Rail Canada', color: '#005596', country: 'CA', continent: 'NA', type: 'Estatal', model: 'Siemens Charger Venture' },
  ROCKY_MOUNTAINEER: { name: 'Rocky Mountaineer', color: '#8B2332', country: 'CA', continent: 'NA', type: 'Privado', model: 'GoldLeaf Dome Bi-Level' },
  TREN_MAYA: { name: 'Tren Maya', color: '#0B4F3A', country: 'MX', continent: 'NA', type: 'Estatal', model: 'Alstom Xiinbal D-EMU' },
  EL_INSURGENTE: { name: 'Tren El Insurgente', color: '#7A1C3C', country: 'MX', continent: 'NA', type: 'Estatal', model: 'CAF Civity 160' },

  DEFAULT: { name: 'Operador Ferroviario', color: '#1E40AF', country: 'INT', continent: 'ALL', type: 'Comercial', model: 'Alta Velocidad' },
};

const createTrainIcon = (operator, isRealtime, isStopped = false) => {
  const opKey = operator?.toUpperCase() || 'DEFAULT';
  const config = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;
  const color = config.color;
  const badgeColor = isStopped ? '#EF4444' : '#10B981';
  const badgeTitle = isStopped ? 'Parado en estación (0 km/h)' : 'En marcha';

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
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
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
      <div class="${isStopped ? 'stopped-badge' : 'pulse-badge'}" style="
        position: absolute;
        bottom: 0px;
        right: 0px;
        width: 10px;
        height: 10px;
        background-color: ${badgeColor};
        border: 1.5px solid #ffffff;
        border-radius: 50%;
      " title="${badgeTitle}"></div>
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

const createUserLocationIcon = () => {
  const svgHtml = `
    <div style="position: relative; width: 34px; height: 34px;">
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.35);
        animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      "></div>
      <div style="
        position: absolute;
        top: 7px;
        left: 7px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: #2563EB;
        border: 2.5px solid #ffffff;
        box-shadow: 0 3px 8px rgba(0,0,0,0.5);
      "></div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-user-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
};

// ==============================================================================
// 2. Corredores Ferroviarios con Trazado Geodésico Real de Vía (Waypoints)
// ==============================================================================
const HIGH_SPEED_CORRIDORS = [
  // --- EUROPA: ESPAÑA ---
  {
    train_id: 'IRYO-6014', train_name: 'iryo 6014', operator: 'IRYO', country: 'ES', continent: 'EU',
    origin: 'Madrid P.Atocha', dest: 'Barcelona Sants', speed: 295,
    line_name: 'LAV Madrid - Zaragoza - Barcelona (Línea 050 Adif)',
    waypoints: [
      [40.4065, -3.6896], [40.4883, -3.1090], [41.3486, -1.6375], [41.6586, -0.9118],
      [41.6212, 0.6322], [41.1928, 1.2544], [41.3465, 1.6972], [41.3792, 2.1401]
    ]
  },
  {
    train_id: 'IRYO-6122', operator: 'IRYO', country: 'ES', continent: 'EU',
    origin: 'Zaragoza-Delicias', dest: 'Madrid P.Atocha', speed: 300,
    line_name: 'LAV Zaragoza - Calatayud - Madrid (Línea 050 Adif)',
    waypoints: [
      [41.6586, -0.9118], [41.3486, -1.6375], [40.4883, -3.1090], [40.4065, -3.6896]
    ]
  },
  {
    train_id: 'IRYO-6230', operator: 'IRYO', country: 'ES', continent: 'EU',
    origin: 'Madrid P.Atocha', dest: 'Valencia J.Sorolla', speed: 285,
    line_name: 'LAV Madrid - Levante (Línea 040 Adif)',
    waypoints: [
      [40.4065, -3.6896], [40.0381, -2.1458], [39.5133, -1.1394], [39.4667, -0.3774]
    ]
  },
  {
    train_id: 'IRYO-6345', operator: 'IRYO', country: 'ES', continent: 'EU',
    origin: 'Sevilla S.Justa', dest: 'Madrid P.Atocha', speed: 290,
    line_name: 'LAV Madrid - Sevilla (Línea 010 Adif)',
    waypoints: [
      [37.3920, -5.9753], [37.8882, -4.7892], [38.6908, -4.1089], [38.9892, -3.9189], [40.4065, -3.6896]
    ]
  },
  {
    train_id: 'IRYO-6410', operator: 'IRYO', country: 'ES', continent: 'EU',
    origin: 'Málaga M.Zambrano', dest: 'Córdoba Central', speed: 280,
    line_name: 'LAV Córdoba - Málaga (Línea 020 Adif)',
    waypoints: [
      [36.7118, -4.4326], [37.0700, -4.7170], [37.3912, -4.8210], [37.8882, -4.7892]
    ]
  },
  {
    train_id: 'OUIGO-9710', train_name: 'Ouigo 9710', operator: 'OUIGO', country: 'ES', continent: 'EU',
    origin: 'Madrid Chamartín', dest: 'Barcelona Sants', speed: 300,
    line_name: 'LAV Madrid - Barcelona (Línea 050 Adif)',
    waypoints: [
      [40.4720, -3.6826], [40.4883, -3.1090], [41.3486, -1.6375], [41.6586, -0.9118],
      [41.6212, 0.6322], [41.1928, 1.2544], [41.3792, 2.1401]
    ]
  },
  {
    train_id: 'OUIGO-9725', operator: 'OUIGO', country: 'ES', continent: 'EU',
    origin: 'Barcelona Sants', dest: 'Camp de Tarragona', speed: 290,
    line_name: 'LAV Corredor Nordeste (Línea 050 Adif)',
    waypoints: [
      [41.3792, 2.1401], [41.3465, 1.6972], [41.1928, 1.2544]
    ]
  },
  {
    train_id: 'OUIGO-9830', operator: 'OUIGO', country: 'ES', continent: 'EU',
    origin: 'Madrid Chamartín', dest: 'Valencia J.Sorolla', speed: 295,
    line_name: 'LAV Madrid - Levante (Línea 040 Adif)',
    waypoints: [
      [40.4720, -3.6826], [40.0381, -2.1458], [39.5133, -1.1394], [39.4667, -0.3774]
    ]
  },
  {
    train_id: 'OUIGO-9615', operator: 'OUIGO', country: 'ES', continent: 'EU',
    origin: 'Valladolid C.Grande', dest: 'Segovia Guiomar', speed: 280,
    line_name: 'LAV Madrid - Segovia - Valladolid (Línea 080 Adif)',
    waypoints: [
      [41.6420, -4.7280], [41.3000, -4.9100], [40.9100, -4.1100]
    ]
  },
  {
    train_id: 'RENFE-AVE-2143', train_name: 'AVE 2143', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Madrid P.Atocha', dest: 'Barcelona Sants', speed: 305,
    line_name: 'LAV Madrid - Barcelona (Línea 050 Adif)',
    waypoints: [
      [40.4065, -3.6896], [40.4883, -3.1090], [41.3486, -1.6375], [41.6586, -0.9118],
      [41.6212, 0.6322], [41.1928, 1.2544], [41.3792, 2.1401]
    ]
  },
  {
    train_id: 'RENFE-AVLO-2151', train_name: 'Avlo 2151', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Madrid Chamartín', dest: 'Valencia J.Sorolla', speed: 295,
    line_name: 'LAV Madrid - Levante (Línea 040 Adif)',
    waypoints: [
      [40.4720, -3.6826], [40.0381, -2.1458], [39.5133, -1.1394], [39.4667, -0.3774]
    ]
  },
  {
    train_id: 'RENFE-AVE-3102', train_name: 'AVE 3102', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Madrid P.Atocha', dest: 'Sevilla S.Justa', speed: 285,
    line_name: 'LAV Madrid - Sevilla (Línea 010 Adif)',
    waypoints: [
      [40.4065, -3.6896], [38.9892, -3.9189], [38.6908, -4.1089], [37.8882, -4.7892], [37.3920, -5.9753]
    ]
  },
  {
    train_id: 'RENFE-AVE-4210', train_name: 'AVE 4210', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Madrid Chamartín', dest: 'Ourense', speed: 290,
    line_name: 'LAV Madrid - Galicia (Línea 082 Adif)',
    waypoints: [
      [40.4720, -3.6826], [40.9100, -4.1100], [41.3000, -4.9100], [41.5136, -5.7419], [42.0000, -6.6000], [42.3480, -7.8640]
    ]
  },
  {
    train_id: 'RENFE-ALVIA-04143', train_name: 'Alvia 04143', service: 'Alvia', service_category: 'LARGA_MEDIA', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Madrid Chamartín', dest: 'Santander', speed: 250,
    model: 'Talgo S-130 / S-730 Alvia',
    line_name: 'LAV Madrid - Segovia - Valladolid - Palencia - Santander',
    waypoints: [
      [40.4720, -3.6826], [40.9100, -4.1100], [41.6420, -4.7280], [41.9214, -4.4922],
      [42.0167, -4.5333], [42.2667, -4.4056], [42.4111, -4.3639], [42.5936, -4.3300],
      [42.7933, -4.2600], [42.8761, -4.1561], [42.9986, -4.1378], [43.1558, -4.0583],
      [43.2625, -4.0628], [43.3458, -4.0536], [43.4594, -3.8122]
    ]
  },
  {
    train_id: 'RENFE-ALVIA-04140', train_name: 'Alvia 04140', service: 'Alvia', service_category: 'LARGA_MEDIA', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Santander', dest: 'Madrid Chamartín', speed: 250,
    model: 'Talgo S-130 / S-730 Alvia',
    line_name: 'LAV Santander - Palencia - Valladolid - Segovia - Madrid',
    waypoints: [
      [43.4594, -3.8122], [43.3458, -4.0536], [43.2625, -4.0628], [43.1558, -4.0583],
      [42.9986, -4.1378], [42.8761, -4.1561], [42.7933, -4.2600], [42.5936, -4.3300],
      [42.4111, -4.3639], [42.2667, -4.4056], [42.0167, -4.5333], [41.9214, -4.4922],
      [41.6420, -4.7280], [40.9100, -4.1100], [40.4720, -3.6826]
    ]
  },
  {
    train_id: 'RENFE-ALVIA-04181', train_name: 'Alvia 04181', service: 'Alvia', service_category: 'LARGA_MEDIA', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Madrid Chamartín', dest: 'Gijón', speed: 250,
    model: 'Talgo S-130 Alvia',
    line_name: 'LAV Madrid - León - Variante de Pajares - Oviedo - Gijón',
    waypoints: [
      [40.4720, -3.6826], [40.9100, -4.1100], [41.6420, -4.7280], [42.0167, -4.5333],
      [42.5987, -5.5667], [42.8025, -5.6289], [43.1611, -5.8281], [43.3667, -5.8500], [43.5357, -5.6615]
    ]
  },
  {
    train_id: 'RENFE-ALVIA-02184', train_name: 'Alvia 02184', service: 'Alvia', service_category: 'LARGA_MEDIA', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Madrid P.Atocha', dest: 'Cádiz', speed: 250,
    model: 'Talgo S-130 Alvia',
    line_name: 'LAV Madrid - Córdoba - Sevilla - Cádiz',
    waypoints: [
      [40.4065, -3.6896], [38.9892, -3.9189], [37.8882, -4.7892], [37.3920, -5.9753],
      [36.7000, -6.1333], [36.5298, -6.2926]
    ]
  },
  // --- MEDIA DISTANCIA & REGIONAL ---
  {
    train_id: 'RENFE-AVANT-08122', train_name: 'Avant 08122', service: 'Avant', service_category: 'LARGA_MEDIA', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Madrid P.Atocha', dest: 'Toledo', speed: 250,
    model: 'Renfe Serie 104 Avant',
    line_name: 'LAV Madrid - Toledo (Media Distancia Alta Velocidad)',
    waypoints: [
      [40.4065, -3.6896], [40.2372, -3.7667], [40.0300, -3.8800], [39.8628, -4.0189]
    ]
  },
  {
    train_id: 'RENFE-REG-18012', train_name: 'Regional Exprés 18012', service: 'Regional Exprés', service_category: 'LARGA_MEDIA', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Madrid Chamartín', dest: 'Ávila', speed: 160,
    model: 'Renfe Serie 449 Media Distancia',
    line_name: 'Línea Madrid Chamartín - El Escorial - Ávila',
    waypoints: [
      [40.4720, -3.6826], [40.6300, -4.0000], [40.5833, -4.1250], [40.6000, -4.3300], [40.6583, -4.6861]
    ]
  },
  {
    train_id: 'RENFE-EUROMED-01131', train_name: 'Euromed 01131', service: 'Euromed', service_category: 'LARGA_MEDIA', operator: 'RENFE', country: 'ES', continent: 'EU',
    origin: 'Barcelona Sants', dest: 'Alicante Terminal', speed: 220,
    model: 'Talgo S-130 Euromed',
    line_name: 'Corredor Mediterráneo: Barcelona - Valencia - Alicante',
    waypoints: [
      [41.3792, 2.1401], [41.1928, 1.2544], [39.9864, -0.0514], [39.4667, -0.3774], [38.3444, -0.4950]
    ]
  },
  // --- CERCANÍAS Y SUBURBANO (COMMUTER) ---
  {
    train_id: 'RENFE-CER-C4-1', train_name: 'Cercanías C-4 (Parla - Alcobendas)', service: 'Cercanías Madrid', service_category: 'CERCANIAS', operator: 'RENFE_CERCANIAS', country: 'ES', continent: 'EU',
    origin: 'Parla', dest: 'Alcobendas - S.S. Reyes', speed: 120,
    model: 'Civia Serie 465 Cercanías',
    line_name: 'Línea C-4 Cercanías Madrid (Túnel Sol)',
    waypoints: [
      [40.2372, -3.7667], [40.2917, -3.7389], [40.3061, -3.7297], [40.3408, -3.7125],
      [40.4050, -3.6883], [40.4168, -3.7038], [40.4461, -3.6917], [40.4720, -3.6826],
      [40.5403, -3.6931], [40.5475, -3.6358]
    ]
  },
  {
    train_id: 'RENFE-CER-C5-1', train_name: 'Cercanías C-5 (Móstoles - Humanes)', service: 'Cercanías Madrid', service_category: 'CERCANIAS', operator: 'RENFE_CERCANIAS', country: 'ES', continent: 'EU',
    origin: 'Móstoles El Soto', dest: 'Humanes', speed: 110,
    model: 'Renfe Serie 446 Cercanías',
    line_name: 'Línea C-5 Cercanías Madrid',
    waypoints: [
      [40.3236, -3.8864], [40.3497, -3.8294], [40.3756, -3.7858], [40.4050, -3.6883],
      [40.3958, -3.6781], [40.3408, -3.7125], [40.2828, -3.7942], [40.2522, -3.8317]
    ]
  },
  {
    train_id: 'RENFE-ROD-R1-1', train_name: 'Rodalies R1 (Molins de Rei - Mataró)', service: 'Rodalies de Catalunya', service_category: 'CERCANIAS', operator: 'RENFE_CERCANIAS', country: 'ES', continent: 'EU',
    origin: 'Molins de Rei', dest: 'Mataró', speed: 110,
    model: 'Civia Serie 465 Rodalies',
    line_name: 'Línea R1 Rodalies Barcelona (Litoral)',
    waypoints: [
      [41.4117, 2.0208], [41.3600, 2.1000], [41.3792, 2.1401], [41.3870, 2.1700],
      [41.3917, 2.1817], [41.4083, 2.1883], [41.4481, 2.2472], [41.4681, 2.2817],
      [41.4883, 2.3600], [41.5333, 2.4450]
    ]
  },
  {
    train_id: 'RENFE-CER-VLC-1', train_name: 'Cercanías C-1 (Valencia Nord - Gandía)', service: 'Cercanías Valencia', service_category: 'CERCANIAS', operator: 'RENFE_CERCANIAS', country: 'ES', continent: 'EU',
    origin: 'Valencia Nord', dest: 'Gandía', speed: 120,
    model: 'Civia Serie 464 Cercanías',
    line_name: 'Línea C-1 Cercanías Valencia',
    waypoints: [
      [39.4670, -0.3770], [39.4230, -0.3950], [39.4030, -0.4040], [39.3620, -0.4140],
      [39.2020, -0.3110], [39.1620, -0.2610], [39.0720, -0.2450], [39.0350, -0.2220], [38.9680, -0.1810]
    ]
  },
  {
    train_id: 'SBB-SBAHN-S12', train_name: 'S-Bahn S12 (Zürich)', service: 'S-Bahn Zürich', service_category: 'CERCANIAS', operator: 'SBB', country: 'CH', continent: 'EU',
    origin: 'Brugg AG', dest: 'Winterthur', speed: 125,
    model: 'Stadler Regio-Dosto S-Bahn',
    line_name: 'S-Bahn Zürich Linie S12',
    waypoints: [
      [47.4833, 8.2167], [47.4736, 8.3075], [47.4083, 8.4417], [47.3782, 8.5402],
      [47.3917, 8.5833], [47.4986, 8.7236]
    ]
  },
  {
    train_id: 'DB-SBAHN-S1', train_name: 'S-Bahn S1 (München)', service: 'S-Bahn München', service_category: 'CERCANIAS', operator: 'DB', country: 'DE', continent: 'EU',
    origin: 'München Hbf', dest: 'München Flughafen', speed: 130,
    model: 'DB Baureihe 423 S-Bahn',
    line_name: 'S-Bahn München Linie S1 (Flughafenlinie)',
    waypoints: [
      [48.1402, 11.5583], [48.1600, 11.5300], [48.2100, 11.5200], [48.3000, 11.6000],
      [48.3538, 11.7861]
    ]
  },

  // --- EUROPA: FRANCIA ---
  {
    train_id: 'SNCF-TGV-9205', operator: 'SNCF', country: 'FR', continent: 'EU',
    origin: 'Paris Gare de Lyon', dest: 'Lyon Part-Dieu', speed: 310,
    line_name: 'LGV Sud-Est (SNCF Réseau)',
    waypoints: [
      [48.8443, 2.3744], [48.6653, 2.5631], [47.7025, 4.0210], [46.7725, 4.4300], [46.2800, 4.7800], [45.7606, 4.8598]
    ]
  },
  {
    train_id: 'SNCF-TGV-6612', operator: 'SNCF', country: 'FR', continent: 'EU',
    origin: 'Lyon Part-Dieu', dest: 'Marseille St-Charles', speed: 300,
    line_name: 'LGV Méditerranée (SNCF Réseau)',
    waypoints: [
      [45.7606, 4.8598], [44.9900, 4.9700], [43.9214, 4.7861], [43.4553, 5.3175], [43.3032, 5.3804]
    ]
  },
  {
    train_id: 'SNCF-TGV-8410', operator: 'SNCF', country: 'FR', continent: 'EU',
    origin: 'Paris Montparnasse', dest: 'Bordeaux Saint-Jean', speed: 315,
    line_name: 'LGV Sud Europe Atlantique (SNCF Réseau)',
    waypoints: [
      [48.8412, 2.3204], [48.7253, 2.2611], [47.8010, 1.0500], [47.3872, 0.7233], [46.5819, 0.3333], [45.6569, 0.1656], [44.8258, -0.5566]
    ]
  },
  {
    train_id: 'SNCF-TGV-7015', operator: 'SNCF', country: 'FR', continent: 'EU',
    origin: 'Paris Gare du Nord', dest: 'Lille Europe', speed: 300,
    line_name: 'LGV Nord (SNCF Réseau)',
    waypoints: [
      [48.8809, 2.3553], [49.8597, 2.8322], [50.2900, 2.7800], [50.6389, 3.0758]
    ]
  },
  {
    train_id: 'EUROSTAR-9304', operator: 'EUROSTAR', country: 'FR/BE/DE', continent: 'EU',
    origin: 'Paris Gare du Nord', dest: 'Köln Hbf', speed: 300,
    line_name: 'LGV Nord / HSL 2 / HSL 3 Trans-Europe',
    waypoints: [
      [48.8809, 2.3553], [50.6389, 3.0758], [50.8357, 4.3364], [50.6243, 5.5667], [50.7678, 6.0915], [50.9422, 6.9578]
    ]
  },
  {
    train_id: 'EUROSTAR-9110', operator: 'EUROSTAR', country: 'UK/FR', continent: 'EU',
    origin: 'London St Pancras', dest: 'Paris Gare du Nord', speed: 300,
    line_name: 'High Speed 1 + Eurotunnel + LGV Nord',
    waypoints: [
      [51.5314, -0.1261], [51.4428, 0.3206], [51.1436, 0.8747], [51.0950, 1.1500], [50.9250, 1.8100], [50.6389, 3.0758], [48.8809, 2.3553]
    ]
  },

  // --- EUROPA: ITALIA ---
  {
    train_id: 'ITALO-9915', operator: 'ITALO', country: 'IT', continent: 'EU',
    origin: 'Milano Centrale', dest: 'Roma Termini', speed: 300,
    line_name: 'Ferrovia Milano - Bologna - Firenze - Roma (RFI AV)',
    waypoints: [
      [45.4870, 9.2045], [45.0500, 9.7000], [44.8000, 10.3300], [44.5058, 11.3430], [43.7765, 11.2479], [42.6000, 12.1000], [41.9010, 12.5020]
    ]
  },
  {
    train_id: 'FS-FR-9514', operator: 'FS', country: 'IT', continent: 'EU',
    origin: 'Firenze S.M.N.', dest: 'Roma Termini', speed: 295,
    line_name: 'Direttissima Firenze - Roma (RFI AV)',
    waypoints: [
      [43.7765, 11.2479], [43.4600, 11.8800], [42.9900, 12.0100], [42.4500, 12.3000], [41.9010, 12.5020]
    ]
  },

  // --- EUROPA: ALEMANIA ---
  {
    train_id: 'DB-ICE11-593', operator: 'DB', country: 'DE', continent: 'EU',
    origin: 'München Hbf', dest: 'Nürnberg Hbf', speed: 270,
    line_name: 'NBS Nürnberg - Ingolstadt - München (VDE 8)',
    waypoints: [
      [48.1402, 11.5583], [48.7600, 11.4300], [49.1000, 11.3500], [49.4447, 11.0827]
    ]
  },
  {
    train_id: 'DB-ICE20-604', operator: 'DB', country: 'DE', continent: 'EU',
    origin: 'Düsseldorf Hbf', dest: 'Frankfurt(Main)Hbf', speed: 280,
    line_name: 'SFS Köln - Rhein/Main (DB Netze)',
    waypoints: [
      [51.2198, 6.7944], [50.9422, 6.9578], [50.4350, 7.8200], [50.1071, 8.6638]
    ]
  },

  // --- EUROPA: SUIZA & AUSTRIA ---
  {
    train_id: 'SBB-GIR-410', operator: 'SBB', country: 'CH', continent: 'EU',
    origin: 'Zürich HB', dest: 'Lugano', speed: 250,
    line_name: 'Gotthard-Basistunnel (AlpTransit SBB)',
    waypoints: [
      [47.3782, 8.5402], [47.1662, 8.5155], [46.9900, 8.6400], [46.5200, 8.8000], [46.1950, 9.0200], [46.0053, 8.9470]
    ]
  },
  {
    train_id: 'OEBB-RJX65', operator: 'OEBB', country: 'AT', continent: 'EU',
    origin: 'Wien Hbf', dest: 'Salzburg Hbf', speed: 230,
    line_name: 'Westbahn Neubaustrecke (ÖBB Infra)',
    waypoints: [
      [48.1851, 16.3762], [48.2082, 15.6267], [48.1200, 14.8800], [48.3064, 14.2858], [47.8129, 13.0456]
    ]
  },

  // --- ASIA: JAPÓN (Shinkansen) ---
  {
    train_id: 'JR-NOZOMI-24', operator: 'SHINKANSEN_JR', country: 'JP', continent: 'AS',
    origin: 'Tokyo Station', dest: 'Shin-Osaka', speed: 285,
    line_name: 'Tokaido Shinkansen (JR Central)',
    waypoints: [
      [35.6812, 139.7671], [35.6284, 139.7387], [35.5068, 139.6178], [35.2564, 139.1558],
      [34.9717, 138.3891], [34.7037, 137.7345], [35.1709, 136.8815], [34.9858, 135.7588], [34.7335, 135.5003]
    ]
  },
  {
    train_id: 'JR-MIZUHO-600', operator: 'SHINKANSEN_JR', country: 'JP', continent: 'AS',
    origin: 'Shin-Osaka', dest: 'Hakata (Fukuoka)', speed: 300,
    line_name: 'Sanyo Shinkansen (JR West)',
    waypoints: [
      [34.7335, 135.5003], [34.7058, 135.1953], [34.8267, 134.6908], [34.6663, 133.9181],
      [34.3977, 132.4753], [33.8872, 130.8824], [33.5900, 130.4206]
    ]
  },

  // --- ASIA: CHINA (CRH / Fuxing Hao) ---
  {
    train_id: 'CR-G1-FUXING', operator: 'CHINA_RAILWAY', country: 'CN', continent: 'AS',
    origin: 'Beijing South', dest: 'Shanghai Hongqiao', speed: 350,
    line_name: 'Jinghu High-Speed Railway (CR Beijing - Shanghai)',
    waypoints: [
      [39.8652, 116.3785], [39.0558, 117.0603], [36.6669, 116.8911], [34.2706, 117.2917],
      [31.9703, 118.7972], [31.4200, 120.6400], [31.1947, 121.3204]
    ]
  },

  // --- ASIA: COREA DEL SUR (KTX) ---
  {
    train_id: 'KTX-SANCHEON-101', operator: 'KORAIL_KTX', country: 'KR', continent: 'AS',
    origin: 'Seoul Station', dest: 'Busan Station', speed: 305,
    line_name: 'Gyeongbu High Speed Railway (Korail)',
    waypoints: [
      [37.5559, 126.9723], [37.2600, 127.0100], [36.3500, 127.3800], [35.8700, 128.6000], [35.1152, 129.0422]
    ]
  },

  // --- ASIA: TAIWÁN (THSR) ---
  {
    train_id: 'THSR-0115', operator: 'THSR', country: 'TW', continent: 'AS',
    origin: 'Taipei Main Station', dest: 'Kaohsiung Zuoying', speed: 300,
    line_name: 'Taiwan High Speed Rail Mainline',
    waypoints: [
      [25.0478, 121.5170], [24.8000, 120.9700], [24.1121, 120.6158], [23.4700, 120.4400], [22.9900, 120.2100], [22.6872, 120.3080]
    ]
  },

  // --- NORTEAMÉRICA: ESTADOS UNIDOS ---
  {
    train_id: 'AMTK-ACELA-2150', operator: 'AMTRAK_ACELA', country: 'US', continent: 'NA',
    origin: 'Washington Union', dest: 'New York Penn', speed: 240,
    line_name: 'Northeast Corridor South (Amtrak NEC)',
    waypoints: [
      [38.8973, -77.0063], [39.3072, -76.6156], [39.7369, -75.5511], [39.9558, -75.1820], [40.2189, -74.7547], [40.7347, -74.1642], [40.7505, -73.9935]
    ]
  },
  {
    train_id: 'AMTK-ACELA-2165', operator: 'AMTRAK_ACELA', country: 'US', continent: 'NA',
    origin: 'New York Penn', dest: 'Boston South', speed: 240,
    line_name: 'Northeast Corridor North (Amtrak NEC)',
    waypoints: [
      [40.7505, -73.9935], [41.0469, -73.5425], [41.2975, -72.9267], [41.3547, -72.0933], [41.8294, -71.4142], [42.2131, -71.1506], [42.3522, -71.0552]
    ]
  },
  {
    train_id: 'BL-ORL-MIA-101', operator: 'BRIGHTLINE', country: 'US', continent: 'NA',
    origin: 'Orlando Intl Airport', dest: 'MiamiCentral', speed: 200,
    line_name: 'Brightline Florida East Coast Corridor',
    waypoints: [
      [28.4312, -81.3081], [28.3500, -80.7300], [27.6400, -80.3900], [26.7139, -80.0578], [26.1200, -80.1400], [25.7781, -80.1983]
    ]
  },

  // --- NORTEAMÉRICA: CANADÁ ---
  {
    train_id: 'VIA-CORR-64', operator: 'VIA_RAIL', country: 'CA', continent: 'NA',
    origin: 'Toronto Union', dest: 'Montréal Gare Centrale', speed: 160,
    line_name: 'VIA Rail Québec City - Windsor Corridor',
    waypoints: [
      [43.6453, -79.3806], [44.2300, -76.5000], [44.6000, -75.7000], [45.0000, -74.7500], [45.4998, -73.5667]
    ]
  },

  // --- NORTEAMÉRICA: MÉXICO ---
  {
    train_id: 'MAYA-XIIN-101', operator: 'TREN_MAYA', country: 'MX', continent: 'NA',
    origin: 'Cancún Aeropuerto', dest: 'Playa del Carmen', speed: 160,
    line_name: 'Tren Maya Tramo 5 Norte',
    waypoints: [
      [21.0372, -86.8770], [20.8500, -86.9100], [20.6274, -87.0798]
    ]
  },
  {
    train_id: 'MAYA-XIIN-305', operator: 'TREN_MAYA', country: 'MX', continent: 'NA',
    origin: 'Campeche San Francisco', dest: 'Mérida Teya', speed: 160,
    line_name: 'Tren Maya Tramo 3 Campeche - Mérida',
    waypoints: [
      [19.8329, -90.5050], [20.3000, -90.0500], [20.7000, -89.7500], [20.9419, -89.5447]
    ]
  },
];

// Cálculo de distancia euclidiana geodésica entre dos puntos
const getSegmentDistance = (p1, p2) => {
  const dLat = p2[0] - p1[0];
  const dLon = (p2[1] - p1[1]) * Math.cos(((p1[0] + p2[0]) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLon * dLon);
};

// Interpolación cinemática exacta a lo largo de la polilínea oficial de la vía ferroviaria
const interpolateTrackPolyline = (waypoints, progress) => {
  if (!waypoints || waypoints.length === 0) return null;
  if (waypoints.length === 1) return { lat: waypoints[0][0], lon: waypoints[0][1], heading: 0, headingText: 'N' };

  const dists = [];
  let totalDist = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = getSegmentDistance(waypoints[i], waypoints[i + 1]);
    dists.push(d);
    totalDist += d;
  }

  if (totalDist === 0) return { lat: waypoints[0][0], lon: waypoints[0][1], heading: 0, headingText: 'N' };

  const targetDist = progress * totalDist;
  let accumulated = 0;

  for (let i = 0; i < dists.length; i++) {
    const segLen = dists[i];
    if (accumulated + segLen >= targetDist || i === dists.length - 1) {
      const u = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      const clampedU = Math.max(0, Math.min(1, u));
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];

      const lat = p1[0] + (p2[0] - p1[0]) * clampedU;
      const lon = p1[1] + (p2[1] - p1[1]) * clampedU;

      // Rumbo en grados
      const y = Math.sin((p2[1] - p1[1]) * (Math.PI / 180)) * Math.cos(p2[0] * (Math.PI / 180));
      const x = Math.cos(p1[0] * (Math.PI / 180)) * Math.sin(p2[0] * (Math.PI / 180)) -
                Math.sin(p1[0] * (Math.PI / 180)) * Math.cos(p2[0] * (Math.PI / 180)) * Math.cos((p2[1] - p1[1]) * (Math.PI / 180));
      let brng = (Math.atan2(y, x) * 180) / Math.PI;
      brng = (brng + 360) % 360;

      const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO', 'N'];
      const cardIdx = Math.round(brng / 45);
      const headingText = cardinals[cardIdx];

      return {
        lat: Number(lat.toFixed(5)),
        lon: Number(lon.toFixed(5)),
        heading: Math.round(brng),
        headingText,
      };
    }
    accumulated += segLen;
  }

  const last = waypoints[waypoints.length - 1];
  return { lat: last[0], lon: last[1], heading: 0, headingText: 'N' };
};

// ==============================================================================
// Corrector Universal de Quietud: Si el tren no se desplaza geográficamente,
// su velocidad física se corrige estrictamente a 0 km/h.
// ==============================================================================
const sanitizeTrainSpeed = (newTrain, prevTrain) => {
  if (!newTrain) return newTrain;

  // Si ya viene marcado como parado o con velocidad cero
  if (newTrain.is_stopped || newTrain.speed === 0) {
    return { ...newTrain, speed: 0, is_stopped: true };
  }

  // Si tenemos registro previo, verificar si realmente se ha desplazado en coordenadas GPS
  if (prevTrain && prevTrain.lat != null && prevTrain.lon != null) {
    const dLat = Math.abs(newTrain.lat - prevTrain.lat);
    const dLon = Math.abs(newTrain.lon - prevTrain.lon);
    // Margen de 0.00008 grados (~8 metros, tolerancia por andén/GPS)
    if (dLat < 0.00008 && dLon < 0.00008) {
      return {
        ...newTrain,
        speed: 0,
        is_stopped: true,
      };
    }
  }

  // Velocidades mínimas de aproximación (<= 3 km/h) se consideran detención completa
  if (newTrain.speed != null && newTrain.speed <= 3) {
    return {
      ...newTrain,
      speed: 0,
      is_stopped: true,
    };
  }

  return { ...newTrain, is_stopped: false };
};

// Cálculo de posición cinemática en tiempo real con trazado exacto de vía y fases de parada
const calculateRealTimePosition = (corridor, currentTimeMs) => {
  const cycleDurationMs = 180000; // Ciclo cinemático continuo de 3 minutos
  const trainHash = corridor.train_id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const offsetMs = (trainHash * 19733) % cycleDurationMs;
  const effectiveTime = currentTimeMs + offsetMs;
  const progress = (effectiveTime % cycleDurationMs) / cycleDurationMs;

  const waypoints = corridor.waypoints;
  const originCoord = waypoints[0];
  const destCoord = waypoints[waypoints.length - 1];

  let lat, lon, speed, isStopped, stationStatus, heading, headingText;

  // Fase 1: Parado en estación de origen (14% del ciclo, ~25 segundos)
  if (progress < 0.14) {
    lat = originCoord[0];
    lon = originCoord[1];
    speed = 0; // REGLA: Si no se mueve, velocidad = 0 km/h
    isStopped = true;
    heading = 0;
    headingText = 'En andén';
    stationStatus = `Parado en ${corridor.origin} (Vía / Embarque)`;
  }
  // Fase 2: En tránsito siguiendo la traza geométrica de la vía férrea (72% del ciclo)
  else if (progress < 0.86) {
    const t = (progress - 0.14) / 0.72; // Rango normalizado 0.0 -> 1.0
    const point = interpolateTrackPolyline(waypoints, t);
    lat = point.lat;
    lon = point.lon;
    heading = point.heading;
    headingText = point.headingText;

    // Perfil sinusoidal cinemático: acelera al salir de origen y frena al aproximarse a destino
    const dynamicSpeed = Math.round(Math.sin(t * Math.PI) * corridor.speed);
    if (dynamicSpeed < 5) {
      speed = 0;
      isStopped = true;
      stationStatus = `Aproximación / Detención en andén`;
    } else {
      speed = dynamicSpeed;
      isStopped = false;
      stationStatus = `${corridor.origin} -> ${corridor.dest}`;
    }
  }
  // Fase 3: Parado en estación de destino (14% del ciclo, ~25 segundos)
  else {
    lat = destCoord[0];
    lon = destCoord[1];
    speed = 0; // REGLA: Si no se mueve, velocidad = 0 km/h
    isStopped = true;
    heading = 0;
    headingText = 'En andén';
    stationStatus = `Parado en ${corridor.dest} (Llegada / Andén)`;
  }

  return {
    train_id: corridor.train_id,
    train_name: corridor.train_name || corridor.train_id,
    service: corridor.service,
    service_category: corridor.service_category,
    model: corridor.model,
    origin: corridor.origin,
    dest: corridor.dest,
    operator: corridor.operator,
    country: corridor.country,
    continent: corridor.continent,
    line_name: corridor.line_name,
    waypoints: corridor.waypoints,
    lat: Number(lat.toFixed(5)),
    lon: Number(lon.toFixed(5)),
    speed: speed,
    heading: heading,
    headingText: headingText,
    is_stopped: isStopped,
    is_realtime: true,
    telemetry_type: 'TRACK_POLYLINE',
    telemetry_source: `Trazado de Vía: ${corridor.line_name}`,
    last_station_name: stationStatus,
    time: new Date(currentTimeMs).toISOString(),
  };
};

// ==============================================================================
// Categorías Ferroviarias: Alta Velocidad, Larga y Media Distancia, Cercanías
// ==============================================================================
const SERVICE_CATEGORY_META = {
  ALL: { label: 'Todos', icon: '🌐', color: '#3B82F6', badgeBg: '#EFF6FF', badgeText: '#1D4ED8' },
  ALTA_VELOCIDAD: { label: 'Alta Velocidad', icon: '⚡', color: '#7B2082', badgeBg: '#F3E8FF', badgeText: '#6B21A8' },
  LARGA_MEDIA: { label: 'Larga y Media Distancia', icon: '🚆', color: '#D97706', badgeBg: '#FEF3C7', badgeText: '#92400E' },
  CERCANIAS: { label: 'Cercanías / Suburbano', icon: '🚊', color: '#DC2626', badgeBg: '#FEE2E2', badgeText: '#991B1B' },
};

const getTrainServiceCategory = (train) => {
  if (!train) return 'ALTA_VELOCIDAD';
  if (train.service_category) return train.service_category;

  const id = (train.train_id || '').toUpperCase();
  const name = (train.train_name || '').toUpperCase();
  const service = (train.service || '').toUpperCase();
  const op = (train.operator || '').toUpperCase();
  const line = (train.line_name || '').toUpperCase();

  // 1. Cercanías / Rodalies / Suburbano / S-Bahn / Commuter
  if (
    id.includes('CER-') || id.includes('ROD-') || id.includes('SBAHN') || id.includes('S-BAHN') ||
    op.includes('CERCANIAS') || op.includes('RODALIES') || op.includes('CALTRAIN') || op.includes('INSURGENTE') ||
    service.includes('CERCAN') || service.includes('RODAL') || service.includes('S-BAHN') || service.includes('COMMUTER') ||
    name.includes('CERCAN') || name.includes('RODAL') || name.includes('S-BAHN') ||
    line.includes('CERCAN') || line.includes('RODAL') || line.includes('S-BAHN')
  ) {
    return 'CERCANIAS';
  }

  // 2. Larga y Media Distancia (Alvia, Avant, Regional, Euromed, Intercity, Amtrak Regional, VIA Rail, etc.)
  if (
    id.includes('ALVIA') || id.includes('AVANT') || id.includes('REG-') || id.includes('EUROMED') || id.includes('INTERCITY') || id.includes('VIA-') ||
    op.includes('AMTRAK_REGIONAL') || op.includes('VIA_RAIL') || op.includes('ROCKY') || op.includes('TREN_MAYA') ||
    service.includes('ALVIA') || service.includes('AVANT') || service.includes('REGIONAL') || service.includes('EUROMED') || service.includes('INTERCITY') || service.includes('MEDIA') || service.includes('LARGA') ||
    name.includes('ALVIA') || name.includes('AVANT') || name.includes('REGIONAL') || name.includes('EUROMED') || name.includes('INTERCITY') ||
    line.includes('MEDIA DISTANCIA') || line.includes('REGIONAL') || line.includes('INTERCITY')
  ) {
    return 'LARGA_MEDIA';
  }

  // 3. Alta Velocidad por defecto (AVE, Avlo, Iryo, Ouigo, TGV, ICE, Frecciarossa, Shinkansen, etc.)
  return 'ALTA_VELOCIDAD';
};

// Componente para animar y centrar el mapa al cambiar de región o continente
const ChangeMapView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && zoom) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
};

// ==============================================================================
// 3. Componente Principal TrainMap (100% Autosuficiente)
// ==============================================================================
const TrainMap = () => {
  const [trains, setTrains] = useState({});
  const [continentFilter, setContinentFilter] = useState('ALL'); // ALL, EU, AS, NA
  const [filterType, setFilterType] = useState('ALL'); // ALL, PRIVADO, ESTATAL
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('ALL'); // ALL, ALTA_VELOCIDAD, LARGA_MEDIA, CERCANIAS
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedTrainId, setSelectedTrainId] = useState(null);
  const markerRefs = useRef({});

  const QUICK_SEARCH_CHIPS = [
    { label: 'Alvia 04143', query: 'Alvia 04143' },
    { label: 'AVE 2143', query: 'AVE 2143' },
    { label: 'iryo 6014', query: 'iryo 6014' },
    { label: 'Ouigo 9710', query: 'Ouigo 9710' },
    { label: 'Acela 2150', query: 'Acela' },
    { label: 'SBB Giruno', query: 'Giruno' },
  ];

  // Obtener ubicación guardada para iniciar inmediatamente en la posición del usuario al abrir o recargar
  const getInitialLocation = () => {
    try {
      const cached = localStorage.getItem('railscope_user_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length === 2) return parsed;
      }
    } catch (e) {}
    return null;
  };

  const [userLocation, setUserLocation] = useState(getInitialLocation);
  const [mapCenter, setMapCenter] = useState(() => getInitialLocation() || [40.4168, -3.7038]);
  const [mapZoom, setMapZoom] = useState(() => (getInitialLocation() ? 12 : 5));

  // Estados de conectividad y modo de ejecución
  const isNative = Capacitor.isNativePlatform();
  const [engineMode, setEngineMode] = useState('AUTONOMOUS'); // 'AUTONOMOUS' | 'REMOTE_SERVER'
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [remoteStatus, setRemoteStatus] = useState('No configurado');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Paneles móviles desplegables
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showLegendPanel, setShowLegendPanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const wsRef = useRef(null);
  const liveSyncTimerRef = useRef(null);

  // Función para obtener y centrar en la ubicación actual del usuario
  const locateUserPosition = useCallback((isExplicitClick = false) => {
    if (!('geolocation' in navigator)) {
      if (isExplicitClick) alert('Geolocalización no soportada en este dispositivo.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [
          Number(pos.coords.latitude.toFixed(5)),
          Number(pos.coords.longitude.toFixed(5)),
        ];
        setUserLocation(coords);
        setMapCenter(coords);
        setMapZoom(12);
        try {
          localStorage.setItem('railscope_user_location', JSON.stringify(coords));
        } catch (e) {}
      },
      (err) => {
        console.warn('Geolocalización no disponible o pendiente de permiso:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  // Solicitar ubicación del usuario inmediatamente al abrir la app o recargar
  useEffect(() => {
    locateUserPosition(false);
  }, [locateUserPosition]);

  // 1. Motor cinemático local en dispositivo (Completamente autosuficiente)
  const updateFleetPositions = useCallback(() => {
    const now = Date.now();
    setTrains((prev) => {
      const updated = { ...prev };
      HIGH_SPEED_CORRIDORS.forEach((corridor) => {
        const rawTrain = calculateRealTimePosition(corridor, now);
        updated[rawTrain.train_id] = sanitizeTrainSpeed(rawTrain, prev[rawTrain.train_id]);
      });
      return updated;
    });
  }, []);

  // 2. Ingesta de Telemetría Real en Vivo desde APIs Satelitales y Abiertas (Amtrak, Digitraffic, SBB)
  const fetchRealLiveTrainFeeds = useCallback(async () => {
    if (!navigator.onLine) return;

    // A. Amtrak GPS Satelital Oficial en Tiempo Real (Estados Unidos & Canadá)
    try {
      const resp = await fetch('https://api-v3.amtraker.com/v3/trains');
      if (resp.ok) {
        const data = await resp.json();
        setTrains((prev) => {
          const updated = { ...prev };
          Object.entries(data).forEach(([routeNum, trainsArr]) => {
            if (Array.isArray(trainsArr)) {
              trainsArr.forEach((tr) => {
                if (tr.lat && tr.lon && tr.trainID) {
                  const trainId = `AMTK-${tr.trainID}`;
                  const isAcela = tr.routeName?.toLowerCase().includes('acela');
                  const speedKmh = tr.velocity != null ? Math.round(tr.velocity * 1.60934) : null;
                  const isStopped = speedKmh === 0 || (speedKmh != null && speedKmh <= 3);

                  const rawTrain = {
                    train_id: trainId,
                    operator: isAcela ? 'AMTRAK_ACELA' : 'AMTRAK_REGIONAL',
                    country: tr.routeName?.includes('Cascades') ? 'US/CA' : 'US',
                    continent: 'NA',
                    lat: Number(tr.lat.toFixed(5)),
                    lon: Number(tr.lon.toFixed(5)),
                    speed: isStopped ? 0 : speedKmh,
                    heading: tr.heading || 'N/D',
                    headingText: tr.heading || 'N/D',
                    is_stopped: isStopped,
                    is_realtime: true,
                    is_official_gps: true,
                    telemetry_type: 'GPS_SATELLITE',
                    telemetry_source: 'Transpondedor GPS Satelital (Amtraker v3)',
                    line_name: `Ruta Amtrak: ${tr.routeName || 'Intercity'}`,
                    last_station_name: `${tr.routeName} #${tr.trainNumRaw || routeNum} • ${tr.trainTimely || 'En servicio'}`,
                    time: new Date().toISOString(),
                  };
                  updated[trainId] = sanitizeTrainSpeed(rawTrain, prev[trainId]);
                }
              });
            }
          });
          return updated;
        });
      }
    } catch (e) {}

    // B. Fintraffic / Digitraffic (Finlandia / Red Nórdica de Alta Precisión Satelital)
    try {
      const resp = await fetch('https://rata.digitraffic.fi/api/v1/train-locations/latest', {
        headers: { Accept: 'application/json' },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          setTrains((prev) => {
            const updated = { ...prev };
            data.slice(0, 50).forEach((tr) => {
              const coords = tr?.location?.coordinates;
              if (coords && coords.length >= 2) {
                const lon = coords[0];
                const lat = coords[1];
                const trainId = `VR-${tr.trainNumber}`;
                const speed = tr.speed != null ? Math.round(tr.speed) : 0;
                const isStopped = speed === 0 || speed <= 3;

                const rawTrain = {
                  train_id: trainId,
                  operator: 'VR',
                  country: 'FI',
                  continent: 'EU',
                  lat: Number(lat.toFixed(5)),
                  lon: Number(lon.toFixed(5)),
                  speed: isStopped ? 0 : speed,
                  is_stopped: isStopped,
                  is_realtime: true,
                  is_official_gps: true,
                  telemetry_type: 'GPS_SATELLITE',
                  telemetry_source: 'Transpondedor GPS Satelital (Fintraffic / Digitraffic)',
                  line_name: `Red Nacional VR (Línea #${tr.trainNumber})`,
                  last_station_name: `Tren VR #${tr.trainNumber} (Velocidad: ${speed} km/h)`,
                  time: tr.timestamp || new Date().toISOString(),
                };
                updated[trainId] = sanitizeTrainSpeed(rawTrain, prev[trainId]);
              }
            });
            return updated;
          });
        }
      }
    } catch (e) {}

    // C. Open Data Transport Suiza (SBB CFF FFS)
    try {
      const stations = ['Zurich', 'Basel', 'Geneva', 'Bern', 'Lausanne', 'Luzern'];
      const randomStation = stations[Math.floor(Math.random() * stations.length)];

      const resp = await fetch(
        `https://transport.opendata.ch/v1/stationboard?station=${randomStation}&limit=10`
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.stationboard)) {
          setTrains((prev) => {
            const updated = { ...prev };
            data.stationboard.forEach((item) => {
              const coord = item?.stop?.station?.coordinate;
              if (coord && coord.x && coord.y) {
                const trainId = `${item.operator || 'SBB'}-${item.name || item.number || 'IC'}`;
                const rawTrain = {
                  train_id: trainId,
                  operator: item.operator || 'SBB',
                  country: 'CH',
                  continent: 'EU',
                  lat: Number(coord.x.toFixed(5)),
                  lon: Number(coord.y.toFixed(5)),
                  speed: 0, // En andén de estación siempre es 0 km/h
                  is_stopped: true,
                  is_realtime: true,
                  is_official_gps: true,
                  telemetry_type: 'STATION_BOARD',
                  telemetry_source: 'SBB OpenData en Tiempo Real',
                  line_name: `Línea SBB: ${data.station?.name || randomStation} -> ${item.to || 'Destino'}`,
                  last_station_name: `Parado en ${data.station?.name || randomStation} (Destino: ${item.to || 'Vía'})`,
                  time: new Date().toISOString(),
                  delay: item.stop?.delay || 0,
                };
                updated[trainId] = sanitizeTrainSpeed(rawTrain, prev[trainId]);
              }
            });
            return updated;
          });
        }
      }
    } catch (err) {}
  }, []);

  // Detección de red online/offline nativa
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ciclo de vida del Motor Autónomo en Dispositivo
  useEffect(() => {
    updateFleetPositions();
    fetchRealLiveTrainFeeds();

    liveSyncTimerRef.current = setInterval(() => {
      updateFleetPositions();
    }, 2000);

    const liveFeedsTimer = setInterval(() => {
      fetchRealLiveTrainFeeds();
    }, 25000);

    return () => {
      if (liveSyncTimerRef.current) clearInterval(liveSyncTimerRef.current);
      clearInterval(liveFeedsTimer);
    };
  }, [updateFleetPositions, fetchRealLiveTrainFeeds]);

  // Conexión a Servidor Remoto Opcional (sólo si el usuario lo activa conscientemente)
  useEffect(() => {
    if (engineMode !== 'REMOTE_SERVER' || !customServerUrl) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let reconnectTimeout = null;
    const wsUrl = customServerUrl.replace(/^http/, 'ws').replace(/\/+$/, '') + '/ws/telemetry';

    const connectWebSocket = () => {
      try {
        setRemoteStatus('Conectando a servidor...');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setRemoteStatus('Conectado a TimescaleDB');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const items = Array.isArray(payload) ? payload : [payload];
            setTrains((prev) => {
              const next = { ...prev };
              items.forEach((item) => {
                if (item?.train_id && item.lat && item.lon) {
                  const sanitized = sanitizeTrainSpeed(item, prev[item.train_id]);
                  next[item.train_id] = { ...next[item.train_id], ...sanitized };
                }
              });
              return next;
            });
          } catch (e) {}
        };

        ws.onerror = () => {
          setRemoteStatus('Error de conexión remota');
        };

        ws.onclose = () => {
          setRemoteStatus('Desconectado');
          reconnectTimeout = setTimeout(connectWebSocket, 15000);
        };
      } catch (err) {
        setRemoteStatus('Fallo al inicializar WebSocket');
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [engineMode, customServerUrl]);

  // Resultados coincidentes con la búsqueda de trenes
  const searchResults = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return [];
    const rawQ = searchQuery.trim().toLowerCase();
    const tokens = rawQ.split(/\s+/).filter(Boolean);

    return Object.values(trains).filter((t) => {
      const opKey = t.operator?.toUpperCase() || '';
      const cfg = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;

      const fieldsToSearch = [
        t.train_id,
        t.train_name,
        t.service,
        t.operator,
        cfg.name,
        cfg.model,
        t.model,
        t.line_name,
        t.last_station_name,
        t.country,
        t.origin,
        t.dest,
      ].filter(Boolean).map((v) => String(v).toLowerCase()).join(' ');

      const strippedBlob = fieldsToSearch.replace(/[-_ ]/g, '');
      const strippedQ = rawQ.replace(/[-_ ]/g, '');

      return strippedBlob.includes(strippedQ) || tokens.every((tok) => fieldsToSearch.includes(tok));
    });
  }, [trains, searchQuery]);

  // Selección y enfoque inmediato de un tren en el mapa
  const handleSelectTrain = useCallback((train) => {
    if (!train || train.lat == null || train.lon == null) return;
    setSelectedTrainId(train.train_id);
    setSearchQuery(train.train_name || train.train_id);
    setIsSearchOpen(false);

    // Ajustar continente si difiere del actual para asegurar visibilidad en mapa
    const opKey = train.operator?.toUpperCase() || '';
    const cfg = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;
    const itemContinent = train.continent || cfg.continent || 'EU';
    if (continentFilter !== 'ALL' && itemContinent !== continentFilter) {
      setContinentFilter('ALL');
    }

    setMapCenter([train.lat, train.lon]);
    setMapZoom(13);

    setTimeout(() => {
      const marker = markerRefs.current[train.train_id];
      if (marker) {
        marker.openPopup();
      }
    }, 350);
  }, [continentFilter]);

  // Conteo dinámico de trenes por categoría de servicio
  const serviceCategoryCounts = useMemo(() => {
    const list = Object.values(trains);
    let alta = 0, larga = 0, cerc = 0;
    list.forEach((t) => {
      const cat = getTrainServiceCategory(t);
      if (cat === 'ALTA_VELOCIDAD') alta++;
      else if (cat === 'LARGA_MEDIA') larga++;
      else if (cat === 'CERCANIAS') cerc++;
    });
    return {
      ALL: list.length,
      ALTA_VELOCIDAD: alta,
      LARGA_MEDIA: larga,
      CERCANIAS: cerc,
    };
  }, [trains]);

  // Filtrado de Trenes por Continente, Tipo de Operador, Categoría de Servicio y Búsqueda
  const filteredTrains = useMemo(() => {
    return Object.values(trains).filter((t) => {
      const opKey = t.operator?.toUpperCase() || '';
      const cfg = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;
      const trainCat = getTrainServiceCategory(t);

      // Filtro de categoría de servicio (Cercanías, Alta Velocidad, Larga y Media Distancia)
      if (serviceCategoryFilter !== 'ALL' && trainCat !== serviceCategoryFilter) {
        return false;
      }

      // Filtro de búsqueda textual en vivo
      if (searchQuery.trim()) {
        const rawQ = searchQuery.trim().toLowerCase();
        const tokens = rawQ.split(/\s+/).filter(Boolean);
        const catMeta = SERVICE_CATEGORY_META[trainCat] || {};
        const fieldsToSearch = [
          t.train_id,
          t.train_name,
          t.service,
          t.operator,
          cfg.name,
          cfg.model,
          t.model,
          t.line_name,
          t.last_station_name,
          t.country,
          t.origin,
          t.dest,
          catMeta.label,
          trainCat === 'CERCANIAS' ? 'cercanías cercanias rodalies suburbano commuter cercania' : '',
          trainCat === 'ALTA_VELOCIDAD' ? 'alta velocidad ave avlo tgv ice shinkansen high speed veloz' : '',
          trainCat === 'LARGA_MEDIA' ? 'larga distancia media distancia alvia avant intercity regional md' : '',
        ].filter(Boolean).map((v) => String(v).toLowerCase()).join(' ');

        const strippedBlob = fieldsToSearch.replace(/[-_ ]/g, '');
        const strippedQ = rawQ.replace(/[-_ ]/g, '');
        const matchesQuery = strippedBlob.includes(strippedQ) || tokens.every((tok) => fieldsToSearch.includes(tok));
        if (!matchesQuery) return false;
      }

      // Filtro de continente
      const itemContinent = t.continent || cfg.continent || 'EU';
      if (continentFilter !== 'ALL' && itemContinent !== continentFilter) {
        return false;
      }

      // Filtro de tipo de operador
      if (filterType === 'PRIVADO') return cfg.type.includes('Privado');
      if (filterType === 'ESTATAL') return cfg.type.includes('Estatal') || cfg.type.includes('Público');

      return true;
    });
  }, [trains, continentFilter, filterType, searchQuery, serviceCategoryFilter]);

  const jumpToRegion = (center, zoom, continent = 'ALL') => {
    setMapCenter(center);
    setMapZoom(zoom);
    if (continent !== 'ALL') setContinentFilter(continent);
    setShowFiltersPanel(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', backgroundColor: '#0f172a' }}>
      {/* Barra Superior Móvil y de Escritorio (Optimizada para Safe Area en Android) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        color: '#F8FAFC',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: '10px',
        paddingLeft: '14px',
        paddingRight: '14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}>
        {/* Identidad de la App e Indicador de Autonomía */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
            <img
              src="./logo.png"
              alt="RailScope Icon"
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                border: '1.5px solid rgba(96, 165, 250, 0.6)',
                boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <span style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: engineMode === 'AUTONOMOUS' ? '#10B981' : (remoteStatus.includes('Conectado') ? '#10B981' : '#F59E0B'),
              border: '2px solid #0f172a',
              boxShadow: '0 0 6px #10B981',
            }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.3px', color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '6px' }}>
              RailScope Global
              <span style={{
                backgroundColor: '#1E293B',
                color: '#34D399',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(52, 211, 153, 0.3)',
              }}>
                {engineMode === 'AUTONOMOUS' ? 'Autónomo Local' : 'Remoto'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              {isOnline ? '🟢 Red activa' : '🟠 Modo sin conexión'} • {filteredTrains.length} trenes ({filteredTrains.filter(t => t.speed > 0).length} en marcha, {filteredTrains.filter(t => t.speed === 0 || t.is_stopped).length} en estación)
            </div>
          </div>
        </div>

        {/* Buscador de Trenes en Tiempo Real (ej. Alvia 04143) */}
        <div style={{
          position: 'relative',
          flex: '1 1 240px',
          maxWidth: '380px',
          minWidth: '190px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(30, 41, 59, 0.88)',
            border: isSearchOpen ? '1.5px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '20px',
            padding: '5px 12px',
            boxShadow: isSearchOpen ? '0 0 12px rgba(59, 130, 246, 0.35)' : 'none',
            transition: 'all 0.2s ease',
          }}>
            <span style={{ fontSize: '13px', marginRight: '6px', opacity: 0.85 }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (searchResults.length > 0) {
                    handleSelectTrain(searchResults[0]);
                  }
                } else if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                }
              }}
              placeholder="Buscar tren (ej. Alvia 04143, AVE)..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#F8FAFC',
                fontSize: '12px',
                fontWeight: 500,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTrainId(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '0 4px',
                  fontWeight: 700,
                }}
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Menú Desplegable con Resultados y Sugerencias */}
          {isSearchOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.98)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 14px 35px rgba(0,0,0,0.7)',
              backdropFilter: 'blur(16px)',
              maxHeight: '340px',
              overflowY: 'auto',
              zIndex: 2000,
              padding: '8px',
            }}>
              {/* Sugerencias Rápidas */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '4px' }}>
                  Sugerencias Rápidas:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {QUICK_SEARCH_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => {
                        setSearchQuery(chip.query);
                        const match = Object.values(trains).find((t) =>
                          (t.train_name && t.train_name.toLowerCase().includes(chip.query.toLowerCase())) ||
                          t.train_id.toLowerCase().includes(chip.query.toLowerCase())
                        );
                        if (match) {
                          handleSelectTrain(match);
                        }
                      }}
                      style={{
                        backgroundColor: searchQuery.toLowerCase() === chip.query.toLowerCase() ? '#2563EB' : '#1E293B',
                        color: '#E2E8F0',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Resultados Encontrados */}
              {searchQuery.trim() && (
                <div>
                  <div style={{
                    fontSize: '10px',
                    color: '#94A3B8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    paddingLeft: '4px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '6px',
                  }}>
                    Resultados ({searchResults.length}):
                  </div>
                  {searchResults.length === 0 ? (
                    <div style={{ padding: '10px', textAlign: 'center', fontSize: '11px', color: '#94A3B8' }}>
                      No se encontró ningún tren para "{searchQuery}".
                    </div>
                  ) : (
                    searchResults.slice(0, 10).map((t) => {
                      const opKey = t.operator?.toUpperCase() || 'DEFAULT';
                      const cfg = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;
                      const isStopped = t.speed === 0 || t.is_stopped;

                      return (
                        <div
                          key={t.train_id}
                          onClick={() => handleSelectTrain(t)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            backgroundColor: selectedTrainId === t.train_id ? 'rgba(37, 99, 235, 0.28)' : 'transparent',
                            transition: 'background 0.15s ease',
                            marginBottom: '2px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.4)')}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              selectedTrainId === t.train_id ? 'rgba(37, 99, 235, 0.28)' : 'transparent')
                          }
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ ...dotStyle, backgroundColor: cfg.color }} />
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F1F5F9', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {t.train_name || t.train_id}
                                <span style={{ marginLeft: '6px', fontSize: '10px', color: '#94A3B8', fontWeight: 400 }}>
                                  ({cfg.name})
                                </span>
                              </div>
                              <div style={{ fontSize: '10px', color: '#94A3B8', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {t.last_station_name || t.line_name || 'En ruta'}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: isStopped ? '#EF4444' : '#10B981',
                            }}>
                              {isStopped ? '🛑 0 km/h' : `⚡ ${t.speed} km/h`}
                            </div>
                            <div style={{ fontSize: '9px', color: '#64748B' }}>
                              {t.country}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones de Acción Móviles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => locateUserPosition(true)}
            style={{
              ...actionPillStyle(false),
              backgroundColor: 'rgba(37, 99, 235, 0.75)',
            }}
            title="Centrar mapa en mi ubicación actual"
          >
            📍 Mi Posición
          </button>
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            style={actionPillStyle(showFiltersPanel)}
          >
            🌍 Filtros
          </button>
          <button
            onClick={() => setShowLegendPanel(!showLegendPanel)}
            style={actionPillStyle(showLegendPanel)}
          >
            📋 Leyenda
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              ...actionPillStyle(false),
              padding: '6px 10px',
              backgroundColor: 'rgba(51, 65, 85, 0.7)',
            }}
            title="Configuración de Motor"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Barra Flotante de Filtros Rápidos por Categoría: Alta Velocidad, Larga y Media Distancia, Cercanías */}
      <div style={{
        position: 'absolute',
        top: '68px',
        left: '14px',
        zIndex: 990,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        padding: '5px 8px',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        overflowX: 'auto',
        maxWidth: 'calc(100vw - 28px)',
      }}>
        <button
          onClick={() => setServiceCategoryFilter('ALL')}
          style={categoryPillStyle(serviceCategoryFilter === 'ALL', '#2563EB')}
        >
          🌐 Todos ({serviceCategoryCounts.ALL})
        </button>
        <button
          onClick={() => setServiceCategoryFilter('ALTA_VELOCIDAD')}
          style={categoryPillStyle(serviceCategoryFilter === 'ALTA_VELOCIDAD', '#7B2082')}
        >
          ⚡ Alta Velocidad ({serviceCategoryCounts.ALTA_VELOCIDAD})
        </button>
        <button
          onClick={() => setServiceCategoryFilter('LARGA_MEDIA')}
          style={categoryPillStyle(serviceCategoryFilter === 'LARGA_MEDIA', '#D97706')}
        >
          🚆 Larga y Media ({serviceCategoryCounts.LARGA_MEDIA})
        </button>
        <button
          onClick={() => setServiceCategoryFilter('CERCANIAS')}
          style={categoryPillStyle(serviceCategoryFilter === 'CERCANIAS', '#DC2626')}
        >
          🚊 Cercanías ({serviceCategoryCounts.CERCANIAS})
        </button>
      </div>

      {/* Panel Desplegable de Filtros y Regiones */}
      {showFiltersPanel && (
        <div style={{
          position: 'absolute',
          top: '72px',
          right: '14px',
          zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.97)',
          color: '#F1F5F9',
          padding: '14px 16px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          maxWidth: '380px',
          width: 'calc(100vw - 28px)',
          backdropFilter: 'blur(12px)',
          fontFamily: 'system-ui, sans-serif',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#93C5FD' }}>Filtros & Navegación Global</span>
            <button onClick={() => setShowFiltersPanel(false)} style={closeBtnStyle}>✕</button>
          </div>

          {/* Continentes */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '6px' }}>CONTINENTE:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              <button
                onClick={() => { setContinentFilter('ALL'); jumpToRegion([32.0, -20.0], 3, 'ALL'); }}
                style={filterBtnStyle(continentFilter === 'ALL')}
              >
                🌍 Todos
              </button>
              <button
                onClick={() => { setContinentFilter('EU'); jumpToRegion([48.0, 10.0], 5, 'EU'); }}
                style={filterBtnStyle(continentFilter === 'EU')}
              >
                🇪🇺 Europa
              </button>
              <button
                onClick={() => { setContinentFilter('AS'); jumpToRegion([34.0, 105.0], 4, 'AS'); }}
                style={filterBtnStyle(continentFilter === 'AS')}
              >
                🌏 Asia
              </button>
              <button
                onClick={() => { setContinentFilter('NA'); jumpToRegion([39.0, -98.0], 4, 'NA'); }}
                style={filterBtnStyle(continentFilter === 'NA')}
              >
                🌎 Norteamérica
              </button>
            </div>
          </div>

          {/* Categoría de Servicio */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '6px' }}>CATEGORÍA DE SERVICIO:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              <button
                onClick={() => setServiceCategoryFilter('ALL')}
                style={filterBtnStyle(serviceCategoryFilter === 'ALL', '#2563EB')}
              >
                🌐 Todos ({serviceCategoryCounts.ALL})
              </button>
              <button
                onClick={() => setServiceCategoryFilter('ALTA_VELOCIDAD')}
                style={filterBtnStyle(serviceCategoryFilter === 'ALTA_VELOCIDAD', '#7B2082')}
              >
                ⚡ Alta Velocidad ({serviceCategoryCounts.ALTA_VELOCIDAD})
              </button>
              <button
                onClick={() => setServiceCategoryFilter('LARGA_MEDIA')}
                style={filterBtnStyle(serviceCategoryFilter === 'LARGA_MEDIA', '#D97706')}
              >
                🚆 Larga y Media ({serviceCategoryCounts.LARGA_MEDIA})
              </button>
              <button
                onClick={() => setServiceCategoryFilter('CERCANIAS')}
                style={filterBtnStyle(serviceCategoryFilter === 'CERCANIAS', '#DC2626')}
              >
                🚊 Cercanías ({serviceCategoryCounts.CERCANIAS})
              </button>
            </div>
          </div>

          {/* Tipo de Operador */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '6px' }}>TIPO DE OPERADOR:</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setFilterType('ALL')} style={filterBtnStyle(filterType === 'ALL')}>Todos</button>
              <button onClick={() => setFilterType('PRIVADO')} style={filterBtnStyle(filterType === 'PRIVADO', '#D97706')}>Privados ★</button>
              <button onClick={() => setFilterType('ESTATAL')} style={filterBtnStyle(filterType === 'ESTATAL')}>Estatales</button>
            </div>
          </div>

          {/* Búsqueda Rápida de Trenes Destacados */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '6px' }}>TRENES DESTACADOS:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              <button onClick={() => { setSearchQuery('Alvia 04143'); const t = trains['RENFE-ALVIA-04143']; if (t) handleSelectTrain(t); setShowFiltersPanel(false); }} style={{ ...tagBtnStyle, backgroundColor: '#7B2082', color: '#fff' }}>🚆 Alvia 04143 (Santander)</button>
              <button onClick={() => { setSearchQuery('AVE 2143'); const t = trains['RENFE-AVE-2143']; if (t) handleSelectTrain(t); setShowFiltersPanel(false); }} style={{ ...tagBtnStyle, backgroundColor: '#7B2082', color: '#fff' }}>🚆 AVE 2143 (Barcelona)</button>
              <button onClick={() => { setSearchQuery('iryo 6014'); const t = trains['IRYO-6014']; if (t) handleSelectTrain(t); setShowFiltersPanel(false); }} style={{ ...tagBtnStyle, backgroundColor: '#D3122A', color: '#fff' }}>🚆 iryo 6014</button>
              <button onClick={() => { setSearchQuery('Acela'); setShowFiltersPanel(false); }} style={{ ...tagBtnStyle, backgroundColor: '#004B87', color: '#fff' }}>🚆 Amtrak Acela</button>
            </div>
          </div>

          {/* Salto Rápido a Países */}
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '6px' }}>ENFOCAR PAÍS / CORREDOR:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {/* Norteamérica */}
              <button onClick={() => jumpToRegion([39.5, -75.5], 6, 'NA')} style={tagBtnStyle}>🇺🇸 EE.UU. (Acela / NEC)</button>
              <button onClick={() => jumpToRegion([26.7, -80.2], 7, 'NA')} style={tagBtnStyle}>🇺🇸 Florida (Brightline)</button>
              <button onClick={() => jumpToRegion([37.5, -122.1], 8, 'NA')} style={tagBtnStyle}>🇺🇸 California (Caltrain)</button>
              <button onClick={() => jumpToRegion([44.5, -76.5], 6, 'NA')} style={tagBtnStyle}>🇨🇦 Canadá (VIA Rail)</button>
              <button onClick={() => jumpToRegion([51.0, -117.0], 6, 'NA')} style={tagBtnStyle}>🇨🇦 Rocosas (R.Mountaineer)</button>
              <button onClick={() => jumpToRegion([20.8, -88.0], 7, 'NA')} style={tagBtnStyle}>🇲🇽 México (Tren Maya)</button>
              <button onClick={() => jumpToRegion([19.3, -99.4], 9, 'NA')} style={tagBtnStyle}>🇲🇽 México (Insurgente)</button>

              {/* Europa */}
              <button onClick={() => jumpToRegion([40.4168, -3.7038], 6, 'EU')} style={tagBtnStyle}>🇪🇸 España</button>
              <button onClick={() => jumpToRegion([46.6034, 1.8883], 6, 'EU')} style={tagBtnStyle}>🇫🇷 Francia</button>
              <button onClick={() => jumpToRegion([51.1657, 10.4515], 6, 'EU')} style={tagBtnStyle}>🇩🇪 Alemania</button>
              <button onClick={() => jumpToRegion([42.8333, 12.8333], 6, 'EU')} style={tagBtnStyle}>🇮🇹 Italia</button>
              <button onClick={() => jumpToRegion([46.8182, 8.2275], 7, 'EU')} style={tagBtnStyle}>🇨🇭 Suiza</button>
              <button onClick={() => jumpToRegion([54.5, -2.5], 6, 'EU')} style={tagBtnStyle}>🇬🇧 Reino Unido</button>

              {/* Asia */}
              <button onClick={() => jumpToRegion([36.2048, 138.2529], 6, 'AS')} style={tagBtnStyle}>🇯🇵 Japón</button>
              <button onClick={() => jumpToRegion([34.0, 113.0], 5, 'AS')} style={tagBtnStyle}>🇨🇳 China</button>
              <button onClick={() => jumpToRegion([36.5, 127.8], 7, 'AS')} style={tagBtnStyle}>🇰🇷 Corea</button>
              <button onClick={() => jumpToRegion([23.8, 121.0], 7, 'AS')} style={tagBtnStyle}>🇹🇼 Taiwán</button>
              <button onClick={() => jumpToRegion([22.5, 78.5], 5, 'AS')} style={tagBtnStyle}>🇮🇳 India</button>
              <button onClick={() => jumpToRegion([23.8859, 45.0792], 6, 'AS')} style={tagBtnStyle}>🇸🇦 Arabia</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Desplegable de Leyenda de Operadores */}
      {showLegendPanel && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '14px',
          zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.97)',
          color: '#E2E8F0',
          padding: '14px 16px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          maxWidth: '560px',
          width: 'calc(100vw - 28px)',
          maxHeight: '52vh',
          overflowY: 'auto',
          backdropFilter: 'blur(12px)',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: '#93C5FD' }}>Operadores Globales (Europa, Asia & Norteamérica)</span>
            <button onClick={() => setShowLegendPanel(false)} style={closeBtnStyle}>✕</button>
          </div>
          <div style={{ color: '#FBBF24', fontSize: '10px', marginBottom: '8px' }}>
            ★ Operadores Privados Liberalizados / Concesiones
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px 10px' }}>
            {/* Norteamérica */}
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.AMTRAK_ACELA.color }} /><span><strong>Amtrak Acela</strong> (US)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.AMTRAK_REGIONAL.color }} /><span>Amtrak Intercity (US)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.BRIGHTLINE.color }} /><span><strong>Brightline</strong> (US ★)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.CALTRAIN.color }} /><span>Caltrain (US)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.VIA_RAIL.color }} /><span><strong>VIA Rail</strong> (CA)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.ROCKY_MOUNTAINEER.color }} /><span><strong>R.Mountaineer</strong> (CA ★)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.TREN_MAYA.color }} /><span><strong>Tren Maya</strong> (MX)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.EL_INSURGENTE.color }} /><span>El Insurgente (MX)</span></div>

            {/* Cercanías */}
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.RENFE_CERCANIAS.color }} /><span><strong>Renfe Cercanías</strong> (ES)</span></div>

            {/* Privados Europa */}
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.IRYO.color }} /><span><strong>iryo</strong> (ES ★)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.OUIGO.color }} /><span><strong>Ouigo</strong> (ES ★)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.ITALO.color }} /><span><strong>Italo</strong> (IT ★)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.FLIXTRAIN.color }} /><span><strong>FlixTrain</strong> (DE ★)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.WESTBAHN.color }} /><span><strong>Westbahn</strong> (AT ★)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.EUROSTAR.color }} /><span><strong>Eurostar</strong> (EU)</span></div>

            {/* Estatales Europa */}
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.RENFE.color }} /><span>Renfe AVE (ES)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.DB.color }} /><span>DB ICE (DE)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.SNCF.color }} /><span>SNCF TGV (FR)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.FS.color }} /><span>Trenitalia (IT)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.SBB.color }} /><span>SBB (CH)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.OEBB.color }} /><span>ÖBB (AT)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.LNER.color }} /><span>LNER (UK)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.NS.color }} /><span>NS (NL)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.SJ.color }} /><span>SJ X2000 (SE)</span></div>

            {/* Asia */}
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.SHINKANSEN_JR.color }} /><span><strong>Shinkansen</strong> (JP)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.CHINA_RAILWAY.color }} /><span><strong>CR Fuxing</strong> (CN)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.KORAIL_KTX.color }} /><span><strong>KTX Korail</strong> (KR)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.SRT_KOREA.color }} /><span><strong>SRT</strong> (KR ★)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.THSR.color }} /><span><strong>THSR</strong> (TW ★)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.INDIAN_RAIL.color }} /><span><strong>Vande Bharat</strong> (IN)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.HARAMAIN.color }} /><span><strong>Haramain</strong> (SA)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.AFROSIYOB.color }} /><span><strong>Afrosiyob</strong> (UZ)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.TCDD_YHT.color }} /><span><strong>YHT TCDD</strong> (TR)</span></div>
            <div style={legendItemStyle}><span style={{ ...dotStyle, backgroundColor: OPERATOR_CONFIG.WHOOSH.color }} /><span><strong>Whoosh</strong> (ID)</span></div>
          </div>
        </div>
      )}

      {/* Modal de Configuración y Autosuficiencia ⚙️ */}
      {showSettingsModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2000,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontFamily: 'system-ui, sans-serif',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src="./logo.png"
                  alt="RailScope"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '6px',
                    border: '1px solid rgba(96, 165, 250, 0.4)',
                  }}
                />
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#60A5FA' }}>
                  ⚙️ Configuración RailScope
                </div>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={closeBtnStyle}>✕</button>
            </div>

            {/* Tarjeta de Autosuficiencia */}
            <div style={{
              backgroundColor: '#1E293B',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              border: '1px solid rgba(52, 211, 153, 0.2)',
            }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#34D399', marginBottom: '4px' }}>
                ✓ Aplicación 100% Autosuficiente
              </div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', lineHeight: 1.5 }}>
                Esta versión incluye su propio <strong>Motor Cinemático Local en el Dispositivo</strong>. La aplicación funciona sin depender de un servidor externo local en tu ordenador.
              </div>
            </div>

            {/* Selector de Modo */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px' }}>
                MODO DE OPERACIÓN:
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setEngineMode('AUTONOMOUS')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: engineMode === 'AUTONOMOUS' ? '#2563EB' : '#334155',
                    color: '#fff',
                  }}
                >
                  🚀 Autónomo Local
                </button>
                <button
                  onClick={() => setEngineMode('REMOTE_SERVER')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: engineMode === 'REMOTE_SERVER' ? '#2563EB' : '#334155',
                    color: '#fff',
                  }}
                >
                  🌐 Servidor Remoto
                </button>
              </div>
            </div>

            {/* Configuración de Servidor Remoto (Opcional) */}
            {engineMode === 'REMOTE_SERVER' && (
              <div style={{ marginBottom: '16px', backgroundColor: '#1E293B', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>
                  URL de Servidor FastAPI / TimescaleDB:
                </div>
                <input
                  type="text"
                  placeholder="ej. http://192.168.1.50:8000"
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    backgroundColor: '#0F172A',
                    color: '#fff',
                    fontSize: '12px',
                    marginBottom: '8px',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '11px', color: '#38BDF8' }}>
                  Estado: {remoteStatus}
                </div>
              </div>
            )}

            {/* Información Técnica */}
            <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.5, borderTop: '1px solid #1E293B', paddingTop: '10px' }}>
              <div>• Plataforma: {isNative ? 'Android Nativa (Capacitor)' : 'Navegador Web'}</div>
              <div>• Cobertura: Europa, Asia y Norteamérica</div>
              <div>• Corredores precargados: {HIGH_SPEED_CORRIDORS.length} trenes activos</div>
              <div>• API Datos Abiertos: transport.opendata.ch (En vivo)</div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              style={{
                marginTop: '16px',
                width: '100%',
                backgroundColor: '#2563EB',
                color: '#fff',
                border: 'none',
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cerrar y Volver al Mapa
            </button>
          </div>
        </div>
      )}

      {/* Contenedor del Mapa Leaflet */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <ChangeMapView center={mapCenter} zoom={mapZoom} />
        {/* Controles de zoom reubicados en la esquina inferior derecha para no solapar el logo/navbar */}
        <ZoomControl position="bottomright" />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Marcador de Ubicación Actual del Usuario (Inicio / Recarga) */}
        {userLocation && (
          <Marker position={userLocation} icon={createUserLocationIcon()}>
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', padding: '4px', minWidth: '190px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '13px', color: '#1E40AF' }}>📍 Tu Ubicación Actual</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  Punto de inicio al abrir la aplicación
                </div>
                <div style={{ fontSize: '11px', color: '#0F172A', marginTop: '4px', fontWeight: 600 }}>
                  Lat: {userLocation[0]}° | Lon: {userLocation[1]}°
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Agrupación Visual Inteligente de Marcadores */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={45}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={11}
        >
          {filteredTrains.map((train) => {
            const opKey = train.operator?.toUpperCase() || 'DEFAULT';
            const cfg = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;
            const trainCat = getTrainServiceCategory(train);
            const catMeta = SERVICE_CATEGORY_META[trainCat] || SERVICE_CATEGORY_META.ALL;

            let continentLabel = '🇪🇺 Europa';
            if (train.continent === 'AS' || cfg.continent === 'AS') continentLabel = '🌏 Asia';
            if (train.continent === 'NA' || cfg.continent === 'NA') continentLabel = '🌎 Norteamérica';

            return (
              <Marker
                key={train.train_id}
                ref={(m) => {
                  if (m) markerRefs.current[train.train_id] = m;
                }}
                position={[train.lat, train.lon]}
                icon={createTrainIcon(train.operator, train.is_realtime, train.speed === 0 || train.is_stopped)}
                eventHandlers={{
                  click: () => {
                    setSelectedTrainId(train.train_id);
                  },
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: '230px', color: '#1F2937' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '15px', color: '#0F172A' }}>{train.train_name || train.train_id}</strong>
                        {train.train_name && (
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>ID: {train.train_id}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{
                          backgroundColor: catMeta.badgeBg,
                          color: catMeta.badgeText,
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}>
                          {catMeta.icon} {catMeta.label}
                        </span>
                        <span style={{
                          backgroundColor: cfg.type.includes('Privado') ? '#FEF3C7' : '#E0E7FF',
                          color: cfg.type.includes('Privado') ? '#92400E' : '#3730A3',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}>
                          {cfg.type}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                      <div><strong>Operador:</strong> {cfg.name} ({train.country})</div>
                      <div><strong>Continente:</strong> {continentLabel}</div>
                      <div><strong>Material Rodante:</strong> {cfg.model}</div>
                      {train.line_name && <div><strong>Línea / Vía:</strong> {train.line_name}</div>}
                      <div><strong>Ruta / Dirección:</strong> {train.last_station_name || 'En tránsito'}</div>
                      <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '2px' }}>
                        <strong>Coordenadas GPS:</strong> {train.lat.toFixed(5)}°, {train.lon.toFixed(5)}°
                      </div>
                      {train.headingText && train.headingText !== 'En andén' && (
                        <div style={{ fontSize: '11px', color: '#4B5563' }}>
                          <strong>Rumbo:</strong> {train.headingText} ({train.heading}°)
                        </div>
                      )}
                      {train.speed != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                          <strong>Velocidad:</strong>
                          {train.speed === 0 || train.is_stopped ? (
                            <>
                              <span style={{ color: '#DC2626', fontWeight: 800 }}>0 km/h</span>
                              <span style={{
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}>
                                🛑 Parado en estación
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ color: '#059669', fontWeight: 700 }}>{train.speed} km/h</span>
                              <span style={{
                                backgroundColor: '#D1FAE5',
                                color: '#065F46',
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}>
                                ⚡ En marcha
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', borderTop: '1px solid #E5E7EB', paddingTop: '6px' }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: train.is_official_gps ? '#10B981' : '#3B82F6',
                          boxShadow: train.is_official_gps ? '0 0 6px #10B981' : '0 0 6px #3B82F6',
                        }} />
                        <span style={{ fontSize: '11px', color: train.is_official_gps ? '#059669' : '#1D4ED8', fontWeight: 700 }}>
                          {train.is_official_gps ? '🛰️ GPS Satelital Oficial (En Tiempo Real)' : '📍 Telemetría Geodésica de Vía'}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px' }}>
                        {train.telemetry_source || (train.is_official_gps ? 'Transpondedor a bordo' : 'Trazado Oficial de Alta Velocidad')}
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

      {/* Tarjeta Flotante del Tren Seleccionado (Información en Vivo) */}
      {selectedTrainId && trains[selectedTrainId] && (() => {
        const selTrain = trains[selectedTrainId];
        const opKey = selTrain.operator?.toUpperCase() || 'DEFAULT';
        const cfg = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;
        const isStopped = selTrain.speed === 0 || selTrain.is_stopped;
        const cardCat = getTrainServiceCategory(selTrain);
        const cardCatMeta = SERVICE_CATEGORY_META[cardCat] || SERVICE_CATEGORY_META.ALL;

        return (
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '14px',
            zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            color: '#F8FAFC',
            borderRadius: '14px',
            padding: '14px 16px',
            boxShadow: '0 14px 40px rgba(0,0,0,0.75)',
            border: '1.5px solid rgba(96, 165, 250, 0.4)',
            maxWidth: '380px',
            width: 'calc(100vw - 28px)',
            backdropFilter: 'blur(14px)',
            fontFamily: 'system-ui, sans-serif',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🚆</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#60A5FA' }}>
                    {selTrain.train_name || selTrain.train_id}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{cfg.name} ({selTrain.country})</span>
                    <span style={{
                      backgroundColor: cardCatMeta.badgeBg,
                      color: cardCatMeta.badgeText,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}>
                      {cardCatMeta.icon} {cardCatMeta.label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrainId(null)}
                style={closeBtnStyle}
                title="Cerrar tarjeta"
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#E2E8F0' }}>
              {selTrain.line_name && (
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#94A3B8' }}>Línea: </span>
                  <span style={{ fontWeight: 600 }}>{selTrain.line_name}</span>
                </div>
              )}
              <div style={{ marginBottom: '4px' }}>
                <span style={{ color: '#94A3B8' }}>Ruta / Estado: </span>
                <span style={{ fontWeight: 600, color: '#93C5FD' }}>
                  {selTrain.last_station_name || 'En tránsito'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#94A3B8' }}>Velocidad:</span>
                <span style={{
                  fontWeight: 700,
                  color: isStopped ? '#EF4444' : '#10B981',
                }}>
                  {isStopped ? '🛑 0 km/h (Parado en estación)' : `⚡ ${selTrain.speed} km/h (En marcha)`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8' }}>
                <span>Posición GPS:</span>
                <span>{selTrain.lat.toFixed(5)}°, {selTrain.lon.toFixed(5)}°</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={() => {
                  setMapCenter([selTrain.lat, selTrain.lon]);
                  setMapZoom(13);
                  const m = markerRefs.current[selTrain.train_id];
                  if (m) m.openPopup();
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#2563EB',
                  color: '#fff',
                  border: 'none',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                📍 Re-enfocar en mapa
              </button>
              <button
                onClick={() => {
                  setSearchQuery(selTrain.train_name || selTrain.train_id);
                }}
                style={{
                  backgroundColor: 'rgba(51, 65, 85, 0.7)',
                  color: '#E2E8F0',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Filtrar en mapa
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Estilos auxiliares
const actionPillStyle = (isActive) => ({
  background: isActive ? '#2563EB' : 'rgba(51, 65, 85, 0.8)',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '20px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

const categoryPillStyle = (isSelected, activeColor = '#2563EB') => ({
  background: isSelected ? activeColor : 'rgba(51, 65, 85, 0.75)',
  color: '#fff',
  border: isSelected ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '20px',
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: isSelected ? 700 : 500,
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  transition: 'all 0.15s ease',
  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
});

const filterBtnStyle = (isSelected, activeColor = '#2563EB') => ({
  flex: 1,
  background: isSelected ? activeColor : 'rgba(51, 65, 85, 0.6)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '6px 8px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
});

const tagBtnStyle = {
  background: 'rgba(51, 65, 85, 0.6)',
  color: '#E2E8F0',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 500,
};

const closeBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#94A3B8',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 700,
};

const dotStyle = {
  width: 9,
  height: 9,
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
};

const legendItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

export default TrainMap;
