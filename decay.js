// ==========================================
// LEARNIFY DECAY & AUTO-FEED ENGINE
// ==========================================

export const DECAY_CONFIG = {
    CAR_MAX: 100,
    TRAIN_MAX: 100,
    CAR_COST_PER_10L: 150,     // 15 coins per Liter
    TRAIN_COST_PER_10KW: 100,  // 10 coins per kW
    CAR_MINUTES_PER_LITER: 48,
    TRAIN_MINUTES_PER_KW: 48,
    MIN_FILL_THRESHOLD: 10,
    AUTO_FILL_CEILING: 90,     // Cannot autofill if already above 90 (e.g. 91)
    CRITICAL_THRESHOLD: 10     // Emergency threshold for auto-loan rescue
};

/**
 * Calculates current real-time fuel/electricity accounting for offline elapsed time.
 */
export function calculateCurrentLevel(storedLevel, lastUpdate, minutesPerUnit) {
    if (storedLevel === undefined || storedLevel === null) return 0;
    const now = Date.now();
    const lastTime = lastUpdate || now;
    const elapsedMs = Math.max(0, now - lastTime);
    const msPerUnit = minutesPerUnit * 60 * 1000;
    const unitsLost = elapsedMs / msPerUnit;
    return Math.max(0, storedLevel - unitsLost);
}

/**
 * Core decay cycle processor.
 * Evaluates car and train status against decay wallet balance and thresholds.
 */
