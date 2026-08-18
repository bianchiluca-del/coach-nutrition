import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

// Lecteur de codes-barres 1D produits (EAN-13, EAN-8, UPC) — pas du QR.
const buildBarcodeReader = () => {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  // 2e arg = options : scan ~10x/s (au lieu de 2x/s par defaut)
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100, delayBetweenScanSuccess: 500 });
};
import {
  Check, X, Send, RotateCcw, Loader2, Sparkles, ChevronDown, ChevronUp,
  Plus, Edit3, Trash2, ArrowRight, ArrowUp, ArrowDown, MessageCircle, AlertCircle, Brain,
  Repeat, CheckCircle2, LogOut, Mic, MicOff, Volume2, VolumeX
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import AccountSettings from './components/AccountSettings.jsx';
import { deleteFoodFavorite, favoriteToEntry, loadFoodFavorites, saveFoodFavorite } from './lib/foodFavorites';
import {
  loadCloudSnapshot,
  saveDailyStates,
  savePreferences,
  saveTracking,
} from './lib/cloudSync';

// Parse la valeur en grammes depuis une string comme "120 g", "400g", "2 pieces" etc.
function parseGrams(qtyStr) {
  if (!qtyStr) return null;
  const m = String(qtyStr).match(/^(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

// ===== BASE DE DONNÉES ALIMENTS (per 100g) — 863 aliments =====
const ALIMENTS_DB = {
  proteines: [
    {name:'Blanc de poulet', cal:111.0, p:24.0, g:0.0, l:1.2},
    {name:'Aiguillette de poulet', cal:111.0, p:24.0, g:0.0, l:1.2},
    {name:'Cuisse de poulet', cal:177.0, p:19.0, g:0.0, l:11.0},
    {name:'Pilon de poulet', cal:172.0, p:19.0, g:0.0, l:10.0},
    {name:'Aile de poulet', cal:200.0, p:18.0, g:0.0, l:14.0},
    {name:'Blanc de dinde', cal:109.0, p:24.0, g:0.0, l:1.0},
    {name:'Escalope de dinde', cal:109.0, p:24.0, g:0.0, l:1.0},
    {name:'Cuisse de dinde', cal:150.0, p:20.0, g:0.0, l:8.0},
    {name:'Magret de canard', cal:200.0, p:20.0, g:0.0, l:13.0},
    {name:'Cuisse de canard confite', cal:230.0, p:20.0, g:0.0, l:17.0},
    {name:'Filet mignon de porc', cal:120.0, p:22.0, g:0.0, l:3.0},
    {name:'Cote de porc', cal:242.0, p:20.0, g:0.0, l:18.0},
    {name:'Roti de porc degraisse', cal:145.0, p:21.0, g:0.0, l:6.0},
    {name:'Echine de porc', cal:250.0, p:18.0, g:0.0, l:20.0},
    {name:'Jarret de porc', cal:180.0, p:22.0, g:0.0, l:10.0},
    {name:'Noix de veau', cal:118.0, p:22.0, g:0.0, l:2.5},
    {name:'Escalope de veau', cal:114.0, p:22.0, g:0.0, l:2.0},
    {name:'Cote de veau', cal:168.0, p:21.0, g:0.0, l:9.0},
    {name:'Steak hache 5%', cal:133.0, p:21.0, g:0.0, l:5.0},
    {name:'Steak hache 10%', cal:176.0, p:20.0, g:0.0, l:10.0},
    {name:'Steak hache 15%', cal:215.0, p:19.0, g:0.0, l:15.0},
    {name:'Steak hache 20%', cal:254.0, p:18.0, g:0.0, l:20.0},
    {name:'Filet de boeuf', cal:126.0, p:22.0, g:0.0, l:4.0},
    {name:'Rumsteck', cal:127.0, p:22.0, g:0.0, l:4.0},
    {name:'Tende de tranche', cal:125.0, p:22.0, g:0.0, l:4.0},
    {name:'Rosbif', cal:125.0, p:22.0, g:0.0, l:4.0},
    {name:'Bavette', cal:145.0, p:22.0, g:0.0, l:7.0},
    {name:'Onglet', cal:165.0, p:21.0, g:0.0, l:10.0},
    {name:'Faux-filet', cal:185.0, p:21.0, g:0.0, l:12.0},
    {name:'Entrecote', cal:225.0, p:20.0, g:0.0, l:17.0},
    {name:'Carpaccio de boeuf', cal:120.0, p:22.0, g:0.0, l:4.0},
    {name:"Gigot d'agneau", cal:230.0, p:20.0, g:0.0, l:16.0},
    {name:"Cote d'agneau", cal:280.0, p:18.0, g:0.0, l:23.0},
    {name:"Souris d'agneau", cal:240.0, p:20.0, g:0.0, l:17.0},
    {name:'Lapin', cal:150.0, p:21.0, g:0.0, l:7.0},
    {name:'Viande de cheval', cal:110.0, p:21.0, g:0.0, l:2.5},
    {name:'Foie de boeuf', cal:135.0, p:20.0, g:4.0, l:4.0},
    {name:'Foie de volaille', cal:124.0, p:19.0, g:1.0, l:5.0},
    {name:'Cordon bleu', cal:240.0, p:15.0, g:12.0, l:15.0},
    {name:'Merguez', cal:280.0, p:15.0, g:2.0, l:24.0},
    {name:'Chipolata', cal:280.0, p:13.0, g:1.0, l:25.0},
    {name:'Saucisse de Toulouse', cal:290.0, p:14.0, g:1.0, l:26.0},
    {name:'Boudin noir', cal:380.0, p:14.0, g:3.0, l:35.0},
    {name:'Jambon blanc degraisse', cal:114.0, p:20.0, g:1.0, l:3.0},
    {name:'Jambon de dinde', cal:104.0, p:21.0, g:1.0, l:2.0},
    {name:'Jambon de poulet', cal:102.0, p:21.0, g:1.0, l:1.5},
    {name:'Jambon cru', cal:240.0, p:27.0, g:0.5, l:14.0},
    {name:'Jambon de Bayonne', cal:230.0, p:27.0, g:0.5, l:13.0},
    {name:'Bresaola', cal:151.0, p:32.0, g:0.0, l:2.0},
    {name:'Viande des Grisons', cal:155.0, p:35.0, g:0.0, l:2.0},
    {name:'Bacon', cal:215.0, p:22.0, g:1.0, l:14.0},
    {name:'Lardons', cal:280.0, p:14.0, g:1.0, l:25.0},
    {name:'Lardons alleges', cal:180.0, p:18.0, g:1.0, l:12.0},
    {name:'Saucisson sec', cal:460.0, p:24.0, g:2.0, l:40.0},
    {name:'Chorizo', cal:450.0, p:24.0, g:2.0, l:38.0},
    {name:'Rosette', cal:420.0, p:22.0, g:1.0, l:37.0},
    {name:'Mortadelle', cal:310.0, p:15.0, g:1.0, l:27.0},
    {name:'Pate de campagne', cal:280.0, p:13.0, g:2.0, l:24.0},
    {name:'Rillettes', cal:400.0, p:15.0, g:0.0, l:38.0},
    {name:'Terrine', cal:250.0, p:13.0, g:2.0, l:22.0},
    {name:'Andouille', cal:200.0, p:18.0, g:2.0, l:13.0},
    {name:'Cabillaud', cal:82.0, p:18.0, g:0.0, l:0.7},
    {name:'Colin', cal:85.0, p:18.0, g:0.0, l:1.0},
    {name:'Lieu noir', cal:90.0, p:19.0, g:0.0, l:1.0},
    {name:'Merlu', cal:86.0, p:18.0, g:0.0, l:1.0},
    {name:'Sole', cal:83.0, p:18.0, g:0.0, l:1.0},
    {name:'Dorade', cal:96.0, p:20.0, g:0.0, l:2.0},
    {name:'Bar', cal:97.0, p:20.0, g:0.0, l:2.0},
    {name:'Limande', cal:78.0, p:17.0, g:0.0, l:1.0},
    {name:'Plie', cal:79.0, p:17.0, g:0.0, l:1.0},
    {name:'Raie', cal:90.0, p:20.0, g:0.0, l:1.0},
    {name:'Julienne', cal:80.0, p:18.0, g:0.0, l:0.8},
    {name:'Eglefin', cal:80.0, p:18.0, g:0.0, l:0.5},
    {name:'Lotte', cal:76.0, p:16.0, g:0.0, l:0.7},
    {name:'Rouget', cal:115.0, p:19.0, g:0.0, l:4.0},
    {name:'Saint-Pierre', cal:95.0, p:19.0, g:0.0, l:2.0},
    {name:'Espadon', cal:140.0, p:20.0, g:0.0, l:6.0},
    {name:'Fletan', cal:110.0, p:21.0, g:0.0, l:2.5},
    {name:'Thon frais', cal:132.0, p:28.0, g:0.0, l:1.0},
    {name:'Thon au naturel egoutte', cal:116.0, p:26.0, g:0.0, l:1.0},
    {name:"Thon a l'huile egoutte", cal:190.0, p:25.0, g:0.0, l:10.0},
    {name:'Saumon', cal:208.0, p:22.0, g:0.0, l:13.0},
    {name:'Saumon fume', cal:184.0, p:25.0, g:0.0, l:10.0},
    {name:'Truite', cal:190.0, p:22.0, g:0.0, l:11.0},
    {name:'Truite fumee', cal:160.0, p:24.0, g:0.0, l:7.0},
    {name:'Maquereau', cal:205.0, p:20.0, g:0.0, l:14.0},
    {name:'Sardines', cal:208.0, p:25.0, g:0.0, l:11.0},
    {name:"Sardines a l'huile", cal:220.0, p:24.0, g:0.0, l:14.0},
    {name:'Hareng', cal:220.0, p:18.0, g:0.0, l:16.0},
    {name:'Hareng fume', cal:215.0, p:20.0, g:0.0, l:15.0},
    {name:'Anchois', cal:130.0, p:20.0, g:0.0, l:5.0},
    {name:'Surimi', cal:95.0, p:8.0, g:12.0, l:1.0},
    {name:'Crevettes', cal:99.0, p:24.0, g:0.0, l:0.5},
    {name:'Gambas', cal:90.0, p:20.0, g:0.0, l:1.0},
    {name:'Saint-Jacques', cal:88.0, p:17.0, g:2.0, l:1.0},
    {name:'Moules', cal:86.0, p:12.0, g:4.0, l:2.0},
    {name:'Calamars', cal:92.0, p:16.0, g:3.0, l:1.0},
    {name:'Poulpe', cal:82.0, p:15.0, g:2.0, l:1.0},
    {name:'Huitres', cal:68.0, p:9.0, g:4.0, l:2.0},
    {name:'Crabe', cal:83.0, p:18.0, g:0.0, l:1.0},
    {name:'Homard', cal:90.0, p:19.0, g:0.0, l:1.0},
    {name:'Langoustine', cal:90.0, p:20.0, g:0.0, l:1.0},
    {name:'Bulots', cal:100.0, p:21.0, g:3.0, l:0.5},
    {name:'Oeuf entier', cal:143.0, p:13.0, g:1.0, l:10.0},
    {name:"Blanc d'oeuf", cal:52.0, p:11.0, g:0.7, l:0.0},
    {name:"Jaune d'oeuf", cal:322.0, p:16.0, g:0.6, l:28.0},
    {name:'Oeuf de caille', cal:158.0, p:13.0, g:0.4, l:11.0},
    {name:'Omelette nature', cal:154.0, p:11.0, g:1.0, l:12.0},
    {name:'Tofu nature', cal:120.0, p:12.0, g:2.0, l:7.0},
    {name:'Tofu ferme', cal:145.0, p:16.0, g:2.0, l:8.0},
    {name:'Tofu soyeux', cal:55.0, p:6.0, g:2.0, l:3.0},
    {name:'Tofu fume', cal:150.0, p:16.0, g:2.0, l:9.0},
    {name:'Tempeh', cal:190.0, p:19.0, g:9.0, l:11.0},
    {name:'Seitan', cal:130.0, p:25.0, g:4.0, l:2.0},
    {name:'Edamame', cal:121.0, p:12.0, g:9.0, l:5.0},
    {name:'Proteine de soja texturee (seche)', cal:345.0, p:50.0, g:30.0, l:1.0},
    {name:'Steak vegetal soja', cal:170.0, p:17.0, g:6.0, l:8.0},
    {name:'Falafel', cal:330.0, p:13.0, g:32.0, l:18.0},
    {name:'Whey isolate', cal:370.0, p:85.0, g:3.0, l:1.0},
    {name:'Whey concentree', cal:400.0, p:78.0, g:7.0, l:6.0},
    {name:'Caseine', cal:360.0, p:80.0, g:5.0, l:2.0},
    {name:'Proteine vegetale poudre', cal:370.0, p:75.0, g:8.0, l:4.0},
    {name:'Proteine de pois poudre', cal:380.0, p:80.0, g:5.0, l:5.0},
    {name:'Gainer poudre', cal:380.0, p:25.0, g:55.0, l:6.0},
    {name:'Barre proteinee', cal:350.0, p:32.0, g:30.0, l:10.0},
    {name:'Haddock fume', cal:100.0, p:23.0, g:0.0, l:1.0},
    {name:'Tilapia', cal:96.0, p:20.0, g:0.0, l:2.0},
    {name:'Pangasius', cal:90.0, p:15.0, g:0.0, l:3.0},
    {name:'Perche', cal:91.0, p:19.0, g:0.0, l:1.5},
    {name:'Sandre', cal:83.0, p:19.0, g:0.0, l:0.7},
    {name:'Brochet', cal:80.0, p:18.0, g:0.0, l:0.7},
    {name:'Carrelet', cal:79.0, p:17.0, g:0.0, l:1.0},
    {name:'Lieu jaune', cal:90.0, p:19.0, g:0.0, l:1.0},
    {name:'Merou', cal:92.0, p:20.0, g:0.0, l:1.0},
    {name:'Vivaneau', cal:100.0, p:20.0, g:0.0, l:1.5},
    {name:'Saumon mi-cuit', cal:220.0, p:22.0, g:0.0, l:15.0},
    {name:'Oeufs de saumon', cal:250.0, p:29.0, g:3.0, l:13.0},
    {name:'Tarama', cal:480.0, p:9.0, g:4.0, l:47.0},
    {name:'Foie gras', cal:460.0, p:9.0, g:4.0, l:45.0},
    {name:'Rollmops', cal:180.0, p:14.0, g:4.0, l:12.0},
    {name:'Coppa', cal:380.0, p:28.0, g:1.0, l:30.0},
    {name:'Pancetta', cal:300.0, p:15.0, g:1.0, l:27.0},
    {name:'Speck', cal:280.0, p:26.0, g:0.5, l:19.0},
    {name:'Magret seche', cal:350.0, p:30.0, g:1.0, l:26.0},
    {name:'Gesier confit', cal:140.0, p:27.0, g:1.0, l:4.0},
    {name:'Hache de dinde', cal:150.0, p:19.0, g:0.0, l:8.0},
    {name:'Hache de poulet', cal:143.0, p:20.0, g:0.0, l:7.0},
    {name:'Boulettes de boeuf', cal:240.0, p:16.0, g:6.0, l:17.0},
    {name:'Saute de porc', cal:150.0, p:22.0, g:0.0, l:7.0},
    {name:'Travers de porc', cal:280.0, p:17.0, g:0.0, l:24.0},
    {name:'Escalope panee (cuite)', cal:220.0, p:15.0, g:14.0, l:12.0},
    {name:'Brochette de poulet marinee', cal:130.0, p:22.0, g:2.0, l:4.0},
    {name:'Proteine de chanvre poudre', cal:380.0, p:50.0, g:10.0, l:10.0},
    {name:'Spiruline', cal:290.0, p:57.0, g:24.0, l:8.0},
    {name:'Tofu lacto-fermente', cal:130.0, p:13.0, g:2.0, l:8.0},
    {name:'Hache vegetal', cal:180.0, p:18.0, g:5.0, l:9.0},
    {name:'Boulettes vegetales', cal:200.0, p:15.0, g:8.0, l:11.0},
    {name:'Nuggets vege', cal:220.0, p:13.0, g:15.0, l:12.0},
    {name:'Galette de pois chiches', cal:250.0, p:9.0, g:30.0, l:10.0},
  ],
  fromages: [
    {name:'Carre Frais 0%', cal:25.0, p:4.0, g:2.0, l:0.0},
    {name:'Carre Frais', cal:91.0, p:8.0, g:3.0, l:6.0},
    {name:'Fromage de chevre frais', cal:220.0, p:14.0, g:2.0, l:17.0},
    {name:'Buche de chevre', cal:290.0, p:20.0, g:1.0, l:23.0},
    {name:'Chevre sec', cal:360.0, p:25.0, g:1.0, l:29.0},
    {name:'Crottin de Chavignol', cal:290.0, p:19.0, g:1.0, l:24.0},
    {name:'Camembert', cal:265.0, p:20.0, g:0.5, l:21.0},
    {name:'Brie', cal:280.0, p:21.0, g:0.5, l:23.0},
    {name:'Coulommiers', cal:280.0, p:20.0, g:1.0, l:23.0},
    {name:'Caprice des Dieux', cal:310.0, p:16.0, g:1.0, l:27.0},
    {name:'Saint Moret', cal:245.0, p:7.0, g:4.0, l:24.0},
    {name:'Tartare nature', cal:250.0, p:7.0, g:4.0, l:25.0},
    {name:'Boursin', cal:410.0, p:8.0, g:3.0, l:40.0},
    {name:'Kiri', cal:305.0, p:10.0, g:4.0, l:28.0},
    {name:'Vache Qui Rit', cal:270.0, p:11.0, g:6.0, l:22.0},
    {name:'Cancoillotte', cal:120.0, p:12.0, g:3.0, l:7.0},
    {name:'Babybel classique', cal:290.0, p:22.0, g:0.0, l:22.0},
    {name:'Mozzarella', cal:255.0, p:18.0, g:1.0, l:20.0},
    {name:'Burrata', cal:300.0, p:12.0, g:2.0, l:27.0},
    {name:'Ricotta', cal:174.0, p:11.0, g:3.0, l:13.0},
    {name:'Feta', cal:265.0, p:14.0, g:4.0, l:21.0},
    {name:'Halloumi', cal:320.0, p:22.0, g:2.0, l:25.0},
    {name:'Provolone', cal:350.0, p:26.0, g:2.0, l:27.0},
    {name:'Mascarpone', cal:355.0, p:4.0, g:4.0, l:37.0},
    {name:'Emmental', cal:380.0, p:28.0, g:1.0, l:29.0},
    {name:'Gruyere', cal:410.0, p:29.0, g:0.0, l:33.0},
    {name:'Comte', cal:415.0, p:28.0, g:0.0, l:34.0},
    {name:'Beaufort', cal:410.0, p:27.0, g:0.0, l:33.0},
    {name:'Cantal', cal:385.0, p:25.0, g:1.0, l:31.0},
    {name:'Tomme de Savoie', cal:330.0, p:25.0, g:1.0, l:25.0},
    {name:'Tomme de chevre', cal:360.0, p:24.0, g:1.0, l:29.0},
    {name:'Mimolette', cal:380.0, p:26.0, g:0.0, l:30.0},
    {name:'Edam', cal:330.0, p:25.0, g:1.0, l:25.0},
    {name:'Leerdammer', cal:370.0, p:27.0, g:0.0, l:29.0},
    {name:'Gouda', cal:360.0, p:25.0, g:2.0, l:28.0},
    {name:'Cheddar', cal:410.0, p:25.0, g:1.0, l:34.0},
    {name:'Parmesan', cal:392.0, p:35.0, g:3.0, l:28.0},
    {name:'Pecorino', cal:390.0, p:28.0, g:1.0, l:30.0},
    {name:'Ossau-Iraty', cal:400.0, p:26.0, g:0.0, l:33.0},
    {name:'Saint-Nectaire', cal:340.0, p:24.0, g:1.0, l:27.0},
    {name:'Morbier', cal:350.0, p:22.0, g:0.0, l:29.0},
    {name:'Raclette', cal:350.0, p:23.0, g:1.0, l:28.0},
    {name:'Reblochon', cal:330.0, p:21.0, g:1.0, l:27.0},
    {name:'Munster', cal:320.0, p:20.0, g:1.0, l:26.0},
    {name:'Maroilles', cal:340.0, p:20.0, g:1.0, l:28.0},
    {name:"Pont-l'Eveque", cal:330.0, p:21.0, g:1.0, l:27.0},
    {name:'Livarot', cal:290.0, p:20.0, g:1.0, l:23.0},
    {name:'Epoisses', cal:320.0, p:18.0, g:1.0, l:27.0},
    {name:'Chaource', cal:320.0, p:17.0, g:1.0, l:28.0},
    {name:'Vacherin', cal:320.0, p:18.0, g:1.0, l:27.0},
    {name:'Saint-Marcellin', cal:280.0, p:16.0, g:1.0, l:24.0},
    {name:'Brillat-Savarin', cal:480.0, p:12.0, g:2.0, l:47.0},
    {name:'Roquefort', cal:370.0, p:21.0, g:2.0, l:31.0},
    {name:"Bleu d'Auvergne", cal:350.0, p:20.0, g:2.0, l:29.0},
    {name:"Fourme d'Ambert", cal:330.0, p:19.0, g:2.0, l:27.0},
    {name:'Saint-Agur', cal:370.0, p:19.0, g:1.0, l:33.0},
    {name:'Gorgonzola', cal:330.0, p:19.0, g:0.0, l:28.0},
    {name:'Stilton', cal:410.0, p:24.0, g:0.0, l:35.0},
    {name:'Port-Salut', cal:330.0, p:23.0, g:0.0, l:27.0},
    {name:'Saint-Paulin', cal:300.0, p:24.0, g:0.0, l:23.0},
    {name:'Tomme noire', cal:330.0, p:24.0, g:1.0, l:26.0},
    {name:'Chevre cendre', cal:290.0, p:19.0, g:1.0, l:24.0},
    {name:'Fromage a tartiner allege', cal:130.0, p:11.0, g:5.0, l:7.0},
    {name:'Tomme de brebis', cal:400.0, p:26.0, g:0.0, l:33.0},
    {name:'Manchego', cal:390.0, p:27.0, g:0.5, l:32.0},
    {name:'Apericube', cal:280.0, p:18.0, g:2.0, l:22.0},
    {name:'Vache Qui Rit light', cal:180.0, p:13.0, g:8.0, l:10.0},
    {name:'Tete de moine', cal:410.0, p:26.0, g:0.0, l:34.0},
    {name:'Appenzeller', cal:400.0, p:27.0, g:0.0, l:33.0},
    {name:'Sbrinz', cal:420.0, p:30.0, g:0.0, l:34.0},
    {name:'Fromage de brebis frais', cal:215.0, p:13.0, g:3.0, l:16.0},
  ],
  laitiers: [
    {name:'Skyr nature', cal:63.0, p:11.0, g:4.0, l:0.2},
    {name:'Skyr vanille', cal:70.0, p:10.0, g:6.0, l:0.2},
    {name:'Skyr a boire', cal:60.0, p:8.0, g:6.0, l:0.2},
    {name:'Fromage blanc 0%', cal:47.0, p:8.0, g:4.0, l:0.2},
    {name:'Fromage blanc 3%', cal:73.0, p:7.5, g:4.0, l:3.0},
    {name:'Fromage blanc 40%MG', cal:115.0, p:7.0, g:4.0, l:8.0},
    {name:'Fromage blanc battu nature', cal:75.0, p:7.5, g:4.0, l:3.0},
    {name:'Faisselle', cal:75.0, p:7.0, g:4.0, l:3.0},
    {name:'Petit-suisse 0%', cal:75.0, p:11.0, g:4.0, l:0.2},
    {name:'Petit-suisse nature', cal:142.0, p:9.0, g:4.0, l:9.0},
    {name:'Cottage cheese', cal:98.0, p:11.0, g:3.4, l:4.3},
    {name:'Yaourt nature', cal:61.0, p:3.5, g:5.0, l:3.3},
    {name:'Yaourt nature 0%', cal:45.0, p:4.5, g:6.0, l:0.1},
    {name:'Yaourt grec 0%', cal:57.0, p:10.0, g:4.0, l:0.2},
    {name:'Yaourt grec entier', cal:97.0, p:9.0, g:4.0, l:5.0},
    {name:'Yaourt a la grecque', cal:120.0, p:4.0, g:8.0, l:8.0},
    {name:'Yaourt aux fruits', cal:90.0, p:3.5, g:15.0, l:2.0},
    {name:'Yaourt a boire', cal:70.0, p:3.0, g:12.0, l:1.5},
    {name:'Kefir', cal:40.0, p:3.3, g:4.0, l:1.0},
    {name:'Lait ecreme', cal:35.0, p:3.4, g:5.0, l:0.1},
    {name:'Lait demi-ecreme', cal:46.0, p:3.3, g:4.8, l:1.5},
    {name:'Lait entier', cal:64.0, p:3.2, g:4.8, l:3.6},
    {name:'Lait en poudre ecreme', cal:360.0, p:35.0, g:52.0, l:1.0},
    {name:'Lait concentre non sucre', cal:135.0, p:7.0, g:10.0, l:7.5},
    {name:'Lait concentre sucre', cal:330.0, p:8.0, g:55.0, l:8.0},
    {name:'Creme dessert', cal:120.0, p:3.0, g:19.0, l:4.0},
    {name:'Riz au lait', cal:130.0, p:3.5, g:22.0, l:3.0},
    {name:'Flan / creme caramel', cal:110.0, p:3.0, g:19.0, l:2.5},
    {name:'Yaourt soja nature', cal:50.0, p:4.0, g:2.0, l:2.5},
    {name:'Yaourt coco', cal:130.0, p:1.5, g:10.0, l:9.0},
    {name:"Lait d'amande nss", cal:14.0, p:0.4, g:0.3, l:1.1},
    {name:'Lait de soja nature', cal:42.0, p:3.3, g:1.0, l:1.8},
    {name:"Lait d'avoine", cal:45.0, p:1.0, g:7.0, l:1.5},
    {name:'Boisson de riz', cal:50.0, p:0.1, g:10.0, l:1.0},
    {name:'Lait de coco (conserve)', cal:190.0, p:2.0, g:3.0, l:19.0},
    {name:'Lait ribot / babeurre', cal:40.0, p:3.3, g:4.7, l:0.9},
    {name:'Lait de chevre', cal:70.0, p:3.4, g:4.4, l:4.1},
    {name:'Lait de brebis', cal:95.0, p:5.5, g:4.8, l:6.0},
    {name:'Lait sans lactose', cal:46.0, p:3.3, g:4.8, l:1.5},
    {name:'Yaourt 0% aromatise', cal:50.0, p:4.3, g:8.0, l:0.1},
    {name:'Yaourt brasse', cal:80.0, p:3.5, g:13.0, l:1.5},
    {name:'Skyr aux fruits', cal:70.0, p:9.0, g:8.0, l:0.2},
    {name:'Fromage blanc aux fruits', cal:90.0, p:6.0, g:12.0, l:2.0},
    {name:'Creme dessert proteinee', cal:80.0, p:8.0, g:9.0, l:1.0},
    {name:'Yaourt vegetal amande', cal:60.0, p:1.0, g:6.0, l:3.0},
    {name:'Lait de noisette', cal:30.0, p:0.4, g:3.0, l:1.6},
    {name:'Boisson soja chocolat', cal:75.0, p:3.0, g:11.0, l:2.0},
    {name:'Mousse au chocolat', cal:200.0, p:4.0, g:25.0, l:9.0},
  ],
  legumes: [
    {name:'Artichaut', cal:47.0, p:3.3, g:10.5, l:0.2},
    {name:'Asperge', cal:24.0, p:2.7, g:2.0, l:0.3},
    {name:'Aubergine', cal:25.0, p:1.0, g:4.8, l:0.2},
    {name:'Avocat', cal:169.0, p:2.0, g:1.8, l:15.4},
    {name:'Betterave cuite', cal:42.0, p:1.5, g:8.4, l:0.1},
    {name:'Blette', cal:21.0, p:1.8, g:2.7, l:0.2},
    {name:'Brocoli', cal:34.0, p:2.8, g:4.4, l:0.4},
    {name:'Carotte', cal:36.0, p:0.8, g:7.7, l:0.2},
    {name:'Celeri branche', cal:18.0, p:0.9, g:2.5, l:0.2},
    {name:'Celeri rave', cal:32.0, p:1.2, g:5.0, l:0.3},
    {name:'Champignon de Paris', cal:22.0, p:3.1, g:0.8, l:0.3},
    {name:'Champignon shiitake', cal:35.0, p:2.5, g:5.0, l:0.5},
    {name:'Champignon pleurote', cal:33.0, p:3.3, g:4.0, l:0.4},
    {name:'Cepe', cal:30.0, p:3.5, g:3.0, l:0.4},
    {name:'Girolle', cal:25.0, p:2.0, g:3.0, l:0.4},
    {name:'Chou blanc', cal:28.0, p:1.4, g:4.9, l:0.2},
    {name:'Chou chinois', cal:16.0, p:1.2, g:1.8, l:0.2},
    {name:'Chou fleur', cal:24.0, p:1.9, g:2.4, l:0.3},
    {name:'Chou kale', cal:43.0, p:3.3, g:5.2, l:0.7},
    {name:'Chou rouge', cal:31.0, p:1.4, g:5.1, l:0.2},
    {name:'Chou de Bruxelles', cal:43.0, p:3.4, g:5.2, l:0.5},
    {name:'Chou romanesco', cal:30.0, p:2.7, g:3.0, l:0.4},
    {name:'Chou-rave', cal:27.0, p:1.7, g:4.0, l:0.1},
    {name:'Concombre', cal:15.0, p:0.7, g:2.2, l:0.1},
    {name:'Cornichon', cal:14.0, p:0.5, g:1.9, l:0.2},
    {name:'Courge butternut', cal:45.0, p:1.0, g:8.8, l:0.1},
    {name:'Courge spaghetti', cal:30.0, p:0.6, g:6.0, l:0.3},
    {name:'Courgette', cal:17.0, p:1.2, g:2.1, l:0.3},
    {name:'Endive', cal:17.0, p:1.3, g:1.5, l:0.2},
    {name:'Epinards', cal:23.0, p:2.7, g:1.4, l:0.4},
    {name:'Fenouil', cal:23.0, p:1.2, g:3.0, l:0.2},
    {name:'Feve fraiche', cal:60.0, p:5.0, g:8.0, l:0.6},
    {name:'Haricots verts', cal:31.0, p:1.8, g:4.1, l:0.2},
    {name:'Haricot beurre', cal:30.0, p:1.8, g:4.0, l:0.2},
    {name:'Laitue', cal:14.0, p:1.2, g:1.3, l:0.2},
    {name:'Mache', cal:19.0, p:2.0, g:1.3, l:0.4},
    {name:'Navet', cal:28.0, p:0.9, g:5.1, l:0.2},
    {name:'Oignon', cal:40.0, p:1.1, g:7.9, l:0.1},
    {name:'Echalote', cal:75.0, p:2.5, g:16.0, l:0.2},
    {name:'Ail', cal:130.0, p:6.0, g:28.0, l:0.5},
    {name:'Gingembre frais', cal:80.0, p:1.8, g:15.0, l:0.8},
    {name:'Patisson', cal:18.0, p:1.2, g:2.7, l:0.2},
    {name:'Panais', cal:75.0, p:1.2, g:13.0, l:0.5},
    {name:'Rutabaga', cal:35.0, p:1.0, g:8.0, l:0.2},
    {name:'Salsifis', cal:70.0, p:1.5, g:13.0, l:0.3},
    {name:'Petit pois', cal:81.0, p:5.4, g:10.6, l:0.4},
    {name:'Poireau', cal:31.0, p:1.6, g:5.0, l:0.3},
    {name:'Poivron rouge', cal:31.0, p:1.0, g:4.6, l:0.3},
    {name:'Poivron vert', cal:21.0, p:0.9, g:2.9, l:0.2},
    {name:'Poivron jaune', cal:30.0, p:1.0, g:5.0, l:0.2},
    {name:'Piment', cal:40.0, p:2.0, g:9.0, l:0.4},
    {name:'Potimarron', cal:34.0, p:1.5, g:5.6, l:0.3},
    {name:'Potiron', cal:26.0, p:1.0, g:4.9, l:0.1},
    {name:'Radis', cal:16.0, p:0.7, g:2.0, l:0.1},
    {name:'Roquette', cal:25.0, p:2.6, g:2.1, l:0.7},
    {name:'Salade verte', cal:15.0, p:1.3, g:1.5, l:0.2},
    {name:'Mesclun', cal:17.0, p:1.5, g:1.5, l:0.3},
    {name:"Pousses d'epinards", cal:23.0, p:2.7, g:1.4, l:0.4},
    {name:'Cresson', cal:21.0, p:2.6, g:1.3, l:0.3},
    {name:'Pourpier', cal:20.0, p:2.0, g:3.0, l:0.4},
    {name:'Tomate', cal:18.0, p:0.9, g:2.6, l:0.2},
    {name:'Tomates cerises', cal:23.0, p:1.1, g:3.5, l:0.2},
    {name:"Tomate sechee a l'huile", cal:230.0, p:5.0, g:12.0, l:18.0},
    {name:'Topinambour', cal:73.0, p:2.0, g:14.0, l:0.1},
    {name:'Coeur de palmier', cal:36.0, p:2.7, g:3.9, l:0.6},
    {name:'Olives vertes', cal:145.0, p:1.0, g:4.0, l:15.0},
    {name:'Olives noires', cal:160.0, p:1.5, g:4.0, l:15.0},
    {name:'Persil', cal:36.0, p:3.0, g:6.0, l:0.8},
    {name:'Coriandre', cal:23.0, p:2.0, g:3.7, l:0.5},
    {name:'Basilic', cal:23.0, p:3.2, g:2.7, l:0.6},
    {name:'Ciboulette', cal:30.0, p:3.3, g:4.0, l:0.7},
    {name:'Menthe', cal:44.0, p:3.8, g:8.0, l:0.7},
    {name:'Wakame', cal:45.0, p:3.0, g:9.0, l:0.6},
    {name:'Betterave crue', cal:43.0, p:1.6, g:8.8, l:0.2},
    {name:'Radis noir', cal:20.0, p:1.0, g:4.0, l:0.1},
    {name:'Daikon', cal:18.0, p:0.6, g:4.0, l:0.1},
    {name:'Crosne', cal:75.0, p:2.0, g:15.0, l:0.2},
    {name:'Bok choy', cal:13.0, p:1.5, g:1.2, l:0.2},
    {name:'Gombo', cal:33.0, p:2.0, g:7.0, l:0.2},
    {name:'Pissenlit', cal:45.0, p:2.7, g:9.0, l:0.7},
    {name:'Ortie', cal:42.0, p:5.5, g:7.0, l:0.5},
    {name:'Fleur de courgette', cal:17.0, p:1.2, g:2.0, l:0.3},
    {name:'Champignon morille', cal:30.0, p:3.0, g:4.0, l:0.4},
    {name:'Champignon enoki', cal:37.0, p:2.7, g:8.0, l:0.3},
    {name:'Truffe', cal:90.0, p:6.0, g:10.0, l:0.5},
    {name:'Tomate verte', cal:23.0, p:1.2, g:5.0, l:0.2},
    {name:'Choucroute crue', cal:19.0, p:1.0, g:3.0, l:0.1},
    {name:'Choucroute cuite', cal:25.0, p:1.2, g:4.0, l:0.3},
    {name:'Cardon', cal:20.0, p:1.4, g:4.0, l:0.1},
    {name:'Chayotte', cal:19.0, p:0.8, g:4.5, l:0.1},
  ],
  feculents: [
    {name:'Riz basmati cru', cal:351.0, p:8.0, g:78.0, l:0.8},
    {name:'Riz basmati cuit', cal:130.0, p:2.7, g:28.0, l:0.3},
    {name:'Riz complet cru', cal:350.0, p:8.0, g:74.0, l:2.5},
    {name:'Riz complet cuit', cal:123.0, p:2.9, g:25.0, l:1.0},
    {name:'Riz thai cru', cal:352.0, p:7.0, g:79.0, l:0.6},
    {name:'Riz thai cuit', cal:130.0, p:2.5, g:28.0, l:0.3},
    {name:'Riz rond cru', cal:356.0, p:7.0, g:80.0, l:0.5},
    {name:'Riz sushi cuit', cal:140.0, p:2.6, g:30.0, l:0.2},
    {name:'Riz jasmin cuit', cal:130.0, p:2.7, g:28.0, l:0.3},
    {name:'Riz noir cuit', cal:130.0, p:3.5, g:26.0, l:1.0},
    {name:'Pates blanches crues', cal:353.0, p:12.0, g:71.0, l:1.5},
    {name:'Pates blanches cuites', cal:158.0, p:5.8, g:30.0, l:0.9},
    {name:'Pates completes crues', cal:348.0, p:13.0, g:67.0, l:2.5},
    {name:'Pates completes cuites', cal:149.0, p:5.5, g:27.0, l:1.0},
    {name:'Pates semi-completes crues', cal:350.0, p:13.0, g:69.0, l:2.0},
    {name:'Spaghetti crus', cal:353.0, p:12.0, g:71.0, l:1.5},
    {name:'Spaghetti cuits', cal:158.0, p:5.8, g:30.0, l:0.9},
    {name:'Tagliatelles crues', cal:356.0, p:12.0, g:71.0, l:2.0},
    {name:'Tagliatelles cuites', cal:160.0, p:6.0, g:30.0, l:1.0},
    {name:'Pates sans gluten cuites', cal:150.0, p:3.0, g:32.0, l:0.8},
    {name:'Lasagnes (plaque cuite)', cal:160.0, p:5.5, g:30.0, l:1.5},
    {name:'Gnocchi', cal:160.0, p:3.5, g:32.0, l:1.5},
    {name:'Nouilles chinoises cuites', cal:138.0, p:4.5, g:25.0, l:2.0},
    {name:'Nouilles de riz cuites', cal:110.0, p:1.8, g:25.0, l:0.2},
    {name:'Nouilles soba cuites', cal:99.0, p:5.0, g:21.0, l:0.1},
    {name:'Raviolis (boite)', cal:90.0, p:3.5, g:13.0, l:2.5},
    {name:'Semoule crue', cal:360.0, p:12.0, g:73.0, l:1.5},
    {name:'Semoule cuite', cal:112.0, p:3.8, g:23.0, l:0.2},
    {name:'Couscous cuit', cal:112.0, p:3.8, g:23.0, l:0.2},
    {name:'Boulgour cru', cal:342.0, p:12.0, g:69.0, l:1.3},
    {name:'Boulgour cuit', cal:83.0, p:3.1, g:18.0, l:0.2},
    {name:'Quinoa cru', cal:368.0, p:14.0, g:64.0, l:6.0},
    {name:'Quinoa cuit', cal:120.0, p:4.4, g:21.0, l:1.9},
    {name:'Sarrasin cru', cal:343.0, p:13.0, g:71.0, l:3.5},
    {name:'Sarrasin cuit', cal:110.0, p:3.4, g:21.0, l:0.6},
    {name:'Ebly cru', cal:341.0, p:11.0, g:69.0, l:2.0},
    {name:'Ebly cuit', cal:125.0, p:4.5, g:25.0, l:0.8},
    {name:'Orge perle cru', cal:352.0, p:10.0, g:73.0, l:1.5},
    {name:'Orge perle cuit', cal:123.0, p:2.3, g:28.0, l:0.4},
    {name:'Millet cuit', cal:120.0, p:3.5, g:23.0, l:1.0},
    {name:'Epeautre cuit', cal:130.0, p:5.0, g:25.0, l:1.0},
    {name:'Polenta crue', cal:359.0, p:8.0, g:79.0, l:1.5},
    {name:'Polenta cuite', cal:70.0, p:1.7, g:15.0, l:0.3},
    {name:"Flocons d'avoine", cal:372.0, p:13.0, g:60.0, l:7.0},
    {name:"Son d'avoine", cal:246.0, p:17.0, g:23.0, l:7.0},
    {name:'Muesli nature', cal:370.0, p:11.0, g:63.0, l:7.0},
    {name:'Granola nature', cal:450.0, p:10.0, g:60.0, l:15.0},
    {name:'Corn flakes', cal:380.0, p:7.0, g:84.0, l:0.9},
    {name:'Cereales chocolat', cal:385.0, p:6.0, g:78.0, l:5.0},
    {name:'Petales de ble complet', cal:350.0, p:9.0, g:72.0, l:2.0},
    {name:'Riz souffle', cal:385.0, p:6.0, g:87.0, l:1.0},
    {name:'Pop-corn nature', cal:387.0, p:12.0, g:78.0, l:4.0},
    {name:'Pommes de terre', cal:80.0, p:2.0, g:17.0, l:0.1},
    {name:'Pommes de terre vapeur', cal:80.0, p:2.0, g:17.0, l:0.1},
    {name:'Pommes de terre au four', cal:93.0, p:2.5, g:21.0, l:0.1},
    {name:'Pomme de terre grenaille', cal:82.0, p:2.0, g:18.0, l:0.1},
    {name:'Puree de pommes de terre en flocons', cal:360.0, p:8.0, g:78.0, l:0.5},
    {name:'Patate douce', cal:86.0, p:1.6, g:20.0, l:0.1},
    {name:'Patate douce cuite', cal:90.0, p:1.6, g:21.0, l:0.1},
    {name:'Igname cuite', cal:116.0, p:1.5, g:28.0, l:0.1},
    {name:'Manioc cuit', cal:160.0, p:1.4, g:38.0, l:0.3},
    {name:'Plantain cuit', cal:122.0, p:1.0, g:32.0, l:0.4},
    {name:'Chataigne cuite', cal:180.0, p:3.0, g:36.0, l:1.5},
    {name:'Mais doux egoutte', cal:96.0, p:3.4, g:16.0, l:1.5},
    {name:'Pain blanc', cal:265.0, p:8.0, g:55.0, l:1.5},
    {name:'Pain complet', cal:247.0, p:9.0, g:43.0, l:3.0},
    {name:'Pain aux cereales', cal:255.0, p:9.0, g:45.0, l:4.0},
    {name:'Pain de mie blanc', cal:275.0, p:8.0, g:49.0, l:4.0},
    {name:'Pain de mie complet', cal:255.0, p:10.0, g:42.0, l:4.0},
    {name:'Pain de seigle', cal:250.0, p:8.0, g:48.0, l:2.0},
    {name:'Baguette', cal:278.0, p:8.0, g:58.0, l:1.0},
    {name:'Pain pita', cal:275.0, p:9.0, g:55.0, l:1.5},
    {name:'Pain naan', cal:310.0, p:8.0, g:50.0, l:8.0},
    {name:'Pain burger', cal:280.0, p:9.0, g:48.0, l:5.0},
    {name:'Pain au lait', cal:350.0, p:8.0, g:55.0, l:11.0},
    {name:'Pain suedois', cal:290.0, p:9.0, g:55.0, l:4.0},
    {name:'Biscotte', cal:390.0, p:11.0, g:72.0, l:6.0},
    {name:'Pain azyme', cal:380.0, p:11.0, g:77.0, l:2.0},
    {name:'Wrap ble', cal:320.0, p:9.0, g:54.0, l:7.0},
    {name:'Tortilla ble', cal:315.0, p:8.0, g:52.0, l:7.0},
    {name:'Tortilla mais', cal:220.0, p:6.0, g:44.0, l:3.0},
    {name:'Galette sarrasin', cal:210.0, p:6.0, g:40.0, l:1.5},
    {name:'Galette de riz', cal:385.0, p:8.0, g:81.0, l:3.0},
    {name:'Galette de mais', cal:380.0, p:7.0, g:82.0, l:3.0},
    {name:'Cracker', cal:430.0, p:9.0, g:65.0, l:15.0},
    {name:'Crackotte', cal:385.0, p:10.0, g:75.0, l:4.0},
    {name:'Chapelure', cal:350.0, p:12.0, g:72.0, l:2.0},
    {name:'Lentilles vertes cuites', cal:116.0, p:9.0, g:20.0, l:0.4},
    {name:'Lentilles corail crues', cal:340.0, p:25.0, g:52.0, l:1.5},
    {name:'Lentilles corail cuites', cal:115.0, p:9.0, g:20.0, l:0.4},
    {name:'Pois chiches cuits', cal:164.0, p:9.0, g:27.0, l:3.0},
    {name:'Pois casses cuits', cal:118.0, p:8.0, g:20.0, l:0.4},
    {name:'Haricots rouges cuits', cal:127.0, p:9.0, g:22.0, l:0.5},
    {name:'Haricots blancs cuits', cal:114.0, p:8.0, g:20.0, l:0.6},
    {name:'Haricots noirs cuits', cal:130.0, p:9.0, g:24.0, l:0.5},
    {name:'Flageolets cuits', cal:95.0, p:7.0, g:16.0, l:0.5},
    {name:'Feves cuites', cal:110.0, p:8.0, g:16.0, l:0.6},
    {name:'Soja jaune cuit', cal:145.0, p:13.0, g:9.0, l:7.0},
    {name:'Pois chiches grilles', cal:364.0, p:19.0, g:61.0, l:6.0},
    {name:'Farine de ble', cal:348.0, p:10.0, g:72.0, l:1.0},
    {name:"Farine d'avoine", cal:389.0, p:15.0, g:63.0, l:7.0},
    {name:'Farine de riz', cal:366.0, p:6.0, g:80.0, l:1.0},
    {name:'Farine de sarrasin', cal:340.0, p:13.0, g:71.0, l:3.0},
    {name:'Farine de mais (Maizena)', cal:350.0, p:0.5, g:85.0, l:0.5},
    {name:'Farine de chataigne', cal:365.0, p:6.0, g:76.0, l:4.0},
    {name:'Farine de coco', cal:400.0, p:20.0, g:22.0, l:15.0},
    {name:'Pate a pizza', cal:270.0, p:8.0, g:52.0, l:3.0},
    {name:'Pate feuilletee', cal:380.0, p:6.0, g:38.0, l:23.0},
    {name:'Pate brisee', cal:380.0, p:7.0, g:40.0, l:22.0},
    {name:'Riz rouge cuit', cal:130.0, p:3.0, g:27.0, l:0.5},
    {name:'Riz pilaf', cal:150.0, p:3.0, g:30.0, l:2.0},
    {name:'Risotto', cal:160.0, p:4.0, g:28.0, l:4.0},
    {name:'Pates fraiches cuites', cal:130.0, p:5.0, g:25.0, l:1.5},
    {name:'Vermicelle de soja cuit', cal:80.0, p:0.1, g:19.0, l:0.0},
    {name:'Quenelle', cal:180.0, p:8.0, g:15.0, l:10.0},
    {name:'Spatzle cuits', cal:160.0, p:6.0, g:28.0, l:3.0},
    {name:'Freekeh cuit', cal:120.0, p:4.5, g:24.0, l:1.0},
    {name:'Amarante cuite', cal:100.0, p:4.0, g:19.0, l:1.5},
    {name:'Teff cuit', cal:100.0, p:4.0, g:20.0, l:0.7},
    {name:'Fonio cuit', cal:110.0, p:2.0, g:24.0, l:0.5},
    {name:'Petit epeautre cuit', cal:130.0, p:5.0, g:24.0, l:1.0},
    {name:'Pain complet aux graines', cal:260.0, p:10.0, g:40.0, l:6.0},
    {name:'Pain brioche', cal:320.0, p:8.0, g:50.0, l:10.0},
    {name:'Pain sans gluten', cal:250.0, p:4.0, g:45.0, l:6.0},
    {name:'Pain viennois', cal:290.0, p:9.0, g:52.0, l:6.0},
    {name:'Bagel', cal:270.0, p:10.0, g:52.0, l:2.0},
    {name:'Muffin anglais', cal:230.0, p:8.0, g:45.0, l:2.0},
    {name:'Gressins', cal:410.0, p:12.0, g:72.0, l:8.0},
    {name:'Cornilles cuites', cal:116.0, p:8.0, g:21.0, l:0.5},
    {name:'Azukis cuits', cal:128.0, p:8.0, g:25.0, l:0.2},
    {name:'Lupin (graines)', cal:120.0, p:16.0, g:10.0, l:3.0},
    {name:'Pois chiches en conserve', cal:139.0, p:7.0, g:22.0, l:2.5},
  ],
  fruits: [
    {name:'Abricot', cal:47.0, p:1.0, g:9.0, l:0.4},
    {name:'Abricot sec', cal:241.0, p:3.4, g:53.0, l:0.5},
    {name:'Ananas', cal:52.0, p:0.5, g:11.0, l:0.1},
    {name:'Ananas au sirop', cal:84.0, p:0.3, g:20.0, l:0.1},
    {name:'Ananas seche', cal:350.0, p:2.0, g:85.0, l:0.5},
    {name:'Avocat', cal:169.0, p:2.0, g:1.8, l:15.4},
    {name:'Banane', cal:90.0, p:1.1, g:20.0, l:0.2},
    {name:'Banane sechee', cal:346.0, p:3.9, g:80.0, l:1.8},
    {name:'Banane chips', cal:520.0, p:2.0, g:58.0, l:30.0},
    {name:'Cassis', cal:63.0, p:1.4, g:9.0, l:0.4},
    {name:'Cerise', cal:68.0, p:1.3, g:14.0, l:0.3},
    {name:'Citron', cal:29.0, p:1.1, g:3.0, l:0.3},
    {name:'Citron vert', cal:30.0, p:0.7, g:4.0, l:0.2},
    {name:'Clementine', cal:47.0, p:0.8, g:9.0, l:0.2},
    {name:'Coco fraiche', cal:365.0, p:3.5, g:7.0, l:33.0},
    {name:'Coing', cal:38.0, p:0.4, g:9.0, l:0.1},
    {name:'Cranberries sechees', cal:325.0, p:0.4, g:82.0, l:1.0},
    {name:'Datte', cal:282.0, p:2.5, g:64.0, l:0.4},
    {name:'Datte Medjool', cal:280.0, p:2.0, g:75.0, l:0.2},
    {name:'Figue', cal:67.0, p:0.8, g:13.0, l:0.3},
    {name:'Figue sechee', cal:252.0, p:3.3, g:55.0, l:0.9},
    {name:'Fraise', cal:32.0, p:0.7, g:5.0, l:0.3},
    {name:'Framboise', cal:49.0, p:1.2, g:5.0, l:0.6},
    {name:'Fruit de la passion', cal:97.0, p:2.2, g:18.0, l:0.7},
    {name:'Fruit du dragon', cal:50.0, p:1.0, g:11.0, l:0.4},
    {name:'Goyave', cal:68.0, p:2.6, g:9.0, l:1.0},
    {name:'Grenade', cal:74.0, p:1.5, g:14.0, l:1.2},
    {name:'Groseille', cal:56.0, p:1.1, g:9.0, l:0.2},
    {name:'Kaki', cal:68.0, p:0.6, g:14.0, l:0.2},
    {name:'Kiwi', cal:61.0, p:1.1, g:11.0, l:0.5},
    {name:'Kumquat', cal:71.0, p:1.9, g:16.0, l:0.9},
    {name:'Litchi', cal:66.0, p:0.8, g:15.0, l:0.4},
    {name:'Mandarine', cal:50.0, p:0.8, g:10.0, l:0.3},
    {name:'Mangue', cal:60.0, p:0.8, g:13.0, l:0.4},
    {name:'Mangue sechee', cal:320.0, p:2.0, g:78.0, l:0.5},
    {name:'Melon', cal:34.0, p:0.8, g:7.0, l:0.2},
    {name:'Mure', cal:47.0, p:1.4, g:6.0, l:0.5},
    {name:'Myrtille', cal:57.0, p:0.7, g:12.0, l:0.3},
    {name:'Nectarine', cal:44.0, p:1.0, g:8.0, l:0.3},
    {name:'Nefle', cal:47.0, p:0.4, g:11.0, l:0.2},
    {name:'Noix de coco rapee', cal:660.0, p:7.0, g:24.0, l:64.0},
    {name:'Orange', cal:47.0, p:0.9, g:9.0, l:0.1},
    {name:'Papaye', cal:43.0, p:0.5, g:8.0, l:0.3},
    {name:'Pasteque', cal:30.0, p:0.6, g:6.0, l:0.2},
    {name:'Peche', cal:46.0, p:0.9, g:9.0, l:0.2},
    {name:'Peche au sirop', cal:75.0, p:0.5, g:18.0, l:0.1},
    {name:'Physalis', cal:53.0, p:1.9, g:11.0, l:0.7},
    {name:'Poire', cal:57.0, p:0.4, g:12.0, l:0.1},
    {name:'Pomme', cal:52.0, p:0.3, g:11.0, l:0.2},
    {name:'Pomme compote sans sucre', cal:68.0, p:0.2, g:15.0, l:0.1},
    {name:'Pomme cuite', cal:85.0, p:0.3, g:19.0, l:0.2},
    {name:'Pomme sechee', cal:243.0, p:2.0, g:57.0, l:0.3},
    {name:'Pomelo', cal:42.0, p:0.8, g:7.0, l:0.1},
    {name:'Prune', cal:46.0, p:0.7, g:10.0, l:0.3},
    {name:'Pruneau', cal:229.0, p:2.2, g:52.0, l:0.4},
    {name:'Raisin', cal:69.0, p:0.6, g:15.0, l:0.2},
    {name:'Raisin sec', cal:299.0, p:3.0, g:65.0, l:0.5},
    {name:'Rhubarbe', cal:21.0, p:0.9, g:2.0, l:0.2},
    {name:'Salade de fruits (conserve)', cal:70.0, p:0.5, g:17.0, l:0.1},
    {name:'Eau de coco', cal:20.0, p:0.7, g:4.0, l:0.2},
    {name:'Carambole', cal:31.0, p:1.0, g:7.0, l:0.3},
    {name:'Ramboutan', cal:75.0, p:0.9, g:18.0, l:0.2},
    {name:'Longane', cal:60.0, p:1.0, g:15.0, l:0.1},
    {name:'Durian', cal:147.0, p:1.5, g:27.0, l:5.0},
    {name:'Jacquier', cal:95.0, p:1.7, g:23.0, l:0.6},
    {name:'Tamarillo', cal:31.0, p:2.0, g:7.0, l:0.4},
    {name:'Mangoustan', cal:73.0, p:0.4, g:18.0, l:0.6},
    {name:'Corossol', cal:66.0, p:1.0, g:17.0, l:0.3},
    {name:'Sapotille', cal:83.0, p:0.4, g:20.0, l:1.0},
    {name:'Bergamote', cal:37.0, p:0.8, g:9.0, l:0.2},
    {name:'Airelle', cal:46.0, p:0.4, g:11.0, l:0.1},
    {name:'Argousier', cal:82.0, p:1.5, g:8.0, l:3.0},
    {name:'Sureau', cal:73.0, p:0.7, g:18.0, l:0.5},
    {name:'Groseille a maquereau', cal:44.0, p:0.9, g:10.0, l:0.6},
    {name:'Melange de fruits secs', cal:350.0, p:10.0, g:40.0, l:18.0},
    {name:'Myrtille sechee', cal:320.0, p:2.0, g:78.0, l:1.0},
    {name:'Cranberry fraiche', cal:46.0, p:0.4, g:11.0, l:0.1},
  ],
  matieres_grasses: [
    {name:"Huile d'olive", cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:'Huile de colza', cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:'Huile de tournesol', cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:'Huile de coco', cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:'Huile de noix', cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:'Huile de lin', cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:'Huile de sesame', cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:"Huile d'arachide", cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:'Huile de pepins de raisin', cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:'Beurre', cal:745.0, p:0.7, g:0.7, l:82.0},
    {name:'Beurre allege 41%', cal:371.0, p:0.5, g:1.0, l:41.0},
    {name:'Beurre clarifie (ghee)', cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:'Margarine', cal:720.0, p:0.2, g:0.5, l:80.0},
    {name:'Margarine allegee', cal:360.0, p:0.2, g:0.5, l:40.0},
    {name:'Saindoux', cal:900.0, p:0.0, g:0.0, l:100.0},
    {name:'Creme fraiche epaisse 30%', cal:290.0, p:2.5, g:3.0, l:30.0},
    {name:'Creme fraiche 15%', cal:160.0, p:3.0, g:4.0, l:15.0},
    {name:'Creme liquide entiere 30%', cal:290.0, p:2.4, g:3.0, l:30.0},
    {name:'Creme liquide legere 12%', cal:130.0, p:3.0, g:4.0, l:12.0},
    {name:'Creme de soja', cal:195.0, p:3.0, g:3.0, l:19.0},
    {name:'Beurre de coco', cal:660.0, p:7.0, g:24.0, l:64.0},
  ],
  oleagineux: [
    {name:'Amandes', cal:600.0, p:21.0, g:7.0, l:53.0},
    {name:'Amandes effilees', cal:620.0, p:21.0, g:7.0, l:55.0},
    {name:"Poudre d'amande", cal:620.0, p:22.0, g:8.0, l:54.0},
    {name:'Noisettes', cal:628.0, p:15.0, g:7.0, l:61.0},
    {name:'Noix (cerneaux)', cal:654.0, p:15.0, g:11.0, l:65.0},
    {name:'Noix de cajou', cal:553.0, p:18.0, g:30.0, l:44.0},
    {name:'Pistaches', cal:562.0, p:20.0, g:28.0, l:45.0},
    {name:'Noix de pecan', cal:690.0, p:9.0, g:14.0, l:72.0},
    {name:'Noix de macadamia', cal:718.0, p:8.0, g:14.0, l:76.0},
    {name:'Noix du Bresil', cal:656.0, p:14.0, g:12.0, l:66.0},
    {name:'Cacahuetes', cal:567.0, p:26.0, g:16.0, l:49.0},
    {name:'Cacahuetes grillees salees', cal:600.0, p:25.0, g:15.0, l:52.0},
    {name:'Pignons de pin', cal:670.0, p:14.0, g:13.0, l:68.0},
    {name:'Melange apero (noix)', cal:580.0, p:20.0, g:20.0, l:48.0},
    {name:'Beurre de cacahuete', cal:588.0, p:25.0, g:20.0, l:50.0},
    {name:"Puree d'amande", cal:630.0, p:21.0, g:19.0, l:55.0},
    {name:'Puree de noisette', cal:650.0, p:15.0, g:12.0, l:62.0},
    {name:'Puree de cajou', cal:600.0, p:18.0, g:25.0, l:47.0},
    {name:'Tahini (puree de sesame)', cal:595.0, p:17.0, g:21.0, l:53.0},
    {name:'Graines de chia', cal:486.0, p:17.0, g:42.0, l:31.0},
    {name:'Graines de lin', cal:534.0, p:18.0, g:29.0, l:42.0},
    {name:'Graines de courge', cal:559.0, p:30.0, g:11.0, l:49.0},
    {name:'Graines de tournesol', cal:584.0, p:21.0, g:20.0, l:51.0},
    {name:'Graines de sesame', cal:573.0, p:18.0, g:23.0, l:50.0},
    {name:'Graines de chanvre', cal:553.0, p:32.0, g:9.0, l:49.0},
    {name:'Graines de pavot', cal:525.0, p:18.0, g:28.0, l:42.0},
  ],
  sucres: [
    {name:'Sucre blanc', cal:400.0, p:0.0, g:100.0, l:0.0},
    {name:'Sucre roux', cal:390.0, p:0.0, g:98.0, l:0.0},
    {name:'Sucre glace', cal:400.0, p:0.0, g:100.0, l:0.0},
    {name:'Sucre vanille', cal:400.0, p:0.0, g:98.0, l:0.0},
    {name:'Miel', cal:320.0, p:0.4, g:80.0, l:0.0},
    {name:"Sirop d'agave", cal:310.0, p:0.0, g:76.0, l:0.0},
    {name:"Sirop d'erable", cal:260.0, p:0.0, g:67.0, l:0.0},
    {name:'Confiture', cal:250.0, p:0.5, g:60.0, l:0.1},
    {name:'Confiture allegee', cal:170.0, p:0.5, g:40.0, l:0.1},
    {name:'Pate a tartiner (Nutella)', cal:540.0, p:6.0, g:57.0, l:31.0},
    {name:'Pate a tartiner allegee', cal:450.0, p:8.0, g:50.0, l:22.0},
    {name:'Pate a tartiner speculoos', cal:530.0, p:5.0, g:55.0, l:32.0},
    {name:'Chocolat noir 70%', cal:540.0, p:8.0, g:35.0, l:40.0},
    {name:'Chocolat noir 85%', cal:580.0, p:10.0, g:22.0, l:50.0},
    {name:'Chocolat au lait', cal:535.0, p:7.0, g:55.0, l:31.0},
    {name:'Chocolat blanc', cal:540.0, p:6.0, g:59.0, l:31.0},
    {name:'Cacao en poudre non sucre', cal:350.0, p:20.0, g:15.0, l:22.0},
    {name:'Cacao sucre (type Nesquik)', cal:380.0, p:5.0, g:80.0, l:3.0},
    {name:"Pate d'amande", cal:460.0, p:8.0, g:57.0, l:22.0},
    {name:'Praline', cal:560.0, p:8.0, g:45.0, l:38.0},
    {name:'Caramel', cal:380.0, p:2.0, g:85.0, l:3.0},
    {name:'Pate de fruits', cal:350.0, p:0.5, g:85.0, l:0.1},
    {name:'Bonbons gelifies', cal:340.0, p:6.0, g:78.0, l:0.0},
    {name:'Guimauve', cal:320.0, p:4.0, g:80.0, l:0.0},
    {name:'Nougat', cal:430.0, p:7.0, g:65.0, l:16.0},
    {name:'Halva', cal:540.0, p:12.0, g:50.0, l:32.0},
    {name:'Sirop (grenadine, menthe)', cal:260.0, p:0.0, g:65.0, l:0.0},
    {name:'Biscuit sec (petit-beurre)', cal:440.0, p:7.0, g:75.0, l:13.0},
    {name:'Sable', cal:480.0, p:6.0, g:65.0, l:22.0},
    {name:'Cookie', cal:480.0, p:5.0, g:65.0, l:22.0},
    {name:'Madeleine', cal:440.0, p:6.0, g:55.0, l:22.0},
    {name:'Quatre-quarts', cal:420.0, p:6.0, g:52.0, l:21.0},
    {name:'Brownie', cal:460.0, p:6.0, g:55.0, l:24.0},
    {name:'Muffin', cal:380.0, p:5.0, g:50.0, l:18.0},
    {name:'Croissant', cal:405.0, p:8.0, g:46.0, l:21.0},
    {name:'Pain au chocolat', cal:420.0, p:8.0, g:46.0, l:24.0},
    {name:'Chausson aux pommes', cal:320.0, p:4.0, g:40.0, l:16.0},
    {name:'Brioche', cal:350.0, p:8.0, g:52.0, l:12.0},
    {name:"Pain d'epices", cal:350.0, p:5.0, g:75.0, l:3.0},
    {name:'Gaufre', cal:430.0, p:7.0, g:50.0, l:22.0},
    {name:'Crepe nature', cal:200.0, p:6.0, g:30.0, l:6.0},
    {name:'Pancake', cal:230.0, p:6.0, g:35.0, l:7.0},
    {name:'Beignet', cal:360.0, p:6.0, g:45.0, l:18.0},
    {name:'Barre cerealiere', cal:420.0, p:6.0, g:70.0, l:13.0},
    {name:'Barre chocolatee (type Mars)', cal:450.0, p:4.0, g:70.0, l:17.0},
    {name:'Cake aux fruits', cal:360.0, p:5.0, g:55.0, l:14.0},
    {name:'Tarte aux pommes', cal:240.0, p:3.0, g:35.0, l:10.0},
    {name:'Eclair', cal:250.0, p:5.0, g:30.0, l:12.0},
    {name:'Macaron', cal:400.0, p:6.0, g:65.0, l:14.0},
    {name:'Glace vanille', cal:200.0, p:3.5, g:24.0, l:10.0},
    {name:'Sorbet', cal:130.0, p:0.5, g:32.0, l:0.0},
    {name:'Creme glacee chocolat', cal:220.0, p:4.0, g:26.0, l:11.0},
    {name:'Gelee de fruits', cal:250.0, p:0.3, g:62.0, l:0.0},
    {name:"Marmelade d'orange", cal:250.0, p:0.5, g:60.0, l:0.1},
    {name:'Creme de marrons', cal:280.0, p:1.5, g:68.0, l:0.5},
    {name:'Sucre de coco', cal:380.0, p:1.0, g:93.0, l:0.0},
    {name:'Melasse', cal:290.0, p:0.0, g:75.0, l:0.0},
    {name:'Sirop de glucose', cal:320.0, p:0.0, g:80.0, l:0.0},
    {name:'Erythritol', cal:20.0, p:0.0, g:5.0, l:0.0},
    {name:'Xylitol', cal:240.0, p:0.0, g:100.0, l:0.0},
    {name:'Stevia (poudre)', cal:0.0, p:0.0, g:0.0, l:0.0},
    {name:'Chocolat noir 90%', cal:600.0, p:11.0, g:14.0, l:55.0},
    {name:'Chocolat fourre', cal:500.0, p:5.0, g:60.0, l:27.0},
    {name:'Speculoos (biscuit)', cal:480.0, p:6.0, g:70.0, l:19.0},
    {name:'Galette bretonne', cal:510.0, p:6.0, g:64.0, l:26.0},
    {name:'Financier', cal:450.0, p:7.0, g:48.0, l:26.0},
    {name:'Donut', cal:450.0, p:6.0, g:55.0, l:22.0},
    {name:'Churros', cal:380.0, p:5.0, g:45.0, l:20.0},
    {name:'Tiramisu', cal:240.0, p:5.0, g:25.0, l:13.0},
    {name:'Cheesecake', cal:320.0, p:6.0, g:30.0, l:19.0},
    {name:'Panna cotta', cal:220.0, p:4.0, g:22.0, l:13.0},
    {name:'Mille-feuille', cal:290.0, p:4.0, g:32.0, l:16.0},
    {name:'Tarte au citron', cal:280.0, p:4.0, g:38.0, l:12.0},
    {name:'Clafoutis', cal:160.0, p:4.0, g:22.0, l:6.0},
    {name:'Far breton', cal:180.0, p:5.0, g:30.0, l:4.0},
    {name:'Ile flottante', cal:130.0, p:4.0, g:20.0, l:3.0},
    {name:'Gaufre liegeoise', cal:420.0, p:7.0, g:50.0, l:21.0},
  ],
  snacks: [
    {name:'Chips', cal:540.0, p:6.0, g:50.0, l:35.0},
    {name:'Chips allegees', cal:460.0, p:6.0, g:60.0, l:22.0},
    {name:'Frites (four)', cal:180.0, p:3.0, g:28.0, l:6.0},
    {name:'Frites (friture)', cal:290.0, p:3.5, g:38.0, l:14.0},
    {name:'Pringles', cal:530.0, p:4.0, g:52.0, l:34.0},
    {name:'Tortilla chips (nachos)', cal:490.0, p:7.0, g:63.0, l:24.0},
    {name:'Crackers sales', cal:430.0, p:9.0, g:65.0, l:15.0},
    {name:'Bretzel', cal:380.0, p:10.0, g:80.0, l:3.0},
    {name:'Quiche lorraine', cal:280.0, p:9.0, g:22.0, l:17.0},
    {name:'Pizza margherita', cal:240.0, p:10.0, g:30.0, l:9.0},
    {name:'Croque-monsieur', cal:290.0, p:14.0, g:25.0, l:15.0},
    {name:'Nuggets', cal:250.0, p:14.0, g:15.0, l:15.0},
    {name:'Samoussa', cal:280.0, p:7.0, g:28.0, l:15.0},
    {name:'Nem', cal:200.0, p:8.0, g:22.0, l:9.0},
    {name:'Beignet de crevette', cal:240.0, p:9.0, g:25.0, l:11.0},
    {name:'Sushi (piece)', cal:150.0, p:4.0, g:28.0, l:2.0},
    {name:'Lasagnes bolognaise (plat)', cal:130.0, p:6.0, g:12.0, l:6.0},
    {name:'Hachis parmentier', cal:110.0, p:6.0, g:12.0, l:4.0},
    {name:'Couscous royal', cal:150.0, p:8.0, g:18.0, l:5.0},
    {name:'Paella', cal:130.0, p:7.0, g:16.0, l:4.0},
    {name:'Chili con carne', cal:110.0, p:8.0, g:10.0, l:4.0},
    {name:'Boeuf bourguignon', cal:130.0, p:12.0, g:5.0, l:7.0},
    {name:'Blanquette de veau', cal:120.0, p:10.0, g:5.0, l:6.0},
    {name:'Gratin dauphinois', cal:150.0, p:3.0, g:15.0, l:9.0},
    {name:'Pates carbonara', cal:180.0, p:7.0, g:20.0, l:8.0},
    {name:'Riz cantonais', cal:150.0, p:5.0, g:22.0, l:4.0},
    {name:'Soupe de legumes', cal:35.0, p:1.0, g:6.0, l:0.8},
    {name:'Veloute', cal:50.0, p:1.5, g:7.0, l:2.0},
    {name:'Ratatouille', cal:70.0, p:1.5, g:7.0, l:4.0},
    {name:'Taboule', cal:130.0, p:3.0, g:22.0, l:3.0},
    {name:'Salade composee', cal:120.0, p:5.0, g:8.0, l:8.0},
    {name:'Hamburger', cal:250.0, p:12.0, g:22.0, l:12.0},
    {name:'Cheeseburger', cal:280.0, p:14.0, g:22.0, l:15.0},
    {name:'Hot-dog', cal:250.0, p:9.0, g:22.0, l:14.0},
    {name:'Kebab (assiette)', cal:170.0, p:12.0, g:15.0, l:8.0},
    {name:'Tacos (francais)', cal:230.0, p:9.0, g:25.0, l:11.0},
    {name:'Panini', cal:260.0, p:11.0, g:30.0, l:11.0},
    {name:'Sandwich jambon-beurre', cal:250.0, p:9.0, g:30.0, l:10.0},
    {name:'Club sandwich', cal:230.0, p:10.0, g:22.0, l:12.0},
    {name:'Wrap poulet', cal:200.0, p:10.0, g:22.0, l:8.0},
    {name:'Bo bun', cal:150.0, p:7.0, g:20.0, l:4.0},
    {name:'Pad thai', cal:170.0, p:7.0, g:22.0, l:6.0},
    {name:'Ramen (bol)', cal:90.0, p:5.0, g:12.0, l:3.0},
    {name:'Curry de poulet', cal:140.0, p:11.0, g:8.0, l:7.0},
    {name:'Tajine', cal:110.0, p:8.0, g:10.0, l:4.0},
    {name:'Gratin de pates', cal:160.0, p:7.0, g:18.0, l:7.0},
    {name:'Frittata', cal:150.0, p:11.0, g:3.0, l:11.0},
    {name:'Oeufs cocotte', cal:160.0, p:10.0, g:2.0, l:13.0},
    {name:'Croque-madame', cal:300.0, p:15.0, g:24.0, l:17.0},
  ],
  condiments: [
    {name:'Moutarde', cal:150.0, p:6.0, g:4.0, l:10.0},
    {name:"Moutarde a l'ancienne", cal:150.0, p:6.0, g:5.0, l:10.0},
    {name:'Ketchup', cal:110.0, p:1.2, g:25.0, l:0.1},
    {name:'Mayonnaise', cal:700.0, p:1.0, g:2.0, l:75.0},
    {name:'Mayonnaise allegee', cal:300.0, p:1.0, g:8.0, l:28.0},
    {name:'Sauce soja', cal:60.0, p:6.0, g:6.0, l:0.0},
    {name:'Sauce soja sucree', cal:150.0, p:4.0, g:30.0, l:0.0},
    {name:'Nuoc-mam', cal:50.0, p:8.0, g:4.0, l:0.0},
    {name:'Sauce tomate (basique)', cal:35.0, p:1.5, g:6.0, l:0.5},
    {name:'Sauce bolognaise', cal:90.0, p:5.0, g:8.0, l:4.0},
    {name:'Coulis de tomate', cal:30.0, p:1.5, g:5.0, l:0.3},
    {name:'Concentre de tomate', cal:80.0, p:4.0, g:14.0, l:0.5},
    {name:'Pesto', cal:450.0, p:5.0, g:6.0, l:45.0},
    {name:'Sauce barbecue', cal:160.0, p:1.0, g:35.0, l:0.5},
    {name:'Sauce curry', cal:120.0, p:2.0, g:12.0, l:7.0},
    {name:'Sauce aigre-douce', cal:130.0, p:0.5, g:30.0, l:0.2},
    {name:'Vinaigrette', cal:450.0, p:0.5, g:5.0, l:47.0},
    {name:'Vinaigre', cal:20.0, p:0.3, g:0.6, l:0.0},
    {name:'Vinaigre balsamique', cal:90.0, p:0.5, g:19.0, l:0.0},
    {name:'Creme de balsamique', cal:200.0, p:0.5, g:48.0, l:0.0},
    {name:'Jus de citron', cal:25.0, p:0.4, g:6.0, l:0.1},
    {name:'Poivre', cal:250.0, p:10.0, g:64.0, l:3.0},
    {name:'Bouillon cube (prepare)', cal:5.0, p:0.3, g:0.5, l:0.2},
    {name:'Fond de veau', cal:250.0, p:12.0, g:30.0, l:8.0},
    {name:'Tabasco', cal:12.0, p:0.5, g:1.0, l:0.5},
    {name:'Sauce piquante', cal:30.0, p:1.0, g:6.0, l:0.3},
    {name:'Harissa', cal:90.0, p:3.0, g:9.0, l:4.0},
    {name:'Houmous', cal:230.0, p:8.0, g:14.0, l:16.0},
    {name:'Tzatziki', cal:100.0, p:3.0, g:4.0, l:8.0},
    {name:'Guacamole', cal:160.0, p:2.0, g:4.0, l:15.0},
    {name:'Tapenade', cal:250.0, p:2.0, g:3.0, l:25.0},
    {name:'Capres', cal:25.0, p:2.4, g:5.0, l:0.6},
    {name:'Wasabi', cal:290.0, p:7.0, g:40.0, l:10.0},
    {name:'Gingembre marine', cal:50.0, p:0.5, g:12.0, l:0.1},
    {name:'Levure de biere', cal:350.0, p:45.0, g:20.0, l:6.0},
    {name:'Levure maltee', cal:360.0, p:50.0, g:20.0, l:5.0},
    {name:'Gomasio', cal:580.0, p:18.0, g:22.0, l:49.0},
    {name:'Sel', cal:0.0, p:0.0, g:0.0, l:0.0},
    {name:'Sauce yaourt', cal:80.0, p:3.0, g:5.0, l:5.0},
    {name:'Sauce blanche (kebab)', cal:350.0, p:2.0, g:8.0, l:35.0},
    {name:'Sauce samourai', cal:250.0, p:1.5, g:12.0, l:22.0},
    {name:'Sauce teriyaki', cal:90.0, p:3.0, g:18.0, l:0.5},
    {name:'Sauce huitre', cal:50.0, p:2.0, g:10.0, l:0.0},
    {name:'Sauce hoisin', cal:220.0, p:3.0, g:45.0, l:3.0},
    {name:'Sauce satay (cacahuete)', cal:350.0, p:12.0, g:20.0, l:25.0},
    {name:'Raita', cal:60.0, p:3.0, g:5.0, l:3.0},
    {name:'Chimichurri', cal:250.0, p:1.0, g:4.0, l:26.0},
    {name:'Sauce au poivre', cal:150.0, p:3.0, g:8.0, l:12.0},
    {name:'Sauce bearnaise', cal:350.0, p:2.0, g:3.0, l:37.0},
    {name:'Sauce hollandaise', cal:320.0, p:2.0, g:3.0, l:34.0},
    {name:'Beurre blanc', cal:350.0, p:1.0, g:2.0, l:38.0},
    {name:'Chutney', cal:180.0, p:0.5, g:44.0, l:0.2},
    {name:'Pesto rosso', cal:380.0, p:5.0, g:8.0, l:37.0},
    {name:'Sauce tartare', cal:500.0, p:1.0, g:4.0, l:52.0},
    {name:'Aioli', cal:650.0, p:2.0, g:3.0, l:68.0},
    {name:'Ketchup allege', cal:70.0, p:1.0, g:15.0, l:0.1},
    {name:'Curry en poudre', cal:325.0, p:13.0, g:55.0, l:14.0},
    {name:'Paprika', cal:280.0, p:14.0, g:54.0, l:13.0},
    {name:'Cumin', cal:375.0, p:18.0, g:44.0, l:22.0},
    {name:'Curcuma', cal:350.0, p:8.0, g:65.0, l:10.0},
    {name:'Herbes de Provence', cal:280.0, p:10.0, g:64.0, l:7.0},
    {name:'Cannelle', cal:260.0, p:4.0, g:81.0, l:3.0},
    {name:'Bouillon de legumes (prepare)', cal:4.0, p:0.2, g:0.6, l:0.1},
  ],
  boissons: [
    {name:'Eau', cal:0.0, p:0.0, g:0.0, l:0.0},
    {name:'Cafe noir', cal:2.0, p:0.1, g:0.0, l:0.0},
    {name:'The', cal:1.0, p:0.0, g:0.0, l:0.0},
    {name:"Jus d'orange", cal:45.0, p:0.7, g:10.0, l:0.1},
    {name:'Jus de pomme', cal:46.0, p:0.1, g:11.0, l:0.1},
    {name:'Jus de raisin', cal:67.0, p:0.3, g:16.0, l:0.1},
    {name:'Jus multifruits', cal:50.0, p:0.4, g:12.0, l:0.1},
    {name:'Jus de tomate', cal:18.0, p:0.8, g:3.0, l:0.1},
    {name:'Smoothie fruits', cal:55.0, p:0.8, g:12.0, l:0.3},
    {name:'Soda (cola)', cal:42.0, p:0.0, g:11.0, l:0.0},
    {name:'Soda light', cal:0.3, p:0.0, g:0.0, l:0.0},
    {name:'Limonade', cal:40.0, p:0.0, g:10.0, l:0.0},
    {name:'Sirop dilue', cal:40.0, p:0.0, g:10.0, l:0.0},
    {name:'Boisson energisante', cal:45.0, p:0.0, g:11.0, l:0.0},
    {name:'Boisson isotonique', cal:25.0, p:0.0, g:6.0, l:0.0},
    {name:'Kombucha', cal:30.0, p:0.0, g:7.0, l:0.0},
    {name:'Chocolat chaud', cal:90.0, p:3.5, g:12.0, l:3.0},
    {name:'Biere', cal:43.0, p:0.5, g:3.6, l:0.0},
    {name:'Biere sans alcool', cal:25.0, p:0.4, g:5.0, l:0.0},
    {name:'Vin rouge', cal:85.0, p:0.1, g:2.6, l:0.0},
    {name:'Vin blanc', cal:82.0, p:0.1, g:2.6, l:0.0},
    {name:'Champagne', cal:80.0, p:0.2, g:1.4, l:0.0},
    {name:'Whisky', cal:250.0, p:0.0, g:0.0, l:0.0},
    {name:'Vodka', cal:230.0, p:0.0, g:0.0, l:0.0},
    {name:'Rhum', cal:230.0, p:0.0, g:0.0, l:0.0},
    {name:'Pastis', cal:280.0, p:0.0, g:2.0, l:0.0},
    {name:'Cafe au lait', cal:40.0, p:2.0, g:4.0, l:1.5},
    {name:'Cappuccino', cal:55.0, p:3.0, g:5.0, l:2.5},
    {name:'Latte', cal:60.0, p:3.0, g:6.0, l:3.0},
    {name:'The glace', cal:30.0, p:0.0, g:7.5, l:0.0},
    {name:'Eau gazeuse', cal:0.0, p:0.0, g:0.0, l:0.0},
    {name:'Eau aromatisee', cal:15.0, p:0.0, g:3.5, l:0.0},
    {name:'Milkshake', cal:110.0, p:3.5, g:16.0, l:4.0},
    {name:'Bubble tea', cal:90.0, p:1.0, g:20.0, l:1.0},
    {name:'Jus de carotte', cal:40.0, p:1.0, g:9.0, l:0.2},
    {name:'Jus de betterave', cal:40.0, p:1.0, g:8.0, l:0.1},
    {name:'Jus vert (legumes)', cal:30.0, p:1.5, g:5.0, l:0.2},
    {name:"Jus d'ananas", cal:53.0, p:0.4, g:13.0, l:0.1},
    {name:'Jus de pamplemousse', cal:40.0, p:0.5, g:9.0, l:0.1},
    {name:'Jus de cranberry', cal:46.0, p:0.4, g:12.0, l:0.1},
    {name:'Nectar (abricot/peche)', cal:55.0, p:0.3, g:13.0, l:0.1},
    {name:'Lait de poule', cal:150.0, p:4.0, g:15.0, l:8.0},
    {name:'Cidre', cal:45.0, p:0.0, g:5.0, l:0.0},
    {name:'Vin rose', cal:80.0, p:0.1, g:2.5, l:0.0},
    {name:'Porto', cal:160.0, p:0.2, g:12.0, l:0.0},
    {name:'Gin', cal:260.0, p:0.0, g:0.0, l:0.0},
    {name:'Tequila', cal:230.0, p:0.0, g:0.0, l:0.0},
    {name:'Sangria', cal:110.0, p:0.2, g:12.0, l:0.0},
    {name:'Tonic', cal:35.0, p:0.0, g:9.0, l:0.0},
    {name:'Smoothie vert', cal:50.0, p:1.5, g:10.0, l:0.3},
  ],
};

const RECURRENTS = {
  proteines: ['Blanc de poulet','Escalope de poulet','Steak hache 5%','Oeuf entier','Thon au naturel egoutte','Saumon'],
  fromages: ['Séré maigre','Fromage blanc 0%','Cottage cheese','Carre Frais 0%','Skyr nature','Ricotta'],
  laitiers: ['Skyr nature','Yaourt grec 0%','Lait demi-ecreme','Fromage blanc 0%','Yaourt nature 0%'],
  legumes: ['Brocoli','Haricots verts','Courgette','Tomate','Epinards','Carotte'],
  feculents: ['Riz basmati cuit','Pates blanches cuites','Quinoa cuit','Patate douce cuite','Pommes de terre cuites','Boulgour cuit'],
  fruits: ['Banane','Fraise','Kiwi','Mangue','Framboise','Pomme'],
  matieres_grasses: ["Huile d'olive",'Beurre','Huile de coco','Avocat'],
  oleagineux: ['Amandes','Noix de cajou','Noisettes','Noix'],
  sucres: ['Miel','Chocolat noir 70%','Confiture allegee'],
  snacks: ['Barre proteinees','Galette de riz','Crackers'],
  condiments: ['Moutarde','Sauce soja','Ketchup'],
  boissons: ['Cafe noir','The vert','Eau'],
};

// ===== PROTÉINES INTERCHANGEABLES =====
// Valeurs nutritionnelles par 100g
const PROTEINS_DB = {
  poulet:       { name: 'Filet de poulet',    cal: 110, p: 22.2, g: 1.0, l: 2.0 },
  crevettes:    { name: 'Crevettes',          cal: 99,  p: 24.0, g: 0,   l: 1.0 },
  thon:         { name: 'Thon conserve',      cal: 116, p: 26.0, g: 0,   l: 1.0 },
  poissonBlanc: { name: 'Poisson blanc',      cal: 80,  p: 18.0, g: 0,   l: 0.5 },
  saumon:       { name: 'Saumon',             cal: 208, p: 20.0, g: 0,   l: 13.0 },
  boeufMaigre:  { name: 'Boeuf maigre',       cal: 150, p: 22.0, g: 0,   l: 6.0 },
  tofu:         { name: 'Tofu',               cal: 76,  p: 8.0,  g: 1.0, l: 4.0 },
};

// Génère une liste d'options à partir des portions hardcodées (en grammes)
function makeProteinOptions(portions) {
  return Object.entries(portions).map(([id, grams]) => {
    const ref = PROTEINS_DB[id];
    const f = grams / 100;
    return {
      id, name: ref.name, qty: `${grams} g`,
      cal: Math.round(ref.cal * f * 10) / 10,
      p:   Math.round(ref.p   * f * 10) / 10,
      g:   Math.round(ref.g   * f * 10) / 10,
      l:   Math.round(ref.l   * f * 10) / 10,
    };
  });
}

// Portions pour les repas principaux Luca (≈33g P midi, ≈22g P souper)
const PROTEIN_OPTS_LUCA_BIG = makeProteinOptions({
  poulet: 150, crevettes: 170, thon: 150, poissonBlanc: 180,
  saumon: 100, boeufMaigre: 120, tofu: 160,
});

const PROTEIN_OPTS_LUCA_SMALL = makeProteinOptions({
  poulet: 100, crevettes: 110, thon: 100, poissonBlanc: 120,
  saumon: 70, boeufMaigre: 80, tofu: 110,
});

// Portions pour les repas principaux Émilie (≈26g P)
const PROTEIN_OPTS_EMILIE = makeProteinOptions({
  poulet: 120, crevettes: 135, thon: 120, poissonBlanc: 145,
  saumon: 80, boeufMaigre: 95, tofu: 130,
});

// Thème couleur par profil pour les éléments interactifs (sélecteur de protéine)
const ACCENT_THEME_BY_PROFILE = {
  luca: {
    selectedBg: 'bg-blue-50',
    selectedBorder: 'border-blue-500',
    selectedText: 'text-blue-700',
    selectedIcon: 'text-blue-600',
    chip: 'bg-blue-100 text-blue-700',
  },
  andy: {
    selectedBg: 'bg-green-50',
    selectedBorder: 'border-green-500',
    selectedText: 'text-green-700',
    selectedIcon: 'text-green-600',
    chip: 'bg-green-100 text-green-700',
  },
  emilie: {
    selectedBg: 'bg-pink-50',
    selectedBorder: 'border-pink-500',
    selectedText: 'text-pink-700',
    selectedIcon: 'text-pink-600',
    chip: 'bg-pink-100 text-pink-700',
  },
};

// ===== PLANS NUTRITIONNELS PAR PROFIL + MODE =====
//
// Chaque profil a plusieurs MODES (Standard / Hard / Easy / Cheat) qui correspondent
// à des journées-types avec leur propre plan complet, leurs propres cibles macros,
// et leur propre état (consommé, sauté, IA) pour permettre de switcher en 1 clic
// selon ce qu'est la journée (training lourd, repos, cheat, etc).

// ----- LUCA — STANDARD (jour normal, ≈2606 kcal / 171g P / 320g G / 52g L) -----
const PLAN_LUCA_STANDARD = [
  { id: 'petit-dej', name: 'Petit Déjeuner', icon: '☕', color: 'from-amber-100 to-orange-50', border: 'border-amber-200',
    items: [
      { id: 'zinc', name: 'Zinc bisglycinate (15 mg) à jeun', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'oeuf', name: 'Oeuf entier', qty: '3', cal: 222, p: 19.5, g: 1.2, l: 15.3, swappable:'protein' },
      { id: 'jambon-1', name: 'Tranches jambon maigre', qty: '70 g', cal: 70, p: 15.4, g: 0.7, l: 2.1, swappable:'protein' },
      { id: 'banane-1', name: 'Banane', qty: '120 g', cal: 106.8, p: 1.2, g: 27.6, l: 0 , swappable: 'fruits' },
      { id: 'compote', name: 'Compote sans sucre ou fruit', qty: '100 g', cal: 57, p: 0.5, g: 12.5, l: 0.3 , swappable: 'fruits' },
      { id: 'creatine', name: 'Créatine (5 g)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'omega', name: 'Oméga 3 (3 g)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'd3', name: 'Vitamine D3 K2 (1000 UI)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'vitc', name: 'Vitamine C (750 mg)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    ]
  },
  { id: 'gouter-1', name: 'Goûter 1', icon: '🍌', color: 'from-yellow-50 to-amber-50', border: 'border-yellow-200',
    items: [
      { id: 'whey-1', name: 'Isolat de whey', qty: '15 g', cal: 57, p: 13.8, g: 0.2, l: 0.2, swappable:'protein' },
      { id: 'banane-2', name: 'Banane', qty: '120 g', cal: 106.8, p: 1.2, g: 27.6, l: 0 , swappable: 'fruits' },
      { id: 'dattes-1', name: 'Dattes ou fruit sec', qty: '40 g', cal: 112.8, p: 1.0, g: 30.0, l: 0.2 , swappable: 'fruits' },
    ]
  },
  { id: 'midi', name: 'Repas Midi', icon: '🍽️', color: 'from-blue-50 to-indigo-50', border: 'border-blue-200',
    items: [
      { id: 'feculents-1', name: 'Feculents pesés cuits au choix', swappable:'feculents', qty: '150 g', cal: 172.5, p: 3.9, g: 34.5, l: 1.4 },
      { id: 'poulet-1', name: 'Filet de poulet', qty: '150 g', cal: 165, p: 33.3, g: 1.5, l: 3.0, swappable: 'protein', options: PROTEIN_OPTS_LUCA_BIG, optionId: 'poulet' },
      { id: 'legumes-1', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5, swappable:'legumes' },
      { id: 'oleagineux', name: 'Oléagineux au choix', qty: '15 g', cal: 86.7, p: 3.3, g: 1.8, l: 7.0 },
    ]
  },
  { id: 'gouter-2', name: 'Goûter Après-midi', icon: '🥣', color: 'from-pink-50 to-rose-50', border: 'border-pink-200',
    items: [
      { id: 'sere', name: 'Séré maigre', qty: '150 g', cal: 100.5, p: 18.0, g: 5.3, l: 0.5 , swappable: 'fromages' },
      { id: 'avoine', name: 'Avoine', qty: '40 g', cal: 144, p: 6.0, g: 25.6, l: 2.4 , swappable: 'feculents' },
      { id: 'framboise', name: 'Framboise', qty: '100 g', cal: 55, p: 1.2, g: 12.0, l: 0.7 , swappable: 'fruits' },
      { id: 'choco-1', name: 'Chocolat 70%', qty: '10 g', cal: 57.2, p: 0.9, g: 3.0, l: 4.0 },
    ]
  },
  { id: 'training', name: 'Intra-Training (si entraînement)', icon: '💪', color: 'from-orange-100 to-red-50', border: 'border-orange-300', conditional: true,
    items: [
      { id: 'malto', name: 'Maltodextrine', qty: '50 g', cal: 190, p: 0.1, g: 47.5, l: 0.1 },
      { id: 'electro', name: 'Électrolytes', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    ]
  },
  { id: 'apero', name: 'Apéro', icon: '🍅', color: 'from-red-50 to-orange-50', border: 'border-red-200',
    items: [
      { id: 'jambon-2', name: 'Tranches jambon maigre', qty: '70 g', cal: 70, p: 15.4, g: 0.7, l: 2.1, swappable:'protein' },
      { id: 'tomates', name: 'Tomates cerise', qty: '200 g', cal: 40, p: 2.0, g: 9.0, l: 0.6 , swappable: 'legumes' },
    ]
  },
  { id: 'souper', name: 'Souper', icon: '🌙', color: 'from-violet-50 to-purple-50', border: 'border-violet-200',
    items: [
      { id: 'feculents-2', name: 'Feculents pesés cuits au choix', swappable:'feculents', qty: '150 g', cal: 172.5, p: 3.9, g: 34.5, l: 1.4 },
      { id: 'poulet-2', name: 'Filet de poulet', qty: '100 g', cal: 110, p: 22.2, g: 1.0, l: 2.0, swappable: 'protein', options: PROTEIN_OPTS_LUCA_SMALL, optionId: 'poulet' },
      { id: 'legumes-2', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 , swappable:'legumes' },
      { id: 'dattes-2', name: 'Dattes ou fruit sec', qty: '20 g', cal: 56.4, p: 0.5, g: 15.0, l: 0.1 , swappable: 'fruits' },
      { id: 'choco-2', name: 'Chocolat 70%', qty: '20 g', cal: 114.4, p: 1.8, g: 6.0, l: 8.0 },
      { id: 'mag', name: 'Magnésium bisglycinate (240 mg)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    ]
  },
];

// ----- LUCA — HARD DAY (jour training lourd, ≈2873 kcal / 173g P / 362g G / 53g L) -----
// Différences vs Standard : souper féculents 250g (+92 kcal) + maltodextrine 70g (+76 kcal)
const PLAN_LUCA_HARD = [
  PLAN_LUCA_STANDARD[0], // Petit Déjeuner identique
  PLAN_LUCA_STANDARD[1], // Goûter 1 identique
  PLAN_LUCA_STANDARD[2], // Repas Midi identique
  PLAN_LUCA_STANDARD[3], // Goûter Après-midi identique
  { id: 'training', name: 'Intra-Training (si entraînement)', icon: '💪', color: 'from-orange-100 to-red-50', border: 'border-orange-300', conditional: true,
    items: [
      { id: 'malto', name: 'Maltodextrine', qty: '70 g', cal: 266, p: 0.1, g: 66.5, l: 0.1 },
      { id: 'electro', name: 'Électrolytes', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    ]
  },
  PLAN_LUCA_STANDARD[5], // Apéro identique
  { id: 'souper', name: 'Souper', icon: '🌙', color: 'from-violet-50 to-purple-50', border: 'border-violet-200',
    items: [
      { id: 'feculents-2', name: 'Feculents pesés cuits au choix', swappable:'feculents', qty: '250 g', cal: 287.5, p: 6.5, g: 57.5, l: 2.3 },
      { id: 'poulet-2', name: 'Filet de poulet', qty: '100 g', cal: 110, p: 22.2, g: 1.0, l: 2.0, swappable: 'protein', options: PROTEIN_OPTS_LUCA_SMALL, optionId: 'poulet' },
      { id: 'legumes-2', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 , swappable:'legumes' },
      { id: 'dattes-2', name: 'Dattes ou fruit sec', qty: '20 g', cal: 56.4, p: 0.5, g: 15.0, l: 0.1 , swappable: 'fruits' },
      { id: 'choco-2', name: 'Chocolat 70%', qty: '20 g', cal: 114.4, p: 1.8, g: 6.0, l: 8.0 },
      { id: 'mag', name: 'Magnésium bisglycinate (240 mg)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    ]
  },
];

// ----- LUCA — DÉFICIT (sèche / restriction, ≈2392 kcal / 151g P / 303g G / 43g L) -----
// Différences vs Standard : apéro vide, oléagineux 10g, avoine 35g, chocolat souper 10g.
const PLAN_LUCA_DEFICIT = [
  PLAN_LUCA_STANDARD[0], // Petit Déjeuner identique
  PLAN_LUCA_STANDARD[1], // Goûter 1 identique
  { id: 'midi', name: 'Repas Midi', icon: '🍽️', color: 'from-blue-50 to-indigo-50', border: 'border-blue-200',
    items: [
      { id: 'feculents-1', name: 'Feculents pesés cuits au choix', swappable:'feculents', qty: '150 g', cal: 172.5, p: 3.9, g: 34.5, l: 1.4 },
      { id: 'poulet-1', name: 'Filet de poulet', qty: '150 g', cal: 165, p: 33.3, g: 1.5, l: 3.0, swappable: 'protein', options: PROTEIN_OPTS_LUCA_BIG, optionId: 'poulet' },
      { id: 'legumes-1', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5, swappable:'legumes' },
      { id: 'oleagineux', name: 'Oléagineux au choix', qty: '10 g', cal: 57.8, p: 2.2, g: 1.2, l: 4.7 },
    ]
  },
  { id: 'gouter-2', name: 'Goûter Après-midi', icon: '🥣', color: 'from-pink-50 to-rose-50', border: 'border-pink-200',
    items: [
      { id: 'sere', name: 'Séré maigre', qty: '150 g', cal: 100.5, p: 18.0, g: 5.3, l: 0.5 , swappable: 'fromages' },
      { id: 'avoine', name: 'Avoine', qty: '35 g', cal: 126, p: 5.3, g: 22.4, l: 2.1 , swappable: 'feculents' },
      { id: 'framboise', name: 'Framboise', qty: '100 g', cal: 55, p: 1.2, g: 12.0, l: 0.7 , swappable: 'fruits' },
      { id: 'choco-1', name: 'Chocolat 70%', qty: '10 g', cal: 57.2, p: 0.9, g: 3.0, l: 4.0 },
    ]
  },
  PLAN_LUCA_STANDARD[4], // Intra-Training identique (Maltodextrine 50g)
  // Pas d'apéro en mode déficit
  { id: 'souper', name: 'Souper', icon: '🌙', color: 'from-violet-50 to-purple-50', border: 'border-violet-200',
    items: [
      { id: 'feculents-2', name: 'Feculents pesés cuits au choix', swappable:'feculents', qty: '150 g', cal: 172.5, p: 3.9, g: 34.5, l: 1.4 },
      { id: 'poulet-2', name: 'Filet de poulet', qty: '100 g', cal: 110, p: 22.2, g: 1.0, l: 2.0, swappable: 'protein', options: PROTEIN_OPTS_LUCA_SMALL, optionId: 'poulet' },
      { id: 'legumes-2', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 , swappable:'legumes' },
      { id: 'dattes-2', name: 'Dattes ou fruit sec', qty: '20 g', cal: 56.4, p: 0.5, g: 15.0, l: 0.1 , swappable: 'fruits' },
      { id: 'choco-2', name: 'Chocolat 70%', qty: '10 g', cal: 57.2, p: 0.9, g: 3.0, l: 4.0 },
      { id: 'mag', name: 'Magnésium bisglycinate (240 mg)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    ]
  },
];

// ===== ÉMILIE — 5 MODES (Easy Sucré/Salé, Hard Sucré/Salé, Cheat) =====
// Chaque mode Easy/Hard existe en 2 variantes selon le MEAL 1 et MEAL 3 :
//   - SUCRÉ : Séré + granola + sirop + cacahuète + framboise / nuit = whey + banane + speculos
//   - SALÉ  : Jambon + pain complet + cottage cheese + avocat   / nuit = séré + muesli
// L'utilisatrice choisit son mode au matin selon son envie.

// --- Meals partagés Émilie (identiques entre variantes sucré/salé d'un même mode) ---

// EASY : MEAL 2 et MEAL 4 (mêmes quantités, peu importe la variante)
const EMILIE_EASY_MEAL_2 = { id: 'meal-2', name: 'Meal 2 — Midi', icon: '🍽️', color: 'from-rose-100 to-pink-50', border: 'border-rose-300',
  items: [
    { id: 'feculents-e1', name: 'Feculents pesés cuits au choix', swappable:'feculents', qty: '100 g', cal: 115, p: 2.6, g: 23.0, l: 0.9 },
    { id: 'poulet-e1', name: 'Filet de poulet', qty: '150 g', cal: 165, p: 33.3, g: 1.5, l: 3.0, swappable: 'protein', options: PROTEIN_OPTS_EMILIE, optionId: 'poulet' },
    { id: 'legumes-e1', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 , swappable:'legumes' },
    { id: 'compote-e1', name: 'Compote sans sucre ou fruit', qty: '150 g', cal: 85.5, p: 0.8, g: 18.8, l: 0.5 , swappable: 'fruits' },
    { id: 'choco-e1', name: 'Chocolat 70%', qty: '10 g', cal: 57.2, p: 0.9, g: 3.0, l: 4.0, swappable:'sucres' },
  ]
};
const EMILIE_EASY_MEAL_4 = { id: 'meal-4', name: 'Meal 4 — Soir', icon: '🌆', color: 'from-fuchsia-50 to-purple-50', border: 'border-fuchsia-200',
  items: [
    { id: 'feculents-e2', name: 'Feculents pesés cuits au choix', swappable:'feculents', qty: '100 g', cal: 115, p: 2.6, g: 23.0, l: 0.9 },
    { id: 'poulet-e2', name: 'Filet de poulet', qty: '150 g', cal: 165, p: 33.3, g: 1.5, l: 3.0, swappable: 'protein', options: PROTEIN_OPTS_EMILIE, optionId: 'poulet' },
    { id: 'legumes-e2', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 , swappable:'legumes' },
    { id: 'huile-e', name: 'Huile d\'olive (1 c. à café)', qty: '1', cal: 43.5, p: 0, g: 0.1, l: 5.0, swappable:'matieres_grasses' },
    { id: 'compote-e2', name: 'Compote sans sucre ou fruit', qty: '150 g', cal: 85.5, p: 0.8, g: 18.8, l: 0.5 , swappable: 'fruits' },
  ]
};

// HARD : MEAL 2 et MEAL 4 (mêmes quantités plus élevées pour training)
const EMILIE_HARD_MEAL_2 = { id: 'meal-2', name: 'Meal 2 — Midi', icon: '🍽️', color: 'from-rose-100 to-pink-50', border: 'border-rose-300',
  items: [
    { id: 'feculents-e1', name: 'Feculents pesés cuits au choix', swappable:'feculents', qty: '230 g', cal: 264.5, p: 6.0, g: 52.9, l: 2.1 },
    { id: 'poulet-e1', name: 'Filet de poulet', qty: '120 g', cal: 132, p: 26.6, g: 1.2, l: 2.4, swappable: 'protein', options: PROTEIN_OPTS_EMILIE, optionId: 'poulet' },
    { id: 'legumes-e1', name: 'Légumes ou crudités', qty: '150 g', cal: 45, p: 1.8, g: 6.8, l: 0.3 , swappable:'legumes' },
    { id: 'compote-e1', name: 'Compote sans sucre ou fruit', qty: '150 g', cal: 85.5, p: 0.8, g: 18.8, l: 0.5 , swappable: 'fruits' },
    { id: 'choco-e1', name: 'Chocolat 70%', qty: '20 g', cal: 114.4, p: 1.8, g: 6.0, l: 8.0, swappable:'sucres' },
  ]
};
const EMILIE_HARD_MEAL_4 = { id: 'meal-4', name: 'Meal 4 — Soir', icon: '🌆', color: 'from-fuchsia-50 to-purple-50', border: 'border-fuchsia-200',
  items: [
    { id: 'feculents-e2', name: 'Feculents pesés cuits au choix', swappable:'feculents', qty: '230 g', cal: 264.5, p: 6.0, g: 52.9, l: 2.1 },
    { id: 'poulet-e2', name: 'Filet de poulet', qty: '120 g', cal: 132, p: 26.6, g: 1.2, l: 2.4, swappable: 'protein', options: PROTEIN_OPTS_EMILIE, optionId: 'poulet' },
    { id: 'legumes-e2', name: 'Légumes ou crudités', qty: '150 g', cal: 45, p: 1.8, g: 6.8, l: 0.3 , swappable:'legumes' },
    { id: 'huile-e', name: 'Huile d\'olive (1 c. à café)', qty: '1', cal: 43.5, p: 0, g: 0.1, l: 5.0, swappable:'matieres_grasses' },
    { id: 'compote-e2', name: 'Compote sans sucre ou fruit', qty: '150 g', cal: 85.5, p: 0.8, g: 18.8, l: 0.5 , swappable: 'fruits' },
  ]
};

// Intra-training : identique entre variantes
const EMILIE_INTRA_TRAINING_EASY = { id: 'meal-5', name: 'Meal 5 — Intra-Training (sauf easy jogg)', icon: '💪', color: 'from-orange-100 to-red-50', border: 'border-orange-300', conditional: true,
  items: [
    { id: 'boisson-e', name: 'Boisson glucidique (0,5g/kg/h)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    { id: 'electro-e', name: 'Électrolytes', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
  ]
};
const EMILIE_INTRA_TRAINING_HARD = { id: 'meal-5', name: 'Meal 5 — Intra-Training', icon: '💪', color: 'from-orange-100 to-red-50', border: 'border-orange-300', conditional: true,
  items: [
    { id: 'boisson-e', name: 'Boisson glucidique (0,5g/kg/h) — OBLIGATOIRE', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    { id: 'electro-e', name: 'Électrolytes', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
  ]
};

// Suppléments matin (toujours pareils en sucré comme en salé)
const EMILIE_MORNING_SUPPL = [
  { id: 'zinc-e', name: 'Zinc bisglycinate (15 mg) à jeun', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
];
const EMILIE_MORNING_SUPPL_END = [
  { id: 'omega-e', name: 'Oméga 3 (3 g)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
  { id: 'd3-e', name: 'Vitamine D3 K2 (1000 UI)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
  { id: 'creatine-e', name: 'Créatine (3 g)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
];

// ----- ÉMILIE — EASY SUCRÉ (≈1663 kcal / 126g P / 181g G / 35g L) -----
const PLAN_EMILIE_EASY_SUCRE = [
  { id: 'meal-1', name: 'Meal 1 — Matin 🥣 Sucré', icon: '☀️', color: 'from-pink-100 to-rose-50', border: 'border-pink-200',
    items: [
      ...EMILIE_MORNING_SUPPL,
      { id: 'sere-e1', name: 'Séré maigre', qty: '150 g', cal: 100.5, p: 18.0, g: 5.3, l: 0.5 , swappable: 'fromages' },
      { id: 'granola-e', name: 'Granola', qty: '35 g', cal: 157.5, p: 3.2, g: 21.0, l: 7.0 , swappable: 'feculents' },
      { id: 'sirop-e', name: 'Sirop d\'érable', qty: '10 g', cal: 26, p: 0, g: 6.7, l: 0, swappable:'sucres' },
      { id: 'cacahuete-e', name: 'Beurre de cacahuète', qty: '10 g', cal: 58, p: 2.5, g: 2.0, l: 5.0, swappable:'oleagineux' },
      { id: 'framboise-e1', name: 'Framboise', qty: '50 g', cal: 27.5, p: 0.6, g: 6.0, l: 0.4 , swappable: 'fruits' },
      ...EMILIE_MORNING_SUPPL_END,
    ]
  },
  EMILIE_EASY_MEAL_2,
  { id: 'meal-3', name: 'Meal 3 🥛 (si nuit 2h-3h)', icon: '🌙', color: 'from-indigo-50 to-purple-50', border: 'border-indigo-200',
    items: [
      { id: 'whey-e2', name: 'Iso whey', qty: '20 g', cal: 94.8, p: 18.4, g: 0.2, l: 0.2, swappable:'protein' },
      { id: 'banane-e2', name: 'Banane', qty: '120 g', cal: 106.8, p: 1.2, g: 27.6, l: 0 , swappable: 'fruits' },
      { id: 'speculos-e', name: 'Petit beurre ou speculos', qty: '24 g (3)', cal: 110.4, p: 1.9, g: 0, l: 3.4, swappable:'sucres' },
    ]
  },
  EMILIE_EASY_MEAL_4,
  EMILIE_INTRA_TRAINING_EASY,
];

// ----- ÉMILIE — EASY SALÉ (≈1737 kcal / 128g P / 175g G / 46g L) -----
const PLAN_EMILIE_EASY_SALE = [
  { id: 'meal-1', name: 'Meal 1 — Matin 🥪 Salé', icon: '☀️', color: 'from-pink-100 to-rose-50', border: 'border-pink-200',
    items: [
      ...EMILIE_MORNING_SUPPL,
      { id: 'oeuf-sale-e', name: 'Oeuf entier', qty: '1', cal: 74, p: 6.5, g: 0.4, l: 5.1, swappable:'protein' },
      { id: 'jambon-sale-e', name: 'Jambon sans nitrite', qty: '35 g', cal: 42, p: 7.7, g: 0, l: 1.1, swappable:'protein' },
      { id: 'pain-sale-e', name: 'Pain complet style Harry\'s', qty: '40 g', cal: 101.2, p: 3.1, g: 16.7, l: 1.8, swappable:'feculents' },
      { id: 'cottage-sale-e', name: 'Cottage cheese', qty: '60 g', cal: 57, p: 6.6, g: 2.4, l: 2.4 , swappable: 'fromages' },
      { id: 'avocat-sale-e', name: '½ Avocat', qty: '90 g', cal: 144, p: 1.8, g: 7.2, l: 12.6, swappable:'matieres_grasses' },
      ...EMILIE_MORNING_SUPPL_END,
    ]
  },
  EMILIE_EASY_MEAL_2,
  { id: 'meal-3', name: 'Meal 3 🥄 (si nuit 2h-3h)', icon: '🌙', color: 'from-indigo-50 to-purple-50', border: 'border-indigo-200',
    items: [
      { id: 'sere-nuit-e', name: 'Séré maigre', qty: '150 g', cal: 100.5, p: 18.0, g: 5.3, l: 0.5 , swappable: 'fromages' },
      { id: 'muesli-nuit-e', name: 'Muesli', qty: '50 g', cal: 237, p: 3.8, g: 30.5, l: 4.0 , swappable: 'feculents' },
    ]
  },
  EMILIE_EASY_MEAL_4,
  EMILIE_INTRA_TRAINING_EASY,
];

// ----- ÉMILIE — HARD SUCRÉ (≈1904 kcal / 109g P / 241g G / 43g L) -----
const PLAN_EMILIE_HARD_SUCRE = [
  { id: 'meal-1', name: 'Meal 1 — Matin 🥣 Sucré', icon: '☀️', color: 'from-pink-100 to-rose-50', border: 'border-pink-200',
    items: [
      ...EMILIE_MORNING_SUPPL,
      { id: 'sere-e1', name: 'Séré maigre', qty: '100 g', cal: 67, p: 12.0, g: 3.5, l: 0.3 , swappable: 'fromages' },
      { id: 'granola-e', name: 'Granola', qty: '50 g', cal: 225, p: 4.5, g: 30.0, l: 10.0 , swappable: 'feculents' },
      { id: 'sirop-e', name: 'Sirop d\'érable', qty: '10 g', cal: 26, p: 0, g: 6.7, l: 0, swappable:'sucres' },
      { id: 'cacahuete-e', name: 'Beurre de cacahuète', qty: '10 g', cal: 58, p: 2.5, g: 2.0, l: 5.0, swappable:'oleagineux' },
      { id: 'framboise-e1', name: 'Framboise', qty: '50 g', cal: 27.5, p: 0.6, g: 6.0, l: 0.4 , swappable: 'fruits' },
      ...EMILIE_MORNING_SUPPL_END,
    ]
  },
  EMILIE_HARD_MEAL_2,
  { id: 'meal-3', name: 'Meal 3 🥛 (si nuit 2h-3h)', icon: '🌙', color: 'from-indigo-50 to-purple-50', border: 'border-indigo-200',
    items: [
      { id: 'whey-e2', name: 'Iso whey', qty: '15 g', cal: 71.1, p: 13.8, g: 0.2, l: 0.2, swappable:'protein' },
      { id: 'banane-e2', name: 'Banane', qty: '120 g', cal: 106.8, p: 1.2, g: 27.6, l: 0 , swappable: 'fruits' },
      { id: 'speculos-e', name: 'Petit beurre ou speculos', qty: '24 g (3)', cal: 110.4, p: 1.9, g: 0, l: 3.4, swappable:'sucres' },
    ]
  },
  EMILIE_HARD_MEAL_4,
  EMILIE_INTRA_TRAINING_HARD,
];

// ----- ÉMILIE — HARD SALÉ (≈1911 kcal / 109g P / 234g G / 47g L) -----
const PLAN_EMILIE_HARD_SALE = [
  { id: 'meal-1', name: 'Meal 1 — Matin 🥪 Salé', icon: '☀️', color: 'from-pink-100 to-rose-50', border: 'border-pink-200',
    items: [
      ...EMILIE_MORNING_SUPPL,
      { id: 'jambon-sale-e', name: 'Jambon sans nitrite', qty: '35 g', cal: 42, p: 7.7, g: 0, l: 1.1, swappable:'protein' },
      { id: 'pain-sale-e', name: 'Pain complet style Harry\'s', qty: '60 g', cal: 151.8, p: 4.6, g: 25.0, l: 2.7, swappable:'feculents' },
      { id: 'cottage-sale-e', name: 'Cottage cheese', qty: '60 g', cal: 57, p: 6.6, g: 2.4, l: 2.4 , swappable: 'fromages' },
      { id: 'avocat-sale-e', name: '½ Avocat', qty: '90 g', cal: 144, p: 1.8, g: 7.2, l: 12.6, swappable:'matieres_grasses' },
      ...EMILIE_MORNING_SUPPL_END,
    ]
  },
  EMILIE_HARD_MEAL_2,
  { id: 'meal-3', name: 'Meal 3 🥄 (si nuit 2h-3h)', icon: '🌙', color: 'from-indigo-50 to-purple-50', border: 'border-indigo-200',
    items: [
      { id: 'sere-nuit-e', name: 'Séré maigre', qty: '100 g', cal: 67, p: 12.0, g: 3.5, l: 0.3 , swappable: 'fromages' },
      { id: 'muesli-nuit-e', name: 'Muesli', qty: '50 g', cal: 237, p: 3.8, g: 30.5, l: 4.0 , swappable: 'feculents' },
    ]
  },
  EMILIE_HARD_MEAL_4,
  EMILIE_INTRA_TRAINING_HARD,
];

// ----- ÉMILIE — CHEAT MEAL (high-protein autour, cheat libre, ≈508 kcal hors cheat) -----
const PLAN_EMILIE_CHEAT = [
  { id: 'meal-1', name: 'Meal 1 — Matin', icon: '☀️', color: 'from-pink-100 to-rose-50', border: 'border-pink-200',
    items: [
      { id: 'zinc-e', name: 'Zinc bisglycinate (15 mg) à jeun', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'sere-cheat', name: 'Séré maigre', qty: '200 g', cal: 134, p: 24.0, g: 7.0, l: 0.6 },
      { id: 'omega-e', name: 'Oméga 3 (3 g)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'd3-e', name: 'Vitamine D3 K2 (1000 UI)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'creatine-e', name: 'Créatine (3 g)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    ]
  },
  { id: 'meal-2', name: 'Meal 2 — Midi (protéiné)', icon: '🥩', color: 'from-rose-100 to-pink-50', border: 'border-rose-300',
    items: [
      { id: 'poulet-cheat-1', name: 'Filet de poulet', qty: '150 g', cal: 165, p: 33.3, g: 1.5, l: 3.0, swappable: 'protein', options: PROTEIN_OPTS_EMILIE, optionId: 'poulet' },
      { id: 'legumes-cheat-1', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 , swappable:'legumes' },
    ]
  },
  { id: 'meal-3', name: 'Meal 3 (si nuit 2h-3h)', icon: '🌙', color: 'from-indigo-50 to-purple-50', border: 'border-indigo-200',
    items: [
      { id: 'sere-cheat-2', name: 'Séré maigre', qty: '200 g', cal: 134, p: 24.0, g: 7.0, l: 0.6 },
    ]
  },
  { id: 'meal-4', name: '🍕 Cheat Meal', icon: '🍕', color: 'from-orange-100 to-amber-100', border: 'border-orange-400',
    items: [
      { id: 'cheat-meal', name: 'Cheat Meal (libre)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    ]
  },
  { id: 'meal-5', name: 'Meal 5 — Intra-Training', icon: '💪', color: 'from-orange-100 to-red-50', border: 'border-orange-300', conditional: true,
    items: [
      { id: 'boisson-e', name: 'Boisson glucidique (0,5g/kg/h)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'electro-e', name: 'Électrolytes', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    ]
  },
];


const PROTEIN_OPTS_ANDY_M2 = makeProteinOptions({ poulet: 200, crevettes: 225, thon: 200, poissonBlanc: 240, saumon: 130, boeufMaigre: 160, tofu: 210 });
const PROTEIN_OPTS_ANDY_NIGHT = makeProteinOptions({ poulet: 120, crevettes: 135, thon: 120, poissonBlanc: 145, saumon: 80, boeufMaigre: 95, tofu: 130 });
const PROTEIN_OPTS_ANDY_M1R = makeProteinOptions({ poulet: 160, crevettes: 180, thon: 160, poissonBlanc: 190, saumon: 105, boeufMaigre: 130, tofu: 170 });

const PLAN_ANDY_ENTRAINEMENT = [
  { id:'andy-m1', name:'Meal 1', icon:'🌅', color:'from-green-100 to-emerald-50', border:'border-green-200', items:[
    { id:'pdt-a1', name:'Pomme de terre (cuite)', qty:'400 g', cal:340, p:6.0, g:72.0, l:1.6, swappable:'feculents' },
    { id:'poulet-a1', name:'Filet de poulet', qty:'120 g', cal:132, p:26.6, g:1.2, l:2.4, swappable:'protein', options:PROTEIN_OPTS_ANDY_NIGHT, optionId:'poulet' },
    { id:'carottes-a1', name:'Carottes', qty:'350 g', cal:108.5, p:3.5, g:28.0, l:0, swappable:'legumes' },
    { id:'balsamique-a1', name:'Creme balsamique', qty:'20 g', cal:45.2, p:0.2, g:11.0, l:0.1 },
    { id:'huile-a1', name:"Huile d'olive", qty:'10 g', cal:86.2, p:0.0, g:0.0, l:10.0 },
  ]},
  { id:'andy-m2', name:'Meal 2', icon:'🍽️', color:'from-emerald-100 to-green-50', border:'border-emerald-200', items:[
    { id:'poulet-a2', name:'Filet de poulet', qty:'200 g', cal:220, p:44.4, g:2.0, l:4.0, swappable:'protein', options:PROTEIN_OPTS_ANDY_M2, optionId:'poulet' },
    { id:'pdt-a2', name:'Pomme de terre (cuite)', qty:'400 g', cal:340, p:6.0, g:72.0, l:1.6, swappable:'feculents' },
    { id:'carottes-a2', name:'Carottes', qty:'200 g', cal:62, p:2.0, g:16.0, l:0, swappable:'legumes' },
    { id:'tomates-a2', name:'Tomates', qty:'150 g', cal:30, p:1.5, g:6.75, l:0.45, swappable:'legumes' },
    { id:'salade-a2', name:'Salade sucrine', qty:'150 g', cal:22.5, p:1.5, g:4.5, l:0, swappable:'legumes' },
    { id:'balsamique-a2', name:'Creme balsamique', qty:'20 g', cal:45.2, p:0.2, g:11.0, l:0.1 },
    { id:'huile-a2', name:"Huile d'olive", qty:'10 g', cal:86.2, p:0.0, g:0.0, l:10.0 },
  ]},
  { id:'andy-m3', name:'Meal 3', icon:'🍫', color:'from-teal-50 to-green-50', border:'border-teal-200', items:[
    { id:'banane-a3', name:'Banane', qty:'300 g', cal:267, p:3.0, g:69.0, l:0, swappable:'fruits' },
    { id:'blanc-oeuf-a3', name:"Blanc d'oeuf", qty:'2 pieces', cal:28, p:6.2, g:0.4, l:0, swappable:'protein' },
    { id:'choco-a3', name:'Chocolat 70%', qty:'30 g', cal:171.6, p:2.7, g:9.0, l:12.0, swappable:'sucres' },
  ]},
  { id:'andy-m4', name:'Meal 4', icon:'🌙', color:'from-green-50 to-teal-50', border:'border-green-200', items:[
    { id:'pain-a4', name:"Pain complet style Harry's", qty:'160 g', cal:404.8, p:12.3, g:66.7, l:7.2, swappable:'feculents' },
    { id:'poulet-a4', name:'Filet de poulet', qty:'120 g', cal:132, p:26.6, g:1.2, l:2.4, swappable:'protein', options:PROTEIN_OPTS_ANDY_NIGHT, optionId:'poulet' },
    { id:'tomates-a4', name:'Tomates', qty:'250 g', cal:50, p:2.5, g:11.25, l:0.75, swappable:'legumes' },
  ]},
];

const PLAN_ANDY_REPOS = [
  { id:'andy-m1', name:'Meal 1', icon:'🌅', color:'from-green-100 to-emerald-50', border:'border-green-200', items:[
    { id:'pdt-a1', name:'Pomme de terre (cuite)', qty:'400 g', cal:340, p:6.0, g:72.0, l:1.6, swappable:'feculents' },
    { id:'poulet-a1', name:'Filet de poulet', qty:'160 g', cal:176, p:35.5, g:1.6, l:3.2, swappable:'protein', options:PROTEIN_OPTS_ANDY_M1R, optionId:'poulet' },
    { id:'carottes-a1', name:'Carottes', qty:'200 g', cal:62, p:2.0, g:16.0, l:0, swappable:'legumes' },
    { id:'balsamique-a1', name:'Creme balsamique', qty:'20 g', cal:45.2, p:0.2, g:11.0, l:0.1 },
    { id:'huile-a1', name:"Huile d'olive", qty:'10 g', cal:86.2, p:0.0, g:0.0, l:10.0 },
  ]},
  { id:'andy-m2', name:'Meal 2', icon:'🍽️', color:'from-emerald-100 to-green-50', border:'border-emerald-200', items:[
    { id:'poulet-a2', name:'Filet de poulet', qty:'200 g', cal:220, p:44.4, g:2.0, l:4.0, swappable:'protein', options:PROTEIN_OPTS_ANDY_M2, optionId:'poulet' },
    { id:'pdt-a2', name:'Pomme de terre (cuite)', qty:'400 g', cal:340, p:6.0, g:72.0, l:1.6, swappable:'feculents' },
    { id:'carottes-a2', name:'Carottes', qty:'200 g', cal:62, p:2.0, g:16.0, l:0, swappable:'legumes' },
    { id:'tomates-a2', name:'Tomates', qty:'150 g', cal:30, p:1.5, g:6.75, l:0.45, swappable:'legumes' },
    { id:'salade-a2', name:'Salade sucrine', qty:'150 g', cal:22.5, p:1.5, g:4.5, l:0, swappable:'legumes' },
    { id:'balsamique-a2', name:'Creme balsamique', qty:'20 g', cal:45.2, p:0.2, g:11.0, l:0.1 },
    { id:'huile-a2', name:"Huile d'olive", qty:'10 g', cal:86.2, p:0.0, g:0.0, l:10.0 },
  ]},
  { id:'andy-m3', name:'Meal 3', icon:'🍎', color:'from-teal-50 to-green-50', border:'border-teal-200', items:[
    { id:'fruit-a3', name:'Fruit au choix', qty:'300 g', cal:150, p:2.1, g:33.0, l:0.9, swappable:'fruits' },
    { id:'blanc-oeuf-a3', name:"Blanc d'oeuf", qty:'2 pieces', cal:28, p:6.2, g:0.4, l:0, swappable:'protein' },
  ]},
  { id:'andy-m4', name:'Meal 4', icon:'🌙', color:'from-green-50 to-teal-50', border:'border-green-200', items:[
    { id:'pain-a4', name:"Pain complet style Harry's", qty:'160 g', cal:404.8, p:12.3, g:66.7, l:7.2, swappable:'feculents' },
    { id:'poulet-a4', name:'Filet de poulet', qty:'120 g', cal:132, p:26.6, g:1.2, l:2.4, swappable:'protein', options:PROTEIN_OPTS_ANDY_NIGHT, optionId:'poulet' },
    { id:'tomates-a4', name:'Tomates', qty:'250 g', cal:50, p:2.5, g:11.25, l:0.75, swappable:'legumes' },
  ]},
];
// ===== PROFILS + MODES =====

const PROFILES = ['luca', 'emilie'];

const MODES_BY_PROFILE = {
  luca: [
    { id: 'standard', label: 'Standard', emoji: '💼', desc: 'Jour normal' },
    { id: 'hard',     label: 'Hard',     emoji: '🔥', desc: 'Training lourd' },
    { id: 'deficit',  label: 'Déficit',  emoji: '📉', desc: 'Sèche / restriction' },
  ],
  emilie: [
    { id: 'easy-sucre',  label: 'Easy 🥣',  emoji: '😌', desc: 'Repos · Sucré (séré + granola)' },
    { id: 'easy-sale',   label: 'Easy 🥪',  emoji: '😌', desc: 'Repos · Salé (pain + cottage + avocat)' },
    { id: 'hard-sucre',  label: 'Hard 🥣',  emoji: '🔥', desc: 'Training · Sucré (séré + granola)' },
    { id: 'hard-sale',   label: 'Hard 🥪',  emoji: '🔥', desc: 'Training · Salé (pain + cottage + avocat)' },
    { id: 'cheat',       label: 'Cheat',    emoji: '🍕', desc: 'Cheat meal' },
  ],
  andy: [
    { id: 'entrainement', label: 'Training', emoji: '💪', desc: 'Jour entrainement (2571 kcal)' },
    { id: 'repos',        label: 'Repos',    emoji: '🌿', desc: 'Jour de repos (2280 kcal)' },
  ],
};

// Bases profil (mêmes infos pour tous les modes d'un profil)
const BASE_PROFILE = {
  luca: {
    name: 'Luca', avatar: '🧑',
    accent: 'violet',
    accentGradient: 'from-violet-600 to-purple-600',
    accentRing: '#8b5cf6',
    profile: 'Luca, 70 kg / 1m70, athlète HYROX. Régime flexible (mange occasionnellement de la viande, pas strictement pesco-végétarien). Suit le plan The Genius (coach Andy).',
  },
  andy: {
    name: 'Andy', avatar: '🦁',
    accent: 'green',
    accentGradient: 'from-green-600 to-emerald-600',
    accentRing: '#16a34a',
    profile: 'Andy, coach et athlete HYROX. 4 repas: matin (pomme de terre + poulet + carottes), midi (poulet + pomme de terre + legumes), collation, repas de nuit (pain + poulet + tomates).',
  },
  emilie: {
    name: 'Émilie', avatar: '👩',
    accent: 'pink',
    accentGradient: 'from-pink-500 to-rose-500',
    accentRing: '#ec4899',
    profile: 'Émilie, athlète HYROX, infirmière puéricultrice (travaille parfois de nuit). Plan structuré en 5 repas. Le Meal 3 fait partie intégrante de la journée et doit toujours être pris : l\'après-midi en journée normale, ou entre 2h-3h du matin si elle est de garde de nuit (juste un changement d\'horaire). Il n\'est PAS optionnel.',
  },
};

const PLAN_BY_USER_ID = {
  'luca-standard':    PLAN_LUCA_STANDARD,
  'luca-hard':        PLAN_LUCA_HARD,
  'luca-deficit':     PLAN_LUCA_DEFICIT,
  'emilie-easy-sucre': PLAN_EMILIE_EASY_SUCRE,
  'emilie-easy-sale':  PLAN_EMILIE_EASY_SALE,
  'emilie-hard-sucre': PLAN_EMILIE_HARD_SUCRE,
  'emilie-hard-sale':  PLAN_EMILIE_HARD_SALE,
  'emilie-cheat':      PLAN_EMILIE_CHEAT,
  'andy-entrainement': PLAN_ANDY_ENTRAINEMENT,
  'andy-repos':        PLAN_ANDY_REPOS,
};

// USERS = chaque combo (profil, mode) est un user virtuel avec son propre plan et état.
// Les plans restent isolés par mode. Lors d'un changement en cours de journée, seules
// les macros déjà consommées sont reportées dans le nouveau mode (voir __modeCarryover).
function buildUsers() {
  const out = {};
  for (const profileId of PROFILES) {
    const base = BASE_PROFILE[profileId];
    for (const mode of MODES_BY_PROFILE[profileId]) {
      const userId = `${profileId}-${mode.id}`;
      out[userId] = {
        id: userId,
        profileId,
        modeId: mode.id,
        modeLabel: mode.label,
        modeEmoji: mode.emoji,
        modeDesc: mode.desc,
        name: base.name,
        avatar: base.avatar,
        accent: base.accent,
        accentGradient: base.accentGradient,
        accentRing: base.accentRing,
        profile: `${base.profile} Mode actif : ${mode.label} (${mode.desc}).`,
        plan: PLAN_BY_USER_ID[userId],
      };
    }
  }
  return out;
}

const USERS = buildUsers();
const DEFAULT_UID = Object.keys(USERS)[0]; // 1er profil/mode dispo (robuste quel que soit PROFILES)

// Default mode quand on bascule entre profils
const DEFAULT_MODE_BY_PROFILE = { luca: 'standard', emilie: 'easy-sucre' };

function registerNutritionProfile(nutritionProfile) {
  if (!nutritionProfile?.profile_id || !nutritionProfile?.plan_modes_json) return;
  const profileId = nutritionProfile.profile_id;
  const modes = Object.values(nutritionProfile.plan_modes_json);
  if (!PROFILES.includes(profileId)) PROFILES.push(profileId);
  MODES_BY_PROFILE[profileId] = modes.map(mode => ({ id: mode.id, label: mode.label, emoji: mode.emoji, desc: mode.desc }));
  BASE_PROFILE[profileId] = {
    name: nutritionProfile.display_name,
    avatar: '🙂', accent: 'violet', accentGradient: 'from-violet-600 to-fuchsia-600', accentRing: '#8b5cf6',
    profile: `${nutritionProfile.display_name}, programme personnel créé à partir du questionnaire initial. Respecter allergies, exclusions et contraintes présentes dans le profil.`,
  };
  DEFAULT_MODE_BY_PROFILE[profileId] = modes.find(mode => mode.id === 'standard')?.id || modes[0]?.id;
  for (const mode of modes) {
    const uid = `${profileId}-${mode.id}`;
    USERS[uid] = {
      id: uid, profileId, modeId: mode.id, modeLabel: mode.label, modeEmoji: mode.emoji,
      modeDesc: mode.desc, name: nutritionProfile.display_name, avatar: '🙂', accent: 'violet',
      accentGradient: 'from-violet-600 to-fuchsia-600', accentRing: '#8b5cf6',
      profile: `${BASE_PROFILE[profileId].profile} Mode actif : ${mode.label} (${mode.desc}).`,
      plan: mode.plan || [],
    };
  }
}

// ===== UTILS =====

const today = () => new Date().toISOString().split('T')[0];
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

function extractJSON(text) {
  if (!text) return null;
  let cleaned = text
    .replace(/```(?:json|JSON)?\s*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^[^\{<]*/, '')
    .trim();

  if (cleaned.includes('<function_calls>') || cleaned.includes('<invoke')) {
    try {
      const result = {};
      const paramRegex = /<parameter\s+name="([^"]+)">([\s\S]*?)<\/parameter>/g;
      let match;
      while ((match = paramRegex.exec(cleaned)) !== null) {
        const key = match[1];
        let value = match[2].trim();
        try { value = JSON.parse(value); } catch {}
        result[key] = value;
      }
      if (result.headline || result.observations || result.actions || result.summary) return result;
    } catch (e) { console.warn('[extractJSON] XML parse failed:', e); }
  }

  const unwrap = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.headline !== undefined || obj.observations !== undefined || obj.actions !== undefined || obj.summary !== undefined) return obj;
    if (obj.input && typeof obj.input === 'object') return unwrap(obj.input);
    if (obj.tool && (obj.observations || obj.actions || obj.headline)) {
      const { tool, ...rest } = obj;
      return rest;
    }
    return null;
  };

  try {
    const direct = JSON.parse(cleaned);
    const unwrapped = unwrap(direct);
    if (unwrapped) return unwrapped;
  } catch (e) {}

  const candidates = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] !== '{') continue;
    let depth = 0, inString = false, escape = false;
    for (let j = i; j < cleaned.length; j++) {
      const c = cleaned[j];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { candidates.push(cleaned.substring(i, j + 1)); break; } }
    }
  }
  candidates.sort((a, b) => b.length - a.length);

  for (const c of candidates) {
    try {
      const p = JSON.parse(c);
      const unwrapped = unwrap(p);
      if (unwrapped) return unwrapped;
    } catch {
      try {
        const fixed = c.replace(/([^\\])\n/g, '$1\\n').replace(/^\n/, '\\n');
        const p = JSON.parse(fixed);
        const unwrapped = unwrap(p);
        if (unwrapped) return unwrapped;
      } catch {}
    }
  }
  return null;
}

function stateHash(plan, status) {
  return plan.map(m => m.items.map(i => `${m.id}/${i.id}/${i.cal}/${i.p}/${status[`${m.id}-${i.id}`] || ''}`).join(';')).join('||');
}

// ===== COMPOSANTS PRÉSENTATIONNELS =====

const BigRing = ({ label, current, target, color, unit = '' }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const safeTarget = target > 0 ? target : 1;
  const isOverflow = current > target;
  const pct = Math.min(100, (current / safeTarget) * 100);
  const offset = circumference - (pct / 100) * circumference;
  const displayColor = isOverflow ? '#dc2626' : color; // red-600 si dépassement
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[68px] h-[68px] sm:w-24 sm:h-24">
        <svg width="100%" height="100%" viewBox="0 0 96 96" className="-rotate-90">
          <circle cx="48" cy="48" r={radius} stroke={isOverflow ? '#fecaca' : '#e5e7eb'} strokeWidth="7" fill="none" />
          <circle cx="48" cy="48" r={radius} stroke={displayColor} strokeWidth="7" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-base sm:text-2xl font-bold leading-none" style={{ color: displayColor }}>{current.toFixed(0)}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">/{target.toFixed(0)}{unit}</div>
        </div>
      </div>
      <div className={`text-[10px] font-bold mt-2 tracking-widest ${isOverflow ? 'text-red-600' : 'text-slate-500'}`}>{label}{isOverflow && ' ⚠'}</div>
    </div>
  );
};

const RemainingDisplay = ({ value, unit, label, color }) => {
  const isCalories = unit === 'kcal';
  const isOverflow = value < 0;
  const absValue = Math.abs(value);
  const formatted = absValue === 0 ? '0' : (isCalories ? absValue.toFixed(0) : absValue.toFixed(1));
  return (
    <div className="text-center">
      <div className={`text-sm sm:text-lg font-bold ${isOverflow ? 'text-red-600' : color}`}>
        {isOverflow && '+'}{formatted} {unit}
      </div>
      <div className={`text-[9px] sm:text-xs mt-0.5 ${isOverflow ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
        {isOverflow ? 'en trop 🚨' : label}
      </div>
    </div>
  );
};

const ObservationCard = ({ severity, title, description }) => {
  const cfg = {
    alert: { dot: 'bg-red-500', bg: 'bg-red-50' },
    warning: { dot: 'bg-amber-500', bg: 'bg-amber-50' },
    positive: { dot: 'bg-emerald-500', bg: 'bg-emerald-50' },
    info: { dot: 'bg-blue-500', bg: 'bg-blue-50' },
  };
  const c = cfg[severity] || cfg.info;
  return (
    <div className={`${c.bg} rounded-xl px-3 py-2.5`}>
      <div className="flex items-start gap-2.5">
        <div className={`w-2 h-2 ${c.dot} rounded-full mt-1.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 text-sm leading-snug">{title}</div>
          {description && <div className="text-xs text-slate-600 mt-1 leading-relaxed">{description}</div>}
        </div>
      </div>
    </div>
  );
};

const DeltaChip = ({ value, unit, label, inverse = false }) => {
  if (!value || value === 0) return null;
  const isPositive = value > 0;
  const goodColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  const badColor = 'bg-red-50 text-red-700 border-red-200';
  const isGood = inverse ? !isPositive : isPositive;
  const color = isGood ? goodColor : badColor;
  const Arrow = isPositive ? ArrowUp : ArrowDown;
  return (
    <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${color}`}>
      <Arrow size={9} strokeWidth={3} />
      {Math.abs(value).toFixed(Math.abs(value) < 10 ? 1 : 0).replace(/\.0$/, '')}{unit}
      <span className="opacity-70 font-medium ml-0.5">{label}</span>
    </div>
  );
};

const TabBtn = ({ active, onClick, children, badge }) => (
  <button onClick={onClick} className={`relative flex-1 py-2.5 text-sm font-semibold transition-colors ${active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
    <span className="inline-flex items-center gap-1.5">
      {children}
      {badge > 0 && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
          {badge}
        </span>
      )}
    </span>
    {active && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-slate-900 rounded-full" />}
  </button>
);

const ActionProposalCard = ({ action, idx, plan, remaining, onApply, onRefuse, onAlternative }) => {
  const meal = plan.find(m => m.id === action.meal_id);
  const item = meal?.items.find(it => it.id === action.item_id);
  const typeConfig = {
    add_item: { icon: Plus, label: 'Ajouter', color: 'bg-emerald-500', border: 'border-emerald-200' },
    modify_item: { icon: Edit3, label: 'Modifier', color: 'bg-blue-500', border: 'border-blue-200' },
    remove_item: { icon: Trash2, label: 'Retirer', color: 'bg-red-500', border: 'border-red-200' },
    mark_consumed: { icon: Check, label: 'Marquer mangé', color: 'bg-violet-500', border: 'border-violet-200' },
    mark_skipped: { icon: X, label: 'Marquer sauté', color: 'bg-slate-500', border: 'border-slate-200' },
  };
  const cfg = typeConfig[action.type] || typeConfig.add_item;
  const Icon = cfg.icon;
  const isApplied = action.applied === 'accepted';
  const isRefused = action.applied === 'refused';
  const isReplaced = action.applied === 'replaced';
  const impact = action.impact || {};

  return (
    <div className={`bg-white rounded-xl border ${cfg.border} p-3 ${isApplied ? 'opacity-60' : ''} ${isRefused ? 'opacity-40' : ''} ${isReplaced ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-2.5">
        <div className={`${cfg.color} rounded-lg p-1.5 flex-shrink-0`}>
          <Icon size={13} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{cfg.label}</span>
            <span className="text-[10px] text-slate-400">→</span>
            <span className="text-[10px] font-semibold text-slate-700">{meal?.name || action.meal_id}</span>
          </div>
          {action.type === 'add_item' && (
            <div className="mt-0.5">
              <div className="font-bold text-slate-800 text-sm">{action.item?.name}</div>
              {action.item?.qty && <div className="text-xs text-slate-500">{action.item.qty}</div>}
            </div>
          )}
          {action.type === 'modify_item' && item && (
            <div className="mt-0.5">
              <div className="font-bold text-slate-800 text-sm">{item.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                <span className="font-mono line-through text-slate-400">{item.qty}</span>
                <ArrowRight size={11} className="text-slate-400" />
                <span className="font-mono font-bold text-slate-800">{action.new_qty || item.qty}</span>
              </div>
            </div>
          )}
          {(action.type === 'remove_item' || action.type === 'mark_skipped') && item && (
            <div className="mt-0.5 font-bold text-slate-800 text-sm">
              <span className={action.type === 'remove_item' ? 'line-through opacity-60' : ''}>
                {item.name} {item.qty && <span className="font-normal text-slate-500">· {item.qty}</span>}
              </span>
            </div>
          )}
          {action.type === 'mark_consumed' && item && (
            <div className="mt-0.5 font-bold text-slate-800 text-sm">{item.name} {item.qty && <span className="font-normal text-slate-500">· {item.qty}</span>}</div>
          )}
          {(impact.cal || impact.p || impact.g || impact.l) && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              <DeltaChip value={impact.cal} unit="" label=" kcal" inverse={remaining.cal < 100} />
              <DeltaChip value={impact.p} unit="g" label=" P" />
              <DeltaChip value={impact.g} unit="g" label=" G" />
              <DeltaChip value={impact.l} unit="g" label=" L" inverse={remaining.l < 5} />
            </div>
          )}
          {action.reason && (
            <div className="text-xs text-slate-600 mt-2 leading-relaxed">💡 {action.reason}</div>
          )}
          {action.applied === 'pending' && (
            <div className="flex gap-1.5 mt-2">
              <button onClick={() => onApply(idx)} className={`flex-1 ${cfg.color} hover:brightness-110 text-white font-bold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1`}>
                <Check size={12} strokeWidth={3} /> Appliquer
              </button>
              <button onClick={() => onAlternative(idx)} className="px-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 border border-violet-200" title="Demander une alternative à l'IA">
                <RotateCcw size={11} /> Autre
              </button>
              <button onClick={() => onRefuse(idx)} className="px-2.5 hover:bg-slate-100 text-slate-500 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 border border-slate-200">
                <X size={12} /> Refuser
              </button>
            </div>
          )}
          {isApplied && (
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 mt-1.5">
              <Check size={12} strokeWidth={3} /> Appliqué
            </div>
          )}
          {isRefused && (
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 mt-1.5">
              <X size={12} /> Refusé
            </div>
          )}
          {isReplaced && (
            <div className="flex items-center gap-1 text-xs font-semibold text-violet-600 mt-1.5">
              <RotateCcw size={11} /> Alternative demandée à l'IA…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MealCard = ({ meal, status, realQty, isCollapsed, onToggleCollapse, onToggleItem, onValidateMeal, onSwapProtein, onSetRealQty, onSwapFood, onAddManualFood, onAddManualConsumption, onScannerReady, favorites, onSaveFavorite, onDeleteFavorite, accent }) => {
  const [openPickers, setOpenPickers] = useState({});
  const [searchQueries, setSearchQueries] = useState({});
  const [inputDrafts, setInputDrafts] = useState({});
  const [addPanel, setAddPanel] = useState({ open: false, query: '', selected: null, grams: 100, mode: 'search' });
  const [manualEntry, setManualEntry] = useState({ name: '', qty: '', cal: '', p: '', g: '', l: '' });
  const [saveAsFavorite, setSaveAsFavorite] = useState(true);

  const togglePicker = (itemId) => setOpenPickers(p => ({ ...p, [itemId]: !p[itemId] }));
  const setSearch = (itemId, q) => setSearchQueries(s => ({ ...s, [itemId]: q }));

  // planItems = original plan (target fixe), allConsumedItems = tout ce qui est done (pour les rings)
  const planItems = meal.items.filter(i => !i.aiAdded);
  const mealConsumed = meal.items.reduce((acc, i) => {
    if (status[`${meal.id}-${i.id}`] === 'done') {
      const origGrams = parseGrams(i.qty);
      const realG = realQty?.[`${meal.id}-${i.id}`];
      const ratio = (realG !== undefined && origGrams && origGrams > 0) ? realG / origGrams : 1;
      acc.cal += i.cal * ratio; acc.p += i.p * ratio; acc.g += i.g * ratio; acc.l += i.l * ratio;
    }
    return acc;
  }, { cal: 0, p: 0, g: 0, l: 0 });
  const mealTarget = planItems.reduce((acc, i) => {
    acc.cal += i.cal; acc.p += i.p; acc.g += i.g; acc.l += i.l;
    return acc;
  }, { cal: 0, p: 0, g: 0, l: 0 });
  const allHandled = meal.items.every(i => status[`${meal.id}-${i.id}`]);

  return (
    <div className={`bg-gradient-to-br ${meal.color} rounded-xl border ${meal.border} overflow-hidden`}>
      <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => onToggleCollapse(meal.id)}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl">{meal.icon}</span>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
              {meal.name}
              {meal.conditional && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">conditionnel</span>}
            </h2>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {mealConsumed.cal.toFixed(0)} / {mealTarget.cal.toFixed(0)} kcal · {mealConsumed.p.toFixed(0)}g P
            </p>
            {/* Macro circles */}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {[
                { label: 'kcal', val: mealTarget.cal, consumed: mealConsumed.cal, bg: 'bg-orange-100', text: 'text-orange-700', ring: '#f97316' },
                { label: 'P',    val: mealTarget.p,   consumed: mealConsumed.p,   bg: 'bg-emerald-100', text: 'text-emerald-700', ring: '#10b981' },
                { label: 'G',    val: mealTarget.g,   consumed: mealConsumed.g,   bg: 'bg-blue-100',    text: 'text-blue-700',    ring: '#3b82f6' },
                { label: 'L',    val: mealTarget.l,   consumed: mealConsumed.l,   bg: 'bg-pink-100',    text: 'text-pink-700',    ring: '#ec4899' },
              ].map(({ label, val, consumed, bg, text, ring }) => {
                const pct = val > 0 ? Math.min(consumed / val, 1) : 0;
                const r = 9; const circ = 2 * Math.PI * r;
                return (
                  <div key={label} className="flex flex-col items-center gap-0.5" title={`${label}: ${consumed.toFixed(0)} / ${val.toFixed(0)}`}>
                    <svg width="26" height="26" viewBox="0 0 26 26">
                      <circle cx="13" cy="13" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5"/>
                      <circle cx="13" cy="13" r={r} fill="none" stroke={ring} strokeWidth="3.5"
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - pct)}
                        strokeLinecap="round"
                        transform="rotate(-90 13 13)"
                      />
                    </svg>
                    <span className={`text-[8px] font-bold ${text} leading-none`}>{label}</span>
                    <span className="text-[8px] text-slate-500 leading-none">{val.toFixed(0)}{label !== 'kcal' ? 'g' : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!allHandled && (
            <button onClick={(e) => { e.stopPropagation(); onValidateMeal(meal.id); }} className="text-[11px] sm:text-[11px] bg-white/70 active:bg-white text-slate-700 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg font-semibold border border-white/50">
              Tout valider
            </button>
          )}
          {isCollapsed ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronUp size={18} className="text-slate-500" />}
        </div>
      </div>
      {!isCollapsed && (
        <>
        <div className="px-1.5 pb-1.5 space-y-1">
          {meal.items.map(item => {
            const key = `${meal.id}-${item.id}`;
            const s = status[key];
            const swapType = item.swappable; // 'protein', 'feculents', 'legumes', 'fruits', 'fromages', or falsy
            const isSwappable = !!swapType;
            const isPickerOpen = !!openPickers[item.id];
            const searchQ = (searchQueries[item.id] || '').toLowerCase();

            // Aliments: recurrents from item's category, search across ALL categories
            const getCatKey = (t) => t === 'protein' ? 'proteines' : t === 'legumes_crudites' ? 'legumes' : t;
            const catKey = getCatKey(swapType);
            const catFoodList = isSwappable ? (ALIMENTS_DB[catKey] || []) : [];
            const allFoods = isSwappable ? Object.values(ALIMENTS_DB).flat() : [];
            const recurrentNames = isSwappable ? (RECURRENTS[catKey] || []) : [];
            const recurrentItems = recurrentNames.map(n => catFoodList.find(f => f.name === n) || allFoods.find(f => f.name === n)).filter(Boolean);
            const searchResults = searchQ.length >= 2
              ? allFoods.filter(f => f.name.toLowerCase().includes(searchQ)).slice(0, 10)
              : [];
            const origGrams = parseGrams(item.qty) || 100;
            // Ligne recalculée selon le grammage RÉEL saisi (si coché + différent du plan)
            const _realG = realQty?.[key];
            const _origG = parseGrams(item.qty);
            const _hasReal = s === 'done' && _realG !== undefined && _origG !== null && _origG > 0 && _realG !== _origG;
            const _ratio = _hasReal ? _realG / _origG : 1;
            const _r1 = (x) => Math.round((Number(x)||0) * _ratio * 10) / 10;
            const dispQty = _hasReal ? `${_realG} g` : item.qty;
            const dispCal = _hasReal ? Math.round((Number(item.cal)||0) * _ratio) : item.cal;
            const dispP = _hasReal ? _r1(item.p) : item.p;
            const dispG = _hasReal ? _r1(item.g) : item.g;
            const dispL = _hasReal ? _r1(item.l) : item.l;

            return (
              <div key={item.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleItem(meal.id, item.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleItem(meal.id, item.id); } }}
                  className={`cursor-pointer w-full text-left flex items-center gap-2.5 p-3 sm:p-2.5 rounded-lg transition-all ${
                    s === 'done' ? 'bg-emerald-100/80 border border-emerald-200' :
                    s === 'skip' ? 'bg-slate-100/80 border border-slate-200 opacity-60' :
                    'bg-white/70 border border-white active:bg-white'
                  }`}>
                  <div className={`w-6 h-6 sm:w-5 sm:h-5 rounded flex items-center justify-center flex-shrink-0 ${
                    s === 'done' ? 'bg-emerald-500 text-white' :
                    s === 'skip' ? 'bg-slate-400 text-white' :
                    'border-2 border-slate-300'
                  }`}>
                    {s === 'done' && <Check size={14} className="sm:hidden" />}
                    {s === 'done' && <Check size={12} className="hidden sm:block" />}
                    {s === 'skip' && <X size={14} className="sm:hidden" />}
                    {s === 'skip' && <X size={12} className="hidden sm:block" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${s === 'skip' ? 'line-through text-slate-500' : 'text-slate-800'} flex items-center gap-1.5 flex-wrap`}>
                      {item.name} {item.qty && <span className="text-slate-500 font-normal">· {dispQty}</span>}
                      {item.aiAdded && <span className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold">{item.manualAdded ? 'Manuel' : 'IA'}</span>}
                      {item.aiModified && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">mod.</span>}
                    </div>
                    {!item.suppl && (
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        {dispCal} kcal · P{dispP} · G{dispG} · L{dispL}
                      </div>
                    )}
                  </div>
                  {isSwappable && (
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePicker(item.id); }}
                      className={`text-[11px] sm:text-[10px] font-semibold px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-md flex items-center gap-1 flex-shrink-0 border transition-colors ${
                        isPickerOpen
                          ? `${accent.selectedBg} ${accent.selectedBorder} ${accent.selectedText}`
                          : 'bg-white/80 active:bg-white border-slate-200 text-slate-600'
                      }`}
                      title="Changer l'aliment"
                    >
                      <Repeat size={11} strokeWidth={2.5} />
                      {isPickerOpen ? 'Fermer' : 'Changer'}
                    </button>
                  )}
                </div>

                {/* Réel : input grammage quand item coché */}
                {s === 'done' && parseGrams(item.qty) !== null && (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/80 border-t border-emerald-100"
                    onClick={e => e.stopPropagation()}
                  >
                    <span className="text-[11px] text-emerald-700 font-semibold">Réel :</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inputDrafts[`${meal.id}-${item.id}`] !== undefined
                        ? inputDrafts[`${meal.id}-${item.id}`]
                        : String(realQty[`${meal.id}-${item.id}`] ?? parseGrams(item.qty) ?? '')}
                      onFocus={e => {
                        const cur = realQty[`${meal.id}-${item.id}`] ?? parseGrams(item.qty);
                        setInputDrafts(d => ({ ...d, [`${meal.id}-${item.id}`]: String(cur ?? '') }));
                        e.target.select();
                      }}
                      onChange={e => {
                        const raw = e.target.value;
                        setInputDrafts(d => ({ ...d, [`${meal.id}-${item.id}`]: raw }));
                        const v = parseFloat(raw);
                        if (!isNaN(v) && v > 0) onSetRealQty(meal.id, item.id, v);
                      }}
                      onBlur={() => setInputDrafts(d => { const n={...d}; delete n[`${meal.id}-${item.id}`]; return n; })}
                      className="w-16 text-center text-sm font-bold text-emerald-800 bg-white border border-emerald-300 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <span className="text-[11px] text-emerald-600">g</span>
                    {realQty[`${meal.id}-${item.id}`] !== undefined &&
                     realQty[`${meal.id}-${item.id}`] !== parseGrams(item.qty) && (
                      <span className="text-[10px] text-emerald-600 font-medium">
                        ({realQty[`${meal.id}-${item.id}`] > parseGrams(item.qty) ? '+' : ''}
                        {Math.round((realQty[`${meal.id}-${item.id}`] - parseGrams(item.qty)))}g vs plan)
                      </span>
                    )}
                  </div>
                )}

                {/* Universal food picker */}
                {isSwappable && isPickerOpen && (
                  <div className="bg-white/80 rounded-lg mt-1 mb-1 p-2 border border-slate-200" onClick={e => e.stopPropagation()}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">
                      Changer · {origGrams}g
                    </div>

                    {/* Recurrents */}
                    {recurrentItems.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider px-1 mb-1">⭐ Récurrents</div>
                        <div className="flex flex-wrap gap-1">
                          {recurrentItems.map(food => {
                            const cal = Math.round(food.cal * origGrams / 100);
                            const p = Math.round(food.p * origGrams / 10) / 10;
                            const isSelected = item.name === food.name;
                            return (
                              <button
                                key={food.name}
                                onClick={() => onSwapFood(meal.id, item.id, food, origGrams)}
                                className={`text-left px-2 py-1.5 rounded-lg border transition-all text-[11px] ${
                                  isSelected
                                    ? `${accent.selectedBg} ${accent.selectedBorder} ${accent.selectedText} font-bold`
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <div className="font-semibold leading-tight">{food.name}</div>
                                <div className="text-slate-500 text-[9px] mt-0.5">{cal} kcal · P{p}g</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Search bar */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 Rechercher parmi 863 aliments (toutes catégories)..."
                        value={searchQueries[item.id] || ''}
                        onChange={e => setSearch(item.id, e.target.value)}
                        className="w-full text-[12px] px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                      <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto">
                        {searchResults.map(food => {
                          const cal = Math.round(food.cal * origGrams / 100);
                          const p = Math.round(food.p * origGrams / 10) / 10;
                          const g_ = Math.round(food.g * origGrams / 10) / 10;
                          const l_ = Math.round(food.l * origGrams / 10) / 10;
                          const isSelected = item.name === food.name;
                          return (
                            <button
                              key={food.name}
                              onClick={() => { onSwapFood(meal.id, item.id, food, origGrams); setSearch(item.id, ''); }}
                              className={`w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border transition-all ${
                                isSelected
                                  ? `${accent.selectedBg} ${accent.selectedBorder}`
                                  : 'bg-white border-transparent hover:border-slate-200'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                {isSelected && <Check size={11} className={`${accent.selectedIcon} inline mr-1`} strokeWidth={3} />}
                                <span className={`text-sm font-medium ${isSelected ? accent.selectedText : 'text-slate-800'}`}>
                                  {food.name}
                                </span>
                              </div>
                              <div className="flex gap-1 flex-shrink-0 text-[9px]">
                                <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold">{cal}</span>
                                <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">P{p}</span>
                                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold hidden sm:inline">G{g_}</span>
                                <span className="bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded font-bold hidden sm:inline">L{l_}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {searchQ.length >= 2 && searchResults.length === 0 && (
                      <div className="text-center py-2 text-[11px] text-slate-400">Aucun résultat pour "{searchQueries[item.id]}"</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* ➕ Ajouter un aliment hors plan */}
        <div className="mt-2 border-t border-slate-100 pt-2">
          {!addPanel.open ? (
            <button
              onClick={(e) => { e.stopPropagation(); setAddPanel({ open: true, query: '', selected: null, grams: 100, mode: 'search' }); }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-dashed border-slate-200 hover:border-slate-300 transition-all"
            >
              <span className="text-base leading-none">＋</span> Ajouter un aliment hors plan
            </button>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ajouter à {meal.name}</span>
                <button onClick={() => setAddPanel({ open: false, query: '', selected: null, grams: 100 })}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold px-1">✕</button>
              </div>

              {!addPanel.selected ? (
                <>
                  {/* Recherche locale, scanner ou saisie exacte sans appel IA */}
                  <div className="flex gap-1 mb-2">
                    <button onClick={e=>{e.stopPropagation();setAddPanel(p=>({...p,mode:'favorites',query:''}))}}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${addPanel.mode==='favorites'?'bg-amber-500 text-white':'bg-slate-100 text-slate-500'}`}>
                      ⭐ Favoris
                    </button>
                    <button onClick={e=>{e.stopPropagation();setAddPanel(p=>({...p,mode:'search',scanResult:null,scanError:null}))}}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${addPanel.mode==='search'?'bg-slate-800 text-white':'bg-slate-100 text-slate-500'}`}>
                      🔍 Recherche
                    </button>
                    <button onClick={e=>{e.stopPropagation();setAddPanel(p=>({...p,mode:'scan',query:''}))}}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${addPanel.mode==='scan'?'bg-slate-800 text-white':'bg-slate-100 text-slate-500'}`}>
                      📷 Scanner
                    </button>
                    <button onClick={e=>{e.stopPropagation();setAddPanel(p=>({...p,mode:'manual',query:''}))}}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${addPanel.mode==='manual'?'bg-slate-800 text-white':'bg-slate-100 text-slate-500'}`}>
                      ✏️ Manuel
                    </button>
                  </div>

                  {addPanel.mode === 'search' && (
                    <input
                      autoFocus
                      type="text"
                      placeholder="🔍 Rechercher parmi 863 aliments..."
                      value={addPanel.query}
                      onChange={e => setAddPanel(p => ({ ...p, query: e.target.value }))}
                      className="w-full text-[12px] px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 mb-2"
                    />
                  )}

                  {addPanel.mode === 'favorites' && (
                    <div className="space-y-2">
                      {favorites.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-xs text-slate-500">
                          Aucun favori. Enregistre ton prochain aliment manuel pour le retrouver ici.
                        </div>
                      ) : favorites.map(favorite => (
                        <div key={favorite.id} className="flex items-center gap-2 rounded-xl border border-amber-100 bg-white p-2">
                          <button onClick={() => {
                            onAddManualConsumption(meal.id, favoriteToEntry(favorite));
                            setAddPanel({ open: false, query: '', selected: null, grams: 100, mode: 'search' });
                          }} className="min-w-0 flex-1 text-left">
                            <div className="truncate text-sm font-bold text-slate-800">⭐ {favorite.name}</div>
                            <div className="text-[10px] text-slate-500">{favorite.portion} · {favorite.calories} kcal · P{favorite.protein} · G{favorite.carbs} · L{favorite.fat}</div>
                          </button>
                          <button onClick={() => onDeleteFavorite(favorite.id)} className="min-h-10 min-w-10 rounded-lg bg-red-50 text-red-500" aria-label={`Supprimer ${favorite.name}`}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {addPanel.mode === 'manual' && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500">Recopie les macros totales indiquées par Starbucks ou l’étiquette.</p>
                      <input
                        type="text"
                        value={manualEntry.name}
                        onChange={e => setManualEntry(v => ({ ...v, name: e.target.value }))}
                        placeholder="Ex. Latte Starbucks"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                      />
                      <input
                        type="text"
                        value={manualEntry.qty}
                        onChange={e => setManualEntry(v => ({ ...v, qty: e.target.value }))}
                        placeholder="Quantité (ex. Grande 473 ml)"
                        className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          ['cal', 'kcal'], ['p', 'P (g)'], ['g', 'G (g)'], ['l', 'L (g)']
                        ].map(([key, label]) => (
                          <label key={key} className="bg-white border border-slate-200 rounded-lg p-1.5 text-center">
                            <span className="block text-[9px] text-slate-500 mb-1">{label}</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={manualEntry[key]}
                              onFocus={e => e.target.select()}
                              onChange={e => setManualEntry(v => ({ ...v, [key]: e.target.value }))}
                              className="w-full text-sm font-bold text-center text-slate-800 focus:outline-none"
                            />
                          </label>
                        ))}
                      </div>
                      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800">
                        <input type="checkbox" checked={saveAsFavorite} onChange={e => setSaveAsFavorite(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                        ⭐ Enregistrer dans mes favoris
                      </label>
                      <button
                        disabled={!manualEntry.name.trim() || manualEntry.cal === ''}
                        onClick={() => {
                          if (saveAsFavorite) onSaveFavorite(manualEntry);
                          onAddManualConsumption(meal.id, manualEntry);
                          setManualEntry({ name: '', qty: '', cal: '', p: '', g: '', l: '' });
                          setAddPanel({ open: false, query: '', selected: null, grams: 100, mode: 'search' });
                        }}
                        className="w-full py-2.5 rounded-xl bg-violet-600 disabled:bg-slate-300 text-white font-bold text-sm"
                      >
                        ✓ Ajouter sans utiliser l’IA
                      </button>
                    </div>
                  )}

                  {addPanel.mode === 'scan' && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500 text-center">Détection automatique du code-barre</p>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          try {
                            const stream = await navigator.mediaDevices.getUserMedia({
                              video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
                            });
                            onScannerReady(meal.id, meal.name, stream);
                          } catch(err) {
                            if (!navigator.mediaDevices?.getUserMedia) {
                              alert('Camera non disponible sur ce navigateur.');
                            } else if (err.name === 'NotAllowedError') {
                              alert('Permission refusee. Reglages iPhone: Safari > Camera > Autoriser');
                            } else {
                              onScannerReady(meal.id, meal.name, null);
                            }
                          }
                        }}
                        className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center gap-3 active:bg-slate-700"
                      >
                        <span className="text-2xl">📷</span>
                        <span>Ouvrir le scanner</span>
                      </button>
                    </div>
                  )}

                  {addPanel.mode === 'scan' && addPanel.scanResult && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        {addPanel.scanResult.image && <img src={addPanel.scanResult.image} alt="" className="w-14 h-14 object-contain rounded-lg flex-shrink-0"/>}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 text-sm">{addPanel.scanResult.name}</div>
                          {addPanel.scanResult.brand && <div className="text-[10px] text-slate-500">{addPanel.scanResult.brand}</div>}
                          <div className="flex gap-1 mt-1 flex-wrap text-[9px]">
                            <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">{addPanel.scanResult.cal} kcal</span>
                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">P{addPanel.scanResult.p}g</span>
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">G{addPanel.scanResult.g}g</span>
                            <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full font-bold">L{addPanel.scanResult.l}g</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">Grammage :</span>
                        <input type="text" inputMode="decimal" value={addPanel.grams} onFocus={e=>e.target.select()}
                          onChange={e=>setAddPanel(p=>({...p,grams:parseFloat(e.target.value)||100}))}
                          className="w-16 text-center font-bold border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"/>
                        <span className="text-slate-500 text-xs">g</span>
                        <span className="flex-1 text-right text-xs font-bold text-orange-600">→ {Math.round(addPanel.scanResult.cal * addPanel.grams / 100)} kcal</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          const f = addPanel.grams/100; const r = addPanel.scanResult;
                          onAddManualFood(meal.id, {name:r.name,qty:`${addPanel.grams} g`,cal:Math.round(r.cal*f*10)/10,p:Math.round(r.p*f*10)/10,g:Math.round(r.g*f*10)/10,l:Math.round(r.l*f*10)/10}, addPanel.grams);
                          setAddPanel({open:false,query:'',selected:null,grams:100,mode:'search'});
                        }} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-bold text-sm">✓ Ajouter</button>
                        <button onClick={()=>setAddPanel(p=>({...p,scanResult:null,scanError:null}))} className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold">↩</button>
                      </div>
                    </div>
                  )}
                  {addPanel.query.length >= 2 && (() => {
                    const allFoods = Object.values(ALIMENTS_DB).flat();
                    const results = allFoods.filter(f => f.name.toLowerCase().includes(addPanel.query.toLowerCase())).slice(0, 8);
                    return results.length > 0 ? (
                      <div className="space-y-0.5 max-h-48 overflow-y-auto">
                        {results.map(food => (
                          <button
                            key={food.name}
                            onClick={() => setAddPanel(p => ({ ...p, selected: food, grams: 100 }))}
                            className="w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white transition-all"
                          >
                            <span className="text-sm font-medium text-slate-800 flex-1">{food.name}</span>
                            <div className="flex gap-1 text-[9px] flex-shrink-0">
                              <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold">{food.cal} kcal</span>
                              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">P{food.p}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : <div className="text-center py-2 text-[11px] text-slate-400">Aucun résultat</div>;
                  })()}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800">{addPanel.selected.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {Math.round(addPanel.selected.cal * addPanel.grams / 100)} kcal · P{Math.round(addPanel.selected.p * addPanel.grams / 10)/10}g · G{Math.round(addPanel.selected.g * addPanel.grams / 10)/10}g · L{Math.round(addPanel.selected.l * addPanel.grams / 10)/10}g
                      </div>
                    </div>
                    <button onClick={() => setAddPanel(p => ({ ...p, selected: null }))}
                      className="text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-slate-600 font-semibold">Grammage :</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={addPanel.grams}
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        setAddPanel(p => ({ ...p, grams: isNaN(v) ? e.target.value : v }));
                      }}
                      className="w-20 text-center text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <span className="text-[12px] text-slate-500">g</span>
                  </div>
                  <button
                    onClick={() => {
                      const grams = parseFloat(addPanel.grams) || 100;
                      const food = addPanel.selected;
                      setAddPanel({ open: false, query: '', selected: null, grams: 100, mode: 'search' });
                      if (food) onAddManualFood(meal.id, food, grams);
                    }}
                    className="w-full py-2 rounded-lg bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
                  >
                    ✓ Ajouter au {meal.name}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
};



// ===== ADMIN PANEL =====
// Mot de passe hashé SHA-256 (jamais stocker en clair)
const ADMIN_HASH = 'f1f8c29f3f502af3eb7f61feb816b963e3c811612f8f99676a81b3fc50d46d3f';
const checkAdminPwd = async (input) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('') === ADMIN_HASH;
};

const AdminPanel = ({ profiles, onClose, onSavePlan }) => {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [selProfile, setSelProfile] = useState(profiles[0] || '');
  const [selMode, setSelMode] = useState('');
  const [editItem, setEditItem] = useState(null); // {mealIdx, itemIdx, ...item}
  const [addingTo, setAddingTo] = useState(null); // mealIdx

  const modes = MODES_BY_PROFILE[selProfile] || [];
  const activeMode = selMode || modes[0]?.id || '';
  const userId = `${selProfile}-${activeMode}`;
  const [plan, setPlan] = useState(() => {
    const uid = `${selProfile}-${activeMode}`;
    try {
      // Try app storage key first, fall back to original plan
      const appKey = `coach-nutrition:plan-${uid}`;
      const andyKey = `coach-andy:plan-${uid}`;
      const saved = localStorage.getItem(appKey) || localStorage.getItem(andyKey);
      return saved ? JSON.parse(saved) : deepClone(USERS[uid]?.plan || []);
    } catch { return deepClone(USERS[userId]?.plan || []); }
  });

  // Reload plan when profile/mode changes
  useEffect(() => {
    const uid = `${selProfile}-${activeMode}`;
    try {
      const appKey = `coach-nutrition:plan-${uid}`;
      const andyKey = `coach-andy:plan-${uid}`;
      const saved = localStorage.getItem(appKey) || localStorage.getItem(andyKey);
      setPlan(saved ? JSON.parse(saved) : deepClone(USERS[uid]?.plan || []));
    } catch { setPlan(deepClone(USERS[uid]?.plan || [])); }
    setEditItem(null); setAddingTo(null);
  }, [selProfile, activeMode]);

  const savePlan = () => {
    onSavePlan(selProfile, activeMode, plan);
    alert('✅ Plan sauvegardé ! Les changements sont actifs immédiatement.');
  };

  const resetPlan = () => {
    if (!window.confirm("Reset plan ?")) return;
    const uid = `${selProfile}-${activeMode}`;
    const fresh = deepClone(USERS[uid]?.plan || []);
    setPlan(fresh);
    
  };

  const updateItem = (mealIdx, itemIdx, updates) => {
    setPlan(prev => {
      const p = deepClone(prev);
      p[mealIdx].items[itemIdx] = { ...p[mealIdx].items[itemIdx], ...updates };
      return p;
    });
  };

  const deleteItem = (mealIdx, itemIdx) => {
    if (!window.confirm('Supprimer cet aliment ?')) return;
    setPlan(prev => { const p = deepClone(prev); p[mealIdx].items.splice(itemIdx, 1); return p; });
  };

  const addItem = (mealIdx, newItem) => {
    setPlan(prev => {
      const p = deepClone(prev);
      p[mealIdx].items.push({ id: `item-${Date.now()}`, ...newItem });
      return p;
    });
    setAddingTo(null);
  };

  const addMeal = () => {
    const num = plan.length + 1;
    const icons = ['🍳','🥗','🍽️','🌙','💪','🍎','☀️','🌅','🥣','🌆'];
    const newMeal = {
      id: `meal-custom-${Date.now()}`,
      name: `Meal ${num}`,
      icon: icons[num % icons.length] || '🍽️',
      color: 'from-slate-100 to-slate-50',
      border: 'border-slate-200',
      items: []
    };
    setPlan(prev => [...prev, newMeal]);
  };

  const deleteMeal = (mealIdx) => {
    if (!window.confirm("Supprimer ce meal ?")) return;
    setPlan(prev => prev.filter((_, i) => i !== mealIdx));
  };

  const updateMealName = (mealIdx, name) => {
    setPlan(prev => { const p = deepClone(prev); p[mealIdx].name = name; return p; });
  };

  if (!authed) return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-xl font-bold text-white">Accès Administrateur</h2>
          <p className="text-white/40 text-sm mt-1">Zone réservée au coach</p>
        </div>
        <div className="space-y-3">
          <input
            type="password" autoFocus
            value={pwd} onChange={e => { setPwd(e.target.value); setPwdError(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { checkAdminPwd(pwd).then(ok => { if (ok) setAuthed(true); else setPwdError(true); }); } }}
            placeholder="Mot de passe"
            className={`w-full bg-white/10 text-white placeholder-white/30 border ${pwdError ? 'border-red-500' : 'border-white/20'} rounded-2xl px-5 py-4 text-center text-lg tracking-widest focus:outline-none focus:border-violet-500`}
          />
          {pwdError && <p className="text-red-400 text-sm text-center">Mot de passe incorrect</p>}
          <button
            onClick={async () => { const ok = await checkAdminPwd(pwd); if (ok) setAuthed(true); else setPwdError(true); }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-lg hover:opacity-90 transition-opacity"
          >Entrer</button>
        </div>
        <button onClick={onClose} className="w-full text-white/30 text-sm hover:text-white/60 transition-colors">Annuler</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#0d0d1a] z-[100] overflow-y-auto">
      {/* Admin Header */}
      <div className="sticky top-0 bg-[#0d0d1a]/95 backdrop-blur border-b border-white/10 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h1 className="text-white font-bold text-base">Admin — Modifier le plan</h1>
              <p className="text-white/40 text-[10px]">Mode coach</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={resetPlan} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-xs font-semibold hover:bg-white/20">↺ Reset</button>
            <button onClick={savePlan} className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold hover:opacity-90">💾 Sauvegarder</button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20">✕</button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4 pb-20">
        {/* Profile + Mode selectors */}
        <div className="flex gap-2 flex-wrap">
          {profiles.map(pid => (
            <button key={pid} onClick={() => { setSelProfile(pid); setSelMode(''); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selProfile === pid ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
            >{BASE_PROFILE[pid]?.name || pid}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {modes.map(m => (
            <button key={m.id} onClick={() => setSelMode(m.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeMode === m.id ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
            >{m.label}</button>
          ))}
        </div>

        {/* Meals */}
        {plan.map((meal, mealIdx) => (
          <div key={meal.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg flex-shrink-0">{meal.icon || '🍽️'}</span>
                {editingMealName === mealIdx ? (
                  <input autoFocus value={meal.name}
                    onChange={e => updateMealName(mealIdx, e.target.value)}
                    onBlur={() => setEditingMealName(null)}
                    onKeyDown={e => e.key === 'Enter' && setEditingMealName(null)}
                    className="bg-white/20 text-white text-sm font-bold rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-white/50 flex-1 min-w-0"
                  />
                ) : (
                  <button onClick={() => setEditingMealName(mealIdx)} className="text-white font-bold text-sm text-left hover:text-white/70 truncate">
                    {meal.name} ✏️
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => setAddingTo(addingTo === mealIdx ? null : mealIdx)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-400 text-xs font-bold hover:bg-emerald-600/50">+ Aliment</button>
                <button onClick={() => deleteMeal(mealIdx)}
                  className="px-2 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold hover:bg-red-600/40">🗑️</button>
              </div>
            </div>

            {/* Add item form */}
            {addingTo === mealIdx && (
              <AddItemForm onAdd={item => addItem(mealIdx, item)} onCancel={() => setAddingTo(null)} />
            )}

            {/* Items */}
            <div className="divide-y divide-white/5">
              {meal.items.filter(i => !i.aiAdded).map((item, itemIdx) => (
                <div key={item.id}>
                  {editItem?.mealIdx === mealIdx && editItem?.itemIdx === itemIdx ? (
                    <EditItemForm
                      item={item}
                      onSave={updates => { updateItem(mealIdx, itemIdx, updates); setEditItem(null); }}
                      onCancel={() => setEditItem(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5">
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium">{item.name}</div>
                        <div className="text-white/40 text-[10px]">{item.qty} · {item.cal} kcal · P{item.p} · G{item.g} · L{item.l}</div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => setEditItem({ mealIdx, itemIdx, ...item })}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 text-sm">✏️</button>
                        <button onClick={() => deleteItem(mealIdx, itemIdx)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40 font-bold text-sm">✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// Helper: cherche dans ALIMENTS_DB par nom
function searchAlimentsDB(query) {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const allFoods = Object.values(ALIMENTS_DB).flat();
  return allFoods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 6);
}

// Helper: calcule les macros depuis les valeurs pour 100g × grammage
function calcMacros(food100g, grams) {
  const f = grams / 100;
  return {
    cal: Math.round(food100g.cal * f * 10) / 10,
    p:   Math.round(food100g.p   * f * 10) / 10,
    g:   Math.round(food100g.g   * f * 10) / 10,
    l:   Math.round(food100g.l   * f * 10) / 10,
  };
}

const AdminFoodInput = ({ initialName='', initialQty='100 g', initialCal='', initialP='', initialG='', initialL='', accentColor='blue', onSave, onCancel, label='Valider' }) => {
  const [name, setName] = useState(initialName);
  const [qty, setQty] = useState(initialQty);
  const [cal, setCal] = useState(String(initialCal));
  const [p, setP] = useState(String(initialP));
  const [g, setG] = useState(String(initialG));
  const [l, setL] = useState(String(initialL));
  const [suggestions, setSuggestions] = useState([]);
  const [food100g, setFood100g] = useState(null); // macros pour 100g du food sélectionné
  const [manualMacros, setManualMacros] = useState(false);

  const accent = accentColor === 'blue'
    ? { border:'border-blue-500', bg:'bg-blue-950/40', btn:'bg-blue-600 hover:bg-blue-700', ring:'focus:ring-blue-500', suggestion:'hover:bg-blue-900/40' }
    : { border:'border-emerald-500', bg:'bg-emerald-950/40', btn:'bg-emerald-600 hover:bg-emerald-700', ring:'focus:ring-emerald-500', suggestion:'hover:bg-emerald-900/40' };

  const parseGrams = (qtyStr) => {
    const m = String(qtyStr).match(/^(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 100;
  };

  const handleNameChange = (val) => {
    setName(val);
    setFood100g(null);
    setSuggestions(searchAlimentsDB(val));
    setManualMacros(true);
  };

  const selectFood = (food) => {
    setName(food.name);
    setFood100g(food);
    setSuggestions([]);
    setManualMacros(false);
    const grams = parseGrams(qty) || 100;
    const macros = calcMacros(food, grams);
    setCal(String(macros.cal));
    setP(String(macros.p));
    setG(String(macros.g));
    setL(String(macros.l));
  };

  const handleQtyChange = (val) => {
    setQty(val);
    if (food100g && !manualMacros) {
      const grams = parseFloat(val) || 100;
      const macros = calcMacros(food100g, grams);
      setCal(String(macros.cal));
      setP(String(macros.p));
      setG(String(macros.g));
      setL(String(macros.l));
    }
  };

  const fv = v => parseFloat(v) || 0;
  const canSave = name.trim().length > 0;

  return (
    <div className={`px-4 py-3 ${accent.bg} border-l-2 ${accent.border} space-y-2`}>
      {/* Nom + suggestions */}
      <div className="relative">
        <input
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="Nom de l'aliment..."
          className={`w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${accent.ring} placeholder-white/30`}
        />
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-slate-900 border border-white/20 rounded-lg mt-1 z-10 overflow-hidden shadow-xl">
            {suggestions.map(food => (
              <button key={food.name} onClick={() => selectFood(food)}
                className={`w-full text-left px-3 py-2 ${accent.suggestion} transition-colors`}>
                <div className="text-white text-sm font-medium">{food.name}</div>
                <div className="text-white/40 text-[10px]">{food.cal} kcal · P{food.p} · G{food.g} · L{food.l} (pour 100g)</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grammage */}
      <div className="flex items-center gap-2">
        <span className="text-white/50 text-[11px]">Quantité :</span>
        <input value={qty} onChange={e => handleQtyChange(e.target.value)}
          placeholder="ex: 150 g"
          className={`flex-1 bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${accent.ring}`}
        />
        {food100g && !manualMacros && (
          <span className="text-white/40 text-[10px]">auto ✓</span>
        )}
      </div>

      {/* Macros */}
      <div className="grid grid-cols-4 gap-1.5">
        {[['cal','kcal',cal,setCal,'bg-orange-900/30'],['p','P (g)',p,setP,'bg-emerald-900/30'],['g','G (g)',g,setG,'bg-blue-900/30'],['l','L (g)',l,setL,'bg-pink-900/30']].map(([key,ph,val,setter,bg]) => (
          <div key={key} className={`${bg} rounded-lg p-2 text-center`}>
            <div className="text-white/40 text-[9px] mb-1">{ph}</div>
            <input value={val} onFocus={e=>e.target.select()}
              onChange={e=>{setter(e.target.value); setManualMacros(true); setFood100g(null);}}
              inputMode="decimal" type="text"
              className="w-full bg-transparent text-white text-sm font-bold text-center focus:outline-none"
            />
          </div>
        ))}
      </div>
      {food100g && (
        <p className="text-white/30 text-[10px] text-center">
          Macros calculées automatiquement depuis la base de données
        </p>
      )}

      <div className="flex gap-2">
        <button onClick={() => canSave && onSave({ name, qty, cal:fv(cal), p:fv(p), g:fv(g), l:fv(l) })}
          disabled={!canSave}
          className={`flex-1 py-2 rounded-lg ${accent.btn} text-white text-sm font-bold disabled:opacity-40 transition-colors`}>
          {label}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
};

const EditItemForm = ({ item, onSave, onCancel }) => (
  <AdminFoodInput
    initialName={item.name} initialQty={item.qty}
    initialCal={item.cal} initialP={item.p} initialG={item.g} initialL={item.l}
    accentColor="blue" onSave={onSave} onCancel={onCancel} label="✓ Valider"
  />
);

const AddItemForm = ({ onAdd, onCancel }) => (
  <AdminFoodInput
    accentColor="emerald" onSave={onAdd} onCancel={onCancel} label="+ Ajouter"
  />
);






// ===== REAL-TIME BARCODE SCANNER =====
const RealtimeScanner = ({ mealId, mealName, initialStream, onAdd, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const [phase, setPhase] = useState(initialStream ? 'live' : 'start');
  useEffect(() => {
    if (initialStream) {
      streamRef.current = initialStream;
    }
  }, []); // start|live|found|notfound|error|manual
  const [product, setProduct] = useState(null);
  const [grams, setGrams] = useState(100);
  const [errMsg, setErrMsg] = useState('');
  const [manual, setManual] = useState({ name:'', qty:'100 g', cal:'', p:'', g:'', l:'' });
  const trackRef = useRef(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvail, setTorchAvail] = useState(false);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (controlsRef.current) { try { controlsRef.current.stop(); } catch(e){} controlsRef.current = null; }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // Decodage du code-barre 1D via ZXing (gere l'attach + play + boucle, iOS inclus)
  useEffect(() => {
    if (phase !== 'live') return;
    const video = videoRef.current;
    if (!video) { console.log('no video ref'); return; }
    if (!streamRef.current) { console.log('no stream'); return; }

    let cancelled = false;
    if (!readerRef.current) readerRef.current = buildBarcodeReader();

    // Mise au point continue + detection torche (best effort, ignore si non supporte)
    const track = streamRef.current.getVideoTracks ? streamRef.current.getVideoTracks()[0] : null;
    trackRef.current = track || null;
    if (track) {
      try {
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        if (caps.torch) setTorchAvail(true);
        if (caps.focusMode && caps.focusMode.includes && caps.focusMode.includes('continuous')) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(()=>{});
        }
      } catch(e){}
    }

    readerRef.current
      .decodeFromStream(streamRef.current, video, (result, err) => {
        if (cancelled || !result) return; // pas de code sur cette image = normal
        const text = result.getText();
        stop();
        fetchProduct(text);
      })
      .then(controls => { if (cancelled) controls.stop(); else controlsRef.current = controls; })
      .catch(e => {
        setErrMsg('Lecture video impossible : ' + (e && e.message ? e.message : e));
        setPhase('error');
      });

    return () => {
      cancelled = true;
      if (controlsRef.current) { try { controlsRef.current.stop(); } catch(e){} controlsRef.current = null; }
    };
  }, [phase]);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    try { await track.applyConstraints({ advanced: [{ torch: !torchOn }] }); setTorchOn(v => !v); } catch(e){}
  };

  const startScan = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrMsg("Caméra non supportée sur cet appareil ou navigateur.");
      setPhase('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      setPhase('live'); // video element now renders → useEffect attaches stream
    } catch(e) {
      setErrMsg(e.name === "NotAllowedError" ? "Permission camera refusee. Reglages iPhone Safari Camera Autoriser" : "Camera indisponible: " + e.message);
      setPhase('error');
    }
  };

  const fetchProduct = async (barcode) => {
    setPhase('loading');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status !== 1 || !data.product) { setPhase('notfound'); return; }
      const pr = data.product; const n = pr.nutriments || {};
      setProduct({
        name: pr.product_name_fr || pr.product_name || 'Produit',
        brand: pr.brands || '',
        image: pr.image_front_small_url || null,
        cal: Math.round(n['energy-kcal_100g'] || 0),
        p:   Math.round((n['proteins_100g'] || 0) * 10) / 10,
        g:   Math.round((n['carbohydrates_100g'] || 0) * 10) / 10,
        l:   Math.round((n['fat_100g'] || 0) * 10) / 10,
      });
      setPhase('found');
    } catch { setPhase('notfound'); }
  };

  const doAdd = () => {
    const f = grams / 100;
    onAdd({ name: product.name, qty: `${grams} g`,
      cal: Math.round(product.cal*f*10)/10, p: Math.round(product.p*f*10)/10,
      g: Math.round(product.g*f*10)/10, l: Math.round(product.l*f*10)/10 });
  };
  const fv = v => parseFloat(v) || 0;

  return (
    <div className="fixed inset-0 z-[999] bg-black flex flex-col" style={{paddingTop:'env(safe-area-inset-top)'}}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-black/80">
        <div>
          <p className="text-white font-bold text-base">Scanner un produit</p>
          <p className="text-white/40 text-xs">→ {mealName}</p>
        </div>
        <button onClick={() => { stop(); onClose(); }}
          className="w-10 h-10 rounded-full bg-white/20 text-white font-bold text-lg flex items-center justify-center">✕</button>
      </div>

      {/* VIDEO — toujours dans le DOM */}
      <div style={{
        display: phase === 'live' || phase === 'loading' ? 'flex' : 'none',
        flex: 1,
        position: 'relative',
        background: '#000',
        overflow: 'hidden',
        minHeight: 0
      }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            background: '#000'
          }}
        />
        <canvas ref={canvasRef} style={{display:'none'}}/>
        {/* Viseur */}
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
          <div style={{position:'relative',width:'70%',maxWidth:280,height:180}}>
            <div style={{position:'absolute',inset:0,border:'1px solid rgba(255,255,255,0.2)',borderRadius:12}}/>
            {/* Coins du viseur */}
            <div style={{position:'absolute',top:0,left:0,width:32,height:32,borderTop:'3px solid #a78bfa',borderLeft:'3px solid #a78bfa',borderRadius:'8px 0 0 0'}}/>
            <div style={{position:'absolute',top:0,right:0,width:32,height:32,borderTop:'3px solid #a78bfa',borderRight:'3px solid #a78bfa',borderRadius:'0 8px 0 0'}}/>
            <div style={{position:'absolute',bottom:0,left:0,width:32,height:32,borderBottom:'3px solid #a78bfa',borderLeft:'3px solid #a78bfa',borderRadius:'0 0 0 8px'}}/>
            <div style={{position:'absolute',bottom:0,right:0,width:32,height:32,borderBottom:'3px solid #a78bfa',borderRight:'3px solid #a78bfa',borderRadius:'0 0 8px 0'}}/>
            {/* Ligne de scan animée */}
            <div style={{position:'absolute',left:4,right:4,height:2,background:'linear-gradient(90deg,transparent,#a78bfa,transparent)',animation:'scanline 2s linear infinite',top:'50%'}}/>
          </div>
        </div>
        <style>{`@keyframes scanline { 0%{top:10%} 50%{top:90%} 100%{top:10%} }`}</style>
        {phase === 'loading' && (
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <p style={{color:'white',fontWeight:700}}>⏳ Recherche du produit...</p>
          </div>
        )}
        {torchAvail && (
          <button onClick={toggleTorch} style={{position:'absolute',top:8,right:8,background:torchOn?'#a78bfa':'rgba(0,0,0,0.65)',color:'#fff',border:'none',borderRadius:999,padding:'8px 14px',fontSize:13,fontWeight:700,cursor:'pointer',zIndex:6}}>
            {torchOn ? '🔦 ON' : '🔦 Torche'}
          </button>
        )}
        <div style={{position:'absolute',bottom:32,left:0,right:0,textAlign:'center'}}>
          <span style={{background:'rgba(0,0,0,0.6)',color:'rgba(255,255,255,0.8)',padding:'8px 20px',borderRadius:999,fontSize:13,fontWeight:600}}>
            Code-barre bien a plat, ~10-15 cm
          </span>
        </div>
      </div>

      {/* Canvas hors-écran pour états non-live */}
      {phase !== 'live' && phase !== 'loading' && <canvas ref={canvasRef} style={{display:'none'}}/>}

      {/* START - should not appear if initialStream provided */}
      {phase === 'start' && (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,gap:24}}>
          <div style={{width:120,height:120,borderRadius:'50%',background:'rgba(167,139,250,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:52}}>📷</div>
          <p style={{color:'white',fontWeight:700,fontSize:20,textAlign:'center'}}>Chargement de la caméra...</p>
          <button onClick={() => setPhase('manual')}
            style={{color:'rgba(255,255,255,0.4)',background:'none',border:'none',fontSize:14,cursor:'pointer',textDecoration:'underline'}}>
            Saisir manuellement
          </button>
        </div>
      )}

      {/* ERROR */}
      {phase === 'error' && (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,gap:20}}>
          <div style={{fontSize:52}}>⚠️</div>
          <p style={{color:'white',fontWeight:700,fontSize:18,textAlign:'center'}}>Accès caméra impossible</p>
          <p style={{color:'rgba(255,255,255,0.5)',fontSize:13,textAlign:'center',whiteSpace:'pre-line'}}>{errMsg}</p>
          <button onClick={() => setPhase('manual')}
            style={{width:'100%',padding:16,background:'rgba(255,255,255,0.1)',border:'none',borderRadius:14,color:'white',fontWeight:700,fontSize:15,cursor:'pointer'}}>
            ✏️ Saisir manuellement
          </button>
        </div>
      )}

      {/* NOT FOUND */}
      {phase === 'notfound' && (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,gap:20}}>
          <div style={{fontSize:52}}>🔍</div>
          <p style={{color:'white',fontWeight:700,fontSize:18}}>Produit non trouvé</p>
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,textAlign:'center'}}>Ce produit n'est pas dans la base de données</p>
          <button onClick={() => { setPhase('start'); }} style={{width:'100%',padding:16,background:'linear-gradient(135deg,#7c3aed,#2563eb)',border:'none',borderRadius:14,color:'white',fontWeight:700,fontSize:15,cursor:'pointer'}}>
            📷 Rescanner
          </button>
          <button onClick={() => setPhase('manual')} style={{width:'100%',padding:16,background:'rgba(255,255,255,0.1)',border:'none',borderRadius:14,color:'white',fontWeight:700,fontSize:15,cursor:'pointer'}}>
            ✏️ Saisir manuellement
          </button>
        </div>
      )}

      {/* FOUND */}
      {phase === 'found' && product && (
        <div style={{flex:1,padding:20,display:'flex',flexDirection:'column',gap:16,overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:16,background:'rgba(255,255,255,0.08)',borderRadius:16,padding:16}}>
            {product.image && <img src={product.image} alt="" style={{width:72,height:72,objectFit:'contain',borderRadius:12,background:'white',padding:4,flexShrink:0}}/>}
            <div style={{flex:1,minWidth:0}}>
              <p style={{color:'white',fontWeight:700,fontSize:15,lineHeight:1.3}}>{product.name}</p>
              {product.brand && <p style={{color:'rgba(255,255,255,0.4)',fontSize:12,marginTop:2}}>{product.brand}</p>}
              <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                {[{l:'kcal',v:product.cal,c:'#f97316'},{l:'P',v:`${product.p}g`,c:'#34d399'},{l:'G',v:`${product.g}g`,c:'#60a5fa'},{l:'L',v:`${product.l}g`,c:'#f472b6'}].map(({l,v,c})=>(
                  <span key={l} style={{background:c+'22',color:c,padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:700}}>{l}: {v}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,background:'rgba(255,255,255,0.08)',borderRadius:14,padding:'12px 16px'}}>
            <span style={{color:'rgba(255,255,255,0.6)',fontSize:13,fontWeight:600}}>Grammage :</span>
            <input type="text" inputMode="decimal" value={grams} onFocus={e=>e.target.select()}
              onChange={e=>setGrams(parseFloat(e.target.value)||100)}
              style={{width:64,textAlign:'center',fontWeight:700,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,padding:'6px',color:'white',fontSize:15,outline:'none'}}/>
            <span style={{color:'rgba(255,255,255,0.4)',fontSize:13}}>g</span>
            <span style={{flex:1,textAlign:'right',color:'#fb923c',fontWeight:700,fontSize:14}}>→ {Math.round(product.cal*grams/100)} kcal</span>
          </div>
          <button onClick={doAdd} style={{width:'100%',padding:18,background:'linear-gradient(135deg,#7c3aed,#2563eb)',border:'none',borderRadius:16,color:'white',fontWeight:700,fontSize:17,cursor:'pointer'}}>
            ✓ Ajouter à {mealName}
          </button>
          <button onClick={()=>setPhase('start')} style={{color:'rgba(255,255,255,0.3)',background:'none',border:'none',fontSize:13,cursor:'pointer',textDecoration:'underline'}}>
            Scanner un autre produit
          </button>
        </div>
      )}

      {/* MANUAL */}
      {phase === 'manual' && (
        <div style={{flex:1,padding:20,display:'flex',flexDirection:'column',gap:12,overflowY:'auto'}}>
          <p style={{color:'white',fontWeight:700,fontSize:16}}>✏️ Saisie manuelle</p>
          <input value={manual.name} onChange={e=>setManual(d=>({...d,name:e.target.value}))} placeholder="Nom du produit"
            style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:12,padding:'12px 16px',color:'white',fontSize:14,outline:'none',width:'100%'}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[['qty','Quantité (ex: 100 g)','text'],['cal','Calories (kcal)','decimal'],['p','Protéines (g)','decimal'],['g','Glucides (g)','decimal'],['l','Lipides (g)','decimal']].map(([k,ph,mode])=>(
              <input key={k} value={manual[k]} onFocus={e=>e.target.select()} onChange={e=>setManual(d=>({...d,[k]:e.target.value}))}
                placeholder={ph} inputMode={mode}
                style={{gridColumn:k==='qty'?'span 2':'span 1',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:12,padding:'10px 14px',color:'white',fontSize:13,outline:'none'}}/>
            ))}
          </div>
          <button onClick={()=>{if(!manual.name)return;onAdd({name:manual.name,qty:manual.qty,cal:fv(manual.cal),p:fv(manual.p),g:fv(manual.g),l:fv(manual.l)});}}
            disabled={!manual.name}
            style={{width:'100%',padding:16,background:'linear-gradient(135deg,#7c3aed,#2563eb)',border:'none',borderRadius:14,color:'white',fontWeight:700,fontSize:16,cursor:'pointer',opacity:manual.name?1:0.4}}>
            ✓ Ajouter à {mealName}
          </button>
        </div>
      )}
    </div>
  );
};


// ===== BOTTOM NAV =====
const BottomNav = ({ active, onChange }) => {
  const items = [
    { id: 'journal', icon: '📝', label: 'Journal' },
    { id: 'plan', icon: '🍽️', label: 'Plan' },
    { id: 'suivi', icon: '📈', label: 'Suivi' },
    { id: 'mesures', icon: '📏', label: 'Mesures' },
    { id: 'settings', icon: '⚙️', label: 'Réglages' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {items.map(item => (
          <button key={item.id} onClick={() => onChange(item.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 px-2 transition-all relative ${active === item.id ? 'text-violet-600' : 'text-slate-400'}`}
          >
            {active === item.id && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-violet-500 rounded-full" />}
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10px] font-bold leading-none">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// ===== PLAN ALIMENTAIRE VIEW =====
const PlanAlimView = ({ currentProfile }) => {
  const modes = MODES_BY_PROFILE[currentProfile] || [];
  const [selMode, setSelMode] = useState(modes[0]?.id || '');
  const accentGradient = BASE_PROFILE[currentProfile]?.accentGradient || 'from-violet-500 to-indigo-500';
  const userId = `${currentProfile}-${selMode}`;
  const user = USERS[userId];
  const plan = user ? user.plan.map(m => ({ ...m, items: m.items.filter(i => !i.aiAdded) })) : [];
  const totals = plan.reduce((acc, m) => { m.items.forEach(i => { acc.cal+=i.cal; acc.p+=i.p; acc.g+=i.g; acc.l+=i.l; }); return acc; }, { cal:0, p:0, g:0, l:0 });
  return (
    <div className="space-y-4 pb-28">
      <div className="text-center pt-2 pb-1">
        <h2 className="text-lg font-bold text-slate-800">Plan Alimentaire</h2>
        <p className="text-[11px] text-slate-400">{BASE_PROFILE[currentProfile]?.name}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {modes.map(m => (
          <button key={m.id} onClick={() => setSelMode(m.id)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selMode === m.id ? `bg-gradient-to-r ${accentGradient} text-white shadow-md` : 'bg-white border border-slate-200 text-slate-600'}`}
          >{m.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[{l:'kcal',v:Math.round(totals.cal),c:'text-orange-600',bg:'bg-orange-50 border-orange-100'},{l:'Prot',v:`${Math.round(totals.p)}g`,c:'text-emerald-600',bg:'bg-emerald-50 border-emerald-100'},{l:'Gluc',v:`${Math.round(totals.g)}g`,c:'text-blue-600',bg:'bg-blue-50 border-blue-100'},{l:'Lip',v:`${Math.round(totals.l)}g`,c:'text-pink-600',bg:'bg-pink-50 border-pink-100'}].map(({l,v,c,bg}) => (
          <div key={l} className={`${bg} border rounded-2xl p-3 text-center`}>
            <div className={`text-base font-bold ${c}`}>{v}</div>
            <div className="text-[9px] text-slate-500 font-semibold mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      {plan.map(meal => {
        const mealCal = meal.items.reduce((s,i) => s+i.cal, 0);
        const foods = meal.items.filter(i => !i.suppl);
        const suppls = meal.items.filter(i => i.suppl);
        return (
          <div key={meal.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{meal.icon || '🍽️'}</span>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{meal.name}</div>
                  {meal.conditional && <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">conditionnel</span>}
                </div>
              </div>
              <div className="text-sm font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-lg">{Math.round(mealCal)} kcal</div>
            </div>
            <div className="divide-y divide-slate-50">
              {foods.map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/50">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.qty}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {[{v:item.cal,bg:'bg-orange-50',c:'text-orange-600',l:'kcal'},{v:item.p,bg:'bg-emerald-50',c:'text-emerald-600',l:'prot'},{v:item.g,bg:'bg-blue-50',c:'text-blue-600',l:'gluc'},{v:item.l,bg:'bg-pink-50',c:'text-pink-600',l:'lip'}].map(({v,bg,c,l}) => (
                      <div key={l} className={`${bg} rounded-lg px-1.5 py-1 text-center min-w-[32px]`}>
                        <div className={`text-[8px] font-bold ${c}`}>{l}</div>
                        <div className={`text-[10px] font-bold ${c}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {suppls.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2 bg-slate-50/60">
                  <span className="text-[9px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">SUPPL.</span>
                  <span className="text-[12px] text-slate-600 flex-1">{item.name}</span>
                  <span className="text-[11px] text-slate-400">{item.qty}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ===== SUIVI VIEW =====
const SuiviView = ({ profileId, suiviData, onUpdateSuivi }) => {
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const DAYS_H = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const todayD = new Date();
  const [viewYear, setViewYear] = useState(todayD.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayD.getMonth());
  const [selDay, setSelDay] = useState(null);
  const [form, setForm] = useState({ cal:'', diet:null, training:null, noteDiet:'', noteTrain:'' });
  const pData = suiviData[profileId] || {};
  const dateKey = d => `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const dayColor = e => {
    if (!e) return null;
    const {diet:d,training:t} = e;
    if (d==='ok'&&t==='ok') return 'bg-green-50 border-green-300 text-green-700';
    if (d==='ecart'&&t==='ok') return 'bg-orange-50 border-orange-300 text-orange-700';
    if (d==='ok') return 'bg-yellow-50 border-yellow-300 text-yellow-700';
    return 'bg-red-50 border-red-300 text-red-700';
  };
  const mPrefix = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
  const mEntries = Object.entries(pData).filter(([k])=>k.startsWith(mPrefix)).map(([,v])=>v);
  const stats = mEntries.reduce((a,e)=>{ if(e.diet==='ok')a.do++;if(e.diet==='ecart')a.de++;if(e.training==='ok')a.to++;if(e.training==='ecart')a.te++;if(e.cal&&!isNaN(+e.cal)){a.cs+=+e.cal;a.cc++;} return a; },{do:0,de:0,to:0,te:0,cs:0,cc:0});
  const dInM = new Date(viewYear,viewMonth+1,0).getDate();
  const startDow = (new Date(viewYear,viewMonth,1).getDay()+6)%7;
  const openDay = d => { const e=pData[dateKey(d)]||{}; setForm({cal:e.cal||'',calJournal:e.calJournal||0,calBrulees:e.calBrulees||'',diet:e.diet||null,training:e.training||null,noteDiet:e.noteDiet||'',noteTrain:e.noteTrain||''}); setSelDay(d); };
  const saveDay = () => { onUpdateSuivi(profileId, dateKey(selDay), {...form}); setSelDay(null); };
  const prevM = () => viewMonth===0?(setViewYear(y=>y-1),setViewMonth(11)):setViewMonth(m=>m-1);
  const nextM = () => viewMonth===11?(setViewYear(y=>y+1),setViewMonth(0)):setViewMonth(m=>m+1);
  return (
    <div className="space-y-3 pb-28">
      <div className="text-center pt-2"><h2 className="text-lg font-bold text-slate-800">Suivi Journalier</h2></div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {MONTHS.map((m,i) => {
          const hasData = Object.keys(pData).some(k=>k.startsWith(`${viewYear}-${String(i+1).padStart(2,'0')}`));
          return <button key={m} onClick={()=>setViewMonth(i)} className={`flex-shrink-0 w-10 h-8 rounded-lg text-[11px] font-bold transition-all ${i===viewMonth?'bg-violet-500 text-white shadow-sm':hasData?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-400'}`}>{m}</button>;
        })}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {[{l:'Diet OK',v:stats.do,cls:'bg-green-50 text-green-700'},{l:'Écarts',v:stats.de,cls:'bg-orange-50 text-orange-700'},{l:'Train OK',v:stats.to,cls:'bg-blue-50 text-blue-700'},{l:'Train KO',v:stats.te,cls:'bg-red-50 text-red-700'},{l:'Moy kcal',v:stats.cc?Math.round(stats.cs/stats.cc):'—',cls:'bg-purple-50 text-purple-700'}].map(({l,v,cls}) => (
          <div key={l} className={`${cls} rounded-xl p-2 text-center`}><div className="text-sm font-bold">{v}</div><div className="text-[8px] font-semibold mt-0.5">{l}</div></div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <button onClick={prevM} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 text-lg">‹</button>
          <div className="text-center"><div className="font-bold text-slate-800">{MONTHS[viewMonth]} {viewYear}</div><div className="text-[10px] text-slate-400">{mEntries.length} jours enregistrés</div></div>
          <button onClick={nextM} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 text-lg">›</button>
        </div>
        <div className="grid grid-cols-7">{DAYS_H.map(d=><div key={d} className="text-center text-[9px] font-bold text-slate-400 py-2">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-px bg-slate-100">
          {Array(startDow).fill(null).map((_,i)=><div key={`e${i}`} className="bg-white min-h-[54px]" />)}
          {Array.from({length:dInM},(_,i)=>i+1).map(d => {
            const key=dateKey(d); const e=pData[key]; const isToday=d===todayD.getDate()&&viewMonth===todayD.getMonth()&&viewYear===todayD.getFullYear(); const dc=dayColor(e);
            return (
              <button key={d} onClick={()=>openDay(d)} className={`bg-white min-h-[54px] p-1 flex flex-col items-center transition-colors hover:bg-slate-50 ${isToday?'ring-2 ring-violet-400 ring-inset':''}`}>
                <span className={`text-[11px] font-bold mb-0.5 ${isToday?'text-violet-600':'text-slate-700'}`}>{d}</span>
                {e?(<div className={`w-full rounded-md border px-0.5 py-0.5 ${dc} text-center`}><div className="text-[8px] font-bold leading-none">D{e.diet==='ok'?'✓':e.diet==='ecart'?'✗':'·'} T{e.training==='ok'?'✓':e.training==='ecart'?'✗':'·'}</div>{(e.calJournal||e.cal)&&<div className="text-[8px] font-bold leading-none mt-0.5">{e.calJournal||e.cal}</div>}</div>):(<span className="text-slate-200 text-sm">+</span>)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {[{l:'Diet ✓ + Train ✓',c:'bg-green-100 border-green-300'},{l:'Diet ✗ + Train ✓',c:'bg-orange-100 border-orange-300'},{l:'Diet ✓ + Train ✗',c:'bg-yellow-100 border-yellow-300'},{l:'Diet ✗ + Train ✗',c:'bg-red-100 border-red-300'}].map(({l,c})=>(
          <div key={l} className="flex items-center gap-1"><div className={`w-3 h-3 rounded border ${c}`}/><span className="text-[9px] text-slate-500">{l}</span></div>
        ))}
      </div>
      {selDay !== null && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 16px'}} onClick={()=>setSelDay(null)}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:400}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #f1f5f9'}}>
              <span style={{fontWeight:700,color:'#1e293b',fontSize:14}}>📅 {String(selDay).padStart(2,'0')}/{String(viewMonth+1).padStart(2,'0')}/{viewYear}</span>
              <div style={{display:'flex',gap:8}}>
                <button onClick={saveDay} style={{padding:'6px 14px',background:'#7c3aed',border:'none',borderRadius:10,color:'white',fontWeight:700,fontSize:13,cursor:'pointer'}}>✓ Sauver</button>
                <button onClick={()=>setSelDay(null)} style={{width:28,height:28,background:'#f1f5f9',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700,color:'#64748b'}}>✕</button>
              </div>
            </div>
            {/* Body */}
            <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
              {/* Kcal journal */}
              {form.calJournal > 0 && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:18}}>🍽️</span>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:'#16a34a',textTransform:'uppercase',letterSpacing:'0.05em'}}>Consommées (journal)</div>
                    <div style={{fontSize:18,fontWeight:800,color:'#15803d'}}>{form.calJournal} kcal</div>
                  </div>
                </div>
              )}
              {/* Kcal dépensées */}
              <div>
                <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:4}}>🔥 Kcal dépensées</label>
                <input type="text" inputMode="decimal" value={form.calBrulees||''} onFocus={e=>e.target.select()} onChange={e=>setForm(f=>({...f,calBrulees:e.target.value}))} placeholder="ex: 450" style={{width:'100%',padding:'10px 12px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box'}}/>
              </div>
              {/* Net */}
              {form.calJournal > 0 && form.calBrulees && (
                <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:10,padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#2563eb'}}>⚡ Net journalier</span>
                  <span style={{fontWeight:800,fontSize:15,color:(form.calJournal-(+(form.calBrulees||0)))<0?'#dc2626':'#1d4ed8'}}>{Math.round(form.calJournal-(+(form.calBrulees||0)))} kcal</span>
                </div>
              )}
              {/* Diet + Training */}
              {[{k:'diet',l:'🥗 Diet'},{k:'training',l:'💪 Training'}].map(({k,l})=>(
                <div key={k}>
                  <label style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:4}}>{l}</label>
                  <div style={{display:'flex',gap:6}}>
                    {[['ok','✓ OK','#22c55e'],['ecart','✗ Écart','#f59e0b'],[null,'— Neutre','#94a3b8']].map(([v,lb,bg])=>(
                      <button key={String(v)} onClick={()=>setForm(f=>({...f,[k]:v}))} style={{flex:1,padding:'8px 0',background:form[k]===v?bg:'#f1f5f9',border:'none',borderRadius:10,color:form[k]===v?'white':'#64748b',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all 0.15s'}}>{lb}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== MESURES VIEW =====
const MESURE_FIELDS = [
  { key:'poids', label:'Poids', unit:'kg', good:'decrease' },
  { key:'bicepsD', label:'Biceps D', unit:'cm', good:'any' },
  { key:'bicepsG', label:'Biceps G', unit:'cm', good:'any' },
  { key:'poitrine', label:'Poitrine', unit:'cm', good:'decrease' },
  { key:'nombril', label:'Nombril', unit:'cm', good:'decrease' },
  { key:'fesses', label:'Fesses', unit:'cm', good:'decrease' },
  { key:'cuisseD', label:'Cuisse D', unit:'cm', good:'decrease' },
  { key:'cuisseG', label:'Cuisse G', unit:'cm', good:'decrease' },
];
const MesuresView = ({ profileId, mesuresData, onUpdateMesures }) => {
  const entries = [...(mesuresData[profileId]||[])].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0] });
  const first = entries[0]; const last = entries[entries.length-1];
  const openAdd = () => { setEditId(null); setForm({ date:new Date().toISOString().split('T')[0], ...Object.fromEntries(MESURE_FIELDS.map(f=>[f.key,''])) }); setShowForm(true); };
  const openEdit = e => { setEditId(e.id); setForm({...e}); setShowForm(true); };
  const save = () => { if(!form.date) return; onUpdateMesures(profileId, editId?'edit':'add', {...form, id:editId||`m-${Date.now()}`}); setShowForm(false); };
  const del = id => { if(window.confirm('Supprimer cette entrée ?')) onUpdateMesures(profileId,'delete',id); };
  const fmtDate = d => { try { return new Date(d+'T12:00:00').toLocaleDateString('fr-CH',{day:'2-digit',month:'2-digit',year:'numeric'}); } catch { return d; } };
  return (
    <div className="space-y-4 pb-28">
      <div className="text-center pt-2">
        <h2 className="text-lg font-bold text-slate-800">Mensurations</h2>
        {first&&last&&entries.length>1&&<p className="text-[11px] text-slate-400">Depuis le {fmtDate(first.date)}</p>}
      </div>
      {first&&last&&entries.length>1&&(
        <div className="grid grid-cols-2 gap-3">
          {[{key:'poids',label:'Poids',bg:'from-blue-50 to-indigo-50',border:'border-blue-100',c:'text-blue-700',unit:'kg'},{key:'poitrine',label:'Poitrine',bg:'from-purple-50 to-pink-50',border:'border-purple-100',c:'text-purple-700',unit:'cm'},{key:'nombril',label:'Nombril',bg:'from-emerald-50 to-teal-50',border:'border-emerald-100',c:'text-emerald-700',unit:'cm'},{key:'fesses',label:'Fesses',bg:'from-amber-50 to-orange-50',border:'border-amber-100',c:'text-amber-700',unit:'cm'}].map(({key,label,bg,border,c,unit}) => {
            const fv=parseFloat(first[key]); const lv=parseFloat(last[key]); const delta=(fv&&lv)?lv-fv:null;
            return (
              <div key={key} className={`bg-gradient-to-br ${bg} border ${border} rounded-2xl p-3`}>
                <div className={`text-[9px] font-bold uppercase tracking-wider ${c} opacity-60 mb-1`}>{label}</div>
                <div className={`text-sm font-bold ${c}`}>{first[key]?`${first[key]} → ${last[key]}`:'—'} <span className="text-[10px] opacity-50">{unit}</span></div>
                {delta!==null&&Math.abs(delta)>0.001&&<div className={`text-[11px] font-bold mt-0.5 ${delta<0?'text-green-600':'text-red-500'}`}>{delta>0?'+':''}{delta.toFixed(1)} {unit}</div>}
              </div>
            );
          })}
        </div>
      )}
      <button onClick={openAdd} className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-bold shadow-sm hover:opacity-90 transition-opacity">＋ Ajouter un bilan</button>
      {[...entries].reverse().map((entry, idx, arr) => {
        const prev = arr[idx+1];
        return (
          <div key={entry.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
              <span className="font-bold text-slate-800">{fmtDate(entry.date)}</span>
              <div className="flex gap-1.5">
                <button onClick={()=>openEdit(entry)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-sm">✏️</button>
                <button onClick={()=>del(entry.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-400 font-bold text-sm">✕</button>
              </div>
            </div>
            <div className="grid grid-cols-4 divide-x divide-y divide-slate-100">
              {MESURE_FIELDS.map(field => {
                const val=entry[field.key]; const prevVal=prev?.[field.key];
                const delta=(val&&prevVal&&!isNaN(+val)&&!isNaN(+prevVal))?(+val)-(+prevVal):null;
                const isGood=delta!==null?(field.good==='decrease'?delta<0:true):null;
                return (
                  <div key={field.key} className="p-2 text-center">
                    <div className="text-[9px] text-slate-400 font-medium">{field.label}</div>
                    <div className="text-sm font-bold text-slate-800">{val||<span className="text-slate-300">—</span>}{val&&<span className="text-[9px] text-slate-400 ml-0.5">{field.unit}</span>}</div>
                    {delta!==null&&Math.abs(delta)>0.001&&<div className={`text-[9px] font-bold ${isGood?'text-green-500':'text-red-500'}`}>{delta>0?'+':''}{delta.toFixed(1)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {entries.length===0&&(<div className="text-center py-16 text-slate-400"><div className="text-5xl mb-4">📏</div><div className="font-bold text-slate-500">Aucune mesure enregistrée</div><div className="text-sm mt-2">Commence le suivi dès aujourd'hui</div></div>)}
      {showForm&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-lg">{editId?'Modifier le bilan':'Nouveau bilan'}</h3>
              <button onClick={()=>setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-bold">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Date</label>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {MESURE_FIELDS.map(field=>(
                  <div key={field.key}>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">{field.label} ({field.unit})</label>
                    <input type="text" inputMode="decimal" value={form[field.key]||''} onFocus={e=>e.target.select()} onChange={e=>setForm(f=>({...f,[field.key]:e.target.value}))} placeholder={field.key==='poids'?'70':'90'} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 text-slate-800"/>
                  </div>
                ))}
              </div>
              <button onClick={save} className="w-full py-3.5 rounded-xl bg-violet-500 text-white font-bold hover:bg-violet-600 transition-colors">{editId?'Enregistrer les modifications':'Ajouter le bilan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// Switcher de PROFIL (Luca / Émilie). Ne change que le profil ; le mode est conservé
// via lastModeByProfile pour reprendre où on en était.
const UserSwitcher = ({ currentProfile, onSelect, profiles = PROFILES }) => (
  <div className="flex gap-2 mb-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5">
    {profiles.map(profileId => {
      const base = BASE_PROFILE[profileId];
      const isActive = currentProfile === profileId;
      return (
        <button
          key={profileId}
          onClick={() => onSelect(profileId)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all ${
            isActive
              ? `bg-gradient-to-r ${base.accentGradient} text-white shadow-sm`
              : 'text-slate-500 active:bg-slate-100'
          }`}
        >
          <span className="text-lg">{base.avatar}</span>
          <span>{base.name}</span>
        </button>
      );
    })}
  </div>
);

// Switcher de MODE (Standard/Hard/Easy/Cheat) — affiche les modes du profil actif
// avec un highlight sur le mode courant. Chaque mode garde son état isolé.
const ModeSwitcher = ({ currentProfile, currentMode, onSelect }) => {
  const modes = MODES_BY_PROFILE[currentProfile] || [];
  // Si 4+ modes, on serre pour tenir sur mobile en une ligne
  const isDense = modes.length >= 4;
  return (
    <div className="flex gap-1 sm:gap-1.5 mb-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-1 sm:p-1.5">
      {modes.map(m => {
        const isActive = m.id === currentMode;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            title={m.desc}
            className={`flex-1 min-w-0 flex items-center justify-center gap-0.5 sm:gap-1 ${isDense ? 'py-2 px-0.5 sm:px-1' : 'py-2.5 px-2'} rounded-xl font-semibold ${isDense ? 'text-[10px] sm:text-sm' : 'text-xs sm:text-sm'} transition-all whitespace-nowrap ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 active:bg-slate-100'
            }`}
          >
            <span className={isDense ? 'text-xs sm:text-base' : 'text-base'}>{m.emoji}</span>
            <span className="truncate">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ===== STORAGE POLYFILL =====
// window.storage existe dans les artifacts Claude mais pas sur GitHub Pages.
// Ce wrapper utilise localStorage comme fallback.
const storage = window.storage || {
  get: async (key) => {
    try {
      const val = localStorage.getItem(`coach-nutrition:${key}`);
      return val !== null ? { value: val } : null;
    } catch { return null; }
  },
  set: async (key, value) => {
    try { localStorage.setItem(`coach-nutrition:${key}`, value); } catch {}
    return { key, value };
  },
  delete: async (key) => {
    try { localStorage.removeItem(`coach-nutrition:${key}`); } catch {}
    return { key, deleted: true };
  },
};

// ===== APP =====

export default function App({ session, accountProfileId, nutritionProfile }) {
  registerNutritionProfile(nutritionProfile);
  const allowedUserIds = Object.keys(USERS).filter(uid => USERS[uid].profileId === accountProfileId);
  const accountDefaultUserId = `${accountProfileId}-${DEFAULT_MODE_BY_PROFILE[accountProfileId]}`;
  const [currentUserId, setCurrentUserId] = useState(accountDefaultUserId);
  const [activeSection, setActiveSection] = useState('journal');
  const [showAdmin, setShowAdmin] = useState(false);
  const [scannerTarget, setScannerTarget] = useState(null); // {mealId, mealName, stream}
  const [suiviData, setSuiviData] = useState({});
  const [mesuresData, setMesuresData] = useState({});
  // Map du dernier mode utilisé par profil pour préserver la sélection au switch profil
  const [lastModeByProfile, setLastModeByProfile] = useState(DEFAULT_MODE_BY_PROFILE);
  const [usersData, setUsersData] = useState(() => {
    const out = {};
    for (const uid of Object.keys(USERS)) {
      out[uid] = { plan: deepClone(USERS[uid].plan), status: {}, insight: null, collapsed: {}, changesSinceAnalysis: 0, realQty: {} };
    }
    return out;
  });
  const [storageReady, setStorageReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncState, setSyncState] = useState('loading');
  const cloudApplyingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);
  const [tab, setTab] = useState('bilan');
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [foodFavorites, setFoodFavorites] = useState([]);

  // Hash ref par user virtuel
  const lastAnalyzedHashRef = useRef(Object.fromEntries(Object.keys(USERS).map(uid => [uid, null])));

  const user = USERS[currentUserId] || USERS[DEFAULT_UID];
  const currentProfile = user.profileId;
  const currentMode = user.modeId;
  const emptyUser = { plan: [], status: {}, insight: null, collapsed: {}, changesSinceAnalysis: 0, realQty: {} };
  const userData = usersData[currentUserId] || usersData[DEFAULT_UID] || emptyUser;
  const plan = userData.plan;
  const status = userData.status;
  const insight = userData.insight;
  const collapsed = userData.collapsed;
  const changesSinceAnalysis = userData.changesSinceAnalysis;
  const realQty = userData.realQty || {};

  const updateUserData = (userId, updates) => {
    setUsersData(prev => ({
      ...prev,
      [userId]: { ...prev[userId], ...(typeof updates === 'function' ? updates(prev[userId]) : updates) }
    }));
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', error);
    } finally {
      setSigningOut(false);
    }
  };

  const speechRecognitionClass = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const voiceInputSupported = Boolean(speechRecognitionClass);
  const voiceOutputSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const toggleVoiceInput = () => {
    setVoiceError(null);
    if (!voiceInputSupported) {
      setVoiceError('Dictée directe indisponible. Utilise le micro du clavier de ton téléphone.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new speechRecognitionClass();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const initialText = chatInput.trim();

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || '';
      }
      setChatInput([initialText, transcript.trim()].filter(Boolean).join(' '));
    };
    recognition.onerror = (event) => {
      const messages = {
        'not-allowed': 'Autorise le microphone dans les réglages du navigateur.',
        'no-speech': 'Je n’ai rien entendu. Rapproche-toi du micro et réessaie.',
        'audio-capture': 'Le microphone est indisponible sur cet appareil.',
      };
      setVoiceError(messages[event.error] || 'La dictée a été interrompue. Réessaie.');
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleInsightSpeech = () => {
    if (!voiceOutputSupported || !insight) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const observations = (insight.observations || [])
      .map(item => `${item.title || ''}. ${item.description || ''}`)
      .join(' ');
    const text = [insight.headline, insight.summary, observations].filter(Boolean).join('. ');
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 1600));
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    loadFoodFavorites(session.user.id)
      .then(setFoodFavorites)
      .catch(error => console.error('Chargement des favoris impossible :', error));
  }, [session?.user?.id]);

  const handleSaveFavorite = async (entry) => {
    try {
      const saved = await saveFoodFavorite(session.user.id, entry);
      setFoodFavorites(previous => [saved, ...previous.filter(item => item.id !== saved.id && item.name !== saved.name)]);
    } catch (error) {
      console.error('Enregistrement du favori impossible :', error);
    }
  };

  const handleDeleteFavorite = async (favoriteId) => {
    try {
      await deleteFoodFavorite(session.user.id, favoriteId);
      setFoodFavorites(previous => previous.filter(item => item.id !== favoriteId));
    } catch (error) {
      console.error('Suppression du favori impossible :', error);
    }
  };

  // Tick + reset minuit
  useEffect(() => {
    const tick = async () => {
      const now = new Date();
      setCurrentTime(now);
      try {
        const dateRes = await storage.get('current-date');
        if (dateRes?.value && dateRes.value !== today()) await resetAllUsers(true);
      } catch {}
    };
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load initial
  useEffect(() => {
    (async () => {
      try {
        const dateRes = await storage.get('current-date');
        if (dateRes?.value !== today()) {
          await storage.set('current-date', today());
          for (const uid of allowedUserIds) {
            await storage.set(`plan-${uid}`, JSON.stringify(USERS[uid].plan));
            await storage.set(`status-${uid}`, JSON.stringify({}));
            await storage.set(`insight-${uid}`, JSON.stringify(null));
          }
        } else {
          const loaded = {};
          for (const uid of allowedUserIds) {
            const freshPlan = deepClone(USERS[uid].plan);
            let p = freshPlan;
            let s = {};
            let i = null;
            try { const r = await storage.get(`plan-${uid}`); if (r?.value) p = JSON.parse(r.value); } catch {}
            try { const r = await storage.get(`status-${uid}`); if (r?.value) s = JSON.parse(r.value); } catch {}
            try { const r = await storage.get(`insight-${uid}`); if (r?.value && r.value !== 'null') i = JSON.parse(r.value); } catch {}
            let rq = {};
            try { const r = await storage.get(`realQty-${uid}`); if (r?.value) rq = JSON.parse(r.value); } catch {}
            // Migration : réinjecte les propriétés swappable depuis le plan frais (code)
            // au cas où le localStorage aurait un plan plus ancien sans ces props
            p = p.map((meal, mi) => ({
              ...meal,
              items: meal.items.map((item, ii) => {
                const fresh = freshPlan[mi]?.items[ii];
                if (fresh && fresh.id === item.id && fresh.swappable && !item.swappable) {
                  return { ...item, swappable: fresh.swappable };
                }
                return item;
              })
            }));
            loaded[uid] = { plan: p, status: s, insight: i, collapsed: {}, changesSinceAnalysis: 0, realQty: rq };
          }
          setUsersData(loaded);
        }
        try {
          const cu = await storage.get('current-user');
          if (cu?.value && allowedUserIds.includes(cu.value)) setCurrentUserId(cu.value);
          else setCurrentUserId(accountDefaultUserId);
        } catch { setCurrentUserId(accountDefaultUserId); }
        try {
          const lm = await storage.get('last-mode-by-profile');
          if (lm?.value) {
            const parsed = JSON.parse(lm.value);
            // Valider que les modes existent toujours
            const validated = { ...DEFAULT_MODE_BY_PROFILE };
            for (const p of [accountProfileId]) {
              if (parsed[p] && MODES_BY_PROFILE[p].some(m => m.id === parsed[p])) {
                validated[p] = parsed[p];
              }
            }
            setLastModeByProfile(validated);
          }
        } catch {}
      } catch (e) { console.error(e); }
      finally { setStorageReady(true); }
    })();
  }, [accountDefaultUserId, accountProfileId]);

  // Persist
  useEffect(() => { if (storageReady) storage.set('current-user', currentUserId).catch(() => {}); }, [currentUserId, storageReady]);
  useEffect(() => { if (storageReady) storage.set('last-mode-by-profile', JSON.stringify(lastModeByProfile)).catch(() => {}); }, [lastModeByProfile, storageReady]);
  useEffect(() => {
    if (!storageReady) return;
    for (const uid of allowedUserIds) {
      if (!usersData[uid]) continue;
      storage.set(`plan-${uid}`, JSON.stringify(usersData[uid].plan)).catch(() => {});
      storage.set(`status-${uid}`, JSON.stringify(usersData[uid].status)).catch(() => {});
      storage.set(`realQty-${uid}`, JSON.stringify(usersData[uid].realQty || {})).catch(() => {});
      if (usersData[uid].insight) {
        storage.set(`insight-${uid}`, JSON.stringify(usersData[uid].insight)).catch(() => {});
      }
    }
  }, [usersData, storageReady]);

  // Charge d'abord Supabase. S'il n'existe encore aucune ligne distante,
  // l'état local déjà présent sera envoyé par les effets de synchronisation.
  useEffect(() => {
    if (!storageReady || !session?.user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setSyncState('loading');
        const snapshot = await loadCloudSnapshot({
          userId: session.user.id,
          profileId: accountProfileId,
          dateKey: today(),
        });
        if (cancelled) return;
        cloudApplyingRef.current = true;

        if (snapshot.daily.length) {
          setUsersData(prev => {
            const next = { ...prev };
            for (const row of snapshot.daily) {
              const uid = `${row.profile_id}-${row.mode_id}`;
              if (!allowedUserIds.includes(uid)) continue;
              next[uid] = {
                ...next[uid],
                plan: row.plan_json,
                status: row.status_json || {},
                insight: row.insight_json || null,
                realQty: row.real_qty_json || {},
                collapsed: row.collapsed_json || {},
                changesSinceAnalysis: row.changes_since_analysis || 0,
              };
            }
            return next;
          });
        }

        const preferredMode = snapshot.preferences?.current_mode_id;
        if (preferredMode && MODES_BY_PROFILE[accountProfileId].some(mode => mode.id === preferredMode)) {
          setCurrentUserId(`${accountProfileId}-${preferredMode}`);
          setLastModeByProfile(prev => ({
            ...prev,
            ...(snapshot.preferences?.last_mode_by_profile_json || {}),
            [accountProfileId]: preferredMode,
          }));
        }

        if (snapshot.tracking.length) {
          const trackingByDate = {};
          let latestMeasurements = [];
          for (const row of snapshot.tracking) {
            trackingByDate[row.date_key] = row.entry_json || {};
            if (Array.isArray(row.measurements_json) && row.measurements_json.length) {
              latestMeasurements = row.measurements_json;
            }
          }
          setSuiviData(prev => ({ ...prev, [accountProfileId]: trackingByDate }));
          if (latestMeasurements.length) {
            setMesuresData(prev => ({ ...prev, [accountProfileId]: latestMeasurements }));
          }
        }

        cloudApplyingRef.current = false;
        setCloudReady(true);
        setSyncState('synced');
      } catch (error) {
        console.error('Chargement Supabase impossible :', error);
        setCloudReady(true);
        setSyncState('offline');
        cloudApplyingRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [storageReady, session?.user?.id, accountProfileId]);

  useEffect(() => {
    if (!cloudReady || cloudApplyingRef.current || !session?.user?.id) return;
    setSyncState('saving');
    const timer = setTimeout(async () => {
      try {
        await saveDailyStates({
          userId: session.user.id,
          dateKey: today(),
          rows: allowedUserIds.filter(uid => usersData[uid]).map(uid => ({
            profileId: USERS[uid].profileId,
            modeId: USERS[uid].modeId,
            ...usersData[uid],
          })),
        });
        setSyncState('synced');
      } catch (error) {
        console.error('Sauvegarde Supabase impossible :', error);
        setSyncState('offline');
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [usersData, cloudReady, session?.user?.id, accountProfileId]);

  // Migration transparente des changements de mode effectués avec l'ancienne
  // version, qui ne conservait que les macros agrégées. Les états du mode source
  // existent encore dans Supabase : on peut donc recocher les aliments identiques
  // dans le mode actuel sans modifier le total déjà consommé.
  useEffect(() => {
    if (!cloudReady || cloudApplyingRef.current) return;
    const destinationData = usersData[currentUserId];
    const legacyCarryover = destinationData?.realQty?.__modeCarryover;
    if (!legacyCarryover?.fromModeId || legacyCarryover.matchedItems !== undefined) return;

    const sourceUserId = `${USERS[currentUserId]?.profileId}-${legacyCarryover.fromModeId}`;
    const sourceData = usersData[sourceUserId];
    if (!sourceData?.plan) return;

    const normalizeLabel = value => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const nextPlan = deepClone(destinationData.plan);
    const nextStatus = { ...(destinationData.status || {}) };
    const nextRealQty = { ...(destinationData.realQty || {}) };
    const usedDestinationItems = new Set(
      Object.entries(nextStatus).filter(([, state]) => state === 'done').map(([key]) => key)
    );
    const matchedDestinationMacros = { cal: 0, p: 0, g: 0, l: 0 };

    sourceData.plan.forEach(sourceMeal => sourceMeal.items.forEach(sourceItem => {
      const sourceKey = `${sourceMeal.id}-${sourceItem.id}`;
      if (sourceData.status?.[sourceKey] !== 'done' || sourceItem.suppl) return;
      const foodName = normalizeLabel(sourceItem.name);
      const mealName = normalizeLabel(sourceMeal.name);
      const candidates = [];
      nextPlan.forEach(destinationMeal => destinationMeal.items.forEach(destinationItem => {
        const destinationKey = `${destinationMeal.id}-${destinationItem.id}`;
        if (destinationItem.suppl || usedDestinationItems.has(destinationKey)) return;
        if (normalizeLabel(destinationItem.name) !== foodName) return;
        candidates.push({
          destinationMeal,
          destinationItem,
          destinationKey,
          sameMeal: normalizeLabel(destinationMeal.name) === mealName,
        });
      }));
      const match = candidates.find(candidate => candidate.sameMeal) || candidates[0];
      if (!match) return;

      usedDestinationItems.add(match.destinationKey);
      nextStatus[match.destinationKey] = 'done';
      const sourcePlannedGrams = parseGrams(sourceItem.qty);
      const sourceRealGrams = sourceData.realQty?.[sourceKey];
      const consumedGrams = sourceRealGrams !== undefined ? Number(sourceRealGrams) : sourcePlannedGrams;
      const destinationPlannedGrams = parseGrams(match.destinationItem.qty);
      let destinationRatio = 1;
      if (Number.isFinite(consumedGrams) && consumedGrams > 0 && destinationPlannedGrams > 0) {
        nextRealQty[match.destinationKey] = consumedGrams;
        destinationRatio = consumedGrams / destinationPlannedGrams;
      }
      matchedDestinationMacros.cal += match.destinationItem.cal * destinationRatio;
      matchedDestinationMacros.p += match.destinationItem.p * destinationRatio;
      matchedDestinationMacros.g += match.destinationItem.g * destinationRatio;
      matchedDestinationMacros.l += match.destinationItem.l * destinationRatio;
    }));

    const previousTotal = {
      cal: Number(legacyCarryover.cal) || 0,
      p: Number(legacyCarryover.p) || 0,
      g: Number(legacyCarryover.g) || 0,
      l: Number(legacyCarryover.l) || 0,
    };
    const migratedCount = usedDestinationItems.size - Object.values(destinationData.status || {}).filter(state => state === 'done').length;
    nextRealQty.__modeCarryover = {
      ...legacyCarryover,
      cal: previousTotal.cal - matchedDestinationMacros.cal,
      p: previousTotal.p - matchedDestinationMacros.p,
      g: previousTotal.g - matchedDestinationMacros.g,
      l: previousTotal.l - matchedDestinationMacros.l,
      totalCal: previousTotal.cal,
      totalP: previousTotal.p,
      totalG: previousTotal.g,
      totalL: previousTotal.l,
      matchedItems: Math.max(0, migratedCount),
      migratedAt: new Date().toISOString(),
    };
    updateUserData(currentUserId, prev => ({
      status: nextStatus,
      realQty: nextRealQty,
      changesSinceAnalysis: (prev.changesSinceAnalysis || 0) + 1,
    }));
    // Une seule tentative par mode chargé ; l'état migré est ensuite synchronisé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudReady, currentUserId]);

  useEffect(() => {
    if (!cloudReady || cloudApplyingRef.current || !session?.user?.id) return;
    const timer = setTimeout(() => {
      savePreferences({
        userId: session.user.id,
        profileId: accountProfileId,
        modeId: USERS[currentUserId]?.modeId || DEFAULT_MODE_BY_PROFILE[accountProfileId],
        lastModeByProfile,
      }).catch(error => console.error('Préférences Supabase impossibles :', error));
    }, 500);
    return () => clearTimeout(timer);
  }, [currentUserId, lastModeByProfile, cloudReady, session?.user?.id, accountProfileId]);

  useEffect(() => {
    if (!cloudReady || cloudApplyingRef.current || !session?.user?.id) return;
    const timer = setTimeout(() => {
      saveTracking({
        userId: session.user.id,
        profileId: accountProfileId,
        suivi: suiviData[accountProfileId] || {},
        measurements: mesuresData[accountProfileId] || [],
      }).catch(error => console.error('Suivi Supabase impossible :', error));
    }, 900);
    return () => clearTimeout(timer);
  }, [suiviData, mesuresData, cloudReady, session?.user?.id, accountProfileId]);

  // Macros
  // ⚠️ La CIBLE = objectif FIXE du jour pour ce profil/mode.
  // On la calcule depuis le plan de RÉFÉRENCE (USERS), JAMAIS depuis le plan en cours :
  // ainsi un swap d'aliment, le grammage réel ou une adaptation IA ne déplacent plus l'objectif.
  const basePlan = (USERS[currentUserId] && USERS[currentUserId].plan) || plan;
  const target = basePlan.filter(m => !m.conditional).reduce((acc, m) => {
    m.items.forEach(i => {
      if (i.aiAdded) return; // exclut les items ajoutés par l'IA hors plan
      acc.cal += i.cal; acc.p += i.p; acc.g += i.g; acc.l += i.l;
    });
    return acc;
  }, { cal: 0, p: 0, g: 0, l: 0 });

  // Le CONSOMMÉ inclut TOUT ce qui est marqué done, avec le grammage réel si renseigné.
  const modeCarryover = realQty.__modeCarryover || null;
  const consumed = plan.reduce((acc, m) => {
    m.items.forEach(i => {
      if (status[`${m.id}-${i.id}`] === 'done') {
        const origGrams = parseGrams(i.qty);
        const realG = realQty[`${m.id}-${i.id}`];
        if (realG !== undefined && origGrams && origGrams > 0) {
          const ratio = realG / origGrams;
          acc.cal += i.cal * ratio; acc.p += i.p * ratio;
          acc.g += i.g * ratio; acc.l += i.l * ratio;
        } else {
          acc.cal += i.cal; acc.p += i.p; acc.g += i.g; acc.l += i.l;
        }
      }
    });
    return acc;
  }, {
    cal: Number(modeCarryover?.cal) || 0,
    p: Number(modeCarryover?.p) || 0,
    g: Number(modeCarryover?.g) || 0,
    l: Number(modeCarryover?.l) || 0,
  });

  // remaining peut être NÉGATIF si dépassement → affichage "en trop" en rouge
  const remaining = {
    cal: target.cal - consumed.cal,
    p: target.p - consumed.p,
    g: target.g - consumed.g,
    l: target.l - consumed.l,
  };

  // Handlers
  const toggleItem = (mealId, itemId) => {
    const key = `${mealId}-${itemId}`;
    updateUserData(currentUserId, (prev) => {
      const nextStatus = { ...prev.status };
      if (nextStatus[key] === 'done') nextStatus[key] = 'skip';
      else if (nextStatus[key] === 'skip') delete nextStatus[key];
      else nextStatus[key] = 'done';
      return { status: nextStatus, changesSinceAnalysis: prev.changesSinceAnalysis + 1 };
    });
  };

  const setRealQtyHandler = (mealId, itemId, grams) => {
    updateUserData(currentUserId, (prev) => ({
      realQty: { ...prev.realQty, [`${mealId}-${itemId}`]: grams }
    }));
  };

  const validateMeal = (mealId) => {
    const meal = plan.find(m => m.id === mealId);
    if (!meal) return;
    updateUserData(currentUserId, (prev) => {
      const nextStatus = { ...prev.status };
      meal.items.forEach(i => { nextStatus[`${mealId}-${i.id}`] = 'done'; });
      return { status: nextStatus, changesSinceAnalysis: prev.changesSinceAnalysis + 1 };
    });
  };

  async function resetAllUsers(silent = false) {
    if (!silent && !confirm(`Réinitialiser la journée de ${BASE_PROFILE[accountProfileId].name} dans tous ses modes ?`)) return;
    const fresh = {};
    const freshHash = {};
    for (const uid of allowedUserIds) {
      fresh[uid] = { plan: deepClone(USERS[uid].plan), status: {}, insight: null, collapsed: {}, changesSinceAnalysis: 0, realQty: {} };
      freshHash[uid] = null;
    }
    setUsersData(fresh);
    lastAnalyzedHashRef.current = freshHash;
    setInsightError(null);
    try {
      await storage.set('current-date', today());
      for (const uid of allowedUserIds) {
        await storage.set(`plan-${uid}`, JSON.stringify(USERS[uid].plan));
        await storage.set(`status-${uid}`, JSON.stringify({}));
        await storage.set(`insight-${uid}`, JSON.stringify(null));
      }
    } catch {}
  }

  const resetCurrentUser = async () => {
    if (!confirm(`Réinitialiser la journée de ${user.name} en mode ${user.modeLabel} ?`)) return;
    updateUserData(currentUserId, {
      plan: deepClone(USERS[currentUserId].plan),
      status: {}, insight: null, collapsed: {}, changesSinceAnalysis: 0, realQty: {}
    });
    lastAnalyzedHashRef.current[currentUserId] = null;
    setInsightError(null);
    try {
      await storage.set(`plan-${currentUserId}`, JSON.stringify(USERS[currentUserId].plan));
      await storage.set(`status-${currentUserId}`, JSON.stringify({}));
      await storage.set(`insight-${currentUserId}`, JSON.stringify(null));
    } catch {}
  };

  const toggleCollapse = (mealId) => {
    updateUserData(currentUserId, (prev) => ({
      collapsed: { ...prev.collapsed, [mealId]: !prev.collapsed[mealId] }
    }));
  };

  const swapProtein = (mealId, itemId, optionId) => {
    updateUserData(currentUserId, (prev) => {
      const newPlan = deepClone(prev.plan);
      const meal = newPlan.find(m => m.id === mealId);
      if (!meal) return prev;
      const item = meal.items.find(i => i.id === itemId);
      if (!item || !Array.isArray(item.options)) return prev;
      const option = item.options.find(o => o.id === optionId);
      if (!option) return prev;
      item.name = option.name;
      item.qty = option.qty;
      item.cal = option.cal;
      item.p = option.p;
      item.g = option.g;
      item.l = option.l;
      item.optionId = option.id;
      return { plan: newPlan, changesSinceAnalysis: prev.changesSinceAnalysis + 1 };
    });
  };

  // Swap any food item using ALIMENTS_DB (per-100g values × grams)
  const swapFood = (mealId, itemId, food, grams) => {
    const f = grams / 100;
    updateUserData(currentUserId, (prev) => {
      const newPlan = deepClone(prev.plan);
      const meal = newPlan.find(m => m.id === mealId);
      if (!meal) return prev;
      const item = meal.items.find(i => i.id === itemId);
      if (!item) return prev;
      item.name = food.name;
      item.qty = `${grams} g`;
      item.cal = Math.round(food.cal * f * 10) / 10;
      item.p   = Math.round(food.p   * f * 10) / 10;
      item.g   = Math.round(food.g   * f * 10) / 10;
      item.l   = Math.round(food.l   * f * 10) / 10;
      return { plan: newPlan, changesSinceAnalysis: prev.changesSinceAnalysis + 1 };
    });
  };

  // Ajouter manuellement un aliment hors plan à un meal
  const addManualFood = (mealId, food, grams) => {
    if (!food || !mealId) return;
    const g2 = parseFloat(grams) || 100;
    const f = g2 / 100;
    const safe = v => isNaN(parseFloat(v)) ? 0 : Math.round(parseFloat(v) * f * 10) / 10;
    const newItem = {
      id: `manual-${Date.now()}`,
      name: food.name || 'Aliment',
      qty: `${g2} g`,
      cal: safe(food.cal),
      p:   safe(food.p),
      g:   safe(food.g),
      l:   safe(food.l),
      aiAdded: true,
    };
    updateUserData(currentUserId, (prev) => {
      const newPlan = deepClone(prev.plan);
      const meal = newPlan.find(m => m.id === mealId);
      if (!meal) return prev;
      meal.items.push(newItem);
      const newStatus = { ...prev.status, [`${mealId}-${newItem.id}`]: 'done' };
      return { plan: newPlan, status: newStatus, changesSinceAnalysis: prev.changesSinceAnalysis + 1 };
    });
  };

  // Ajout exact d'une consommation connue (Starbucks, restaurant, étiquette, etc.).
  // Les valeurs saisies sont des totaux pour la portion, pas des valeurs pour 100 g.
  const addManualConsumption = (mealId, entry) => {
    if (!mealId || !entry?.name?.trim()) return;
    const number = value => {
      const parsed = Number.parseFloat(String(value).replace(',', '.'));
      return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : 0;
    };
    const newItem = {
      id: `manual-${Date.now()}`,
      name: entry.name.trim(),
      qty: entry.qty.trim() || '1 portion',
      cal: number(entry.cal),
      p: number(entry.p),
      g: number(entry.g),
      l: number(entry.l),
      manualAdded: true,
      aiAdded: true,
    };
    updateUserData(currentUserId, prev => {
      const newPlan = deepClone(prev.plan);
      const meal = newPlan.find(m => m.id === mealId);
      if (!meal) return prev;
      meal.items.push(newItem);
      return {
        plan: newPlan,
        status: { ...prev.status, [`${mealId}-${newItem.id}`]: 'done' },
        changesSinceAnalysis: prev.changesSinceAnalysis + 1,
      };
    });
  };




  // Admin: ouvre via URL #admin — compatible iOS Safari
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin' || window.location.hash === '#Admin') {
        setShowAdmin(true);
        window.history.replaceState(null, '', window.location.pathname);
      }
    };
    // Check immédiat au chargement
    checkHash();
    // iOS Safari: vérifier aussi après 500ms (délai de rendu)
    const t = setTimeout(checkHash, 500);
    window.addEventListener('hashchange', checkHash);
    // Aussi sur focus (quand on revient sur l'onglet)
    window.addEventListener('focus', checkHash);
    return () => {
      clearTimeout(t);
      window.removeEventListener('hashchange', checkHash);
      window.removeEventListener('focus', checkHash);
    };
  }, []);


  // Scanner: reçoit le stream depuis le bouton MealCard
  const handleScannerReady = (mealId, mealName, stream) => {
    setScannerTarget({ mealId, mealName, stream });
  };

  // Admin: apply modified plan to usersData
  const handleAdminSavePlan = (profileId, modeId, newPlan) => {
    const uid = `${profileId}-${modeId}`;
    // Update in-memory state - spread to force re-render
    setUsersData(prev => ({ ...prev, [uid]: { ...prev[uid], plan: deepClone(newPlan) } }));
    // Persist to the same key the app reads on load
    try { storage.set(`plan-${uid}`, JSON.stringify(newPlan)).catch(()=>{}); } catch {}
  };

  // ===== SUIVI & MESURES HANDLERS =====

  // Auto-sync journal kcal → suivi du jour
  useEffect(() => {
    if (!currentProfile) return;
    const today = new Date().toISOString().split('T')[0];
    const calConsumed = Math.round(consumed.cal);
    if (calConsumed <= 0) return;
    setSuiviData(prev => {
      const existing = (prev[currentProfile] || {})[today] || {};
      const updated = {
        ...prev,
        [currentProfile]: {
          ...(prev[currentProfile] || {}),
          [today]: { ...existing, calJournal: calConsumed }
        }
      };
      try { localStorage.setItem(`coach-suivi-${currentProfile}`, JSON.stringify(updated[currentProfile])); } catch {}
      return updated;
    });
  }, [consumed.cal, currentProfile]);

  const updateSuivi = (profileId, dateKey, entry) => {
    setSuiviData(prev => {
      const updated = { ...prev, [profileId]: { ...(prev[profileId]||{}), [dateKey]: entry } };
      try { localStorage.setItem(`coach-suivi-${profileId}`, JSON.stringify(updated[profileId])); } catch {}
      return updated;
    });
  };

  const updateMesures = (profileId, action, data) => {
    setMesuresData(prev => {
      const current = [...(prev[profileId]||[])];
      let updated;
      if (action === 'add') updated = [...current, data];
      else if (action === 'edit') updated = current.map(e => e.id === data.id ? data : e);
      else if (action === 'delete') updated = current.filter(e => e.id !== data);
      else updated = current;
      const result = { ...prev, [profileId]: updated };
      try { localStorage.setItem(`coach-mesures-${profileId}`, JSON.stringify(updated)); } catch {}
      return result;
    });
  };

  // Load suivi + mesures from localStorage on mount
  useEffect(() => {
    const profiles = [accountProfileId];
    const sd = {};
    const md = {};
    profiles.forEach(pid => {
      try { const s = localStorage.getItem(`coach-suivi-${pid}`); if(s) sd[pid] = JSON.parse(s); } catch {}
      try { const m = localStorage.getItem(`coach-mesures-${pid}`); if(m) md[pid] = JSON.parse(m); } catch {}
    });
    if (Object.keys(sd).length) setSuiviData(sd);
    if (Object.keys(md).length) setMesuresData(md);
  }, [accountProfileId]);

  const applyAction = (actionIdx) => {
    if (!insight?.actions?.[actionIdx]) return;
    const action = insight.actions[actionIdx];

    updateUserData(currentUserId, (prev) => {
      const newPlan = deepClone(prev.plan);
      const meal = newPlan.find(m => m.id === action.meal_id);
      if (meal || action.type === 'mark_consumed' || action.type === 'mark_skipped') {
        switch (action.type) {
          case 'add_item':
            if (meal && action.item) meal.items.push({
              id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: action.item.name, qty: action.item.qty || '',
              cal: Number(action.item.cal) || 0, p: Number(action.item.p) || 0,
              g: Number(action.item.g) || 0, l: Number(action.item.l) || 0,
              aiAdded: true,
            });
            break;
          case 'modify_item': {
            const item = meal?.items.find(i => i.id === action.item_id);
            if (item) {
              if (action.new_qty !== undefined) item.qty = action.new_qty;
              if (action.new_cal !== undefined) item.cal = Number(action.new_cal);
              if (action.new_p !== undefined) item.p = Number(action.new_p);
              if (action.new_g !== undefined) item.g = Number(action.new_g);
              if (action.new_l !== undefined) item.l = Number(action.new_l);
              item.aiModified = true;
            }
            break;
          }
          case 'remove_item':
            if (meal) meal.items = meal.items.filter(i => i.id !== action.item_id);
            break;
          default: break;
        }
      }

      const nextStatus = { ...prev.status };
      if (action.type === 'mark_consumed') nextStatus[`${action.meal_id}-${action.item_id}`] = 'done';
      else if (action.type === 'mark_skipped') nextStatus[`${action.meal_id}-${action.item_id}`] = 'skip';

      const nextInsight = prev.insight ? {
        ...prev.insight,
        actions: prev.insight.actions.map((a, i) => i === actionIdx ? { ...a, applied: 'accepted' } : a)
      } : prev.insight;

      return {
        plan: newPlan, status: nextStatus, insight: nextInsight,
        changesSinceAnalysis: prev.changesSinceAnalysis + 1
      };
    });
  };

  const refuseAction = (actionIdx) => {
    updateUserData(currentUserId, (prev) => ({
      insight: prev.insight ? {
        ...prev.insight,
        actions: prev.insight.actions.map((a, i) => i === actionIdx ? { ...a, applied: 'refused' } : a)
      } : prev.insight
    }));
  };

  const requestAlternative = (actionIdx) => {
    const userData = usersData[currentUserId];
    const action = userData?.insight?.actions?.[actionIdx];
    if (!action) return;

    // Construit une description de l'action refusée pour donner le contexte à l'IA
    const currentPlan = userData.plan;
    const meal = currentPlan.find(m => m.id === action.meal_id);
    const mealName = meal?.name || action.meal_id;
    let actionDesc = '';

    if (action.type === 'add_item' && action.item) {
      actionDesc = `ajouter "${action.item.name}"${action.item.qty ? ` (${action.item.qty})` : ''} à ${mealName}`;
    } else if (action.type === 'modify_item') {
      const it = meal?.items.find(i => i.id === action.item_id);
      actionDesc = `modifier "${it?.name || 'cet item'}" dans ${mealName}`;
    } else if (action.type === 'remove_item') {
      const it = meal?.items.find(i => i.id === action.item_id);
      actionDesc = `retirer "${it?.name || 'cet item'}" de ${mealName}`;
    } else if (action.type === 'mark_consumed' || action.type === 'mark_skipped') {
      const it = meal?.items.find(i => i.id === action.item_id);
      actionDesc = `${action.type === 'mark_consumed' ? 'marquer comme consommé' : 'marquer comme sauté'} "${it?.name || 'cet item'}"`;
    }

    // Marque l'action comme "remplacement demandé" pour qu'elle s'affiche en gris
    updateUserData(currentUserId, (prev) => ({
      insight: prev.insight ? {
        ...prev.insight,
        actions: prev.insight.actions.map((a, i) => i === actionIdx ? { ...a, applied: 'replaced' } : a)
      } : prev.insight
    }));

    // Construit la question contextuelle pour l'IA
    const impactStr = action.impact
      ? ` (effet visé: ${action.impact.cal >= 0 ? '+' : ''}${action.impact.cal?.toFixed(0) || 0} kcal, ${action.impact.p >= 0 ? '+' : ''}${action.impact.p?.toFixed(1) || 0}g P, ${action.impact.g >= 0 ? '+' : ''}${action.impact.g?.toFixed(1) || 0}g G, ${action.impact.l >= 0 ? '+' : ''}${action.impact.l?.toFixed(1) || 0}g L)`
      : '';
    const question = `Je refuse ta proposition de ${actionDesc}${impactStr}. Propose-moi une ALTERNATIVE DIFFÉRENTE qui apporte un effet similaire sur les macros — pas le même aliment, autre chose.`;

    generateInsight(question);
  };

  async function generateInsight(userQuestion = null) {
    if (Date.now() < rateLimitedUntil) {
      const wait = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      setInsightError(`Limite API atteinte. Attends ${wait}s.`);
      return;
    }

    const hash = stateHash(plan, status);
    if (!userQuestion && hash === lastAnalyzedHashRef.current[currentUserId] && insight) return;

    setInsightLoading(true);
    setInsightError(null);

    try {
      const isModeTransitionOptimization = userQuestion?.startsWith('Changement de mode :');
      // Format compact : lors d'un changement de mode, on n'envoie que les aliments
      // encore disponibles dans le nouveau plan. Le bilan déjà mangé est agrégé plus bas.
      const planSummary = plan.map(meal => {
        const items = meal.items.filter(i => {
          if (!isModeTransitionOptimization) return true;
          return !status[`${meal.id}-${i.id}`] && !i.suppl;
        }).map(i => {
          const key = `${meal.id}-${i.id}`;
          const s = status[key] || 'pending';
          const macros = i.suppl ? 'suppl' : `${i.cal}/${i.p}/${i.g}/${i.l}`;
          const state = s === 'done' ? 'D' : s === 'skip' ? 'S' : 'P';
          return `${i.id}:${i.name},${i.qty},${macros},${state}`;
        }).join('\n');
        return `[${meal.id}|${meal.name}${meal.conditional ? '|COND' : ''}]\n${items}`;
      }).join('\n');

      const systemPrompt = `Coach nutrition de ${user.profile}. Réponds en français, tutoie, sois bref et concret.
Utilise directement submit_nutrition_analysis, sans texte libre.

FORMAT PLAN: [meal_id|nom|COND éventuel], puis item_id:nom,quantité,kcal/P/G/L,état. États D=mangé, S=sauté, P=à venir.
HEURE ${currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
PLAN
${planSummary}

MACROS kcal/P/G/L
CIBLE ${target.cal.toFixed(0)}/${target.p.toFixed(0)}/${target.g.toFixed(0)}/${target.l.toFixed(0)}
CONSOMMÉ ${consumed.cal.toFixed(0)}/${consumed.p.toFixed(0)}/${consumed.g.toFixed(0)}/${consumed.l.toFixed(0)}
RESTANT ${remaining.cal.toFixed(0)}/${remaining.p.toFixed(0)}/${remaining.g.toFixed(0)}/${remaining.l.toFixed(0)}
${userQuestion ? `MESSAGE PRIORITAIRE: ${userQuestion}` : ''}

RÈGLES
1. Une déclaration utilisateur produit UNE seule action: hors plan=add_item; item prévu mangé=mark_consumed; sauté=mark_skipped; quantité différente=modify_item. Jamais de double comptage.
2. auto_apply=true uniquement pour un fait déjà réalisé ou en cours. Toute suggestion future a auto_apply=false.
3. La cible est fixe. Après auto_apply, calcule restant_final=restant_actuel-somme(impacts). Les chiffres cités doivent être ceux de restant_final; si négatif, parle de dépassement. Préfère une formulation qualitative si un total est incertain.
4. impact cal/P/G/L est obligatoire pour add_item, modify_item et remove_item. Estime raisonnablement les aliments hors plan.
5. ${isModeTransitionOptimization ? 'Changement de mode: 0 à 2 observations très brèves et 0 à 3 actions maximum. Modifie seulement les aliments P du nouveau plan pour répartir le RESTANT; ne recrée pas les aliments déjà consommés.' : 'Donne 2 à 4 observations utiles et 0 à 3 actions. Propose une adaptation future seulement si un écart significatif reste à corriger.'}
6. Un repas COND n'entre pas dans la cible et ne doit être conseillé que si l'utilisateur mentionne un entraînement.
7. Priorité: protéines, puis calories, puis glucides autour de l'entraînement.
8. Pour Émilie, Meal 3 fait toujours partie de la cible; seule son heure change les nuits de garde. Ne jamais conseiller de le sauter.`;

      const userMsg = userQuestion ||
        "Analyse et propose les ajustements nécessaires pour atteindre les cibles.";

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Session expirée. Reconnecte-toi.');

      const apiEndpoint = import.meta.env.VITE_API_ENDPOINT;
      if (!apiEndpoint) throw new Error('Le proxy OpenAI n’est pas configuré.');

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          systemPrompt,
          userMessage: userMsg,
        })
      });

      if (response.status === 429) {
        setRateLimitedUntil(Date.now() + 60000);
        setInsightError(`⏳ Limite OpenAI atteinte. Réessaie dans 1 minute.`);
        return;
      }
      if (!response.ok) {
        let errDetail = '';
        try { const errBody = await response.text(); errDetail = errBody.slice(0, 200); } catch {}
        throw new Error(`API ${response.status}${errDetail ? ' — ' + errDetail : ''}`);
      }

      const data = await response.json();
      // Conserve uniquement des compteurs agrégés sur l'appareil (aucun contenu de repas).
      // Cela permet d'estimer les coûts futurs depuis les valeurs réelles renvoyées par l'API.
      if (data.usage) {
        try {
          const usageKey = 'coach-nutrition-api-usage-v1';
          const previous = JSON.parse(localStorage.getItem(usageKey) || '{}');
          const today = new Date().toISOString().slice(0, 10);
          const day = previous[today] || { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
          previous[today] = {
            calls: day.calls + 1,
            input: day.input + (data.usage.input_tokens || 0),
            output: day.output + (data.usage.output_tokens || 0),
            cacheRead: day.cacheRead + (data.usage.cached_input_tokens || 0),
            cacheWrite: day.cacheWrite,
            model: data.model || 'gpt-5-mini'
          };
          localStorage.setItem(usageKey, JSON.stringify(previous));
        } catch {
          // Le suivi de coût ne doit jamais bloquer l'analyse nutritionnelle.
        }
      }
      const parsed = data.analysis || null;

      if (!parsed) {
        setInsightError('Réponse OpenAI non exploitable. Réessaie dans quelques secondes.');
        return;
      }

      // 🔥 AUTO-APPLY: applique immédiatement les actions marquées auto_apply: true
      // et tracke leur impact total pour affichage visuel
      const rawActions = Array.isArray(parsed.actions) ? parsed.actions : [];

      // 🛡️ ANTI-DOUBLE-COMPTAGE: si l'IA fait plusieurs actions auto_apply sur le MÊME aliment
      // (ex: add_item "chocolat" + mark_consumed sur choco-e1 du plan), on ne garde QUE la première.
      const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const seenFoodKeys = new Set();
      const dedupedActions = rawActions.map(action => {
        if (!action.auto_apply) return action;
        // Résoud le nom de l'aliment selon le type d'action
        let foodName = '';
        if (action.type === 'add_item') foodName = action.item?.name || '';
        else if (action.type === 'modify_item' || action.type === 'remove_item' || action.type === 'mark_consumed' || action.type === 'mark_skipped') {
          // Cherche l'item dans le plan actuel
          const m = plan.find(mm => mm.id === action.meal_id);
          const it = m?.items.find(i => i.id === action.item_id);
          foodName = it?.name || '';
        }
        const key = normalize(foodName);
        if (key && seenFoodKeys.has(key)) {
          // Doublon détecté → on dégrade en pending pour ne pas double-compter
          return { ...action, auto_apply: false, _deduplicated: true };
        }
        if (key) seenFoodKeys.add(key);
        return action;
      });

      const autoImpact = { cal: 0, p: 0, g: 0, l: 0 };
      let autoCount = 0;

      setUsersData(prev => {
        const u = prev[currentUserId];
        // Deep clone du plan pour pouvoir muter sans risque
        const newPlan = u.plan.map(m => ({ ...m, items: m.items.map(i => ({ ...i })) }));
        const newStatus = { ...u.status };

        const processedActions = dedupedActions.map(action => {
          if (!action.auto_apply) {
            return { ...action, applied: action._deduplicated ? 'duplicate' : 'pending' };
          }

          const meal = newPlan.find(m => m.id === action.meal_id);
          let didApply = false;

          if (action.type === 'add_item' && meal && action.item?.name) {
            const newItem = {
              id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: action.item.name,
              qty: action.item.qty || '',
              cal: Number(action.item.cal) || 0,
              p: Number(action.item.p) || 0,
              g: Number(action.item.g) || 0,
              l: Number(action.item.l) || 0,
              aiAdded: true,
            };
            meal.items.push(newItem);
            // Déclaration de consommation → on marque aussi consommé
            newStatus[`${action.meal_id}-${newItem.id}`] = 'done';
            autoImpact.cal += newItem.cal;
            autoImpact.p += newItem.p;
            autoImpact.g += newItem.g;
            autoImpact.l += newItem.l;
            didApply = true;
          } else if (action.type === 'modify_item' && meal && action.item_id) {
            const item = meal.items.find(i => i.id === action.item_id);
            if (item) {
              const oc = item.cal, op = item.p, og = item.g, ol = item.l;
              if (action.new_qty !== undefined) item.qty = action.new_qty;
              if (action.new_cal !== undefined) item.cal = Number(action.new_cal);
              if (action.new_p !== undefined) item.p = Number(action.new_p);
              if (action.new_g !== undefined) item.g = Number(action.new_g);
              if (action.new_l !== undefined) item.l = Number(action.new_l);
              item.aiModified = true;
              // Impact = delta uniquement si l'item est déjà coché consommé
              if (newStatus[`${action.meal_id}-${action.item_id}`] === 'done') {
                autoImpact.cal += (item.cal - oc);
                autoImpact.p += (item.p - op);
                autoImpact.g += (item.g - og);
                autoImpact.l += (item.l - ol);
              }
              didApply = true;
            }
          } else if (action.type === 'remove_item' && meal && action.item_id) {
            const idx = meal.items.findIndex(i => i.id === action.item_id);
            if (idx >= 0) {
              const removed = meal.items[idx];
              const wasDone = newStatus[`${action.meal_id}-${action.item_id}`] === 'done';
              if (wasDone) {
                autoImpact.cal -= removed.cal;
                autoImpact.p -= removed.p;
                autoImpact.g -= removed.g;
                autoImpact.l -= removed.l;
              }
              meal.items.splice(idx, 1);
              delete newStatus[`${action.meal_id}-${action.item_id}`];
              didApply = true;
            }
          } else if (action.type === 'mark_consumed' && action.item_id) {
            const wasDone = newStatus[`${action.meal_id}-${action.item_id}`] === 'done';
            newStatus[`${action.meal_id}-${action.item_id}`] = 'done';
            if (!wasDone) {
              const item = meal?.items.find(i => i.id === action.item_id);
              if (item) {
                autoImpact.cal += item.cal;
                autoImpact.p += item.p;
                autoImpact.g += item.g;
                autoImpact.l += item.l;
              }
            }
            didApply = true;
          } else if (action.type === 'mark_skipped' && action.item_id) {
            const wasDone = newStatus[`${action.meal_id}-${action.item_id}`] === 'done';
            newStatus[`${action.meal_id}-${action.item_id}`] = 'skip';
            if (wasDone) {
              const item = meal?.items.find(i => i.id === action.item_id);
              if (item) {
                autoImpact.cal -= item.cal;
                autoImpact.p -= item.p;
                autoImpact.g -= item.g;
                autoImpact.l -= item.l;
              }
            }
            didApply = true;
          }

          if (didApply) autoCount++;
          return { ...action, applied: didApply ? 'accepted' : 'pending' };
        });

        const newInsight = {
          headline: parsed.headline || 'Analyse',
          summary: parsed.summary || '',
          observations: Array.isArray(parsed.observations) ? parsed.observations : [],
          actions: processedActions,
          timestamp: Date.now(),
          question: userQuestion || null,
          autoApplied: autoCount > 0 ? { count: autoCount, impact: autoImpact } : null,
        };

        return {
          ...prev,
          [currentUserId]: {
            ...u,
            plan: newPlan,
            status: newStatus,
            insight: newInsight,
            collapsed: { ...u.collapsed, ...Object.fromEntries(processedActions.filter(a => a.type === 'add_item' && a.applied === 'accepted').map(a => [a.meal_id, false])) },
            changesSinceAnalysis: 0,
          },
        };
      });

      lastAnalyzedHashRef.current[currentUserId] = hash;
      if (userQuestion) {
        // Si c'est une demande d'alternative → ouvrir directement Adaptations (où sera la nouvelle proposition)
        // Sinon → Bilan (analyse globale)
        setTab(userQuestion.startsWith('Je refuse ta proposition de') ? 'plan' : 'bilan');
      }
    } catch (e) {
      setInsightError(e.message || 'Erreur inconnue');
    } finally {
      setInsightLoading(false);
    }
  }

  const sendChat = () => {
    if (!chatInput.trim() || insightLoading) return;
    const q = chatInput.trim();
    setChatInput('');
    generateInsight(q);
  };

  // Switch de PROFIL : on revient sur le dernier mode utilisé pour ce profil
  const handleProfileSwitch = (profileId) => {
    if (profileId === currentProfile) return;
    const mode = lastModeByProfile[profileId] || DEFAULT_MODE_BY_PROFILE[profileId];
    setCurrentUserId(`${profileId}-${mode}`);
    setInsightError(null);
    setTab('bilan');
  };

  // Switch de MODE : le plan alimentaire change, mais le bilan réellement consommé
  // reste acquis. Le nouveau plan repart proprement pour éviter tout double comptage.
  const handleModeSwitch = (modeId) => {
    if (modeId === currentMode) return;
    const nextUserId = `${currentProfile}-${modeId}`;
    const hasConsumed = consumed.cal > 0 || consumed.p > 0 || consumed.g > 0 || consumed.l > 0;
    if (hasConsumed) {
      const nextMode = MODES_BY_PROFILE[currentProfile]?.find(mode => mode.id === modeId);
      const accepted = confirm(
        `Passer en mode ${nextMode?.label || modeId} ?\n\n` +
        `${Math.round(consumed.cal)} kcal déjà consommées seront conservées. ` +
        `Le plan restant sera recalculé selon le nouveau mode.`
      );
      if (!accepted) return;

      const nextPlan = deepClone(USERS[nextUserId].plan);
      const nextStatus = {};
      const nextRealQty = {};
      const usedDestinationItems = new Set();
      const matchedDestinationMacros = { cal: 0, p: 0, g: 0, l: 0 };
      const normalizeLabel = value => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

      // Une consommation identique est cochée dans le nouveau mode. On privilégie
      // le même repas (ex. goûter), puis le même aliment ailleurs si les intitulés
      // des repas diffèrent légèrement entre deux modes.
      const consumedItems = plan.flatMap(sourceMeal => sourceMeal.items
        .filter(sourceItem => status[`${sourceMeal.id}-${sourceItem.id}`] === 'done' && !sourceItem.suppl)
        .map(sourceItem => ({ sourceMeal, sourceItem }))
      );

      consumedItems.forEach(({ sourceMeal, sourceItem }) => {
        const foodName = normalizeLabel(sourceItem.name);
        const mealName = normalizeLabel(sourceMeal.name);
        const candidates = [];
        nextPlan.forEach(destinationMeal => destinationMeal.items.forEach(destinationItem => {
          const destinationKey = `${destinationMeal.id}-${destinationItem.id}`;
          if (destinationItem.suppl || usedDestinationItems.has(destinationKey)) return;
          if (normalizeLabel(destinationItem.name) !== foodName) return;
          candidates.push({
            destinationMeal,
            destinationItem,
            destinationKey,
            sameMeal: normalizeLabel(destinationMeal.name) === mealName,
          });
        }));
        const match = candidates.find(candidate => candidate.sameMeal) || candidates[0];
        if (!match) return;

        usedDestinationItems.add(match.destinationKey);
        nextStatus[match.destinationKey] = 'done';

        const sourcePlannedGrams = parseGrams(sourceItem.qty);
        const sourceRealGrams = realQty[`${sourceMeal.id}-${sourceItem.id}`];
        const consumedGrams = sourceRealGrams !== undefined ? Number(sourceRealGrams) : sourcePlannedGrams;
        const destinationPlannedGrams = parseGrams(match.destinationItem.qty);
        let destinationRatio = 1;
        if (Number.isFinite(consumedGrams) && consumedGrams > 0 && destinationPlannedGrams > 0) {
          nextRealQty[match.destinationKey] = consumedGrams;
          destinationRatio = consumedGrams / destinationPlannedGrams;
        }
        matchedDestinationMacros.cal += match.destinationItem.cal * destinationRatio;
        matchedDestinationMacros.p += match.destinationItem.p * destinationRatio;
        matchedDestinationMacros.g += match.destinationItem.g * destinationRatio;
        matchedDestinationMacros.l += match.destinationItem.l * destinationRatio;
      });

      // Le reliquat agrégé conserve exactement le total déjà consommé. Les aliments
      // concordants sont, eux, représentés visuellement par les coches ci-dessus.
      const residualCarryover = {
        cal: consumed.cal - matchedDestinationMacros.cal,
        p: consumed.p - matchedDestinationMacros.p,
        g: consumed.g - matchedDestinationMacros.g,
        l: consumed.l - matchedDestinationMacros.l,
      };
      nextRealQty.__modeCarryover = {
        ...residualCarryover,
        totalCal: consumed.cal,
        totalP: consumed.p,
        totalG: consumed.g,
        totalL: consumed.l,
        matchedItems: usedDestinationItems.size,
        fromModeId: currentMode,
        fromModeLabel: user.modeLabel,
        switchedAt: new Date().toISOString(),
      };

      updateUserData(nextUserId, {
        plan: nextPlan,
        status: nextStatus,
        insight: null,
        collapsed: {},
        changesSinceAnalysis: 1,
        realQty: nextRealQty,
      });
      lastAnalyzedHashRef.current[nextUserId] = null;
    }
    setCurrentUserId(nextUserId);
    setLastModeByProfile(prev => ({ ...prev, [currentProfile]: modeId }));
    setInsightError(null);
    setTab('bilan');
  };

  const optimizeRemainingAfterModeSwitch = () => {
    generateInsight(
      `Changement de mode : optimise uniquement les quantités et aliments des repas restants du mode ${user.modeLabel} pour approcher les macros RESTANT. Ce qui est déjà consommé est définitif et ne doit jamais être ajouté une seconde fois.`
    );
  };

  // UI data
  const dateLabel = currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const timeLabel = currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const hours = currentTime.getHours();
  const subtitle = hours < 11 ? `Matinée jusqu'à ${timeLabel} · Plan journalier complet`
    : hours < 14 ? `Suivi matinée jusqu'à ${timeLabel} · Plan journalier complet`
    : hours < 18 ? `Suivi de la journée jusqu'à ${timeLabel} · Plan journalier complet`
    : `Journée presque terminée · Plan journalier complet`;

  const pendingActions = insight?.actions?.filter(a => a.applied === 'pending').length || 0;
  const observationsCount = insight?.observations?.length || 0;
  const remainingItems = plan.map(m => ({
    ...m,
    pendingItems: m.items.filter(i => !status[`${m.id}-${i.id}`] && !i.suppl)
  })).filter(m => m.pendingItems.length > 0);

  const RING_COLORS = { cal: '#3b82f6', p: '#10b981', g: '#f59e0b', l: '#ec4899' };
  const isRateLimited = Date.now() < rateLimitedUntil;
  const rateLimitWait = isRateLimited ? Math.ceil((rateLimitedUntil - Date.now()) / 1000) : 0;
  const canAnalyze = !insightLoading && !isRateLimited;
  const stateChanged = changesSinceAnalysis > 0;

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="max-w-3xl mx-auto pb-24 safe-bottom">
        {/* Journal section - hidden when other section active */}
      <div style={{display: activeSection !== 'journal' ? 'none' : 'block'}}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-violet-500" size={18} />
              Coach Nutrition
            </h1>
            <p className="text-[11px] text-slate-500">{currentTime.toLocaleDateString('fr-FR', { weekday: 'long' })} {dateLabel} · {timeLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 shadow-sm transition active:scale-[0.98] active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              title="Se déconnecter"
            >
              <LogOut size={14} />
              {signingOut ? '…' : 'Déconnexion'}
            </button>
            <button onClick={resetCurrentUser} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100" title={`Réinitialiser ${user.name} · ${user.modeLabel}`}>
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Profile + Mode Switchers */}
        <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
          <span>{BASE_PROFILE[accountProfileId].avatar} Compte de <strong className="text-slate-700">{BASE_PROFILE[accountProfileId].name}</strong></span>
          <span className={syncState === 'synced' ? 'text-emerald-600' : syncState === 'offline' ? 'text-amber-600' : 'text-slate-400'}>
            {syncState === 'synced' ? '☁ Sauvegardé' : syncState === 'offline' ? 'Hors ligne' : syncState === 'saving' ? 'Sauvegarde…' : 'Synchronisation…'}
          </span>
        </div>
        <ModeSwitcher currentProfile={currentProfile} currentMode={currentMode} onSelect={handleModeSwitch} />

        {nutritionProfile?.calibration_json?.phase === 'initial' && (
          <div className="mb-4 mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-black">⚖️ Calibration en cours · 3 semaines</p><p className="mt-1 text-xs leading-relaxed">Pesées lundi, mercredi et samedi. Nous suivons la moyenne : jamais une valeur isolée.</p></div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-violet-700">Plan déjà actif</span>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-xl">{user.avatar}</span>
              Analyse de {user.name} <span className="text-sm font-medium text-slate-500">· {user.modeEmoji} {user.modeLabel}</span> — {dateLabel}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
            Macros consommées à {timeLabel}
          </div>

          <div className="grid grid-cols-4 gap-1 sm:gap-3 mb-5">
            <BigRing label="CALS" current={consumed.cal} target={target.cal} color={RING_COLORS.cal} />
            <BigRing label="PROT" current={consumed.p} target={target.p} color={RING_COLORS.p} unit="g" />
            <BigRing label="GLUC" current={consumed.g} target={target.g} color={RING_COLORS.g} unit="g" />
            <BigRing label="LIP"  current={consumed.l} target={target.l} color={RING_COLORS.l} unit="g" />
          </div>

          <div className="grid grid-cols-4 gap-1 sm:gap-3 mb-5 pb-5 border-b border-slate-100">
            <RemainingDisplay value={remaining.cal} unit="kcal" label="restantes" color="text-blue-600" />
            <RemainingDisplay value={remaining.p} unit="g P" label="à rattraper" color={remaining.p > target.p * 0.3 ? "text-red-600" : "text-emerald-600"} />
            <RemainingDisplay value={remaining.g} unit="g G" label="restants" color="text-amber-600" />
            <RemainingDisplay value={remaining.l} unit="g L" label="restants" color="text-pink-600" />
          </div>

          {modeCarryover && (
            <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3.5">
              <div className="flex items-start gap-2.5">
                <Repeat size={17} className="mt-0.5 shrink-0 text-violet-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-violet-900">
                    Journée adaptée depuis le mode {modeCarryover.fromModeLabel || modeCarryover.fromModeId}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-violet-700">
                    {Math.round(modeCarryover.totalCal ?? modeCarryover.cal ?? 0)} kcal déjà consommées conservées. Les valeurs restantes ci-dessus sont recalculées gratuitement selon le mode {user.modeLabel}.
                  </p>
                  {modeCarryover.matchedItems > 0 && (
                    <p className="mt-1.5 text-xs font-semibold text-emerald-700">
                      ✓ {modeCarryover.matchedItems} aliment{modeCarryover.matchedItems > 1 ? 's' : ''} identique{modeCarryover.matchedItems > 1 ? 's' : ''} automatiquement coché{modeCarryover.matchedItems > 1 ? 's' : ''} dans le nouveau plan.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={optimizeRemainingAfterModeSwitch}
                    disabled={!canAnalyze}
                    className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-[0.99] active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {insightLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    Optimiser les repas restants avec l’IA
                  </button>
                  <p className="mt-1.5 text-center text-[10px] text-violet-500">Facultatif · un seul appel IA compact</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <button
              onClick={() => generateInsight()}
              disabled={!canAnalyze}
              className={`w-full font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                canAnalyze
                  ? `bg-gradient-to-r ${user.accentGradient} hover:brightness-110 text-white shadow-sm`
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {insightLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Analyse en cours...</>
              ) : isRateLimited ? (
                <><Loader2 size={16} /> Attends {rateLimitWait}s</>
              ) : (
                <>
                  <Brain size={16} />
                  {insight ? (stateChanged ? `Actualiser (${changesSinceAnalysis} changement${changesSinceAnalysis > 1 ? 's' : ''})` : 'Analyse à jour') : `Analyser la journée de ${user.name}`}
                </>
              )}
            </button>
          </div>

          {insightError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs flex-1 min-w-0">
                <span className="font-semibold text-red-700 break-words">{insightError}</span>
              </div>
              <button onClick={() => setInsightError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex border-b border-slate-200 mb-4">
            <TabBtn active={tab === 'bilan'} onClick={() => setTab('bilan')} badge={observationsCount}>Bilan</TabBtn>
            <TabBtn active={tab === 'journal'} onClick={() => setTab('journal')}>Journal</TabBtn>
            <TabBtn active={tab === 'plan'} onClick={() => setTab('plan')} badge={pendingActions}>Adaptations</TabBtn>
          </div>

          <div className="min-h-[140px]">
            {tab === 'bilan' && (() => {
              if (insightLoading && !insight) {
                return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="bg-slate-100 rounded-xl h-14 animate-pulse" />)}</div>;
              }
              if (!insight) {
                return (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">{user.avatar}</div>
                    <p className="text-sm text-slate-600 font-medium">Aucune analyse pour {user.name}</p>
                    <p className="text-xs text-slate-400 mt-1">Coche tes repas, puis clique sur "Analyser"</p>
                  </div>
                );
              }
              const isAlternativeRequest = insight.question?.startsWith('Je refuse ta proposition de');
              return (
                <div className="space-y-3">
                  {isAlternativeRequest ? (
                    <div className="bg-violet-100 border-l-4 border-violet-500 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-1.5 font-bold text-violet-800 text-sm">
                        <RotateCcw size={14} className="flex-shrink-0" />
                        Alternative à ta demande
                      </div>
                      <div className="text-xs text-violet-700 mt-1 italic leading-relaxed">{insight.question}</div>
                      <div className="text-[10px] text-violet-600 mt-1.5 italic">→ Va dans l'onglet <span className="font-bold">Adaptations</span> pour voir la nouvelle proposition</div>
                    </div>
                  ) : insight.question && (
                    <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 flex items-start gap-2">
                      <MessageCircle size={13} className="text-violet-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-violet-800 italic">"{insight.question}"</div>
                    </div>
                  )}
                  {insight.autoApplied && (
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-sm">
                        <CheckCircle2 size={15} className="flex-shrink-0" />
                        {insight.autoApplied.count} action{insight.autoApplied.count > 1 ? 's' : ''} appliquée{insight.autoApplied.count > 1 ? 's' : ''} automatiquement
                      </div>
                      <div className="text-xs text-emerald-700 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono">
                        <span>{insight.autoApplied.impact.cal >= 0 ? '+' : ''}{insight.autoApplied.impact.cal.toFixed(0)} kcal</span>
                        <span>{insight.autoApplied.impact.p >= 0 ? '+' : ''}{insight.autoApplied.impact.p.toFixed(1)} g P</span>
                        <span>{insight.autoApplied.impact.g >= 0 ? '+' : ''}{insight.autoApplied.impact.g.toFixed(1)} g G</span>
                        <span>{insight.autoApplied.impact.l >= 0 ? '+' : ''}{insight.autoApplied.impact.l.toFixed(1)} g L</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 mt-1 italic">Bulles macros mises à jour ✓</div>
                    </div>
                  )}
                  {insight.headline && (
                    <div>
                      <h3 className="font-bold text-slate-800 text-base leading-tight">{insight.headline}</h3>
                      {insight.summary && <p className="text-sm text-slate-600 leading-relaxed mt-1">{insight.summary}</p>}
                    </div>
                  )}
                  {insight.observations?.length > 0 ? (
                    <div className="space-y-2">
                      {insight.observations.map((o, i) => <ObservationCard key={i} severity={o.severity} title={o.title} description={o.description} />)}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-slate-400">Aucune observation</div>
                  )}
                </div>
              );
            })()}

            {tab === 'journal' && (
              <div className="space-y-2">
                {plan.map(meal => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    status={status}
                    realQty={realQty}
                    isCollapsed={!!collapsed[meal.id]}
                    onToggleCollapse={toggleCollapse}
                    onToggleItem={toggleItem}
                    onValidateMeal={validateMeal}
                    onSwapProtein={swapProtein}
                    onSwapFood={swapFood}
                    onAddManualFood={addManualFood}
                    onAddManualConsumption={addManualConsumption}
                    onScannerReady={handleScannerReady}
                    favorites={foodFavorites}
                    onSaveFavorite={handleSaveFavorite}
                    onDeleteFavorite={handleDeleteFavorite}
                    onSetRealQty={setRealQtyHandler}
                    accent={ACCENT_THEME_BY_PROFILE[currentProfile]}
                  />
                ))}          {(() => {
  const aiItems = plan.flatMap(m => m.items
    .filter(i => i.aiAdded)
    .map(i => ({ ...i, mealId: m.id, mealName: m.name }))
  );
  if (!aiItems.length) return null;
  return (
    <div className="bg-violet-50 rounded-xl border border-violet-200 p-3 mt-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-violet-600 mb-2">✨ Ajouts hors plan</div>
      <div className="space-y-1">
        {aiItems.map((item) => {
          const key = `${item.mealId}-${item.id}`;
          const s = status[key];
          const origGrams = parseGrams(item.qty);
          const rq = realQty[key];
          return (
            <div key={item.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleItem(item.mealId, item.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleItem(item.mealId, item.id); } }}
                className={`cursor-pointer w-full text-left flex items-center gap-2.5 p-2.5 rounded-lg transition-all ${
                  s === 'done' ? 'bg-violet-100 border border-violet-300' :
                  s === 'skip' ? 'bg-slate-100 border border-slate-200 opacity-60' :
                  'bg-white/80 border border-violet-100 hover:bg-violet-50'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                  s === 'done' ? 'bg-violet-500 text-white' :
                  s === 'skip' ? 'bg-slate-400 text-white' :
                  'border-2 border-violet-300'
                }`}>
                  {s === 'done' && <Check size={11} />}
                  {s === 'skip' && <X size={11} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium flex items-center gap-1.5 flex-wrap ${s === 'skip' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {item.name}
                    {item.qty && <span className="text-slate-500 font-normal">· {item.qty}</span>}
                    <span className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold">{item.manualAdded ? 'Manuel' : 'IA'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {item.cal} kcal · P{item.p} · G{item.g} · L{item.l}
                  </div>
                  <div className="text-[9px] text-violet-400 mt-0.5">{item.mealName}</div>
                </div>
              </div>
              {/* Réel grammage pour aiAdded */}
              {s === 'done' && origGrams !== null && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 border-t border-violet-100 rounded-b-lg"
                  onClick={e => e.stopPropagation()}
                >
                  <span className="text-[11px] text-violet-700 font-semibold">Réel :</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={rq ?? origGrams ?? ''}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v > 0) setRealQtyHandler(item.mealId, item.id, v);
                    }}
                    className="w-16 text-center text-sm font-bold text-violet-800 bg-white border border-violet-300 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  <span className="text-[11px] text-violet-600">g</span>
                  {rq !== undefined && rq !== origGrams && (
                    <span className="text-[10px] text-violet-500 font-medium">
                      ({rq > origGrams ? '+' : ''}{Math.round(rq - origGrams)}g vs plan)
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
})()}
              </div>
    
            )}

            {tab === 'plan' && (
              <div className="space-y-4">
                {insight?.question?.startsWith('Je refuse ta proposition de') && (
                  <div className="bg-violet-100 border-l-4 border-violet-500 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-violet-800 text-sm">
                      <RotateCcw size={14} className="flex-shrink-0" />
                      Nouvelle proposition (alternative)
                    </div>
                    <div className="text-[11px] text-violet-700 mt-1 italic leading-relaxed">L'IA a proposé une alternative à ta demande précédente — voir ci-dessous</div>
                  </div>
                )}
                {insight?.actions?.filter(a => a.applied !== 'duplicate').length > 0 ? (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Propositions de l'IA</div>
                    <div className="space-y-2">
                      {insight.actions.map((a, i) => a.applied === 'duplicate' ? null : (
                        <ActionProposalCard key={i} action={a} idx={i} plan={plan} remaining={remaining} onApply={applyAction} onRefuse={refuseAction} onAlternative={requestAlternative} />
                      ))}
                    </div>
                  </div>
                ) : insight ? (
                  <div className="text-center py-4 text-sm text-slate-400">Aucune proposition d'ajustement</div>
                ) : null}

                {remainingItems.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Reste à manger</div>
                    <div className="space-y-1.5">
                      {remainingItems.map(m => (
                        <div key={m.id} className="bg-slate-50 rounded-lg p-2.5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{m.icon}</span>
                            <span className="text-xs font-bold text-slate-700">{m.name}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">{m.pendingItems.length} item{m.pendingItems.length > 1 ? 's' : ''}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 leading-relaxed">
                            {m.pendingItems.map(i => `${i.name}${i.qty ? ` ${i.qty}` : ''}`).join(' · ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {remainingItems.length === 0 && (!insight?.actions || insight.actions.length === 0) && (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="text-sm text-slate-600 font-medium">Tout est géré pour aujourd'hui</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {insight && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Analysé à {new Date(insight.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {stateChanged && (
                <span className="text-[10px] text-amber-600 font-semibold">⚠ {changesSinceAnalysis} modif. depuis</span>
              )}
              {voiceOutputSupported && (
                <button type="button" onClick={toggleInsightSpeech} className="ml-auto flex min-h-10 items-center gap-1.5 rounded-xl bg-violet-50 px-3 text-xs font-bold text-violet-700 active:bg-violet-100" title="Lire l’analyse à voix haute">
                  {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  {isSpeaking ? 'Arrêter' : 'Écouter'}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <MessageCircle size={11} /> Pose une question à ton coach
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={!canAnalyze}
                className={`min-h-12 min-w-12 rounded-xl border flex items-center justify-center transition-all disabled:opacity-30 ${isListening ? 'border-red-300 bg-red-50 text-red-600 animate-pulse' : 'border-violet-200 bg-violet-50 text-violet-700 active:bg-violet-100'}`}
                aria-label={isListening ? 'Arrêter la dictée' : 'Dicter une question'}
                title={voiceInputSupported ? 'Dicter sans utiliser de token audio OpenAI' : 'Utilise le micro du clavier'}
              >
                {isListening ? <MicOff size={19} /> : <Mic size={19} />}
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder={`Ex : "J'ai sauté le ${currentProfile === 'luca' ? 'goûter 1' : 'meal 1'}"`}
                className="min-w-0 flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                disabled={!canAnalyze}
              />
              <button
                onClick={sendChat}
                disabled={!canAnalyze || !chatInput.trim()}
                className="min-h-12 min-w-12 bg-slate-900 active:bg-slate-800 disabled:opacity-30 text-white px-3 py-2.5 rounded-xl flex items-center justify-center"
              >
                {insightLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            {isListening && <p className="mt-2 text-xs font-semibold text-red-600">● J’écoute… parle naturellement, puis vérifie le texte avant l’envoi.</p>}
            {voiceError && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-700">{voiceError}</p>}
            <p className="mt-2 text-[10px] text-slate-400">La dictée reste côté navigateur : aucun token audio OpenAI.</p>
