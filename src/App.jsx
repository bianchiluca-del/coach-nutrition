import React, { useState, useEffect, useRef } from 'react';
import {
  Check, X, Send, RotateCcw, Loader2, Sparkles, ChevronDown, ChevronUp,
  Plus, Edit3, Trash2, ArrowRight, ArrowUp, ArrowDown, MessageCircle, AlertCircle, Brain,
  Repeat, CheckCircle2
} from 'lucide-react';

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
      { id: 'oeuf', name: 'Oeuf entier', qty: '3', cal: 222, p: 19.5, g: 1.2, l: 15.3 },
      { id: 'jambon-1', name: 'Tranches jambon maigre', qty: '70 g', cal: 70, p: 15.4, g: 0.7, l: 2.1 },
      { id: 'banane-1', name: 'Banane', qty: '120 g', cal: 106.8, p: 1.2, g: 27.6, l: 0 },
      { id: 'compote', name: 'Compote sans sucre ou fruit', qty: '100 g', cal: 57, p: 0.5, g: 12.5, l: 0.3 },
      { id: 'creatine', name: 'Créatine (5 g)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'omega', name: 'Oméga 3 (3 g)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'd3', name: 'Vitamine D3 K2 (1000 UI)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
      { id: 'vitc', name: 'Vitamine C (750 mg)', qty: '', cal: 0, p: 0, g: 0, l: 0, suppl: true },
    ]
  },
  { id: 'gouter-1', name: 'Goûter 1', icon: '🍌', color: 'from-yellow-50 to-amber-50', border: 'border-yellow-200',
    items: [
      { id: 'whey-1', name: 'Isolat de whey', qty: '15 g', cal: 57, p: 13.8, g: 0.2, l: 0.2 },
      { id: 'banane-2', name: 'Banane', qty: '120 g', cal: 106.8, p: 1.2, g: 27.6, l: 0 },
      { id: 'dattes-1', name: 'Dattes ou fruit sec', qty: '40 g', cal: 112.8, p: 1.0, g: 30.0, l: 0.2 },
    ]
  },
  { id: 'midi', name: 'Repas Midi', icon: '🍽️', color: 'from-blue-50 to-indigo-50', border: 'border-blue-200',
    items: [
      { id: 'feculents-1', name: 'Féculents pesés cuits au choix', qty: '150 g', cal: 172.5, p: 3.9, g: 34.5, l: 1.4 },
      { id: 'poulet-1', name: 'Filet de poulet', qty: '150 g', cal: 165, p: 33.3, g: 1.5, l: 3.0, swappable: 'protein', options: PROTEIN_OPTS_LUCA_BIG, optionId: 'poulet' },
      { id: 'legumes-1', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 },
      { id: 'oleagineux', name: 'Oléagineux au choix', qty: '15 g', cal: 86.7, p: 3.3, g: 1.8, l: 7.0 },
    ]
  },
  { id: 'gouter-2', name: 'Goûter Après-midi', icon: '🥣', color: 'from-pink-50 to-rose-50', border: 'border-pink-200',
    items: [
      { id: 'sere', name: 'Séré maigre', qty: '150 g', cal: 100.5, p: 18.0, g: 5.3, l: 0.5 },
      { id: 'avoine', name: 'Avoine', qty: '40 g', cal: 144, p: 6.0, g: 25.6, l: 2.4 },
      { id: 'framboise', name: 'Framboise', qty: '100 g', cal: 55, p: 1.2, g: 12.0, l: 0.7 },
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
      { id: 'jambon-2', name: 'Tranches jambon maigre', qty: '70 g', cal: 70, p: 15.4, g: 0.7, l: 2.1 },
      { id: 'tomates', name: 'Tomates cerise', qty: '200 g', cal: 40, p: 2.0, g: 9.0, l: 0.6 },
    ]
  },
  { id: 'souper', name: 'Souper', icon: '🌙', color: 'from-violet-50 to-purple-50', border: 'border-violet-200',
    items: [
      { id: 'feculents-2', name: 'Féculents pesés cuits au choix', qty: '150 g', cal: 172.5, p: 3.9, g: 34.5, l: 1.4 },
      { id: 'poulet-2', name: 'Filet de poulet', qty: '100 g', cal: 110, p: 22.2, g: 1.0, l: 2.0, swappable: 'protein', options: PROTEIN_OPTS_LUCA_SMALL, optionId: 'poulet' },
      { id: 'legumes-2', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 },
      { id: 'dattes-2', name: 'Dattes ou fruit sec', qty: '20 g', cal: 56.4, p: 0.5, g: 15.0, l: 0.1 },
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
      { id: 'feculents-2', name: 'Féculents pesés cuits au choix', qty: '250 g', cal: 287.5, p: 6.5, g: 57.5, l: 2.3 },
      { id: 'poulet-2', name: 'Filet de poulet', qty: '100 g', cal: 110, p: 22.2, g: 1.0, l: 2.0, swappable: 'protein', options: PROTEIN_OPTS_LUCA_SMALL, optionId: 'poulet' },
      { id: 'legumes-2', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 },
      { id: 'dattes-2', name: 'Dattes ou fruit sec', qty: '20 g', cal: 56.4, p: 0.5, g: 15.0, l: 0.1 },
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
      { id: 'feculents-1', name: 'Féculents pesés cuits au choix', qty: '150 g', cal: 172.5, p: 3.9, g: 34.5, l: 1.4 },
      { id: 'poulet-1', name: 'Filet de poulet', qty: '150 g', cal: 165, p: 33.3, g: 1.5, l: 3.0, swappable: 'protein', options: PROTEIN_OPTS_LUCA_BIG, optionId: 'poulet' },
      { id: 'legumes-1', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 },
      { id: 'oleagineux', name: 'Oléagineux au choix', qty: '10 g', cal: 57.8, p: 2.2, g: 1.2, l: 4.7 },
    ]
  },
  { id: 'gouter-2', name: 'Goûter Après-midi', icon: '🥣', color: 'from-pink-50 to-rose-50', border: 'border-pink-200',
    items: [
      { id: 'sere', name: 'Séré maigre', qty: '150 g', cal: 100.5, p: 18.0, g: 5.3, l: 0.5 },
      { id: 'avoine', name: 'Avoine', qty: '35 g', cal: 126, p: 5.3, g: 22.4, l: 2.1 },
      { id: 'framboise', name: 'Framboise', qty: '100 g', cal: 55, p: 1.2, g: 12.0, l: 0.7 },
      { id: 'choco-1', name: 'Chocolat 70%', qty: '10 g', cal: 57.2, p: 0.9, g: 3.0, l: 4.0 },
    ]
  },
  PLAN_LUCA_STANDARD[4], // Intra-Training identique (Maltodextrine 50g)
  // Pas d'apéro en mode déficit
  { id: 'souper', name: 'Souper', icon: '🌙', color: 'from-violet-50 to-purple-50', border: 'border-violet-200',
    items: [
      { id: 'feculents-2', name: 'Féculents pesés cuits au choix', qty: '150 g', cal: 172.5, p: 3.9, g: 34.5, l: 1.4 },
      { id: 'poulet-2', name: 'Filet de poulet', qty: '100 g', cal: 110, p: 22.2, g: 1.0, l: 2.0, swappable: 'protein', options: PROTEIN_OPTS_LUCA_SMALL, optionId: 'poulet' },
      { id: 'legumes-2', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 },
      { id: 'dattes-2', name: 'Dattes ou fruit sec', qty: '20 g', cal: 56.4, p: 0.5, g: 15.0, l: 0.1 },
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
    { id: 'feculents-e1', name: 'Féculents pesés cuits au choix', qty: '100 g', cal: 115, p: 2.6, g: 23.0, l: 0.9 },
    { id: 'poulet-e1', name: 'Filet de poulet', qty: '150 g', cal: 165, p: 33.3, g: 1.5, l: 3.0, swappable: 'protein', options: PROTEIN_OPTS_EMILIE, optionId: 'poulet' },
    { id: 'legumes-e1', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 },
    { id: 'compote-e1', name: 'Compote sans sucre ou fruit', qty: '150 g', cal: 85.5, p: 0.8, g: 18.8, l: 0.5 },
    { id: 'choco-e1', name: 'Chocolat 70%', qty: '10 g', cal: 57.2, p: 0.9, g: 3.0, l: 4.0 },
  ]
};
const EMILIE_EASY_MEAL_4 = { id: 'meal-4', name: 'Meal 4 — Soir', icon: '🌆', color: 'from-fuchsia-50 to-purple-50', border: 'border-fuchsia-200',
  items: [
    { id: 'feculents-e2', name: 'Féculents pesés cuits au choix', qty: '100 g', cal: 115, p: 2.6, g: 23.0, l: 0.9 },
    { id: 'poulet-e2', name: 'Filet de poulet', qty: '150 g', cal: 165, p: 33.3, g: 1.5, l: 3.0, swappable: 'protein', options: PROTEIN_OPTS_EMILIE, optionId: 'poulet' },
    { id: 'legumes-e2', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 },
    { id: 'huile-e', name: 'Huile d\'olive (1 c. à café)', qty: '1', cal: 43.5, p: 0, g: 0.1, l: 5.0 },
    { id: 'compote-e2', name: 'Compote sans sucre ou fruit', qty: '150 g', cal: 85.5, p: 0.8, g: 18.8, l: 0.5 },
  ]
};

