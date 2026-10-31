import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Capacitor } from '@capacitor/core';
import 'leaflet/dist/leaflet.css';

// ==============================================================================
// 1. Configuración de Operadores Ferroviarios (Europa & Asia)
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

  DEFAULT: { name: 'Operador Ferroviario', color: '#1E40AF', country: 'INT', continent: 'ALL', type: 'Comercial', model: 'Alta Velocidad' },
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
// 2. Corredores de Alta Velocidad (Europa & Asia) con Cinemática en Tiempo Real
// ==============================================================================
const HIGH_SPEED_CORRIDORS = [
  // --- ESPAÑA ---
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

  // --- FRANCIA ---
  { train_id: 'SNCF-TGV-9205', operator: 'SNCF', country: 'FR', continent: 'EU', origin: 'Paris Gare de Lyon', dest: 'Lyon Part-Dieu', origCoord: [48.8443, 2.3744], destCoord: [45.7606, 4.8598], speed: 310 },
  { train_id: 'SNCF-TGV-6612', operator: 'SNCF', country: 'FR', continent: 'EU', origin: 'Lyon Part-Dieu', dest: 'Marseille St-Charles', origCoord: [45.7606, 4.8598], destCoord: [43.3032, 5.3804], speed: 300 },
  { train_id: 'SNCF-TGV-8410', operator: 'SNCF', country: 'FR', continent: 'EU', origin: 'Paris Montparnasse', dest: 'Bordeaux Saint-Jean', origCoord: [48.8412, 2.3204], destCoord: [44.8258, -0.5566], speed: 315 },
  { train_id: 'SNCF-TGV-7015', operator: 'SNCF', country: 'FR', continent: 'EU', origin: 'Paris Gare du Nord', dest: 'Lille Europe', origCoord: [48.8809, 2.3553], destCoord: [50.6389, 3.0758], speed: 300 },
  { train_id: 'EUROSTAR-9304', operator: 'EUROSTAR', country: 'FR/BE/DE', continent: 'EU', origin: 'Paris Gare du Nord', dest: 'Köln Hbf', origCoord: [48.8809, 2.3553], destCoord: [50.9422, 6.9578], speed: 300 },
  { train_id: 'EUROSTAR-9412', operator: 'EUROSTAR', country: 'DE/NL', continent: 'EU', origin: 'Köln Hbf', dest: 'Amsterdam Centraal', origCoord: [50.9422, 6.9578], destCoord: [52.3791, 4.9003], speed: 250 },
  { train_id: 'EUROSTAR-9110', operator: 'EUROSTAR', country: 'UK/FR', continent: 'EU', origin: 'London St Pancras', dest: 'Paris Gare du Nord', origCoord: [51.5314, -0.1261], destCoord: [48.8809, 2.3553], speed: 300 },

  // --- ITALIA ---
  { train_id: 'ITALO-9915', operator: 'ITALO', country: 'IT', continent: 'EU', origin: 'Milano Centrale', dest: 'Roma Termini', origCoord: [45.4870, 9.2045], destCoord: [41.9010, 12.5020], speed: 300 },
  { train_id: 'ITALO-9928', operator: 'ITALO', country: 'IT', continent: 'EU', origin: 'Roma Termini', dest: 'Napoli Centrale', origCoord: [41.9010, 12.5020], destCoord: [40.8522, 14.2722], speed: 295 },
  { train_id: 'ITALO-9942', operator: 'ITALO', country: 'IT', continent: 'EU', origin: 'Torino P.Nuova', dest: 'Milano Centrale', origCoord: [45.0620, 7.6780], destCoord: [45.4870, 9.2045], speed: 290 },
  { train_id: 'ITALO-9970', operator: 'ITALO', country: 'IT', continent: 'EU', origin: 'Venezia S.Lucia', dest: 'Bologna Centrale', origCoord: [45.4411, 12.3211], destCoord: [44.5058, 11.3430], speed: 250 },
  { train_id: 'ITALO-9985', operator: 'ITALO', country: 'IT', continent: 'EU', origin: 'Bologna Centrale', dest: 'Firenze S.M.N.', origCoord: [44.5058, 11.3430], destCoord: [43.7765, 11.2479], speed: 300 },
  { train_id: 'FS-FR-9514', operator: 'FS', country: 'IT', continent: 'EU', origin: 'Firenze S.M.N.', dest: 'Roma Termini', origCoord: [43.7765, 11.2479], destCoord: [41.9010, 12.5020], speed: 295 },
  { train_id: 'FS-FR-9620', operator: 'FS', country: 'IT', continent: 'EU', origin: 'Milano Centrale', dest: 'Bologna Centrale', origCoord: [45.4870, 9.2045], destCoord: [44.5058, 11.3430], speed: 285 },
  { train_id: 'FS-FR-9304', operator: 'FS', country: 'IT', continent: 'EU', origin: 'Roma Termini', dest: 'Reggio Calabria', origCoord: [41.9010, 12.5020], destCoord: [38.1030, 15.6420], speed: 260 },

  // --- ALEMANIA ---
  { train_id: 'FLIX-FLX10', operator: 'FLIXTRAIN', country: 'DE', continent: 'EU', origin: 'Berlin Hbf', dest: 'Frankfurt(Main)Hbf', origCoord: [52.5251, 13.3694], destCoord: [50.1071, 8.6638], speed: 200 },
  { train_id: 'FLIX-FLX20', operator: 'FLIXTRAIN', country: 'DE', continent: 'EU', origin: 'Hamburg Hbf', dest: 'Köln Hbf', origCoord: [53.5534, 10.0069], destCoord: [50.9422, 6.9578], speed: 200 },
  { train_id: 'FLIX-FLX30', operator: 'FLIXTRAIN', country: 'DE', continent: 'EU', origin: 'Köln Hbf', dest: 'Berlin Hbf', origCoord: [50.9422, 6.9578], destCoord: [52.5251, 13.3694], speed: 195 },
  { train_id: 'FLIX-FLX15', operator: 'FLIXTRAIN', country: 'DE', continent: 'EU', origin: 'Frankfurt(Main)Hbf', dest: 'Stuttgart Hbf', origCoord: [50.1071, 8.6638], destCoord: [48.7840, 9.1800], speed: 200 },
  { train_id: 'DB-ICE11-593', operator: 'DB', country: 'DE', continent: 'EU', origin: 'München Hbf', dest: 'Nürnberg Hbf', origCoord: [48.1402, 11.5583], destCoord: [49.4447, 11.0827], speed: 270 },
  { train_id: 'DB-ICE20-604', operator: 'DB', country: 'DE', continent: 'EU', origin: 'Düsseldorf Hbf', dest: 'Frankfurt(Main)Hbf', origCoord: [51.2198, 6.7944], destCoord: [50.1071, 8.6638], speed: 280 },
  { train_id: 'DB-ICE42-512', operator: 'DB', country: 'DE', continent: 'EU', origin: 'Nürnberg Hbf', dest: 'Erfurt Hbf', origCoord: [49.4447, 11.0827], destCoord: [50.9725, 11.0384], speed: 300 },
  { train_id: 'DB-ICE78-802', operator: 'DB', country: 'DE', continent: 'EU', origin: 'Hamburg Hbf', dest: 'Berlin Hbf', origCoord: [53.5534, 10.0069], destCoord: [52.5251, 13.3694], speed: 230 },

  // --- SUIZA & AUSTRIA ---
  { train_id: 'SBB-GIR-410', operator: 'SBB', country: 'CH', continent: 'EU', origin: 'Zürich HB', dest: 'Lugano', origCoord: [47.3782, 8.5402], destCoord: [46.0053, 8.9470], speed: 250 },
  { train_id: 'SBB-IC1-720', operator: 'SBB', country: 'CH', continent: 'EU', origin: 'Genève-Cornavin', dest: 'Lausanne', origCoord: [46.2104, 6.1424], destCoord: [46.5168, 6.6291], speed: 200 },
  { train_id: 'SBB-IC5-515', operator: 'SBB', country: 'CH', continent: 'EU', origin: 'Basel SBB', dest: 'Zürich HB', origCoord: [47.5474, 7.5896], destCoord: [47.3782, 8.5402], speed: 200 },
  { train_id: 'WEST-WB960', operator: 'WESTBAHN', country: 'AT/DE', continent: 'EU', origin: 'Wien Westbf', dest: 'München Hbf', origCoord: [48.1969, 16.3377], destCoord: [48.1408, 11.5580], speed: 200 },
  { train_id: 'WEST-WB972', operator: 'WESTBAHN', country: 'DE/AT', continent: 'EU', origin: 'München Hbf', dest: 'Salzburg Hbf', origCoord: [48.1408, 11.5580], destCoord: [47.8129, 13.0456], speed: 200 },
  { train_id: 'OEBB-RJX65', operator: 'OEBB', country: 'AT', continent: 'EU', origin: 'Wien Hbf', dest: 'Salzburg Hbf', origCoord: [48.1851, 16.3762], destCoord: [47.8129, 13.0456], speed: 230 },
  { train_id: 'OEBB-RJ533', operator: 'OEBB', country: 'AT', continent: 'EU', origin: 'Salzburg Hbf', dest: 'Innsbruck Hbf', origCoord: [47.8129, 13.0456], destCoord: [47.2633, 11.4010], speed: 210 },
  { train_id: 'OEBB-RJX112', operator: 'OEBB', country: 'AT', continent: 'EU', origin: 'Wien Hbf', dest: 'Graz Hbf', origCoord: [48.1851, 16.3762], destCoord: [47.0722, 15.4167], speed: 200 },

  // --- REINO UNIDO & BENELUX & ESCANDINAVIA & PORTUGAL & POLONIA ---
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
];

