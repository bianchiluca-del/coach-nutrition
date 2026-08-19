const clone = value => JSON.parse(JSON.stringify(value));

const parseGrams = qty => {
  const match = String(qty || '').match(/^(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

const normalize = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const logicalId = value => String(value || '').replace(/-(training|rest)$/i, '');

export function transferModeConsumption({ sourcePlan, sourceStatus, sourceRealQty, destinationPlan, consumed, currentMode }) {
  const nextPlan = clone(destinationPlan);
  const nextStatus = {};
  const nextRealQty = {};
  const usedDestinationItems = new Set();
  const matched = { cal: 0, p: 0, g: 0, l: 0 };

  const consumedItems = sourcePlan.flatMap(sourceMeal => sourceMeal.items
    .filter(sourceItem => sourceStatus[`${sourceMeal.id}-${sourceItem.id}`] === 'done' && !sourceItem.suppl)
    .map(sourceItem => ({ sourceMeal, sourceItem })));

  consumedItems.forEach(({ sourceMeal, sourceItem }) => {
    const foodName = normalize(sourceItem.name);
    const mealName = normalize(sourceMeal.name);
    const candidates = [];
    nextPlan.forEach(destinationMeal => destinationMeal.items.forEach(destinationItem => {
      const destinationKey = `${destinationMeal.id}-${destinationItem.id}`;
      if (destinationItem.suppl || usedDestinationItems.has(destinationKey)) return;
      if (normalize(destinationItem.name) !== foodName) return;
      candidates.push({
        destinationMeal,
        destinationItem,
        destinationKey,
        sameMeal: normalize(destinationMeal.name) === mealName,
      });
    }));

    let itemMatch = candidates.find(candidate => candidate.sameMeal) || candidates[0];
    if (!itemMatch && !sourceItem.aiAdded && !sourceItem.manualAdded) {
      const destinationMeal = nextPlan.find(meal => logicalId(meal.id) === logicalId(sourceMeal.id))
        || nextPlan.find(meal => normalize(meal.name) === mealName);
      const destinationItem = destinationMeal?.items.find(item => logicalId(item.id) === logicalId(sourceItem.id) && !item.suppl);
      if (destinationMeal && destinationItem) {
        const destinationKey = `${destinationMeal.id}-${destinationItem.id}`;
        if (!usedDestinationItems.has(destinationKey)) {
          Object.assign(destinationItem, clone(sourceItem), { id: destinationItem.id });
          itemMatch = { destinationMeal, destinationItem, destinationKey };
        }
      }
    }

    if (!itemMatch) {
      const destinationMeal = nextPlan.find(meal => meal.id === sourceMeal.id)
        || nextPlan.find(meal => normalize(meal.name) === mealName);
      if (destinationMeal) {
        const destinationItem = {
          ...clone(sourceItem),
          id: `carryover-${sourceMeal.id}-${sourceItem.id}`,
          aiAdded: true,
          carriedFromMode: currentMode,
        };
        destinationMeal.items.push(destinationItem);
        itemMatch = {
          destinationMeal,
          destinationItem,
          destinationKey: `${destinationMeal.id}-${destinationItem.id}`,
        };
      }
    }
    if (!itemMatch) return;

    usedDestinationItems.add(itemMatch.destinationKey);
    nextStatus[itemMatch.destinationKey] = 'done';
    const sourcePlannedGrams = parseGrams(sourceItem.qty);
    const sourceRealGrams = sourceRealQty[`${sourceMeal.id}-${sourceItem.id}`];
    const consumedGrams = sourceRealGrams !== undefined ? Number(sourceRealGrams) : sourcePlannedGrams;
    const destinationPlannedGrams = parseGrams(itemMatch.destinationItem.qty);
    let destinationRatio = 1;
    if (Number.isFinite(consumedGrams) && consumedGrams > 0 && destinationPlannedGrams > 0) {
      nextRealQty[itemMatch.destinationKey] = consumedGrams;
      destinationRatio = consumedGrams / destinationPlannedGrams;
    }
    matched.cal += itemMatch.destinationItem.cal * destinationRatio;
    matched.p += itemMatch.destinationItem.p * destinationRatio;
    matched.g += itemMatch.destinationItem.g * destinationRatio;
    matched.l += itemMatch.destinationItem.l * destinationRatio;
  });

  sourcePlan.forEach(sourceMeal => sourceMeal.items.forEach(sourceItem => {
    const sourceKey = `${sourceMeal.id}-${sourceItem.id}`;
    if (sourceStatus[sourceKey] !== 'skip') return;
    const destinationMeal = nextPlan.find(meal => logicalId(meal.id) === logicalId(sourceMeal.id))
      || nextPlan.find(meal => normalize(meal.name) === normalize(sourceMeal.name));
    const destinationItem = destinationMeal?.items.find(item => logicalId(item.id) === logicalId(sourceItem.id))
      || destinationMeal?.items.find(item => normalize(item.name) === normalize(sourceItem.name));
    if (!destinationMeal || !destinationItem) return;
    const destinationKey = `${destinationMeal.id}-${destinationItem.id}`;
    if (!nextStatus[destinationKey]) nextStatus[destinationKey] = 'skip';
  }));

  nextRealQty.__modeCarryover = {
    cal: consumed.cal - matched.cal,
    p: consumed.p - matched.p,
    g: consumed.g - matched.g,
    l: consumed.l - matched.l,
    totalCal: consumed.cal,
    totalP: consumed.p,
    totalG: consumed.g,
    totalL: consumed.l,
    matchedItems: usedDestinationItems.size,
    migrationVersion: 2,
    fromModeId: currentMode,
    switchedAt: new Date().toISOString(),
  };

  return { plan: nextPlan, status: nextStatus, realQty: nextRealQty };
}
