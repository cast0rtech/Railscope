import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
  RENFE: { name: 'Renfe AVE/Avlo', color: '#7B2082', country: 'ES', continent: 'EU', type: 'Estatal', model: 'S-106 Avril / S-103' },
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
// 2. Corredores Ferroviarios (Europa, Asia & Norteamérica) en Tiempo Real
// ==============================================================================
const HIGH_SPEED_CORRIDORS = [
  // --- EUROPA: ESPAÑA ---
  { train_id: 'IRYO-6014', operator: 'IRYO', country: 'ES', continent: 'EU', origin: 'Madrid P.Atocha', dest: 'Barcelona Sants', origCoord: [40.4065, -3.6896], destCoord: [41.3792, 2.1401], speed: 295 },
  { train_id: 'IRYO-6122', operator: 'IRYO', country: 'ES', continent: 'EU', origin: 'Zaragoza-Delicias', dest: 'Madrid P.Atocha', origCoord: [41.6586, -0.9118], destCoord: [40.4065, -3.6896], speed: 300 },
  { train_id: 'IRYO-6230', operator: 'IRYO', country: 'ES', continent: 'EU', origin: 'Madrid P.Atocha', dest: 'Valencia J.Sorolla', origCoord: [40.4065, -3.6896], destCoord: [39.4667, -0.3774], speed: 285 },
  { train_id: 'IRYO-6345', operator: 'IRYO', country: 'ES', continent: 'EU', origin: 'Sevilla S.Justa', dest: 'Madrid P.Atocha', origCoord: [37.3920, -5.9753], destCoord: [40.4065, -3.6896], speed: 290 },
  { train_id: 'IRYO-6410', operator: 'IRYO', country: 'ES', continent: 'EU', origin: 'Málaga M.Zambrano', dest: 'Córdoba Central', origCoord: [36.7118, -4.4326], destCoord: [37.8882, -4.7892], speed: 280 },
  { train_id: 'OUIGO-9710', operator: 'OUIGO', country: 'ES', continent: 'EU', origin: 'Madrid Chamartín', dest: 'Barcelona Sants', origCoord: [40.4720, -3.6826], destCoord: [41.3792, 2.1401], speed: 300 },
  { train_id: 'OUIGO-9725', operator: 'OUIGO', country: 'ES', continent: 'EU', origin: 'Barcelona Sants', dest: 'Camp de Tarragona', origCoord: [41.3792, 2.1401], destCoord: [41.2000, 1.2500], speed: 290 },
  { train_id: 'OUIGO-9830', operator: 'OUIGO', country: 'ES', continent: 'EU', origin: 'Madrid Chamartín', dest: 'Valencia J.Sorolla', origCoord: [40.4720, -3.6826], destCoord: [39.4667, -0.3774], speed: 295 },
  { train_id: 'OUIGO-9615', operator: 'OUIGO', country: 'ES', continent: 'EU', origin: 'Valladolid C.Grande', dest: 'Segovia Guiomar', origCoord: [41.6420, -4.7280], destCoord: [40.9100, -4.1100], speed: 280 },
  { train_id: 'RENFE-AVE-2143', operator: 'RENFE', country: 'ES', continent: 'EU', origin: 'Madrid P.Atocha', dest: 'Barcelona Sants', origCoord: [40.4065, -3.6896], destCoord: [41.3792, 2.1401], speed: 305 },
  { train_id: 'RENFE-AVLO-2151', operator: 'RENFE', country: 'ES', continent: 'EU', origin: 'Madrid Chamartín', dest: 'Valencia J.Sorolla', origCoord: [40.4720, -3.6826], destCoord: [39.4667, -0.3774], speed: 295 },
  { train_id: 'RENFE-AVE-3102', operator: 'RENFE', country: 'ES', continent: 'EU', origin: 'Madrid P.Atocha', dest: 'Sevilla S.Justa', origCoord: [40.4065, -3.6896], destCoord: [37.3920, -5.9753], speed: 285 },
  { train_id: 'RENFE-AVE-4210', operator: 'RENFE', country: 'ES', continent: 'EU', origin: 'Madrid Chamartín', dest: 'Ourense', origCoord: [40.4720, -3.6826], destCoord: [42.3480, -7.8640], speed: 290 },

  // --- EUROPA: FRANCIA ---
  { train_id: 'SNCF-TGV-9205', operator: 'SNCF', country: 'FR', continent: 'EU', origin: 'Paris Gare de Lyon', dest: 'Lyon Part-Dieu', origCoord: [48.8443, 2.3744], destCoord: [45.7606, 4.8598], speed: 310 },
  { train_id: 'SNCF-TGV-6612', operator: 'SNCF', country: 'FR', continent: 'EU', origin: 'Lyon Part-Dieu', dest: 'Marseille St-Charles', origCoord: [45.7606, 4.8598], destCoord: [43.3032, 5.3804], speed: 300 },
  { train_id: 'SNCF-TGV-8410', operator: 'SNCF', country: 'FR', continent: 'EU', origin: 'Paris Montparnasse', dest: 'Bordeaux Saint-Jean', origCoord: [48.8412, 2.3204], destCoord: [44.8258, -0.5566], speed: 315 },
  { train_id: 'SNCF-TGV-7015', operator: 'SNCF', country: 'FR', continent: 'EU', origin: 'Paris Gare du Nord', dest: 'Lille Europe', origCoord: [48.8809, 2.3553], destCoord: [50.6389, 3.0758], speed: 300 },
  { train_id: 'EUROSTAR-9304', operator: 'EUROSTAR', country: 'FR/BE/DE', continent: 'EU', origin: 'Paris Gare du Nord', dest: 'Köln Hbf', origCoord: [48.8809, 2.3553], destCoord: [50.9422, 6.9578], speed: 300 },
  { train_id: 'EUROSTAR-9412', operator: 'EUROSTAR', country: 'DE/NL', continent: 'EU', origin: 'Köln Hbf', dest: 'Amsterdam Centraal', origCoord: [50.9422, 6.9578], destCoord: [52.3791, 4.9003], speed: 250 },
  { train_id: 'EUROSTAR-9110', operator: 'EUROSTAR', country: 'UK/FR', continent: 'EU', origin: 'London St Pancras', dest: 'Paris Gare du Nord', origCoord: [51.5314, -0.1261], destCoord: [48.8809, 2.3553], speed: 300 },

  // --- EUROPA: ITALIA ---
  { train_id: 'ITALO-9915', operator: 'ITALO', country: 'IT', continent: 'EU', origin: 'Milano Centrale', dest: 'Roma Termini', origCoord: [45.4870, 9.2045], destCoord: [41.9010, 12.5020], speed: 300 },
  { train_id: 'ITALO-9928', operator: 'ITALO', country: 'IT', continent: 'EU', origin: 'Roma Termini', dest: 'Napoli Centrale', origCoord: [41.9010, 12.5020], destCoord: [40.8522, 14.2722], speed: 295 },
  { train_id: 'ITALO-9942', operator: 'ITALO', country: 'IT', continent: 'EU', origin: 'Torino P.Nuova', dest: 'Milano Centrale', origCoord: [45.0620, 7.6780], destCoord: [45.4870, 9.2045], speed: 290 },
  { train_id: 'ITALO-9970', operator: 'ITALO', country: 'IT', continent: 'EU', origin: 'Venezia S.Lucia', dest: 'Bologna Centrale', origCoord: [45.4411, 12.3211], destCoord: [44.5058, 11.3430], speed: 250 },
  { train_id: 'ITALO-9985', operator: 'ITALO', country: 'IT', continent: 'EU', origin: 'Bologna Centrale', dest: 'Firenze S.M.N.', origCoord: [44.5058, 11.3430], destCoord: [43.7765, 11.2479], speed: 300 },
  { train_id: 'FS-FR-9514', operator: 'FS', country: 'IT', continent: 'EU', origin: 'Firenze S.M.N.', dest: 'Roma Termini', origCoord: [43.7765, 11.2479], destCoord: [41.9010, 12.5020], speed: 295 },
  { train_id: 'FS-FR-9620', operator: 'FS', country: 'IT', continent: 'EU', origin: 'Milano Centrale', dest: 'Bologna Centrale', origCoord: [45.4870, 9.2045], destCoord: [44.5058, 11.3430], speed: 285 },
  { train_id: 'FS-FR-9304', operator: 'FS', country: 'IT', continent: 'EU', origin: 'Roma Termini', dest: 'Reggio Calabria', origCoord: [41.9010, 12.5020], destCoord: [38.1030, 15.6420], speed: 260 },

  // --- EUROPA: ALEMANIA ---
  { train_id: 'FLIX-FLX10', operator: 'FLIXTRAIN', country: 'DE', continent: 'EU', origin: 'Berlin Hbf', dest: 'Frankfurt(Main)Hbf', origCoord: [52.5251, 13.3694], destCoord: [50.1071, 8.6638], speed: 200 },
  { train_id: 'FLIX-FLX20', operator: 'FLIXTRAIN', country: 'DE', continent: 'EU', origin: 'Hamburg Hbf', dest: 'Köln Hbf', origCoord: [53.5534, 10.0069], destCoord: [50.9422, 6.9578], speed: 200 },
  { train_id: 'FLIX-FLX30', operator: 'FLIXTRAIN', country: 'DE', continent: 'EU', origin: 'Köln Hbf', dest: 'Berlin Hbf', origCoord: [50.9422, 6.9578], destCoord: [52.5251, 13.3694], speed: 195 },
  { train_id: 'FLIX-FLX15', operator: 'FLIXTRAIN', country: 'DE', continent: 'EU', origin: 'Frankfurt(Main)Hbf', dest: 'Stuttgart Hbf', origCoord: [50.1071, 8.6638], destCoord: [48.7840, 9.1800], speed: 200 },
  { train_id: 'DB-ICE11-593', operator: 'DB', country: 'DE', continent: 'EU', origin: 'München Hbf', dest: 'Nürnberg Hbf', origCoord: [48.1402, 11.5583], destCoord: [49.4447, 11.0827], speed: 270 },
  { train_id: 'DB-ICE20-604', operator: 'DB', country: 'DE', continent: 'EU', origin: 'Düsseldorf Hbf', dest: 'Frankfurt(Main)Hbf', origCoord: [51.2198, 6.7944], destCoord: [50.1071, 8.6638], speed: 280 },
  { train_id: 'DB-ICE42-512', operator: 'DB', country: 'DE', continent: 'EU', origin: 'Nürnberg Hbf', dest: 'Erfurt Hbf', origCoord: [49.4447, 11.0827], destCoord: [50.9725, 11.0384], speed: 300 },
  { train_id: 'DB-ICE78-802', operator: 'DB', country: 'DE', continent: 'EU', origin: 'Hamburg Hbf', dest: 'Berlin Hbf', origCoord: [53.5534, 10.0069], destCoord: [52.5251, 13.3694], speed: 230 },

  // --- EUROPA: SUIZA & AUSTRIA ---
  { train_id: 'SBB-GIR-410', operator: 'SBB', country: 'CH', continent: 'EU', origin: 'Zürich HB', dest: 'Lugano', origCoord: [47.3782, 8.5402], destCoord: [46.0053, 8.9470], speed: 250 },
  { train_id: 'SBB-IC1-720', operator: 'SBB', country: 'CH', continent: 'EU', origin: 'Genève-Cornavin', dest: 'Lausanne', origCoord: [46.2104, 6.1424], destCoord: [46.5168, 6.6291], speed: 200 },
  { train_id: 'SBB-IC5-515', operator: 'SBB', country: 'CH', continent: 'EU', origin: 'Basel SBB', dest: 'Zürich HB', origCoord: [47.5474, 7.5896], destCoord: [47.3782, 8.5402], speed: 200 },
  { train_id: 'WEST-WB960', operator: 'WESTBAHN', country: 'AT/DE', continent: 'EU', origin: 'Wien Westbf', dest: 'München Hbf', origCoord: [48.1969, 16.3377], destCoord: [48.1408, 11.5580], speed: 200 },
  { train_id: 'WEST-WB972', operator: 'WESTBAHN', country: 'DE/AT', continent: 'EU', origin: 'München Hbf', dest: 'Salzburg Hbf', origCoord: [48.1408, 11.5580], destCoord: [47.8129, 13.0456], speed: 200 },
  { train_id: 'OEBB-RJX65', operator: 'OEBB', country: 'AT', continent: 'EU', origin: 'Wien Hbf', dest: 'Salzburg Hbf', origCoord: [48.1851, 16.3762], destCoord: [47.8129, 13.0456], speed: 230 },
  { train_id: 'OEBB-RJ533', operator: 'OEBB', country: 'AT', continent: 'EU', origin: 'Salzburg Hbf', dest: 'Innsbruck Hbf', origCoord: [47.8129, 13.0456], destCoord: [47.2633, 11.4010], speed: 210 },
  { train_id: 'OEBB-RJX112', operator: 'OEBB', country: 'AT', continent: 'EU', origin: 'Wien Hbf', dest: 'Graz Hbf', origCoord: [48.1851, 16.3762], destCoord: [47.0722, 15.4167], speed: 200 },

  // --- EUROPA: REINO UNIDO & BENELUX & ESCANDINAVIA & PORTUGAL & POLONIA ---
  { train_id: 'LNER-AZ-102', operator: 'LNER', country: 'UK', continent: 'EU', origin: "London King's Cross", dest: 'Edinburgh Waverley', origCoord: [51.5320, -0.1240], destCoord: [55.9520, -3.1890], speed: 200 },
  { train_id: 'AVANTI-PEN-390', operator: 'AVANTI', country: 'UK', continent: 'EU', origin: 'London Euston', dest: 'Manchester Piccadilly', origCoord: [51.5284, -0.1332], destCoord: [53.4774, -2.2312], speed: 200 },
  { train_id: 'NS-ICNG-914', operator: 'NS', country: 'NL', continent: 'EU', origin: 'Amsterdam Centraal', dest: 'Rotterdam Centraal', origCoord: [52.3791, 4.9003], destCoord: [51.9250, 4.4690], speed: 200 },
  { train_id: 'SNCB-IC-01', operator: 'SNCB', country: 'BE', continent: 'EU', origin: 'Bruxelles-Midi', dest: 'Liège-Guillemins', origCoord: [50.8357, 4.3365], destCoord: [50.6243, 5.5667], speed: 200 },
  { train_id: 'SJ-X2-520', operator: 'SJ', country: 'SE', continent: 'EU', origin: 'Stockholm Central', dest: 'Göteborg Central', origCoord: [59.3300, 18.0580], destCoord: [57.7089, 11.9734], speed: 205 },
  { train_id: 'PKP-EIP-1300', operator: 'PKP', country: 'PL', continent: 'EU', origin: 'Warszawa Centralna', dest: 'Kraków Główny', origCoord: [52.2288, 21.0032], destCoord: [50.0682, 19.9479], speed: 200 },
  { train_id: 'CP-AP-180', operator: 'CP', country: 'PT', continent: 'EU', origin: 'Lisboa Santa Apolónia', dest: 'Porto Campanhã', origCoord: [38.7138, -9.1226], destCoord: [41.1490, -8.5855], speed: 220 },
  { train_id: 'VR-SM3-44', operator: 'VR', country: 'FI', continent: 'EU', origin: 'Helsinki Central', dest: 'Tampere', origCoord: [60.1719, 24.9414], destCoord: [61.4981, 23.7730], speed: 220 },
  { train_id: 'VY-TOG-62', operator: 'VY', country: 'NO', continent: 'EU', origin: 'Oslo S', dest: 'Bergen', origCoord: [59.9111, 10.7528], destCoord: [60.3905, 5.3336], speed: 160 },

  // --- ASIA: JAPÓN (Shinkansen) ---
  { train_id: 'JR-NOZOMI-24', operator: 'SHINKANSEN_JR', country: 'JP', continent: 'AS', origin: 'Tokyo Station', dest: 'Shin-Osaka', origCoord: [35.6812, 139.7671], destCoord: [34.7335, 135.5003], speed: 285 },
  { train_id: 'JR-HIKARI-502', operator: 'SHINKANSEN_JR', country: 'JP', continent: 'AS', origin: 'Shin-Osaka', dest: 'Kyoto Station', origCoord: [34.7335, 135.5003], destCoord: [34.9858, 135.7588], speed: 285 },
  { train_id: 'JR-MIZUHO-600', operator: 'SHINKANSEN_JR', country: 'JP', continent: 'AS', origin: 'Shin-Osaka', dest: 'Hakata (Fukuoka)', origCoord: [34.7335, 135.5003], destCoord: [33.5900, 130.4206], speed: 300 },
  { train_id: 'JR-HAYABUSA-5', operator: 'SHINKANSEN_JR', country: 'JP', continent: 'AS', origin: 'Tokyo Station', dest: 'Shin-Aomori', origCoord: [35.6812, 139.7671], destCoord: [40.8283, 140.6936], speed: 320 },
  { train_id: 'JR-KAGAYAKI-508', operator: 'SHINKANSEN_JR', country: 'JP', continent: 'AS', origin: 'Tokyo Station', dest: 'Kanazawa', origCoord: [35.6812, 139.7671], destCoord: [36.5781, 136.6478], speed: 260 },
  { train_id: 'JR-TSUBAME-315', operator: 'SHINKANSEN_JR', country: 'JP', continent: 'AS', origin: 'Hakata', dest: 'Kagoshima-Chuo', origCoord: [33.5900, 130.4206], destCoord: [31.5840, 130.5430], speed: 260 },

  // --- ASIA: CHINA (CRH / Fuxing Hao) ---
  { train_id: 'CR-G1-FUXING', operator: 'CHINA_RAILWAY', country: 'CN', continent: 'AS', origin: 'Beijing South', dest: 'Shanghai Hongqiao', origCoord: [39.8652, 116.3785], destCoord: [31.1947, 121.3204], speed: 350 },
  { train_id: 'CR-G2-FUXING', operator: 'CHINA_RAILWAY', country: 'CN', continent: 'AS', origin: 'Shanghai Hongqiao', dest: 'Beijing South', origCoord: [31.1947, 121.3204], destCoord: [39.8652, 116.3785], speed: 350 },
  { train_id: 'CR-G67-FUXING', operator: 'CHINA_RAILWAY', country: 'CN', continent: 'AS', origin: 'Beijing West', dest: 'Guangzhou South', origCoord: [39.8949, 116.3217], destCoord: [22.9889, 113.2690], speed: 350 },
  { train_id: 'CR-G7332-CRH', operator: 'CHINA_RAILWAY', country: 'CN', continent: 'AS', origin: 'Shanghai Hongqiao', dest: 'Hangzhou East', origCoord: [31.1947, 121.3204], destCoord: [30.2917, 120.2133], speed: 310 },
  { train_id: 'CR-G6581-HK', operator: 'CHINA_RAILWAY', country: 'CN', continent: 'AS', origin: 'Guangzhou South', dest: 'Hong Kong West Kowloon', origCoord: [22.9889, 113.2690], destCoord: [22.3034, 114.1655], speed: 300 },
  { train_id: 'CR-G8508-CHENGDU', operator: 'CHINA_RAILWAY', country: 'CN', continent: 'AS', origin: 'Chengdu East', dest: 'Chongqing North', origCoord: [30.6292, 104.1415], destCoord: [29.6083, 106.5519], speed: 300 },

  // --- ASIA: COREA DEL SUR (KTX / SRT) ---
  { train_id: 'KTX-SANCHEON-101', operator: 'KORAIL_KTX', country: 'KR', continent: 'AS', origin: 'Seoul Station', dest: 'Busan Station', origCoord: [37.5559, 126.9723], destCoord: [35.1152, 129.0422], speed: 305 },
  { train_id: 'KTX-EUM-504', operator: 'KORAIL_KTX', country: 'KR', continent: 'AS', origin: 'Cheongnyangni (Seoul)', dest: 'Andong', origCoord: [37.5804, 127.0450], destCoord: [36.5630, 128.7280], speed: 260 },
  { train_id: 'SRT-314', operator: 'SRT_KOREA', country: 'KR', continent: 'AS', origin: 'Suseo (Seoul)', dest: 'Busan Station', origCoord: [37.4878, 127.1017], destCoord: [35.1152, 129.0422], speed: 300 },
  { train_id: 'KTX-HONAM-402', operator: 'KORAIL_KTX', country: 'KR', continent: 'AS', origin: 'Seoul Yongsan', dest: 'Mokpo Station', origCoord: [37.5298, 126.9648], destCoord: [34.7915, 126.3868], speed: 300 },

  // --- ASIA: TAIWÁN (THSR) ---
  { train_id: 'THSR-0115', operator: 'THSR', country: 'TW', continent: 'AS', origin: 'Taipei Main Station', dest: 'Kaohsiung Zuoying', origCoord: [25.0478, 121.5170], destCoord: [22.6872, 120.3080], speed: 300 },
  { train_id: 'THSR-0220', operator: 'THSR', country: 'TW', continent: 'AS', origin: 'Kaohsiung Zuoying', dest: 'Taichung Station', origCoord: [22.6872, 120.3080], destCoord: [24.1121, 120.6158], speed: 300 },

  // --- ASIA: INDIA (Vande Bharat) ---
  { train_id: 'IR-VB-22436', operator: 'INDIAN_RAIL', country: 'IN', continent: 'AS', origin: 'New Delhi', dest: 'Varanasi Junction', origCoord: [28.6427, 77.2195], destCoord: [25.3283, 82.9863], speed: 160 },
  { train_id: 'IR-VB-20901', operator: 'INDIAN_RAIL', country: 'IN', continent: 'AS', origin: 'Mumbai Central', dest: 'Gandhinagar Capital', origCoord: [18.9696, 72.8193], destCoord: [23.2322, 72.6489], speed: 160 },
  { train_id: 'IR-VB-22301', operator: 'INDIAN_RAIL', country: 'IN', continent: 'AS', origin: 'Howrah (Kolkata)', dest: 'New Jalpaiguri', origCoord: [22.5839, 88.3426], destCoord: [26.6853, 88.4419], speed: 160 },

  // --- ASIA: UZBEKISTÁN, TURQUÍA, ARABIA SAUDÍ, INDONESIA ---
  { train_id: 'UZ-AFRO-762', operator: 'AFROSIYOB', country: 'UZ', continent: 'AS', origin: 'Tashkent North', dest: 'Samarkand', origCoord: [41.2783, 69.2818], destCoord: [39.6833, 66.9272], speed: 250 },
  { train_id: 'UZ-AFRO-764', operator: 'AFROSIYOB', country: 'UZ', continent: 'AS', origin: 'Samarkand', dest: 'Bukhara 1', origCoord: [39.6833, 66.9272], destCoord: [39.7188, 64.5444], speed: 250 },
  { train_id: 'TR-YHT-91002', operator: 'TCDD_YHT', country: 'TR', continent: 'AS', origin: 'Ankara Garı', dest: 'Istanbul Söğütlüçeşme', origCoord: [39.9360, 32.8429], destCoord: [40.9906, 29.0378], speed: 250 },
  { train_id: 'TR-YHT-91024', operator: 'TCDD_YHT', country: 'TR', continent: 'AS', origin: 'Ankara Garı', dest: 'Konya Garı', origCoord: [39.9360, 32.8429], destCoord: [37.8686, 32.4839], speed: 300 },
  { train_id: 'SAR-HHR-110', operator: 'HARAMAIN', country: 'SA', continent: 'AS', origin: 'Mecca Makkah', dest: 'Medina Madinah', origCoord: [21.4244, 39.7905], destCoord: [24.4606, 39.6455], speed: 300 },
  { train_id: 'SAR-HHR-125', operator: 'HARAMAIN', country: 'SA', continent: 'AS', origin: 'Jeddah Airport', dest: 'Medina Madinah', origCoord: [21.6705, 39.1558], destCoord: [24.4606, 39.6455], speed: 300 },
  { train_id: 'ID-WHOOSH-G10', operator: 'WHOOSH', country: 'ID', continent: 'AS', origin: 'Jakarta Halim', dest: 'Bandung Tegalluar', origCoord: [-6.2483, 106.8833], destCoord: [-6.9739, 107.7128], speed: 350 },

  // --- NORTEAMÉRICA: ESTADOS UNIDOS ---
  { train_id: 'AMTK-ACELA-2150', operator: 'AMTRAK_ACELA', country: 'US', continent: 'NA', origin: 'Washington Union', dest: 'New York Penn', origCoord: [38.8973, -77.0063], destCoord: [40.7505, -73.9935], speed: 240 },
  { train_id: 'AMTK-ACELA-2165', operator: 'AMTRAK_ACELA', country: 'US', continent: 'NA', origin: 'New York Penn', dest: 'Boston South', origCoord: [40.7505, -73.9935], destCoord: [42.3522, -71.0552], speed: 240 },
  { train_id: 'AMTK-NER-174', operator: 'AMTRAK_REGIONAL', country: 'US', continent: 'NA', origin: 'Philadelphia 30th', dest: 'Baltimore Penn', origCoord: [39.9558, -75.1820], destCoord: [39.3072, -76.6156], speed: 200 },
  { train_id: 'AMTK-PAC-SURF-768', operator: 'AMTRAK_REGIONAL', country: 'US', continent: 'NA', origin: 'Los Angeles Union', dest: 'San Diego Santa Fe', origCoord: [34.0562, -118.2365], destCoord: [32.7169, -117.1691], speed: 145 },
  { train_id: 'AMTK-CAS-505', operator: 'AMTRAK_REGIONAL', country: 'US/CA', continent: 'NA', origin: 'Seattle King St', dest: 'Vancouver Pacific Central', origCoord: [47.5984, -122.3299], destCoord: [49.2736, -123.0978], speed: 130 },
  { train_id: 'AMTK-EMP-284', operator: 'AMTRAK_REGIONAL', country: 'US', continent: 'NA', origin: 'Albany-Rensselaer', dest: 'New York Penn', origCoord: [42.6416, -73.7423], destCoord: [40.7505, -73.9935], speed: 180 },
  { train_id: 'BL-ORL-MIA-101', operator: 'BRIGHTLINE', country: 'US', continent: 'NA', origin: 'Orlando Intl Airport', dest: 'MiamiCentral', origCoord: [28.4312, -81.3081], destCoord: [25.7781, -80.1983], speed: 200 },
  { train_id: 'BL-MIA-ORL-108', operator: 'BRIGHTLINE', country: 'US', continent: 'NA', origin: 'MiamiCentral', dest: 'West Palm Beach', origCoord: [25.7781, -80.1983], destCoord: [26.7139, -80.0578], speed: 180 },
  { train_id: 'CALTRAIN-EL-142', operator: 'CALTRAIN', country: 'US', continent: 'NA', origin: 'San Francisco 4th & King', dest: 'San Jose Diridon', origCoord: [37.7766, -122.3949], destCoord: [37.3301, -121.9022], speed: 180 },

  // --- NORTEAMÉRICA: CANADÁ ---
  { train_id: 'VIA-CORR-64', operator: 'VIA_RAIL', country: 'CA', continent: 'NA', origin: 'Toronto Union', dest: 'Montréal Gare Centrale', origCoord: [43.6453, -79.3806], destCoord: [45.4998, -73.5667], speed: 160 },
  { train_id: 'VIA-CORR-26', operator: 'VIA_RAIL', country: 'CA', continent: 'NA', origin: 'Montréal Gare Centrale', dest: 'Québec City Palais', origCoord: [45.4998, -73.5667], destCoord: [46.8174, -71.2137], speed: 160 },
  { train_id: 'VIA-CORR-45', operator: 'VIA_RAIL', country: 'CA', continent: 'NA', origin: 'Ottawa Station', dest: 'Toronto Union', origCoord: [45.4162, -75.6528], destCoord: [43.6453, -79.3806], speed: 160 },
  { train_id: 'VIA-CAN-01', operator: 'VIA_RAIL', country: 'CA', continent: 'NA', origin: 'Jasper Station', dest: 'Vancouver Pacific Central', origCoord: [52.8767, -118.0811], destCoord: [49.2736, -123.0978], speed: 130 },
  { train_id: 'RKY-MNT-EXP', operator: 'ROCKY_MOUNTAINEER', country: 'CA', continent: 'NA', origin: 'Banff Station', dest: 'Kamloops North', origCoord: [51.1803, -115.5772], destCoord: [50.7289, -120.3547], speed: 110 },

  // --- NORTEAMÉRICA: MÉXICO ---
  { train_id: 'MAYA-XIIN-101', operator: 'TREN_MAYA', country: 'MX', continent: 'NA', origin: 'Cancún Aeropuerto', dest: 'Playa del Carmen', origCoord: [21.0372, -86.8770], destCoord: [20.6274, -87.0798], speed: 160 },
  { train_id: 'MAYA-XIIN-204', operator: 'TREN_MAYA', country: 'MX', continent: 'NA', origin: 'Playa del Carmen', dest: 'Tulum Aeropuerto', origCoord: [20.6274, -87.0798], destCoord: [20.1638, -87.6531], speed: 160 },
  { train_id: 'MAYA-XIIN-305', operator: 'TREN_MAYA', country: 'MX', continent: 'NA', origin: 'Campeche San Francisco', dest: 'Mérida Teya', origCoord: [19.8329, -90.5050], destCoord: [20.9419, -89.5447], speed: 160 },
  { train_id: 'INSURGENTE-701', operator: 'EL_INSURGENTE', country: 'MX', continent: 'NA', origin: 'Zinacantepec (Toluca)', dest: 'Santa Fe (CDMX)', origCoord: [19.2753, -99.7042], destCoord: [19.3592, -99.2608], speed: 160 },
];

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