// HARD : MEAL 2 et MEAL 4 (mêmes quantités plus élevées pour training)
const EMILIE_HARD_MEAL_2 = { id: 'meal-2', name: 'Meal 2 — Midi', icon: '🍽️', color: 'from-rose-100 to-pink-50', border: 'border-rose-300',
  items: [
    { id: 'feculents-e1', name: 'Féculents pesés cuits au choix', qty: '230 g', cal: 264.5, p: 6.0, g: 52.9, l: 2.1 },
    { id: 'poulet-e1', name: 'Filet de poulet', qty: '120 g', cal: 132, p: 26.6, g: 1.2, l: 2.4, swappable: 'protein', options: PROTEIN_OPTS_EMILIE, optionId: 'poulet' },
    { id: 'legumes-e1', name: 'Légumes ou crudités', qty: '150 g', cal: 45, p: 1.8, g: 6.8, l: 0.3 },
    { id: 'compote-e1', name: 'Compote sans sucre ou fruit', qty: '150 g', cal: 85.5, p: 0.8, g: 18.8, l: 0.5 },
    { id: 'choco-e1', name: 'Chocolat 70%', qty: '20 g', cal: 114.4, p: 1.8, g: 6.0, l: 8.0 },
  ]
};
const EMILIE_HARD_MEAL_4 = { id: 'meal-4', name: 'Meal 4 — Soir', icon: '🌆', color: 'from-fuchsia-50 to-purple-50', border: 'border-fuchsia-200',
  items: [
    { id: 'feculents-e2', name: 'Féculents pesés cuits au choix', qty: '230 g', cal: 264.5, p: 6.0, g: 52.9, l: 2.1 },
    { id: 'poulet-e2', name: 'Filet de poulet', qty: '120 g', cal: 132, p: 26.6, g: 1.2, l: 2.4, swappable: 'protein', options: PROTEIN_OPTS_EMILIE, optionId: 'poulet' },
    { id: 'legumes-e2', name: 'Légumes ou crudités', qty: '150 g', cal: 45, p: 1.8, g: 6.8, l: 0.3 },
    { id: 'huile-e', name: 'Huile d\'olive (1 c. à café)', qty: '1', cal: 43.5, p: 0, g: 0.1, l: 5.0 },
    { id: 'compote-e2', name: 'Compote sans sucre ou fruit', qty: '150 g', cal: 85.5, p: 0.8, g: 18.8, l: 0.5 },
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
      { id: 'sere-e1', name: 'Séré maigre', qty: '150 g', cal: 100.5, p: 18.0, g: 5.3, l: 0.5 },
      { id: 'granola-e', name: 'Granola', qty: '35 g', cal: 157.5, p: 3.2, g: 21.0, l: 7.0 },
      { id: 'sirop-e', name: 'Sirop d\'érable', qty: '10 g', cal: 26, p: 0, g: 6.7, l: 0 },
      { id: 'cacahuete-e', name: 'Beurre de cacahuète', qty: '10 g', cal: 58, p: 2.5, g: 2.0, l: 5.0 },
      { id: 'framboise-e1', name: 'Framboise', qty: '50 g', cal: 27.5, p: 0.6, g: 6.0, l: 0.4 },
      ...EMILIE_MORNING_SUPPL_END,
    ]
  },
  EMILIE_EASY_MEAL_2,
  { id: 'meal-3', name: 'Meal 3 🥛 (si nuit 2h-3h)', icon: '🌙', color: 'from-indigo-50 to-purple-50', border: 'border-indigo-200',
    items: [
      { id: 'whey-e2', name: 'Iso whey', qty: '20 g', cal: 94.8, p: 18.4, g: 0.2, l: 0.2 },
      { id: 'banane-e2', name: 'Banane', qty: '120 g', cal: 106.8, p: 1.2, g: 27.6, l: 0 },
      { id: 'speculos-e', name: 'Petit beurre ou speculos', qty: '24 g (3)', cal: 110.4, p: 1.9, g: 0, l: 3.4 },
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
      { id: 'oeuf-sale-e', name: 'Oeuf entier', qty: '1', cal: 74, p: 6.5, g: 0.4, l: 5.1 },
      { id: 'jambon-sale-e', name: 'Jambon sans nitrite', qty: '35 g', cal: 42, p: 7.7, g: 0, l: 1.1 },
      { id: 'pain-sale-e', name: 'Pain complet style Harry\'s', qty: '40 g', cal: 101.2, p: 3.1, g: 16.7, l: 1.8 },
      { id: 'cottage-sale-e', name: 'Cottage cheese', qty: '60 g', cal: 57, p: 6.6, g: 2.4, l: 2.4 },
      { id: 'avocat-sale-e', name: '½ Avocat', qty: '90 g', cal: 144, p: 1.8, g: 7.2, l: 12.6 },
      ...EMILIE_MORNING_SUPPL_END,
    ]
  },
  EMILIE_EASY_MEAL_2,
  { id: 'meal-3', name: 'Meal 3 🥄 (si nuit 2h-3h)', icon: '🌙', color: 'from-indigo-50 to-purple-50', border: 'border-indigo-200',
    items: [
      { id: 'sere-nuit-e', name: 'Séré maigre', qty: '150 g', cal: 100.5, p: 18.0, g: 5.3, l: 0.5 },
      { id: 'muesli-nuit-e', name: 'Muesli', qty: '50 g', cal: 237, p: 3.8, g: 30.5, l: 4.0 },
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
      { id: 'sere-e1', name: 'Séré maigre', qty: '100 g', cal: 67, p: 12.0, g: 3.5, l: 0.3 },
      { id: 'granola-e', name: 'Granola', qty: '50 g', cal: 225, p: 4.5, g: 30.0, l: 10.0 },
      { id: 'sirop-e', name: 'Sirop d\'érable', qty: '10 g', cal: 26, p: 0, g: 6.7, l: 0 },
      { id: 'cacahuete-e', name: 'Beurre de cacahuète', qty: '10 g', cal: 58, p: 2.5, g: 2.0, l: 5.0 },
      { id: 'framboise-e1', name: 'Framboise', qty: '50 g', cal: 27.5, p: 0.6, g: 6.0, l: 0.4 },
      ...EMILIE_MORNING_SUPPL_END,
    ]
  },
  EMILIE_HARD_MEAL_2,
  { id: 'meal-3', name: 'Meal 3 🥛 (si nuit 2h-3h)', icon: '🌙', color: 'from-indigo-50 to-purple-50', border: 'border-indigo-200',
    items: [
      { id: 'whey-e2', name: 'Iso whey', qty: '15 g', cal: 71.1, p: 13.8, g: 0.2, l: 0.2 },
      { id: 'banane-e2', name: 'Banane', qty: '120 g', cal: 106.8, p: 1.2, g: 27.6, l: 0 },
      { id: 'speculos-e', name: 'Petit beurre ou speculos', qty: '24 g (3)', cal: 110.4, p: 1.9, g: 0, l: 3.4 },
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
      { id: 'jambon-sale-e', name: 'Jambon sans nitrite', qty: '35 g', cal: 42, p: 7.7, g: 0, l: 1.1 },
      { id: 'pain-sale-e', name: 'Pain complet style Harry\'s', qty: '60 g', cal: 151.8, p: 4.6, g: 25.0, l: 2.7 },
      { id: 'cottage-sale-e', name: 'Cottage cheese', qty: '60 g', cal: 57, p: 6.6, g: 2.4, l: 2.4 },
      { id: 'avocat-sale-e', name: '½ Avocat', qty: '90 g', cal: 144, p: 1.8, g: 7.2, l: 12.6 },
      ...EMILIE_MORNING_SUPPL_END,
    ]
  },
  EMILIE_HARD_MEAL_2,
  { id: 'meal-3', name: 'Meal 3 🥄 (si nuit 2h-3h)', icon: '🌙', color: 'from-indigo-50 to-purple-50', border: 'border-indigo-200',
    items: [
      { id: 'sere-nuit-e', name: 'Séré maigre', qty: '100 g', cal: 67, p: 12.0, g: 3.5, l: 0.3 },
      { id: 'muesli-nuit-e', name: 'Muesli', qty: '50 g', cal: 237, p: 3.8, g: 30.5, l: 4.0 },
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
      { id: 'legumes-cheat-1', name: 'Légumes ou crudités', qty: '250 g', cal: 75, p: 3.0, g: 11.3, l: 0.5 },
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
};

// USERS = chaque combo (profil, mode) est un user virtuel avec son propre plan et état.
// Permet de switcher en 1 clic entre modes (Standard/Hard/Easy/Cheat) tout en gardant
// l'état isolé (consommé, sauté, IA) par mode. Pas de refactoring profond nécessaire.
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

// Default mode quand on bascule entre profils
const DEFAULT_MODE_BY_PROFILE = { luca: 'standard', emilie: 'hard-sucre' };

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

const MealCard = ({ meal, status, isCollapsed, onToggleCollapse, onToggleItem, onValidateMeal, onSwapProtein, accent }) => {
  const [openPickers, setOpenPickers] = useState({});
  const togglePicker = (itemId) => setOpenPickers(p => ({ ...p, [itemId]: !p[itemId] }));

  const mealConsumed = meal.items.reduce((acc, i) => {
    if (status[`${meal.id}-${i.id}`] === 'done') { acc.cal += i.cal; acc.p += i.p; }
    return acc;
  }, { cal: 0, p: 0 });
  const mealTarget = meal.items.reduce((acc, i) => { acc.cal += i.cal; acc.p += i.p; return acc; }, { cal: 0, p: 0 });
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
        <div className="px-1.5 pb-1.5 space-y-1">
          {meal.items.map(item => {
            const key = `${meal.id}-${item.id}`;
            const s = status[key];
            const isSwappable = item.swappable === 'protein' && Array.isArray(item.options);
            const isPickerOpen = !!openPickers[item.id];

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
                      {item.name} {item.qty && <span className="text-slate-500 font-normal">· {item.qty}</span>}
                      {item.aiAdded && <span className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold">IA</span>}
                      {item.aiModified && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">mod.</span>}
                    </div>
                    {!item.suppl && (
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        {item.cal} kcal · P{item.p} · G{item.g} · L{item.l}
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
                      title="Changer la protéine"
                    >
                      <Repeat size={11} strokeWidth={2.5} />
                      {isPickerOpen ? 'Fermer' : 'Changer'}
                    </button>
                  )}
                </div>

                {isSwappable && isPickerOpen && (
                  <div className="bg-white/60 rounded-lg mt-1 mb-1 p-2 border border-slate-200">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-1.5">
                      Choisis ta protéine
                    </div>
                    <div className="space-y-1">
                      {item.options.map(opt => {
                        const isSelected = opt.id === (item.optionId || 'poulet');
                        return (
                          <button
                            key={opt.id}
                            onClick={(e) => { e.stopPropagation(); onSwapProtein(meal.id, item.id, opt.id); }}
                            className={`w-full text-left flex items-center justify-between gap-2 p-2 rounded-lg border-2 transition-all ${
                              isSelected
                                ? `${accent.selectedBg} ${accent.selectedBorder}`
                                : 'bg-white border-transparent hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isSelected && <Check size={13} className={accent.selectedIcon} strokeWidth={3} />}
                              <div className="min-w-0">
                                <span className={`font-bold text-sm ${isSelected ? accent.selectedText : 'text-slate-800'}`}>
                                  {opt.name}
                                </span>
                                <span className="text-xs text-slate-500 ml-1">{opt.qty}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <div className="text-center px-1.5 py-0.5 rounded bg-orange-50 min-w-[36px]">
                                <div className="text-[8px] text-orange-500 font-semibold leading-none">kcal</div>
                                <div className="text-[10px] font-bold text-orange-700 leading-none mt-0.5">{Math.round(opt.cal)}</div>
                              </div>
                              <div className="text-center px-1.5 py-0.5 rounded bg-emerald-50 min-w-[36px]">
                                <div className="text-[8px] text-emerald-500 font-semibold leading-none">prot</div>
                                <div className="text-[10px] font-bold text-emerald-700 leading-none mt-0.5">{opt.p}g</div>
                              </div>
                              <div className="text-center px-1.5 py-0.5 rounded bg-blue-50 min-w-[28px] hidden sm:block">
                                <div className="text-[8px] text-blue-500 font-semibold leading-none">gluc</div>
                                <div className="text-[10px] font-bold text-blue-700 leading-none mt-0.5">{opt.g}g</div>
                              </div>
                              <div className="text-center px-1.5 py-0.5 rounded bg-pink-50 min-w-[28px] hidden sm:block">
                                <div className="text-[8px] text-pink-500 font-semibold leading-none">lip</div>
                                <div className="text-[10px] font-bold text-pink-700 leading-none mt-0.5">{opt.l}g</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Switcher de PROFIL (Luca / Émilie). Ne change que le profil ; le mode est conservé
// via lastModeByProfile pour reprendre où on en était.
const UserSwitcher = ({ currentProfile, onSelect }) => (
  <div className="flex gap-2 mb-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5">
    {PROFILES.map(profileId => {
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

// ===== APP =====

export default function App() {
  const [currentUserId, setCurrentUserId] = useState('luca-standard');
  // Map du dernier mode utilisé par profil pour préserver la sélection au switch profil
  const [lastModeByProfile, setLastModeByProfile] = useState(DEFAULT_MODE_BY_PROFILE);
  const [usersData, setUsersData] = useState(() => {
    const out = {};
    for (const uid of Object.keys(USERS)) {
      out[uid] = { plan: deepClone(USERS[uid].plan), status: {}, insight: null, collapsed: {}, changesSinceAnalysis: 0 };
    }
    return out;
  });
  const [storageReady, setStorageReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [tab, setTab] = useState('bilan');
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);

  // Hash ref par user virtuel
  const lastAnalyzedHashRef = useRef(Object.fromEntries(Object.keys(USERS).map(uid => [uid, null])));

  const user = USERS[currentUserId];
  const currentProfile = user.profileId;
  const currentMode = user.modeId;
  const userData = usersData[currentUserId];
  const plan = userData.plan;
  const status = userData.status;
  const insight = userData.insight;
  const collapsed = userData.collapsed;
  const changesSinceAnalysis = userData.changesSinceAnalysis;

  const updateUserData = (userId, updates) => {
    setUsersData(prev => ({
      ...prev,
      [userId]: { ...prev[userId], ...(typeof updates === 'function' ? updates(prev[userId]) : updates) }
    }));
  };

  // Tick + reset minuit
  useEffect(() => {
    const tick = async () => {
      const now = new Date();
      setCurrentTime(now);
      try {
        const dateRes = await window.storage.get('current-date');
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
        const dateRes = await window.storage.get('current-date');
        if (dateRes?.value !== today()) {
          await window.storage.set('current-date', today());
          for (const uid of Object.keys(USERS)) {
            await window.storage.set(`plan-${uid}`, JSON.stringify(USERS[uid].plan));
            await window.storage.set(`status-${uid}`, JSON.stringify({}));
            await window.storage.set(`insight-${uid}`, JSON.stringify(null));
          }
        } else {
          const loaded = {};
          for (const uid of Object.keys(USERS)) {
            let p = deepClone(USERS[uid].plan);
            let s = {};
            let i = null;
            try { const r = await window.storage.get(`plan-${uid}`); if (r?.value) p = JSON.parse(r.value); } catch {}
            try { const r = await window.storage.get(`status-${uid}`); if (r?.value) s = JSON.parse(r.value); } catch {}
            try { const r = await window.storage.get(`insight-${uid}`); if (r?.value && r.value !== 'null') i = JSON.parse(r.value); } catch {}
            loaded[uid] = { plan: p, status: s, insight: i, collapsed: {}, changesSinceAnalysis: 0 };
          }
          setUsersData(loaded);
        }
        try { const cu = await window.storage.get('current-user'); if (cu?.value && USERS[cu.value]) setCurrentUserId(cu.value); } catch {}
        try {
          const lm = await window.storage.get('last-mode-by-profile');
          if (lm?.value) {
            const parsed = JSON.parse(lm.value);
            // Valider que les modes existent toujours
            const validated = { ...DEFAULT_MODE_BY_PROFILE };
            for (const p of PROFILES) {
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
  }, []);

  // Persist
  useEffect(() => { if (storageReady) window.storage.set('current-user', currentUserId).catch(() => {}); }, [currentUserId, storageReady]);
  useEffect(() => { if (storageReady) window.storage.set('last-mode-by-profile', JSON.stringify(lastModeByProfile)).catch(() => {}); }, [lastModeByProfile, storageReady]);
  useEffect(() => {
    if (!storageReady) return;
    for (const uid of Object.keys(usersData)) {
      window.storage.set(`plan-${uid}`, JSON.stringify(usersData[uid].plan)).catch(() => {});
      window.storage.set(`status-${uid}`, JSON.stringify(usersData[uid].status)).catch(() => {});
      if (usersData[uid].insight) {
        window.storage.set(`insight-${uid}`, JSON.stringify(usersData[uid].insight)).catch(() => {});
      }
    }
  }, [usersData, storageReady]);

  // Macros
  // ⚠️ La CIBLE = somme du plan de base UNIQUEMENT (sans les items aiAdded hors plan).
  // Un croissant ajouté par l'IA hors plan ne doit PAS augmenter la cible journalière.
  const target = USERS[currentUserId].plan.reduce((acc, m) => {
    if (m.conditional) return acc; // les repas conditionnels ne comptent pas dans la cible par défaut
    m.items.forEach(i => {
      if (i.aiAdded) return; // exclut les items ajoutés par l'IA hors plan
      acc.cal += i.cal; acc.p += i.p; acc.g += i.g; acc.l += i.l;
    });
    return acc;
  }, { cal: 0, p: 0, g: 0, l: 0 });

  // Le CONSOMMÉ inclut TOUT ce qui est marqué done, y compris les items aiAdded.
  const consumed = plan.reduce((acc, m) => {
    m.items.forEach(i => {
      if (status[`${m.id}-${i.id}`] === 'done') {
        acc.cal += i.cal; acc.p += i.p; acc.g += i.g; acc.l += i.l;
      }
    });
    return acc;
  }, { cal: 0, p: 0, g: 0, l: 0 });

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
    if (!silent && !confirm('Réinitialiser la journée pour Luca ET Émilie (tous les modes) ?')) return;
    const fresh = {};
    const freshHash = {};
    for (const uid of Object.keys(USERS)) {
      fresh[uid] = { plan: deepClone(USERS[uid].plan), status: {}, insight: null, collapsed: {}, changesSinceAnalysis: 0 };
      freshHash[uid] = null;
    }
    setUsersData(fresh);
    lastAnalyzedHashRef.current = freshHash;
    setInsightError(null);
    try {
      await window.storage.set('current-date', today());
      for (const uid of Object.keys(USERS)) {
        await window.storage.set(`plan-${uid}`, JSON.stringify(USERS[uid].plan));
        await window.storage.set(`status-${uid}`, JSON.stringify({}));
        await window.storage.set(`insight-${uid}`, JSON.stringify(null));
      }
    } catch {}
  }

  const resetCurrentUser = async () => {
    if (!confirm(`Réinitialiser la journée de ${user.name} en mode ${user.modeLabel} ?`)) return;
    updateUserData(currentUserId, {
      plan: deepClone(USERS[currentUserId].plan),
      status: {}, insight: null, collapsed: {}, changesSinceAnalysis: 0
    });
    lastAnalyzedHashRef.current[currentUserId] = null;
    setInsightError(null);
    try {
      await window.storage.set(`plan-${currentUserId}`, JSON.stringify(USERS[currentUserId].plan));
      await window.storage.set(`status-${currentUserId}`, JSON.stringify({}));
      await window.storage.set(`insight-${currentUserId}`, JSON.stringify(null));
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
      const planSummary = plan.map(meal => {
        const items = meal.items.map(i => {
          const key = `${meal.id}-${i.id}`;
          const s = status[key] || 'pending';
          const macros = i.suppl ? '(suppl)' : `${i.cal}kcal/P${i.p}/G${i.g}/L${i.l}`;
          return `    - id="${i.id}" | ${i.name} ${i.qty} | ${macros} | ${s === 'done' ? 'MANGÉ' : s === 'skip' ? 'SAUTÉ' : 'à venir'}`;
        }).join('\n');
        return `  ${meal.name}${meal.conditional ? ' [CONDITIONNEL]' : ''} (meal_id="${meal.id}"):\n${items}`;
      }).join('\n\n');

      const systemPrompt = `Tu es le coach nutrition de ${user.profile} Direct, concret, tutoyer.

HEURE: ${currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}

PLAN ACTUEL:
${planSummary}

MACROS:
- Cible: ${target.cal.toFixed(0)} kcal / ${target.p.toFixed(0)}g P / ${target.g.toFixed(0)}g G / ${target.l.toFixed(0)}g L
- Consommé: ${consumed.cal.toFixed(0)} kcal / ${consumed.p.toFixed(0)}g P / ${consumed.g.toFixed(0)}g G / ${consumed.l.toFixed(0)}g L
- Restant: ${remaining.cal.toFixed(0)} kcal / ${remaining.p.toFixed(0)}g P / ${remaining.g.toFixed(0)}g G / ${remaining.l.toFixed(0)}g L
${userQuestion ? `\n⚠️ MESSAGE À TRAITER EN PRIORITÉ:\n"${userQuestion}"\n\nInterprète intelligemment:\n- Si un aliment du plan a été SAUTÉ → mark_skipped + actions pour compenser\n- Si MANGÉ hors plan → add_item dans le repas concerné\n- Si quantité différente → modify_item\n- Identifie les items par leur item_id réel (cf. plan)\n` : ''}
INSTRUCTION: Appelle DIRECTEMENT l'outil submit_nutrition_analysis. Pas de texte avant.

🔥 RÈGLE AUTO-APPLY (CRITIQUE):
L'utilisateur veut que ses bulles de macros se mettent à jour SANS devoir cliquer "Appliquer". Tu dois donc poser auto_apply: true sur les actions qui correspondent à une DÉCLARATION de fait passé/présent par l'utilisateur, et auto_apply: false sur les SUGGESTIONS futures.

⛔ ANTI-DOUBLE-COMPTAGE (ABSOLUE PRIORITÉ):
Une DÉCLARATION = UNE SEULE ACTION sur cet aliment. JAMAIS deux.
- Si l'utilisateur déclare avoir mangé un aliment HORS PLAN → UNE SEULE action: add_item (qui marque déjà consommé automatiquement). NE FAIS PAS mark_consumed en plus.
- Si l'utilisateur déclare avoir mangé un item PRÉVU dans le plan → UNE SEULE action: mark_consumed. NE FAIS PAS add_item en plus.
- Si l'utilisateur déclare avoir mangé une quantité DIFFÉRENTE d'un item du plan → UNE SEULE action: modify_item. NE FAIS PAS add_item ni mark_consumed en plus.
Exemple INTERDIT (= double-comptage = bulles fausses):
❌ User: "J'ai mangé 40g de chocolat 70%" → add_item chocolat 70% 40g + mark_consumed choco-e1 du plan
✅ User: "J'ai mangé 40g de chocolat 70%" → SOIT add_item 40g hors plan, SOIT modify_item de choco-e1 pour passer à 40g. UN SEUL choix.

→ auto_apply: TRUE quand l'utilisateur DIT/DÉCLARE:
  • "j'ai mangé X" / "j'ai pris X" / "j'ai consommé X" / "j'ai bouffé X" → add_item (sera ajouté ET marqué consommé automatiquement)
  • "j'ai sauté Y" / "j'ai pas mangé Y" / "Y est sauté" → mark_skipped
  • "j'ai mangé seulement Z g de Y au lieu de W g" → modify_item
  • "je termine X" / "j'ai fini X" → mark_consumed
  • Tout fait au PASSÉ ou PRÉSENT immédiat sur ce que l'utilisateur A FAIT

→ auto_apply: FALSE pour les SUGGESTIONS futures:
  • "tu devrais ajouter X au souper" → add_item auto_apply:false (l'utilisateur décide)
  • "compense avec Y plus tard" → add_item auto_apply:false
  • Tout ce qui est CONSEIL, RECOMMANDATION, propositionnel pour la suite

⚠️ COHÉRENCE OBLIGATOIRE DES CHIFFRES (CRITIQUE):
Les bulles macros affichées à l'utilisateur seront mises à jour AUTOMATIQUEMENT après tes auto-applies. Si tu cites des chiffres "restants" dans summary/observations, ils DOIVENT être cohérents avec ces bulles, sinon l'utilisateur voit des chiffres contradictoires.

⚠️ LOGIQUE CIBLE vs CONSOMMÉ (IMPORTANT):
- La CIBLE journalière (kcal/P/G/L) est FIXE et basée UNIQUEMENT sur le plan de base. Elle ne change JAMAIS quand tu fais add_item.
- Quand tu fais add_item (croissant, pizza, etc.), tu AUGMENTES le CONSOMMÉ mais PAS la cible.
- Donc "restant" = cible_fixe - consommé. Si ça devient négatif, l'utilisateur est EN DÉPASSEMENT (affiché en rouge "en trop").
- Concrètement: si l'utilisateur mange une pizza ananas (~700 kcal) en plus du plan, le "restant kcal" diminue de 700, peut devenir négatif. NE PRÉTEND PAS que la cible a changé.

PROCÉDURE OBLIGATOIRE avant d'écrire summary/observations:
1. Calcule mentalement la somme des IMPACTS de TOUTES tes actions auto_apply:true → totalDelta = { cal, p, g, l }
2. Les "restants après tes actions" = restant_actuel - totalDelta (la cible NE bouge PAS)
3. ⚠️ Dans summary et observations, si tu CITES un total restant kcal/P/G/L, utilise EXCLUSIVEMENT ces valeurs post-auto-apply, JAMAIS celles d'avant.
4. Si le restant devient négatif → mentionne explicitement le DÉPASSEMENT (ex: "tu es 200 kcal au-dessus de ta cible")

Exemple: si "Restant: 1325 kcal / 80g P" et tu fais un auto_apply add_item de +700 kcal / +20g P (pizza):
✅ "Il te reste 625 kcal / 60g P sur la journée — la pizza pèse lourd sur le budget"
❌ "Il te reste 1325 kcal" ← faux, ignore tes actions
❌ "La cible passe à 2400 kcal" ← FAUX, la cible ne bouge JAMAIS

Encore mieux: reste qualitatif quand possible ("trajectoire bonne", "souper clé") plutôt que de citer des totaux précis.

Tu peux MÉLANGER les deux dans une même réponse : auto-apply ce que l'utilisateur a déclaré + proposer des compensations en attente.

OBSERVATIONS (3-6, du plus critique au moins critique):
- "alert" (rouge): écart important sur protéines/calories
- "warning" (orange): écart modéré, point à surveiller
- "positive" (vert): macro en bonne voie
- "info" (bleu): timing, hydratation, conseil
- title court, description avec chiffres concrets

ACTIONS (1-4):
- add_item: nouvel aliment (item.name/qty/cal/p/g/l) + auto_apply
- modify_item: changer qty/macros (item_id + new_*) + auto_apply
- remove_item: retirer (item_id) + auto_apply
- mark_consumed / mark_skipped: marquer statut + auto_apply
- impact: delta { cal, p, g, l } OBLIGATOIRE pour add/modify/remove
- ESTIMATION MACROS: tu DOIS estimer précisément les macros pour TOUT aliment mentionné, même hors de tes références ci-dessous. Utilise ta connaissance large.

⚠️ SOIS PROACTIF SUR LES ADAPTATIONS (auto_apply: false):
Après avoir auto-apply les déclarations, propose 1 à 3 ADAPTATIONS en attente (auto_apply: false) pour les repas à venir, quand pertinent:
- En cas de dépassement (kcal/macros) → propose de réduire qty d'un futur item (modify_item)
- En cas de déficit protéines → propose d'ajouter ou augmenter une source protéique sur un repas à venir
- En cas d'écart significatif sur G ou L → propose un ajustement
- L'utilisateur pourra cliquer Appliquer ✓, Autre 🔁 ou Refuser ✗ sur chaque proposition.

NE PROPOSE PAS d'adaptation si le plan est parfaitement aligné ou si toutes les actions à faire sont déjà des auto-apply.

REPAS CONDITIONNELS (marqués [CONDITIONNEL]): ne sont PAS comptés dans la cible et NE doivent PAS être proposés sauf si l'utilisateur mentionne explicitement un entraînement. Ne suggère JAMAIS au user de "consommer la maltodextrine" comme s'il s'agissait d'un manque.

RÉFÉRENTIEL MACROS (kcal/P/G/L par 100g sauf indication):
Protéines:
- Blanc d'oeuf: 52/11/0.7/0.2 · Oeuf entier: 74/6.5/0.4/5 (1 oeuf ≈ 60g)
- Séré 0%: 67/12/3.5/0.3 · Skyr: 63/11/4/0.2 · Yogourt grec 0%: 59/10/3.6/0.4
- Whey (30g): 114/24/0.5/0.5
- Sardines: 208/25/0/12 · Thon nature: 108/26/0/1 · Saumon: 206/22/0/13
- Poulet: 110/22/0/2 · Boeuf maigre: 158/26/0/6 · Crevettes: 99/24/0/1 · Tofu: 76/8/2/4.8
Glucides:
- Riz cuit: 130/2.7/28/0.3 · Pâtes cuites: 158/5.8/31/0.9 · Pain blanc: 265/9/49/3.2 · Pain complet: 247/13/41/3.4
- Avoine sèche: 389/17/66/7 · Banane: 89/1.1/23/0.3 (1 ≈ 120g) · Pomme: 52/0.3/14/0.2 (1 ≈ 180g)
- Patate douce cuite: 90/2/20/0.1 · Pomme de terre cuite: 87/2/20/0.1
Gras & mixtes:
- Avocat: 160/2/9/15 (1/2 ≈ 100g) · Amandes: 579/21/22/50 · Huile olive: 884/0/0/100
- Croissant: 406/8/45/21 (1 ≈ 70g) · Pain au chocolat: 414/8/49/22 (1 ≈ 90g)
- Pizza margherita: 266/11/33/10 · Burger fast-food: 295/17/30/12
- Fromage Gruyère: 413/27/0.4/32 · Comté: 410/28/0.5/33
- Chocolat noir 70%: 598/8/46/43 · Cookie: 488/5/65/24 (1 ≈ 30g)
Boissons:
- Bière 5%: 43/0.5/3.5/0 (33cl ≈ 142kcal) · Vin rouge: 85/0/2.6/0 (15cl ≈ 128kcal)
- Coca: 42/0/10.6/0 (33cl ≈ 139kcal) · Jus orange: 45/0.7/10/0.2

PRIORITÉ: atteindre protéines totales > calories > glucides timing training`;

      const userMsg = userQuestion ||
        "Analyse et propose les ajustements nécessaires pour atteindre les cibles.";

      const response = await fetch(import.meta.env.VITE_API_ENDPOINT || "https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: systemPrompt,
          tools: [{
            name: "submit_nutrition_analysis",
            description: "Soumet l'analyse nutritionnelle structurée",
            input_schema: {
              type: "object",
              properties: {
                headline: { type: "string", description: "Phrase synthèse courte (max 10 mots)" },
                summary: { type: "string", description: "1-2 phrases sur la trajectoire" },
                observations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      severity: { type: "string", enum: ["alert", "warning", "positive", "info"] },
                      title: { type: "string" },
                      description: { type: "string" }
                    },
                    required: ["severity", "title", "description"]
                  }
                },
                actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["add_item", "modify_item", "remove_item", "mark_consumed", "mark_skipped"] },
                      meal_id: { type: "string" },
                      item_id: { type: "string" },
                      item: { type: "object", properties: { name: {type:"string"}, qty: {type:"string"}, cal: {type:"number"}, p: {type:"number"}, g: {type:"number"}, l: {type:"number"} } },
                      new_qty: { type: "string" }, new_cal: { type: "number" }, new_p: { type: "number" }, new_g: { type: "number" }, new_l: { type: "number" },
                      impact: { type: "object", properties: { cal: {type:"number"}, p: {type:"number"}, g: {type:"number"}, l: {type:"number"} } },
                      auto_apply: { type: "boolean", description: "TRUE = déclaration utilisateur (passé/présent), à appliquer immédiatement. FALSE = suggestion future, en attente de validation manuelle." },
                      reason: { type: "string" }
                    },
                    required: ["type", "meal_id", "reason", "auto_apply"]
                  }
                }
              },
              required: ["headline", "summary", "observations", "actions"]
            }
          }],
          tool_choice: { type: "tool", name: "submit_nutrition_analysis" },
          messages: [{ role: 'user', content: userMsg }]
        })
      });

      if (response.status === 429) {
        setRateLimitedUntil(Date.now() + 60000);
        setInsightError(`⏳ Limite Claude.ai atteinte. Réessaie dans 1 minute.`);
        return;
      }
      if (!response.ok) {
        let errDetail = '';
        try { const errBody = await response.text(); errDetail = errBody.slice(0, 200); } catch {}
        throw new Error(`API ${response.status}${errDetail ? ' — ' + errDetail : ''}`);
      }

      const data = await response.json();
      const toolUse = data.content?.find(b => b.type === 'tool_use');
      let parsed = toolUse?.input || null;

      if (!parsed) {
        const allText = data.content?.filter(b => b.type === 'text').map(b => b.text).join('\n') || '';
        if (allText) parsed = extractJSON(allText);
      }

      if (!parsed) {
        const types = data.content?.map(b => b.type).join(', ') || 'aucun';
        const fallbackText = data.content?.find(b => b.type === 'text')?.text || '';
        setInsightError(`Réponse non exploitable (${types}). "${fallbackText.slice(0, 120)}..."`);
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

  // Switch de MODE dans le profil actif : on bascule sur (profil, mode) et on mémorise
  // ce mode comme "dernier utilisé" pour ce profil.
  const handleModeSwitch = (modeId) => {
    if (modeId === currentMode) return;
    setCurrentUserId(`${currentProfile}-${modeId}`);
    setLastModeByProfile(prev => ({ ...prev, [currentProfile]: modeId }));
    setInsightError(null);
    setTab('bilan');
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
      <div className="max-w-3xl mx-auto pb-8 safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-violet-500" size={18} />
              Coach Nutrition
            </h1>
            <p className="text-[11px] text-slate-500">{currentTime.toLocaleDateString('fr-FR', { weekday: 'long' })} {dateLabel} · {timeLabel}</p>
          </div>
          <button onClick={resetCurrentUser} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100" title={`Réinitialiser ${user.name} · ${user.modeLabel}`}>
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Profile + Mode Switchers */}
        <UserSwitcher currentProfile={currentProfile} onSelect={handleProfileSwitch} />
        <ModeSwitcher currentProfile={currentProfile} currentMode={currentMode} onSelect={handleModeSwitch} />

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
                    isCollapsed={!!collapsed[meal.id]}
                    onToggleCollapse={toggleCollapse}
                    onToggleItem={toggleItem}
                    onValidateMeal={validateMeal}
                    onSwapProtein={swapProtein}
                    accent={ACCENT_THEME_BY_PROFILE[currentProfile]}
                  />
                ))}          {(() => {
  const extras = plan.flatMap(m => m.items.filter(i => i.aiAdded && status[`${m.id}-${i.id}`] === 'done').map(i => ({...i, mealName: m.name})));
  if (!extras.length) return null;
  return (
    <div className="bg-violet-50 rounded-xl border border-violet-200 p-3 mt-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-violet-600 mb-2">✨ Extras mangés hors plan</div>
      <div className="space-y-1">
        {extras.map((item, i) => (
          <div key={i} className="bg-white/80 rounded-lg p-2.5 flex items-center gap-2">
            <div className="w-2 h-2 bg-violet-400 rounded-full flex-shrink-0"/>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">{item.name}{item.qty && <span className="text-slate-500 font-normal"> · {item.qty}</span>}</div>
              <div className="text-[10px] text-slate-500 font-mono">{item.cal} kcal · P{item.p} · G{item.g} · L{item.l}</div>
              <div className="text-[9px] text-violet-500">{item.mealName}</div>
            </div>
            <span className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold">IA</span>
          </div>
        ))}
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
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <MessageCircle size={11} /> Pose une question à ton coach
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder={`Ex : "J'ai sauté le ${currentProfile === 'luca' ? 'goûter 1' : 'meal 1'}"`}
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                disabled={!canAnalyze}
              />
              <button
                onClick={sendChat}
                disabled={!canAnalyze || !chatInput.trim()}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white px-4 py-2.5 rounded-xl flex items-center justify-center"
              >
                {insightLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400 py-4">
          Reset auto à minuit · Cible {user.name} : {target.cal.toFixed(0)} kcal · {target.p.toFixed(0)}g P · {target.g.toFixed(0)}g G · {target.l.toFixed(0)}g L
        </div>
      </div>
    </div>
  );
}
