/* calculator.js — Charging cost calculator with station picker (optimized) */

(function () {
  "use strict";
  window.VR = window.VR || {};

  var EV_PRESETS = [
    { name: "Tata Nexon EV", battery: 40, efficiency: 0.15 },
    { name: "Tata Tigor EV", battery: 26, efficiency: 0.13 },
    { name: "MG ZS EV", battery: 50, efficiency: 0.14 },
    { name: "Hyundai Kona EV", battery: 39, efficiency: 0.13 },
    { name: "BYD Atto 3", battery: 60, efficiency: 0.16 },
    { name: "MG Comet EV", battery: 17, efficiency: 0.10 },
    { name: "Tata Tiago EV", battery: 24, efficiency: 0.12 },
    { name: "Custom", battery: 40, efficiency: 0.15 },
  ];

  var CHARGER_PRESETS = [
    { name: "Slow (AC 3.3 kW)", power: 3.3 },
    { name: "Home (AC 7.4 kW)", power: 7.4 },
    { name: "Fast (DC 25 kW)", power: 25 },
    { name: "Fast (DC 50 kW)", power: 50 },
    { name: "Ultra (DC 100 kW)", power: 100 },
    { name: "Ultra (DC 150 kW)", power: 150 },
  ];

  var calc = {
    evPreset: "Tata Nexon EV",
    battery: 40,
    efficiency: 0.15,
    currentCharge: 20,
    targetCharge: 80,
    chargerPreset: "Fast (DC 50 kW)",
    chargerPower: 50,
    pricePerKWh: 22,
    petrolPrice: 105,
    petrolMileage: 15,
    selectedStationId: null,
    stations: [],
  };

  VR.views.calculator = function (container) {
    container.innerHTML = '<div class="section" style="max-width:72rem;"><div id="calc-app"></div></div>';
    var app = container.querySelector("#calc-app");
    fetch("/api/stations").then(function (r) { return r.json(); }).then(function (data) {
      calc.stations = data.stations || [];
      renderCalc(app);
    }).catch(function () { calc.stations = []; renderCalc(app); });
  };

  function renderCalc(app) {
    app.innerHTML =
      '<div class="mb-6">' +
      '<h1 class="text-2xl font-bold">How much will it cost to charge?</h1>' +
      '<p class="text-sm text-muted mt-2" style="max-width:42rem;">Enter your EV battery, charger speed, and how much you want to charge. Get the exact cost, charging time, and distance your car can travel — compared with petrol in real time.</p></div>' +
      '<div class="calc-grid" id="calc-grid">' +
      '<div id="calc-inputs">' +
      // EV section
      '<div class="card mb-4"><div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;"><div style="width:2rem;height:2rem;border-radius:var(--radius);background:color-mix(in oklch, var(--primary) 15%, transparent);color:var(--primary);display:flex;align-items:center;justify-content:center;">' + VR.icons.car + '</div><div><p style="font-weight:600;font-size:0.875rem;">Your Electric Vehicle</p><p style="font-size:0.75rem;color:var(--muted-foreground);">Pick a preset or customize</p></div></div>' +
      '<div class="mb-2"><label class="label">EV Model</label><select class="input" id="ev-preset">' + EV_PRESETS.map(function (e) { return '<option value="' + e.name + '"' + (calc.evPreset === e.name ? " selected" : "") + '>' + e.name + '</option>'; }).join("") + '</select></div>' +
      '<div class="grid grid-2 mb-2"><div><label class="label">Battery (kWh)</label><input class="input" type="number" id="battery" min="5" max="200" value="' + calc.battery + '"></div><div><label class="label">Efficiency (kWh/km)</label><input class="input" type="number" id="efficiency" step="0.01" min="0.05" max="0.4" value="' + calc.efficiency + '"></div></div>' +
      '<div class="mb-2"><div style="display:flex;justify-content:space-between;"><label class="label">Current charge</label><span class="text-xs font-semibold text-primary" id="current-charge-val">' + calc.currentCharge + '%</span></div><input type="range" id="current-charge" min="0" max="100" step="5" value="' + calc.currentCharge + '" style="width:100%;"></div>' +
      '<div class="mb-2"><div style="display:flex;justify-content:space-between;"><label class="label">Charge up to</label><span class="text-xs font-semibold text-primary" id="target-charge-val">' + calc.targetCharge + '%</span></div><input type="range" id="target-charge" min="' + Math.min(calc.currentCharge + 10, 100) + '" max="100" step="5" value="' + calc.targetCharge + '" style="width:100%;"></div>' +
      '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;background:var(--muted);"><div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:0.375rem;"><span class="text-muted" id="charge-label">Charging from ' + calc.currentCharge + '% → ' + calc.targetCharge + '%</span><span style="font-weight:600;color:var(--primary);" id="charge-pct">+' + (calc.targetCharge - calc.currentCharge) + '%</span></div><div style="position:relative;height:1rem;border-radius:9999px;background:var(--muted);overflow:hidden;border:1px solid var(--border);"><div id="charge-bar-bg" style="position:absolute;top:0;bottom:0;left:0;background:color-mix(in oklch, var(--muted-foreground) 40%, transparent);width:' + calc.currentCharge + '%;"></div><div id="charge-bar-fill" style="position:absolute;top:0;bottom:0;left:0;background:var(--primary);border-radius:9999px;width:' + calc.targetCharge + '%;transition:width 0.3s;"></div></div></div>' +
      '</div>' +
      // Charger section
      '<div class="card mb-4"><div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;"><div style="width:2rem;height:2rem;border-radius:var(--radius);background:color-mix(in oklch, var(--primary) 15%, transparent);color:var(--primary);display:flex;align-items:center;justify-content:center;">' + VR.icons.zap + '</div><div><p style="font-weight:600;font-size:0.875rem;">Charger</p><p style="font-size:0.75rem;color:var(--muted-foreground);">Pick a real station or set manually</p></div></div>' +
      '<div class="mb-2"><label class="label">Charging Station</label><div class="select-wrap"><select class="input" id="station-picker"><option value="">Select a station to auto-fill…</option>' + calc.stations.map(function (s) { return '<option value="' + s.id + '"' + (calc.selectedStationId === s.id ? " selected" : "") + '>' + s.name + ' (' + s.powerKW + ' kW, ₹' + s.pricePerKWh + '/kWh)</option>'; }).join("") + '</select></div></div>' +
      (calc.selectedStationId ? renderStationContext() : '') +
      '<div class="mb-2"><label class="label">Charger Type</label><select class="input" id="charger-preset">' + CHARGER_PRESETS.map(function (c) { return '<option value="' + c.name + '"' + (calc.chargerPreset === c.name ? " selected" : "") + '>' + c.name + '</option>'; }).join("") + '</select></div>' +
      '<div class="grid grid-2"><div><label class="label">Power (kW)</label><input class="input" type="number" id="power" min="1" max="350" value="' + calc.chargerPower + '"></div><div><label class="label">Price (₹/kWh)</label><input class="input" type="number" id="price" min="5" max="50" value="' + calc.pricePerKWh + '"></div></div>' +
      '</div>' +
      // Petrol
      '<div class="card"><div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;"><div style="width:2rem;height:2rem;border-radius:var(--radius);background:color-mix(in oklch, var(--status-maintenance) 15%, transparent);color:var(--status-maintenance);display:flex;align-items:center;justify-content:center;">' + VR.icons.fuel + '</div><div><p style="font-weight:600;font-size:0.875rem;">Petrol Comparison</p><p style="font-size:0.75rem;color:var(--muted-foreground);">For the same distance</p></div></div>' +
      '<div class="grid grid-2"><div><label class="label">Petrol mileage (km/L)</label><input class="input" type="number" id="mileage" min="5" max="30" value="' + calc.petrolMileage + '"></div><div><label class="label">Petrol price (₹/L)</label><input class="input" type="number" id="petrol-price" min="50" max="150" value="' + calc.petrolPrice + '"></div></div>' +
      '</div></div>' +
      // RIGHT: Results
      '<div id="calc-results">' +
      '<div class="grid grid-2 mb-4">' +
      // Cost — the big number (3x)
      '<div class="card mb-4" style="padding:1.25rem;">' +
      '<p style="font-size:0.6875rem;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:0.02em;margin-bottom:0.25rem;">Charging cost</p>' +
      '<p id="r-cost" style="font-size:3.5rem;font-weight:700;color:var(--primary);line-height:1;margin-bottom:0.25rem;" class="tabular-nums">&#8377;0</p>' +
      '<p id="r-cost-sub" style="font-size:0.75rem;color:var(--muted-foreground);">&mdash;</p></div>' +
      // Time, energy, range as a plain text line
      '<div class="card mb-4" style="padding:0.875rem 1rem;">' +
      '<p style="font-size:0.8125rem;line-height:1.7;color:var(--muted-foreground);">' +
      '<span style="color:var(--foreground);font-weight:600;" id="r-time">&mdash;</span> charging time' +
      ' &middot; <span style="color:var(--foreground);font-weight:600;" id="r-energy">&mdash;</span> kWh energy' +
      ' &middot; <span style="color:var(--foreground);font-weight:600;" id="r-range">&mdash;</span> km range' +
      '</p>' +
      '<p id="r-time-sub" style="display:none;"></p><p id="r-energy-sub" style="display:none;"></p><p id="r-range-sub" style="display:none;"></p>' +
      '</div>' +
      // EV vs Petrol — compact
      '<div class="card mb-4" style="padding:0.875rem 1rem;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">' +
      '<p style="font-weight:600;font-size:0.8125rem;">EV vs petrol</p>' +
      '<span class="badge badge-success" id="savings-badge">Save &#8377;0</span></div>' +
      '<div class="mb-2"><div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:2px;"><span>EV</span><span style="font-weight:600;" id="ev-cost-label">&#8377;0</span></div><div style="height:4px;border-radius:2px;background:var(--muted);overflow:hidden;"><div id="ev-bar" style="height:100%;background:var(--primary);width:0%;transition:width 0.3s;"></div></div></div>' +
      '<div><div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:2px;"><span>Petrol</span><span style="font-weight:600;" id="petrol-cost-label">&#8377;0</span></div><div style="height:4px;border-radius:2px;background:var(--muted);overflow:hidden;"><div id="petrol-bar" style="height:100%;background:var(--status-maintenance);width:0%;transition:width 0.3s;"></div></div></div>' +
      '<p id="petrol-liters" style="font-size:0.6875rem;color:var(--muted-foreground);margin-top:0.25rem;">0 liters</p>' +
      '<div style="border-top:1px solid var(--border);margin-top:0.5rem;padding-top:0.5rem;display:flex;justify-content:space-between;font-size:0.75rem;"><span>EV: <span id="ev-per-km" style="font-weight:600;color:var(--primary);">&#8377;0</span>/km</span><span>Petrol: <span id="petrol-per-km" style="font-weight:600;">&#8377;0</span>/km</span></div>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">' +
      '<button class="btn btn-outline btn-sm" data-scenario="10-80">Quick 10% &rarr; 80%</button>' +
      '<button class="btn btn-outline btn-sm" data-scenario="20-100">Full charge</button>' +
      '<button class="btn btn-outline btn-sm" data-scenario="150kw">Ultra-fast 150 kW</button>' +
      '</div></div></div>';

    attachCalcEvents(app);
    updateResults(app);
  }

  function setText(app, id, text) { var el = app.querySelector("#" + id); if (el) el.textContent = text; }

  function updateResults(app) {
    var r = computeResults();
    setText(app, "current-charge-val", calc.currentCharge + "%");
    setText(app, "target-charge-val", calc.targetCharge + "%");
    setText(app, "charge-label", "Charging from " + calc.currentCharge + "% → " + calc.targetCharge + "%");
    setText(app, "charge-pct", "+" + r.chargeNeededPct + "%");
    var bg = app.querySelector("#charge-bar-bg"); if (bg) bg.style.width = calc.currentCharge + "%";
    var fill = app.querySelector("#charge-bar-fill"); if (fill) fill.style.width = calc.targetCharge + "%";
    setText(app, "r-cost", "₹" + r.cost.toLocaleString("en-IN"));
    setText(app, "r-cost-sub", "₹" + calc.pricePerKWh + "/kWh × " + r.energyFromWall + " kWh");
    setText(app, "r-time", r.timeStr);
    setText(app, "r-time-sub", calc.chargerPower + " kW charger");
    setText(app, "r-energy", r.energyNeeded + " kWh");
    setText(app, "r-energy-sub", calc.currentCharge + "% → " + calc.targetCharge + "% of " + calc.battery + " kWh");
    setText(app, "r-range", r.rangeKm + " km");
    setText(app, "r-range-sub", "Full battery: " + r.fullRangeKm + " km");
    setText(app, "ev-cost-label", "₹" + r.cost.toLocaleString("en-IN"));
    setText(app, "petrol-cost-label", "₹" + r.petrolCost.toLocaleString("en-IN"));
    var evBar = app.querySelector("#ev-bar"); if (evBar) evBar.style.width = Math.min(100, (r.cost / Math.max(r.cost, r.petrolCost, 1)) * 100) + "%";
    var pBar = app.querySelector("#petrol-bar"); if (pBar) pBar.style.width = Math.min(100, (r.petrolCost / Math.max(r.cost, r.petrolCost, 1)) * 100) + "%";
    setText(app, "savings-badge", "Save ₹" + r.savings.toLocaleString("en-IN"));
    setText(app, "ev-per-km", "₹" + r.evCostPerKm);
    setText(app, "petrol-per-km", "₹" + r.petrolCostPerKm);
    setText(app, "petrol-liters", r.petrolLiters + " liters of petrol");
  }

  function renderStationContext() {
    var s = calc.stations.find(function (x) { return x.id === calc.selectedStationId; });
    if (!s) return "";
    var statusClass = s.status === "OPERATIONAL" ? "badge-success" : s.status === "MAINTENANCE" ? "badge-warning" : "badge-danger";
    var statusLabel = s.status === "OPERATIONAL" ? s.availablePorts + "/" + s.numberOfPorts + " ports free" : s.status.toLowerCase();
    return '<div style="border:1px solid color-mix(in oklch, var(--primary) 30%, transparent);background:color-mix(in oklch, var(--primary) 5%, transparent);border-radius:var(--radius);padding:0.75rem;margin-bottom:0.5rem;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;"><div style="min-width:0;"><p style="font-size:0.875rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;">' + s.name + '</p><p style="font-size:0.75rem;color:var(--muted-foreground);margin-top:2px;display:flex;align-items:center;gap:4px;">' + VR.icons.mapPin + ' ' + s.area + ', ' + s.city + '</p></div><button class="text-xs text-muted" id="clear-station" style="flex-shrink:0;">Clear</button></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:0.5rem;"><span class="badge ' + statusClass + '"><span class="badge-dot"></span>' + statusLabel + '</span><span class="badge">' + VR.icons.zap + ' ' + s.powerKW + ' kW</span><span class="badge">₹' + s.pricePerKWh + '/kWh</span></div>' +
      '<div style="font-size:0.6875rem;color:var(--muted-foreground);margin-top:4px;display:flex;align-items:center;gap:4px;">' + VR.icons.plug + ' ' + s.connectorTypes.join(", ") + '</div></div>';
  }

  function computeResults() {
    var chargeNeededPct = Math.max(0, calc.targetCharge - calc.currentCharge);
    var energyNeeded = (calc.battery * chargeNeededPct) / 100;
    var energyFromWall = energyNeeded / 0.9;
    var slowdown = calc.targetCharge > 80 ? 1.15 : 1.0;
    var timeHr = (energyNeeded / calc.chargerPower) * slowdown;
    var cost = energyFromWall * calc.pricePerKWh;
    var rangeKm = energyNeeded / calc.efficiency;
    var fullRangeKm = calc.battery / calc.efficiency;
    var petrolLiters = rangeKm / calc.petrolMileage;
    var petrolCost = petrolLiters * calc.petrolPrice;
    var savings = petrolCost - cost;
    function fmtTime(h) { if (h <= 0) return "0 min"; var hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (hh === 0) return mm + " min"; if (mm === 0) return hh + " hr"; return hh + " hr " + mm + " min"; }
    return {
      chargeNeededPct: chargeNeededPct,
      energyNeeded: Math.round(energyNeeded * 10) / 10,
      energyFromWall: Math.round(energyFromWall * 10) / 10,
      timeStr: fmtTime(timeHr),
      cost: Math.round(cost),
      rangeKm: Math.round(rangeKm),
      fullRangeKm: Math.round(fullRangeKm),
      petrolCost: Math.round(petrolCost),
      petrolLiters: Math.round(petrolLiters * 10) / 10,
      savings: Math.round(savings),
      evCostPerKm: rangeKm > 0 ? Math.round((cost / rangeKm) * 100) / 100 : 0,
      petrolCostPerKm: rangeKm > 0 ? Math.round((petrolCost / rangeKm) * 100) / 100 : 0,
    };
  }

  function attachCalcEvents(app) {
    var evSelect = app.querySelector("#ev-preset");
    if (evSelect) evSelect.addEventListener("change", function () {
      calc.evPreset = evSelect.value;
      var p = EV_PRESETS.find(function (e) { return e.name === evSelect.value; });
      if (p && evSelect.value !== "Custom") { calc.battery = p.battery; calc.efficiency = p.efficiency; }
      renderCalc(app);
    });

    var batteryInput = app.querySelector("#battery");
    if (batteryInput) batteryInput.addEventListener("input", function () { calc.battery = Number(batteryInput.value) || 0; updateResults(app); });
    var effInput = app.querySelector("#efficiency");
    if (effInput) effInput.addEventListener("input", function () { calc.efficiency = Number(effInput.value) || 0.1; updateResults(app); });

    var currentSlider = app.querySelector("#current-charge");
    if (currentSlider) currentSlider.addEventListener("input", function () { calc.currentCharge = Number(currentSlider.value); updateResults(app); });
    var targetSlider = app.querySelector("#target-charge");
    if (targetSlider) targetSlider.addEventListener("input", function () { calc.targetCharge = Number(targetSlider.value); updateResults(app); });

    var stationPicker = app.querySelector("#station-picker");
    if (stationPicker) stationPicker.addEventListener("change", function () {
      var id = stationPicker.value;
      calc.selectedStationId = id || null;
      if (id) {
        var s = calc.stations.find(function (x) { return x.id === id; });
        if (s) { calc.chargerPower = s.powerKW; calc.pricePerKWh = s.pricePerKWh; var match = CHARGER_PRESETS.find(function (c) { return c.power === s.powerKW; }); calc.chargerPreset = match ? match.name : s.operator + " — " + s.powerKW + " kW"; }
      } else { calc.chargerPreset = "Fast (DC 50 kW)"; calc.chargerPower = 50; calc.pricePerKWh = 22; }
      renderCalc(app);
    });

    var clearBtn = app.querySelector("#clear-station");
    if (clearBtn) clearBtn.addEventListener("click", function () { calc.selectedStationId = null; calc.chargerPreset = "Fast (DC 50 kW)"; calc.chargerPower = 50; calc.pricePerKWh = 22; renderCalc(app); });

    var chargerSelect = app.querySelector("#charger-preset");
    if (chargerSelect) chargerSelect.addEventListener("change", function () {
      calc.chargerPreset = chargerSelect.value;
      var p = CHARGER_PRESETS.find(function (c) { return c.name === chargerSelect.value; });
      if (p) calc.chargerPower = p.power;
      renderCalc(app);
    });

    var powerInput = app.querySelector("#power");
    if (powerInput) powerInput.addEventListener("input", function () { calc.chargerPower = Number(powerInput.value) || 1; updateResults(app); });
    var priceInput = app.querySelector("#price");
    if (priceInput) priceInput.addEventListener("input", function () { calc.pricePerKWh = Number(priceInput.value) || 0; updateResults(app); });

    var mileageInput = app.querySelector("#mileage");
    if (mileageInput) mileageInput.addEventListener("input", function () { calc.petrolMileage = Number(mileageInput.value) || 1; updateResults(app); });
    var petrolPriceInput = app.querySelector("#petrol-price");
    if (petrolPriceInput) petrolPriceInput.addEventListener("input", function () { calc.petrolPrice = Number(petrolPriceInput.value) || 0; updateResults(app); });

    app.querySelectorAll("[data-scenario]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var s = btn.dataset.scenario;
        if (s === "10-80") { calc.currentCharge = 10; calc.targetCharge = 80; }
        else if (s === "20-100") { calc.currentCharge = 20; calc.targetCharge = 100; }
        else if (s === "150kw") { calc.chargerPreset = "Ultra (DC 150 kW)"; calc.chargerPower = 150; }
        renderCalc(app);
      });
    });
  }

  // Expose calc state so other views (e.g. Destinations) can read the user's
  // car settings (battery, efficiency) and charger selection.
  VR.calcState = calc;
})();