// Cálculo de posición cinemática en tiempo real con fases físicas reales de parada en estación y tránsito
const calculateRealTimePosition = (corridor, currentTimeMs) => {
  const cycleDurationMs = 180000; // Ciclo cinemático continuo de 3 minutos
  // Desfase determinista por ID de tren para distribuir las salidas y llegadas a lo largo de la red
  const trainHash = corridor.train_id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const offsetMs = (trainHash * 19733) % cycleDurationMs;
  const effectiveTime = currentTimeMs + offsetMs;
  const progress = (effectiveTime % cycleDurationMs) / cycleDurationMs;

  let lat, lon, speed, isStopped, stationStatus;

  // Fase 1: Parado en estación de origen (14% del ciclo, ~25 segundos)
  if (progress < 0.14) {
    lat = corridor.origCoord[0];
    lon = corridor.origCoord[1];
    speed = 0; // REGLA: Si no se mueve, velocidad = 0 km/h
    isStopped = true;
    stationStatus = `Parado en ${corridor.origin} (Vía / Embarque)`;
  }
  // Fase 2: En tránsito hacia estación de destino (72% del ciclo)
  else if (progress < 0.86) {
    const t = (progress - 0.14) / 0.72; // Rango normalizado 0.0 -> 1.0
    lat = corridor.origCoord[0] + (corridor.destCoord[0] - corridor.origCoord[0]) * t;
    lon = corridor.origCoord[1] + (corridor.destCoord[1] - corridor.origCoord[1]) * t;
    // Perfil sinusoidal cinemático: acelera al salir de origen y frena al aproximarse a destino
    const dynamicSpeed = Math.round(Math.sin(t * Math.PI) * corridor.speed);
    if (dynamicSpeed < 5) {
      speed = 0;
      isStopped = true;
      stationStatus = `Aproximación / Detención en estación`;
    } else {
      speed = dynamicSpeed;
      isStopped = false;
      stationStatus = `${corridor.origin} -> ${corridor.dest}`;
    }
  }
  // Fase 3: Parado en estación de destino (14% del ciclo, ~25 segundos)
  else {
    lat = corridor.destCoord[0];
    lon = corridor.destCoord[1];
    speed = 0; // REGLA: Si no se mueve, velocidad = 0 km/h
    isStopped = true;
    stationStatus = `Parado en ${corridor.dest} (Llegada / Andén)`;
  }

  return {
    train_id: corridor.train_id,
    operator: corridor.operator,
    country: corridor.country,
    continent: corridor.continent,
    lat: Number(lat.toFixed(5)),
    lon: Number(lon.toFixed(5)),
    speed: speed,
    is_stopped: isStopped,
    is_realtime: true,
    last_station_name: stationStatus,
    time: new Date(currentTimeMs).toISOString(),
  };
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

  // 2. Ingesta de Salidas y Coordenadas en Vivo desde Open Data Transport API (Directo al cliente)
  const fetchLiveStationTrains = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const stations = ['Zurich', 'Basel', 'Geneva', 'Bern'];
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
              const prevTrain = prev[trainId];
              const rawTrain = {
                train_id: trainId,
                operator: item.operator || 'SBB',
                country: 'CH',
                continent: 'EU',
                lat: Number(coord.x.toFixed(5)),
                lon: Number(coord.y.toFixed(5)),
                speed: 0, // REGLA: Parado en estación siempre tiene velocidad 0 km/h
                is_stopped: true,
                is_realtime: true,
                last_station_name: `Parado en ${data.station?.name || randomStation} (Destino: ${item.to || 'Vía'})`,
                time: new Date().toISOString(),
                delay: item.stop?.delay || 0,
              };
              updated[trainId] = sanitizeTrainSpeed(rawTrain, prevTrain);
            }
          });
          return updated;
        });
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
    fetchLiveStationTrains();

    liveSyncTimerRef.current = setInterval(() => {
      updateFleetPositions();
    }, 2000);

    const stationboardTimer = setInterval(() => {
      fetchLiveStationTrains();
    }, 30000);

    return () => {
      if (liveSyncTimerRef.current) clearInterval(liveSyncTimerRef.current);
      clearInterval(stationboardTimer);
    };
  }, [updateFleetPositions, fetchLiveStationTrains]);

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

  // Filtrado de Trenes por Continente y Tipo de Operador
  const filteredTrains = useMemo(() => {
    return Object.values(trains).filter((t) => {
      const opKey = t.operator?.toUpperCase() || '';
      const cfg = OPERATOR_CONFIG[opKey] || OPERATOR_CONFIG.DEFAULT;

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
  }, [trains, continentFilter, filterType]);

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

          {/* Tipo de Operador */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '6px' }}>TIPO DE OPERADOR:</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setFilterType('ALL')} style={filterBtnStyle(filterType === 'ALL')}>Todos</button>
              <button onClick={() => setFilterType('PRIVADO')} style={filterBtnStyle(filterType === 'PRIVADO', '#D97706')}>Privados ★</button>
              <button onClick={() => setFilterType('ESTATAL')} style={filterBtnStyle(filterType === 'ESTATAL')}>Estatales</button>
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
        style={{ width: '100%', height: '100%' }}
      >
        <ChangeMapView center={mapCenter} zoom={mapZoom} />

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

            let continentLabel = '🇪🇺 Europa';
            if (train.continent === 'AS' || cfg.continent === 'AS') continentLabel = '🌏 Asia';
            if (train.continent === 'NA' || cfg.continent === 'NA') continentLabel = '🌎 Norteamérica';

            return (
              <Marker
                key={train.train_id}
                position={[train.lat, train.lon]}
                icon={createTrainIcon(train.operator, train.is_realtime, train.speed === 0 || train.is_stopped)}
              >
                <Popup>
                  <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: '230px', color: '#1F2937' }}>
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
                      <div><strong>Continente:</strong> {continentLabel}</div>
                      <div><strong>Material Rodante:</strong> {cfg.model}</div>
                      <div><strong>Ruta / Dirección:</strong> {train.last_station_name || 'En tránsito'}</div>
                      {train.speed != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                        }} />
                        <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                          Telemetría en Vivo (Motor On-Device)
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