export function evaluateDecayCycle(userData) {
    if (!userData) return null;

    const decay = userData.decay || {};
    const isEnabled = decay.enabled ?? false;

    let decayWallet = Number(decay.wallet ?? userData.decayWallet ?? 0);
    const now = Date.now();

    const result = {
        enabled: isEnabled,
        decayWallet: decayWallet,
        updates: {},
        logsAdded: [],
        emergencyLoans: [],
        carInfo: null,
        trainInfo: null,
        hasChanges: false
    };

    // Calculate live Car level
    if (userData.car) {
        const liveFuel = calculateCurrentLevel(
            userData.car.fuel ?? 0,
            userData.car.lastUpdate,
            DECAY_CONFIG.CAR_MINUTES_PER_LITER
        );
        result.carInfo = {
            fuel: liveFuel,
            damaged: !!userData.car.damaged,
            eligibleForAutofeed: isEnabled && !userData.car.damaged && liveFuel <= DECAY_CONFIG.AUTO_FILL_CEILING,
            isCritical: isEnabled && !userData.car.damaged && liveFuel < DECAY_CONFIG.CRITICAL_THRESHOLD && liveFuel > 0
        };
    }

    // Calculate live Train level
    if (userData.tree) {
        const livePower = calculateCurrentLevel(
            userData.tree.water ?? 0,
            userData.tree.lastUpdate,
            DECAY_CONFIG.TRAIN_MINUTES_PER_KW
        );
        result.trainInfo = {
            power: livePower,
            dead: !!userData.tree.dead,
            eligibleForAutofeed: isEnabled && !userData.tree.dead && livePower <= DECAY_CONFIG.AUTO_FILL_CEILING,
            isCritical: isEnabled && !userData.tree.dead && livePower < DECAY_CONFIG.CRITICAL_THRESHOLD && livePower > 0
        };
    }

    // If decay is not enabled, return the live status without mutations
    if (!isEnabled) {
        return result;
    }

    let carFuel = result.carInfo ? result.carInfo.fuel : 0;
    let carChanged = false;

    // --- CAR EVALUATION ---
    if (result.carInfo && !result.carInfo.damaged) {
        if (carFuel < DECAY_CONFIG.CRITICAL_THRESHOLD && carFuel > 0) {
            // CRITICAL: About to die! Autofill until 90+
            const neededLiters = Math.min(DECAY_CONFIG.CAR_MAX - carFuel, 90);
            const cost = Math.round(neededLiters * 15);

            if (decayWallet >= cost) {
                decayWallet -= cost;
                carFuel = Math.min(DECAY_CONFIG.CAR_MAX, carFuel + neededLiters);
                carChanged = true;
                result.logsAdded.push({
                    time: now,
                    type: 'car-rescue-wallet',
                    text: `🛡️ Car rescued (<10L) with Decay Wallet! Filled ${neededLiters.toFixed(1)}L (${cost} coins). Current: ${carFuel.toFixed(1)}L`
                });
            } else {
                // Auto loan taken to save from dying!
                const loanAmount = cost;
                const loanId = now;
                result.emergencyLoans.push({
                    id: loanId,
                    amount: loanAmount,
                    startTime: now,
                    reason: "Emergency Car Protection (<10L)"
                });
                carFuel = Math.min(DECAY_CONFIG.CAR_MAX, carFuel + neededLiters);
                carChanged = true;
                result.logsAdded.push({
                    time: now,
                    type: 'car-emergency-loan',
                    text: `🚨 EMERGENCY RESCUE: Car was <10L! Auto loan of ${loanAmount} coins taken to fill ${neededLiters.toFixed(1)}L to ${carFuel.toFixed(1)}L.`
                });
            }
        } else if (carFuel <= DECAY_CONFIG.AUTO_FILL_CEILING && carFuel >= DECAY_CONFIG.CRITICAL_THRESHOLD) {
            // Normal autofeed in multiples of 10L
            const maxLiters = Math.floor((DECAY_CONFIG.CAR_MAX - carFuel) / 10) * 10;
            if (maxLiters >= DECAY_CONFIG.MIN_FILL_THRESHOLD) {
                const affordableBlocks = Math.floor(decayWallet / DECAY_CONFIG.CAR_COST_PER_10L);
                const maxBlocks = maxLiters / 10;
                const blocksToFill = Math.min(affordableBlocks, maxBlocks);

                if (blocksToFill >= 1) {
                    const litersToAdd = blocksToFill * 10;
                    const cost = blocksToFill * DECAY_CONFIG.CAR_COST_PER_10L;
                    decayWallet -= cost;
                    carFuel = Math.min(DECAY_CONFIG.CAR_MAX, carFuel + litersToAdd);
                    carChanged = true;
                    result.logsAdded.push({
                        time: now,
                        type: 'car-autofeed',
                        text: `⛽ Car autofed ${litersToAdd}L for ${cost} coins. Fuel restored to ${carFuel.toFixed(1)}L.`
                    });
                }
            }
        }

        if (carChanged) {
            result.updates["car/fuel"] = carFuel;
            result.updates["car/lastUpdate"] = now;
            result.carInfo.fuel = carFuel;
            result.hasChanges = true;
        }
    }

    // --- TRAIN EVALUATION ---
    let trainPower = result.trainInfo ? result.trainInfo.power : 0;
    let trainChanged = false;

    if (result.trainInfo && !result.trainInfo.dead) {
        if (trainPower < DECAY_CONFIG.CRITICAL_THRESHOLD && trainPower > 0) {
            // CRITICAL: About to die! Autofill until 90+
            const neededKw = Math.min(DECAY_CONFIG.TRAIN_MAX - trainPower, 90);
            const cost = Math.round(neededKw * 10);

            if (decayWallet >= cost) {
                decayWallet -= cost;
                trainPower = Math.min(DECAY_CONFIG.TRAIN_MAX, trainPower + neededKw);
                trainChanged = true;
                result.logsAdded.push({
                    time: now,
                    type: 'train-rescue-wallet',
                    text: `🛡️ Train rescued (<10kW) with Decay Wallet! Filled ${neededKw.toFixed(1)}kW (${cost} coins). Current: ${trainPower.toFixed(1)}kW`
                });
            } else {
                // Auto loan taken to save from dying!
                const loanAmount = cost;
                const loanId = now + 1;
                result.emergencyLoans.push({
                    id: loanId,
                    amount: loanAmount,
                    startTime: now,
                    reason: "Emergency Train Protection (<10 kW)"
                });
                trainPower = Math.min(DECAY_CONFIG.TRAIN_MAX, trainPower + neededKw);
                trainChanged = true;
                result.logsAdded.push({
                    time: now,
                    type: 'train-emergency-loan',
                    text: `🚨 EMERGENCY RESCUE: Train was <10kW! Auto loan of ${loanAmount} coins taken to fill ${neededKw.toFixed(1)}kW to ${trainPower.toFixed(1)}kW.`
                });
            }
        } else if (trainPower <= DECAY_CONFIG.AUTO_FILL_CEILING && trainPower >= DECAY_CONFIG.CRITICAL_THRESHOLD) {
            // Normal autofeed in multiples of 10 kW
            const maxKw = Math.floor((DECAY_CONFIG.TRAIN_MAX - trainPower) / 10) * 10;
            if (maxKw >= DECAY_CONFIG.MIN_FILL_THRESHOLD) {
                const affordableBlocks = Math.floor(decayWallet / DECAY_CONFIG.TRAIN_COST_PER_10KW);
                const maxBlocks = maxKw / 10;
                const blocksToFill = Math.min(affordableBlocks, maxBlocks);

                if (blocksToFill >= 1) {
                    const kwToAdd = blocksToFill * 10;
                    const cost = blocksToFill * DECAY_CONFIG.TRAIN_COST_PER_10KW;
                    decayWallet -= cost;
                    trainPower = Math.min(DECAY_CONFIG.TRAIN_MAX, trainPower + kwToAdd);
                    trainChanged = true;
                    result.logsAdded.push({
                        time: now,
                        type: 'train-autofeed',
                        text: `🚅 Train autofed ${kwToAdd}kW for ${cost} coins. Electricity restored to ${trainPower.toFixed(1)}kW.`
                    });
                }
            }
        }

        if (trainChanged) {
            result.updates["tree/water"] = trainPower;
            result.updates["tree/lastUpdate"] = now;
            result.trainInfo.power = trainPower;
            result.hasChanges = true;
        }
    }

    // --- APPLY WALLET & LOANS UPDATES ---
    if (result.hasChanges) {
        result.updates["decay/wallet"] = decayWallet;
        result.updates["decayWallet"] = decayWallet;
        result.decayWallet = decayWallet;

        // Emergency loans
        for (const loan of result.emergencyLoans) {
            result.updates[`loans/${loan.id}`] = {
                amount: loan.amount,
                startTime: loan.startTime,
                reason: loan.reason
            };
            const loanCount = (decay.emergencyLoansCount || 0) + 1;
            result.updates["decay/emergencyLoansCount"] = loanCount;
        }

        // Logs
        if (result.logsAdded.length > 0) {
            const existingLogs = Array.isArray(decay.logs) ? decay.logs : [];
            result.updates["decay/logs"] = [...result.logsAdded, ...existingLogs].slice(0, 30);
            result.updates["decay/lastFeedTime"] = now;
        }
    }

    return result;
}