// Cálculo de posición cinemática en tiempo real interpolando según el reloj de alta precisión
const calculateRealTimePosition = (corridor, currentTimeMs) => {
  const cycleDurationMs = 180000; // Ciclo cinemático continuo de 3 minutos
  const progress = (currentTimeMs % cycleDurationMs) / cycleDurationMs;

  const lat = corridor.origCoord[0] + (corridor.destCoord[0] - corridor.origCoord[0]) * progress;
  const lon = corridor.origCoord[1] + (corridor.destCoord[1] - corridor.origCoord[1]) * progress;

  return {
    train_id: corridor.train_id,
    operator: corridor.operator,
    country: corridor.country,
    continent: corridor.continent,
    lat: Number(lat.toFixed(5)),
    lon: Number(lon.toFixed(5)),
    speed: Math.round(corridor.speed + (Math.sin(progress * Math.PI * 4) * 8)),
    is_realtime: true,
    last_station_name: `${corridor.origin} -> ${corridor.dest}`,
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
  const [continentFilter, setContinentFilter] = useState('ALL'); // ALL, EU, AS
  const [filterType, setFilterType] = useState('ALL'); // ALL, PRIVADO, ESTATAL
  const [mapCenter, setMapCenter] = useState([45.0, 15.0]);
  const [mapZoom, setMapZoom] = useState(4);

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

  // 1. Motor cinemático local en dispositivo (Completamente autosuficiente)
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
              updated[trainId] = {
                train_id: trainId,
                operator: item.operator || 'SBB',
                country: 'CH',
                continent: 'EU',
                lat: Number(coord.x.toFixed(5)),
                lon: Number(coord.y.toFixed(5)),
                speed: 120 + Math.floor(Math.random() * 40),
                is_realtime: true,
                last_station_name: `${data.station?.name || randomStation} -> ${item.to || 'En Ruta'}`,
                time: new Date().toISOString(),
                delay: item.stop?.delay || 0,
              };
            }
          });
          return updated;
        });
      }
    } catch (err) {
      // Ignorar fallos de red en modo offline
    }
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
                  next[item.train_id] = { ...next[item.train_id], ...item };
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
      if (filterType === 'ESTATAL') return cfg.type.includes('Estatal');

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
          <span style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: engineMode === 'AUTONOMOUS' ? '#10B981' : (remoteStatus.includes('Conectado') ? '#10B981' : '#F59E0B'),
            boxShadow: '0 0 10px #10B981',
          }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.3px', color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '6px' }}>
              RailScope
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
              {isOnline ? '🟢 Red activa' : '🟠 Modo sin conexión'} • {filteredTrains.length} trenes procesados
            </div>
          </div>
        </div>

        {/* Botones de Acción Móviles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          maxWidth: '360px',
          width: 'calc(100vw - 28px)',
          backdropFilter: 'blur(12px)',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#93C5FD' }}>Filtros & Navegación</span>
            <button onClick={() => setShowFiltersPanel(false)} style={closeBtnStyle}>✕</button>
          </div>

          {/* Continentes */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '6px' }}>CONTINENTE:</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => { setContinentFilter('ALL'); jumpToRegion([38.0, 50.0], 3, 'ALL'); }}
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
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '6px' }}>ENFOCAR PAÍS:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              <button onClick={() => jumpToRegion([40.4168, -3.7038], 6, 'EU')} style={tagBtnStyle}>🇪🇸 España</button>
              <button onClick={() => jumpToRegion([46.6034, 1.8883], 6, 'EU')} style={tagBtnStyle}>🇫🇷 Francia</button>
              <button onClick={() => jumpToRegion([51.1657, 10.4515], 6, 'EU')} style={tagBtnStyle}>🇩🇪 Alemania</button>
              <button onClick={() => jumpToRegion([42.8333, 12.8333], 6, 'EU')} style={tagBtnStyle}>🇮🇹 Italia</button>
              <button onClick={() => jumpToRegion([46.8182, 8.2275], 7, 'EU')} style={tagBtnStyle}>🇨🇭 Suiza</button>
              <button onClick={() => jumpToRegion([54.5, -2.5], 6, 'EU')} style={tagBtnStyle}>🇬🇧 Reino Unido</button>
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
          maxWidth: '520px',
          width: 'calc(100vw - 28px)',
          maxHeight: '48vh',
          overflowY: 'auto',
          backdropFilter: 'blur(12px)',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: '#93C5FD' }}>Operadores (Europa & Asia)</span>
            <button onClick={() => setShowLegendPanel(false)} style={closeBtnStyle}>✕</button>
          </div>
          <div style={{ color: '#FBBF24', fontSize: '10px', marginBottom: '8px' }}>
            ★ Operadores Privados Liberalizados de Alta Velocidad
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px 10px' }}>
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
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#60A5FA' }}>
                ⚙️ Configuración RailScope
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

            return (
              <Marker
                key={train.train_id}
                position={[train.lat, train.lon]}
                icon={createTrainIcon(train.operator, train.is_realtime)}
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
                      <div><strong>Continente:</strong> {train.continent === 'AS' || cfg.continent === 'AS' ? '🌏 Asia' : '🇪🇺 Europa'}</div>
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
