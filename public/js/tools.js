/* tools.js — Favorites, Destinations, and EV Readiness Planner views */

(function () {
  "use strict";
  window.VR = window.VR || {};

  /* ============================================================
     Constants
     ============================================================ */

  var EV_PREMIUM_INR = 200000;
  var WEEKS_PER_MONTH = 4.33;
  var DEFAULT_AVG_PRICE = 22;
  var NEARBY_KM = 3;
  var CHARGE_CAP_KWH = 40;
  var SEARCH_RADIUS_KM = 2;
  var OWNERSHIP_HORIZON_YEARS = 8;

  var GANDHINAGAR_SECTORS = [
    { name: "Sector 1", lat: 23.2218, lng: 72.6502 },
    { name: "Sector 10", lat: 23.2120, lng: 72.6410 },
    { name: "Sector 15", lat: 23.2056, lng: 72.6269 },
    { name: "Sector 16", lat: 23.2050, lng: 72.6470 },
    { name: "Sector 18", lat: 23.1889, lng: 72.6289 },
    { name: "Sector 20", lat: 23.2167, lng: 72.6308 },
    { name: "Sector 21", lat: 23.2115, lng: 72.6342 },
    { name: "Sector 28", lat: 23.1869, lng: 72.6296 },
    { name: "GIFT City", lat: 23.1593, lng: 72.6837 },
    { name: "Raysan", lat: 23.1568, lng: 72.6615 },
    { name: "Adalaj", lat: 23.1675, lng: 72.5821 },
    { name: "Kudasan", lat: 23.1762, lng: 72.6401 },
    { name: "Kalol", lat: 23.2312, lng: 72.4989 },
    { name: "Kadi", lat: 23.3012, lng: 72.6389 },
    { name: "Dehgam", lat: 23.1809, lng: 72.8245 },
    { name: "Vavol", lat: 23.2218, lng: 72.6502 }
  ];

  var AHMEDABAD_AREAS = [
    { name: "Vastrapur", lat: 23.0398, lng: 72.5292 },
    { name: "SG Highway", lat: 23.0361, lng: 72.5056 },
    { name: "Bodakdev", lat: 23.0379, lng: 72.5081 },
    { name: "Prahlad Nagar", lat: 23.0098, lng: 72.5069 },
    { name: "Thaltej", lat: 23.0589, lng: 72.5069 },
    { name: "Satellite", lat: 23.0297, lng: 72.5113 },
    { name: "Navrangpura", lat: 23.0395, lng: 72.5547 },
    { name: "Maninagar", lat: 22.9989, lng: 72.5933 },
    { name: "Bopal", lat: 23.0198, lng: 72.4583 },
    { name: "Chandkheda", lat: 23.1014, lng: 72.5963 },
    { name: "CG Road", lat: 23.0367, lng: 72.5362 },
    { name: "Science City", lat: 23.0750, lng: 72.5050 },
    { name: "Naroda", lat: 23.0762, lng: 72.6358 },
    { name: "Kankaria", lat: 22.9989, lng: 72.6008 },
    { name: "Drive-in Road", lat: 23.0410, lng: 72.5180 },
    { name: "Gota", lat: 23.0950, lng: 72.5350 }
  ];

  var ALL_AREAS = GANDHINAGAR_SECTORS.concat(AHMEDABAD_AREAS);

  var EFFICIENCY_PRESETS = [
    { label: "Efficient — 0.13 kWh/km", value: 0.13 },
    { label: "Average — 0.15 kWh/km", value: 0.15 },
    { label: "Heavy — 0.18 kWh/km", value: 0.18 }
  ];

  var BATTERY_OPTIONS = [30, 40, 55, 75];

  var QUICK_DURATIONS = [
    { label: "30m", value: 30 },
    { label: "1h", value: 60 },
    { label: "2h", value: 120 },
    { label: "4h", value: 240 },
    { label: "6h", value: 360 }
  ];

  /* ============================================================
     Helpers
     ============================================================ */

  /** 90 -> "1h 30m", 30 -> "30m", 360 -> "6h" */
  function fmtDuration(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (h === 0) return m + "m";
    if (m === 0) return h + "h";
    return h + "h " + m + "m";
  }

  /** Format a number as Indian rupees (no decimals). */
  function inr(n) {
    return "\u20B9" + Math.round(Math.abs(n)).toLocaleString("en-IN");
  }

  /** Format a number with up to 1 decimal place. */
  function fmt1(n) {
    return n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
  }

  /** Simple flat-earth distance approximation in km (good enough for <50km). */
  function simpleDistanceKm(lat1, lng1, lat2, lng2) {
    var dLat = lat1 - lat2;
    var dLng = (lng1 - lng2) * Math.cos(((lat1 + lat2) * Math.PI) / 360);
    return Math.sqrt(dLat * dLat + dLng * dLng) * 111;
  }

  function findArea(name) {
    for (var i = 0; i < ALL_AREAS.length; i++) {
      if (ALL_AREAS[i].name === name) return ALL_AREAS[i];
    }
    return null;
  }

  function escapeHtml(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function statusBadgeClass(status) {
    if (status === "OPERATIONAL") return "badge-success";
    if (status === "MAINTENANCE") return "badge-warning";
    return "badge-danger";
  }

  function statusLabel(status) {
    if (status === "OPERATIONAL") return "Operational";
    if (status === "MAINTENANCE") return "Maintenance";
    return "Offline";
  }

  function shortStatusLabel(status) {
    if (status === "OPERATIONAL") return "Live";
    if (status === "MAINTENANCE") return "Maint.";
    return "Offline";
  }

  /* ============================================================
     FAVORITES VIEW
     ============================================================ */

  VR.views.favorites = function (container) {
    // Auth gate
    if (!VR.state.session || !VR.state.session.user) {
      container.innerHTML =
        '<div class="section">' +
        '<div class="state-empty">' +
        '<div class="state-icon">' + VR.icons.heart + '</div>' +
        '<p class="state-title">Sign in to view your favorites</p>' +
        '<p class="state-desc">Save charging stations for quick access by signing in to your account.</p>' +
        '<button class="btn mt-4" data-action="open-auth" data-tab="login">' + VR.icons.heart + ' Sign In</button>' +
        '</div>' +
        '</div>';
      return;
    }

    container.innerHTML = '<div class="section"><div id="fav-app"></div></div>';
    var app = container.querySelector("#fav-app");
    loadFavorites(app, container);
  };

  function loadFavorites(app, container) {
    // Loading skeleton
    app.innerHTML =
      '<div class="mb-4"><h1 class="text-2xl font-bold">Your Favorites</h1>' +
      '<p class="text-sm text-muted mt-2">Stations you\'ve saved for quick access.</p></div>' +
      '<div class="grid grid-3">' +
      Array.from({ length: 6 }).map(function () {
        return '<div class="skeleton" style="height:14rem;"></div>';
      }).join("") +
      '</div>';

    fetch("/api/favorites").then(function (r) { return r.json(); }).then(function (data) {
      var stations = data.stations || [];
      // Populate VR.state.stations so VR.toggleFavorite can find each station
      VR.state.stations = stations;
      renderFavorites(app, stations, container);
    }).catch(function (err) {
      app.innerHTML =
        '<div class="state-empty">' +
        '<div class="state-icon">' + VR.icons.alertCircle + '</div>' +
        '<p class="state-title">Couldn\'t load favorites</p>' +
        '<p class="state-desc">' + escapeHtml(err.message || "Something went wrong") + '</p>' +
        '<button class="btn btn-outline btn-sm mt-4" id="fav-retry">Retry</button>' +
        '</div>';
      var retryBtn = app.querySelector("#fav-retry");
      if (retryBtn) retryBtn.addEventListener("click", function () { loadFavorites(app, container); });
    });
  }

  function renderFavorites(app, stations, container) {
    var html =
      '<div class="mb-4 flex items-center justify-between">' +
      '<div><h1 class="text-2xl font-bold">Your Favorites</h1>' +
      '<p class="text-sm text-muted mt-2">' + stations.length + ' station' + (stations.length !== 1 ? "s" : "") + ' saved.</p></div>' +
      '</div>';

    if (stations.length === 0) {
      html +=
        '<div class="state-empty">' +
        '<div class="state-icon">' + VR.icons.heart + '</div>' +
        '<p class="state-title">No favorites yet</p>' +
        '<p class="state-desc">Browse the map and tap the heart icon on any station to save it here for quick access.</p>' +
        '<button class="btn mt-4" data-nav="stations">' + VR.icons.search + ' Find Stations</button>' +
        '</div>';
    } else {
      html += '<div class="grid grid-3">';
      stations.forEach(function (s) {
        html += VR.renderStationCard(s);
      });
      html += '</div>';
    }

    app.innerHTML = html;

    // Card click -> open detail
    app.querySelectorAll("[data-station-card]").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest("[data-fav]")) return;
        VR.openStationDetail(card.dataset.stationCard);
      });
    });

    // Favorite toggle -> re-render list
    app.querySelectorAll("[data-fav]").forEach(function (favBtn) {
      favBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        handleFavToggle(favBtn.dataset.fav, container);
      });
    });
  }

  /** Toggle favorite via the API, then re-render the favorites list. */
  function handleFavToggle(stationId, container) {
    if (!VR.state.session || !VR.state.session.user) {
      VR.openAuth("login");
      return;
    }
    var station = (VR.state.stations || []).find(function (s) { return s.id === stationId; });
    if (!station) return;
    var isFav = !!station.isFavorite;
    var url = isFav ? "/api/favorites/" + stationId : "/api/favorites";
    var options = isFav
      ? { method: "DELETE" }
      : { method: "POST", body: JSON.stringify({ stationId: stationId }) };

    VR.api(url, options).then(function () {
      VR.toast(isFav ? "Removed from favorites" : "Added to favorites", "success");
      VR.views.favorites(container); // re-render the whole view
    }).catch(function () {
      VR.toast("Failed to update favorite", "error");
    });
  }

  /* ============================================================
     DESTINATIONS VIEW
     ============================================================ */

  // Landmarks embedded directly (avoids CORS issues with the preview proxy)
  var LANDMARKS = [
    { name: "Mahatma Mandir", area: "Sector 15", city: "Gandhinagar", lat: 23.2056, lng: 72.6269, category: "Convention Centre" },
    { name: "GIFT City", area: "GIFT City", city: "Gandhinagar", lat: 23.1593, lng: 72.6837, category: "Business Park" },
    { name: "Infocity Park", area: "Sector 28", city: "Gandhinagar", lat: 23.1869, lng: 72.6296, category: "IT Park" },
    { name: "Akshardham Temple", area: "Sector 20", city: "Gandhinagar", lat: 23.2167, lng: 72.6308, category: "Temple" },
    { name: "Dandi Kutir", area: "Sector 15", city: "Gandhinagar", lat: 23.2070, lng: 72.6255, category: "Museum" },
    { name: "PDEU Campus", area: "Raysan", city: "Gandhinagar", lat: 23.1568, lng: 72.6615, category: "University" },
    { name: "DAIICT", area: "Sector 18", city: "Gandhinagar", lat: 23.1889, lng: 72.6289, category: "University" },
    { name: "Gandhinagar Bus Station", area: "Sector 1", city: "Gandhinagar", lat: 23.2218, lng: 72.6502, category: "Transit" },
    { name: "Adalaj Stepwell", area: "Adalaj", city: "Gandhinagar", lat: 23.1675, lng: 72.5821, category: "Heritage" },
    { name: "Sarita Udyan", area: "Sector 9", city: "Gandhinagar", lat: 23.1980, lng: 72.6310, category: "Park" },
    { name: "Children's Park", area: "Sector 28", city: "Gandhinagar", lat: 23.1900, lng: 72.6320, category: "Park" },
    { name: "GH-4 Circle", area: "Sector 16", city: "Gandhinagar", lat: 23.2050, lng: 72.6470, category: "Market" },
    { name: "Alpha One Mall", area: "Vastrapur", city: "Ahmedabad", lat: 23.0398, lng: 72.5292, category: "Mall" },
    { name: "Palladium Mall", area: "Thaltej", city: "Ahmedabad", lat: 23.0580, lng: 72.5058, category: "Mall" },
    { name: "ISKCON Temple", area: "SG Highway", city: "Ahmedabad", lat: 23.0295, lng: 72.5115, category: "Temple" },
    { name: "Kankaria Lake", area: "Kankaria", city: "Ahmedabad", lat: 22.9989, lng: 72.6008, category: "Lake" },
    { name: "Sabarmati Riverfront", area: "Ashram Road", city: "Ahmedabad", lat: 23.0250, lng: 72.5700, category: "Park" },
    { name: "Sabarmati Ashram", area: "Ashram Road", city: "Ahmedabad", lat: 23.0570, lng: 72.5800, category: "Heritage" },
    { name: "Sardar Patel Stadium", area: "Navrangpura", city: "Ahmedabad", lat: 23.0410, lng: 72.5490, category: "Stadium" },
    { name: "Gujarat University", area: "Navrangpura", city: "Ahmedabad", lat: 23.0395, lng: 72.5547, category: "University" },
    { name: "Ahmedabad Railway Station", area: "Kalupur", city: "Ahmedabad", lat: 23.0260, lng: 72.6017, category: "Transit" },
    { name: "SG Highway", area: "SG Highway", city: "Ahmedabad", lat: 23.0361, lng: 72.5056, category: "Highway" },
    { name: "Science City", area: "Science City", city: "Ahmedabad", lat: 23.0750, lng: 72.5050, category: "Park" },
    { name: "Lal Darwaja", area: "Khadia", city: "Ahmedabad", lat: 23.0225, lng: 72.5800, category: "Market" },
    { name: "CG Road Market", area: "Navrangpura", city: "Ahmedabad", lat: 23.0367, lng: 72.5362, category: "Market" },
    { name: "Law Garden", area: "Navrangpura", city: "Ahmedabad", lat: 23.0300, lng: 72.5450, category: "Park" },
  ];

  var dest = {
    landmarks: LANDMARKS,  // Use embedded landmarks directly
    selectedName: null,
    duration: 90,
    loaded: true,          // Already loaded — no fetch needed
    useCalcCar: false
  };

  VR.views.destinations = function (container) {
    container.innerHTML =
      '<div class="section" style="max-width:48rem;">' +
      '<h1>Destination Search</h1>' +
      '<p style="font-size:0.875rem;color:var(--muted-foreground);margin-top:0.5rem;max-width:32rem;">Going somewhere? Find chargers near your destination and see how much charge you\'ll add while you\'re there.</p>' +
      '<div id="dest-app" style="margin-top:1.5rem;"></div>' +
      '</div>';

    var app = container.querySelector("#dest-app");

    // Inline responsive styles for the destination result cards
    var style = document.createElement("style");
    style.textContent =
      '.dest-card-top { display:flex; flex-direction:column; gap:0.75rem; padding:1rem; }' +
      '@media (min-width:640px) { .dest-card-top { flex-direction:row; align-items:flex-start; justify-content:space-between; } }' +
      '.dest-metrics { display:grid; grid-template-columns:1fr; }' +
      '@media (min-width:640px) { .dest-metrics { grid-template-columns:1fr 1fr 1fr; } }' +
      '.dest-metric { padding:0.875rem 1rem; border-bottom:1px solid var(--border); }' +
      '@media (min-width:640px) { .dest-metric { border-bottom:none; border-right:1px solid var(--border); } .dest-metric:last-child { border-right:none; } }' +
      '.dest-card-footer { display:flex; flex-direction:column; gap:0.75rem; padding:1rem; border-top:1px solid var(--border); }' +
      '@media (min-width:640px) { .dest-card-footer { flex-direction:row; align-items:center; justify-content:space-between; } }';
    container.appendChild(style);

    // Landmarks are embedded — no fetch needed
    renderDestForm(app, container);
  };

  function renderDestForm(app, container) {
    // Group landmarks by city, preserving order
    var order = [];
    var map = {};
    dest.landmarks.forEach(function (l) {
      if (!map[l.city]) {
        map[l.city] = [];
        order.push(l.city);
      }
      map[l.city].push(l);
    });

    var landmarkOptions = '<option value="">Select a destination\u2026</option>';
    order.forEach(function (city) {
      landmarkOptions += '<optgroup label="' + escapeHtml(city) + '">';
      map[city].forEach(function (l) {
        landmarkOptions += '<option value="' + escapeHtml(l.name) + '"' +
          (dest.selectedName === l.name ? " selected" : "") + '>' +
          escapeHtml(l.name) + ' (' + escapeHtml(l.area) + ')</option>';
      });
      landmarkOptions += '</optgroup>';
    });

    var quickBtns = QUICK_DURATIONS.map(function (q) {
      var active = dest.duration === q.value;
      var style = active
        ? ' style="background:var(--primary);color:var(--primary-foreground);border-color:var(--primary);"'
        : '';
      return '<button class="btn btn-outline btn-sm" data-quick-duration="' + q.value + '"' + style + '>' + q.label + '</button>';
    }).join("");

    app.innerHTML =
      '<div class="card" style="padding:1rem;margin-bottom:1rem;">' +
      '<p style="font-weight:600;font-size:0.9375rem;margin-bottom:0.75rem;">Where are you going?</p>' +
      '<div style="margin-bottom:0.75rem;"><label class="label">Destination</label>' +
      '<select class="input" id="dest-landmark">' + landmarkOptions + '</select></div>' +
      '<div style="margin-bottom:0.75rem;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.375rem;">' +
      '<label class="label" style="margin:0;">How long will you be there?</label>' +
      '<span style="font-size:0.8125rem;font-weight:600;color:var(--primary);" id="dest-duration-display">' + fmtDuration(dest.duration) + '</span>' +
      '</div>' +
      '<input type="range" id="dest-duration" min="15" max="360" step="15" value="' + dest.duration + '" style="width:100%;">' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.375rem;margin-top:0.5rem;">' + quickBtns + '</div>' +
      '</div>' +
      '<div style="padding-top:0.75rem;border-top:1px solid var(--border);">' +
      '<label style="display:flex;align-items:flex-start;gap:0.5rem;cursor:pointer;font-size:0.8125rem;color:var(--muted-foreground);">' +
      '<input type="checkbox" id="dest-use-calc" style="width:1rem;height:1rem;margin-top:1px;flex-shrink:0;accent-color:var(--primary);">' +
      '<span><strong style="color:var(--foreground);">Use my car from the Calculator</strong> \u2014 show charge and range based on my EV\'s battery and efficiency.</span>' +
      '</label>' +
      '<div id="dest-calc-info" style="display:none;margin-top:0.375rem;padding:0.375rem 0.5rem;border:1px solid var(--border);border-radius:var(--radius);font-size:0.75rem;color:var(--muted-foreground);"></div>' +
      '</div>' +
      '</div>' +
      '<div id="dest-results"></div>' +
      '<div style="margin-top:0.75rem;padding:0.5rem 0.625rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--muted);font-size:0.75rem;color:var(--muted-foreground);line-height:1.5;">' +
      '<strong style="color:var(--foreground);">How we calculate:</strong> Charge added = power (kW) \u00D7 time (h), capped at ' + CHARGE_CAP_KWH + ' kWh. Range estimate uses 6 km/kWh efficiency. Actual results vary by vehicle.' +
      '</div>';

    // Landmark change
    var landmarkSelect = app.querySelector("#dest-landmark");
    if (landmarkSelect) {
      landmarkSelect.addEventListener("change", function () {
        dest.selectedName = landmarkSelect.value || null;
        renderDestResults(app, container);
      });
    }

    // Duration slider
    var durationSlider = app.querySelector("#dest-duration");
    var durationDisplay = app.querySelector("#dest-duration-display");
    var resultsTimer;
    if (durationSlider) {
      durationSlider.addEventListener("input", function () {
        dest.duration = Number(durationSlider.value);
        if (durationDisplay) durationDisplay.textContent = fmtDuration(dest.duration);
        updateQuickButtons(app);
        // Debounce the API call
        clearTimeout(resultsTimer);
        resultsTimer = setTimeout(function () {
          renderDestResults(app, container);
        }, 250);
      });
    }

    // Quick duration buttons
    app.querySelectorAll("[data-quick-duration]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        dest.duration = Number(btn.dataset.quickDuration);
        if (durationSlider) durationSlider.value = dest.duration;
        if (durationDisplay) durationDisplay.textContent = fmtDuration(dest.duration);
        updateQuickButtons(app);
        renderDestResults(app, container);
      });
    });

    // Checkbox: use car settings from Calculator
    var calcCheckbox = app.querySelector("#dest-use-calc");
    var calcInfo = app.querySelector("#dest-calc-info");
    if (calcCheckbox) {
      calcCheckbox.addEventListener("change", function () {
        dest.useCalcCar = calcCheckbox.checked;
        if (calcCheckbox.checked && VR.calcState) {
          var cs = VR.calcState;
          var infoText = "Using: " + cs.battery + " kWh battery, " + cs.efficiency + " kWh/km efficiency";
          if (cs.selectedStationId) {
            var st = cs.stations.find(function (x) { return x.id === cs.selectedStationId; });
            if (st) infoText += ", " + st.powerKW + " kW charger (₹" + st.pricePerKWh + "/kWh)";
          }
          if (calcInfo) { calcInfo.textContent = infoText; calcInfo.style.display = "block"; }
        } else if (calcInfo) {
          calcInfo.style.display = "none";
        }
        renderDestResults(app, container);
      });
    }

    // Initial results render
    renderDestResults(app, container);
  }

  function updateQuickButtons(app) {
    app.querySelectorAll("[data-quick-duration]").forEach(function (btn) {
      var isActive = Number(btn.dataset.quickDuration) === dest.duration;
      if (isActive) {
        btn.style.background = "var(--primary)";
        btn.style.color = "var(--primary-foreground)";
        btn.style.borderColor = "var(--primary)";
      } else {
        btn.style.background = "";
        btn.style.color = "";
        btn.style.borderColor = "";
      }
    });
  }

  function renderDestResults(app, container) {
    var resultsEl = app.querySelector("#dest-results");
    if (!resultsEl) return;

    // Not logged in -> still works, but warn. Actually the API doesn't require auth, so proceed.

    if (!dest.selectedName) {
      resultsEl.innerHTML =
        '<div class="state-empty">' +
        '<div class="state-icon">' + VR.icons.search + '</div>' +
        '<p class="state-title">Pick a destination above</p>' +
        '<p class="state-desc">Choose a landmark like Alpha One Mall, Akshardham, or Kankaria Lake, set your visit duration, and we\'ll show nearby chargers with the charge you\'d gain.</p>' +
        '</div>';
      return;
    }

    if (!dest.landmarks.length) {
      resultsEl.innerHTML =
        '<div class="card" style="padding:1.5rem;text-align:center;">' +
        '<div class="skeleton" style="width:2rem;height:2rem;border-radius:50%;margin:0 auto 0.5rem;"></div>' +
        '<p class="text-sm text-muted">Loading landmarks\u2026</p></div>';
      return;
    }

    // Find the landmark
    var landmark = null;
    for (var i = 0; i < dest.landmarks.length; i++) {
      if (dest.landmarks[i].name === dest.selectedName) { landmark = dest.landmarks[i]; break; }
    }
    if (!landmark) {
      resultsEl.innerHTML = '<div class="state-empty"><p class="state-title">Destination not found</p></div>';
      return;
    }

    // Loading state
    resultsEl.innerHTML =
      '<div class="card" style="padding:1rem;display:flex;align-items:center;gap:0.5rem;">' +
      '<div class="skeleton" style="width:1.25rem;height:1.25rem;border-radius:50%;"></div>' +
      '<p class="text-sm text-muted">Searching nearby chargers…</p></div>';

    // Fetch all stations and compute client-side (avoids CORS POST issue)
    // Use plain fetch without Content-Type header to avoid CORS preflight
    fetch("/api/stations")
      .then(function (r) { return r.json(); })
      .then(function (stationData) {
      var allStations = stationData.stations || [];
      var duration = dest.duration;
      var hours = duration / 60;
      var CHARGE_CAP = 40;
      var SEARCH_RADIUS = 2; // km

      // Find stations within 2km of the landmark
      var nearby = [];
      allStations.forEach(function (s) {
        var dist = haversineKm(landmark.lat, landmark.lng, s.lat, s.lng);
        if (dist <= SEARCH_RADIUS) {
          var chargeAdded = s.status === "OPERATIONAL" ? Math.min(CHARGE_CAP, Math.round(s.powerKW * hours * 10) / 10) : 0;
          var rangeAdded = s.status === "OPERATIONAL" ? Math.round(chargeAdded * 6) : 0;
          var cost = s.status === "OPERATIONAL" ? Math.round(chargeAdded * s.pricePerKWh) : 0;
          nearby.push({
            ...s,
            distance: Math.round(dist * 10) / 10,
            walkTimeMin: Math.round(dist * 12),
            chargeAddedKWh: chargeAdded,
            rangeAddedKm: rangeAdded,
            estimatedCost: cost,
          });
        }
      });

      // Sort by distance
      nearby.sort(function (a, b) { return a.distance - b.distance; });

      renderDestResultsData(resultsEl, { stations: nearby, landmark: landmark, durationMinutes: duration });
    }).catch(function (err) {
      resultsEl.innerHTML =
        '<div class="state-empty">' +
        '<div class="state-icon">' + VR.icons.alertCircle + '</div>' +
        '<p class="state-title">Search failed</p>' +
        '<p class="state-desc">' + escapeHtml(err.message || "Something went wrong") + '</p></div>';
    });
  }

  // Simple Haversine distance in km
  function haversineKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = ((lat2 - lat1) * Math.PI) / 180;
    var dLng = ((lng2 - lng1) * Math.PI) / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function renderDestResultsData(resultsEl, data) {
    var stations = data.stations || [];
    var landmark = data.landmark;
    var duration = data.durationMinutes;

    if (stations.length === 0) {
      resultsEl.innerHTML =
        '<div class="state-empty">' +
        '<div class="state-icon">' + VR.icons.mapPin + '</div>' +
        '<p class="state-title">No chargers nearby</p>' +
        '<p class="state-desc">No charging stations within ' + SEARCH_RADIUS_KM + ' km of ' + escapeHtml(landmark.name) + '. Try a different destination.</p>' +
        '</div>';
      return;
    }

    var maxCharge = 0;
    var maxRange = 0;

    // If the user checked "Use my car from Calculator", override the range
    // calculation with their actual EV efficiency instead of the default 6 km/kWh.
    var userEfficiency = null;
    var userBattery = null;
    if (dest.useCalcCar && VR.calcState) {
      userEfficiency = VR.calcState.efficiency;
      userBattery = VR.calcState.battery;
    }

    stations.forEach(function (s) {
      // Override range if user's car efficiency is available
      if (userEfficiency && s.chargeAddedKWh > 0) {
        s.rangeAddedKm = Math.round(s.chargeAddedKWh / userEfficiency);
      }
      // Add charge time (minutes) for display
      if (s.powerKW > 0 && s.chargeAddedKWh > 0) {
        s._chargeTimeMin = Math.round((s.chargeAddedKWh / s.powerKW) * 60);
      }
      if (s.chargeAddedKWh > maxCharge) maxCharge = s.chargeAddedKWh;
      if (s.rangeAddedKm > maxRange) maxRange = s.rangeAddedKm;
    });

    var html =
      '<div style="border:1px solid color-mix(in oklch, var(--primary) 30%, transparent);background:color-mix(in oklch, var(--primary) 5%, transparent);border-radius:var(--radius);padding:0.75rem;margin-bottom:0.75rem;display:flex;align-items:flex-start;gap:0.5rem;">' +
      '<span style="color:var(--primary);flex-shrink:0;margin-top:1px;">' + VR.icons.zap + '</span>' +
      '<p class="text-sm" style="line-height:1.5;">' +
      '<span class="font-semibold">' + stations.length + '</span> station' + (stations.length !== 1 ? "s" : "") +
      ' within ' + SEARCH_RADIUS_KM + ' km of <span class="font-semibold">' + escapeHtml(landmark.name) + '</span>. ' +
      'At <span class="font-semibold">' + fmtDuration(duration) + '</span>, you could add up to ' +
      '<span class="font-semibold text-primary">' + fmt1(maxCharge) + ' kWh</span> ' +
      '<span class="text-muted">(~' + maxRange + ' km of range)</span>.' +
      '</p></div>' +
      // Mini map showing the landmark + nearby stations with route lines
      '<div class="map-container mb-4" style="height:320px;"><div id="dest-map"></div></div>';

    stations.forEach(function (s) {
      html += renderDestStationCard(s);
    });

    resultsEl.innerHTML = html;

    // Initialize the mini map
    initDestMap(landmark, stations);

    // Attach "Show Route" button handlers — draws a thick blue line from the
    // landmark to the selected station and zooms to show both.
    resultsEl.querySelectorAll("[data-show-route]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var stationId = btn.dataset.showRoute;
        var station = stations.find(function (s) { return s.id === stationId; });
        if (!station || !dest._mapInstance) return;
        var map = dest._mapInstance;

        // Remove any previous highlight route
        if (dest._highlightRoute) {
          map.removeLayer(dest._highlightRoute);
          dest._highlightRoute = null;
        }

        // Add a thick solid blue line from landmark to this station
        dest._highlightRoute = L.polyline(
          [[landmark.lat, landmark.lng], [station.lat, station.lng]],
          { color: "#3b82f6", weight: 5, opacity: 0.85 }
        ).addTo(map);

        // Zoom to fit BOTH the landmark and the station (with minimum padding)
        var bounds = L.latLngBounds([[landmark.lat, landmark.lng], [station.lat, station.lng]]);
        // If both points are very close (station at landmark), pad more so the map doesn't zoom too far in
        var dist = Math.abs(landmark.lat - station.lat) + Math.abs(landmark.lng - station.lng);
        if (dist < 0.001) {
          // Same location — just center on it with a reasonable zoom
          map.setView([landmark.lat, landmark.lng], 16);
        } else {
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
        }

        // Open the station popup
        map.eachLayer(function (layer) {
          if (layer instanceof L.Marker && layer.getLatLng) {
            var ll = layer.getLatLng();
            if (Math.abs(ll.lat - station.lat) < 0.0001 && Math.abs(ll.lng - station.lng) < 0.0001) {
              layer.openPopup();
            }
          }
        });

        // Scroll the map into view
        var mapEl = document.getElementById("dest-map");
        if (mapEl) mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function initDestMap(landmark, stations) {
    if (typeof L === "undefined") return;
    var mapEl = document.getElementById("dest-map");
    if (!mapEl) return;

    // Clean up previous map if it exists
    if (dest._mapInstance) {
      dest._mapInstance.remove();
      dest._mapInstance = null;
      dest._highlightRoute = null;
    }

    var m = L.map(mapEl).setView([landmark.lat, landmark.lng], 14);
    dest._mapInstance = m;  // Store for "Show Route" button access
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(m);

    // Landmark marker (blue dot — bigger, always on top via high zIndexOffset)
    L.marker([landmark.lat, landmark.lng], {
      icon: L.divIcon({
        className: "ev-marker",
        html: '<div style="width:28px;height:28px;border-radius:50%;background:#3b82f6;border:4px solid white;box-shadow:0 2px 10px rgba(59,130,246,0.6);display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/></svg></div>',
        iconSize: [28, 28], iconAnchor: [14, 14],
      }),
      zIndexOffset: 1000,
    }).addTo(m).bindPopup("<b>" + landmark.name + "</b><br>" + landmark.category);

    // Station markers + blue route lines from landmark to each station
    var bounds = [[landmark.lat, landmark.lng]];
    stations.forEach(function (s) {
      var cls = s.status === "OPERATIONAL" ? "operational" : s.status === "MAINTENANCE" ? "maintenance" : "offline";
      var icon = L.divIcon({
        className: "ev-marker",
        html: '<div class="ev-marker-pin ' + cls + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>',
        iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -30],
      });
      L.marker([s.lat, s.lng], { icon: icon }).addTo(m).bindPopup(
        "<b>" + s.name + "</b><br>" + s.operator + " · " + s.powerKW + " kW<br>" +
        "Charge: +" + s.chargeAddedKWh + " kWh (~" + s.rangeAddedKm + " km)<br>" +
        "Cost: ₹" + s.estimatedCost + " · " + s.distance + " km away"
      );
      bounds.push([s.lat, s.lng]);

      // Blue dashed line from landmark to station (route line)
      L.polyline(
        [[landmark.lat, landmark.lng], [s.lat, s.lng]],
        { color: "#3b82f6", weight: 2, opacity: 0.6, dashArray: "6,6" }
      ).addTo(m);
    });

    if (bounds.length > 1) m.fitBounds(bounds, { padding: [40, 40] });
    setTimeout(function () { m.invalidateSize(); }, 200);
  }

  function renderDestStationCard(s) {
    var isOperational = s.status === "OPERATIONAL";
    var statusCls = statusBadgeClass(s.status);
    var statusLbl = statusLabel(s.status);
    var directionsUrl = "https://www.google.com/maps/dir/?api=1&destination=" + s.lat + "," + s.lng;
    var chargePct = Math.min(100, Math.round((s.chargeAddedKWh / CHARGE_CAP_KWH) * 100));

    var connectors = (s.connectorTypes && s.connectorTypes.length > 0)
      ? s.connectorTypes.map(function (c) { return '<span class="badge">' + escapeHtml(c) + '</span>'; }).join("")
      : '<span class="text-xs text-muted">No connector info</span>';

    return '<div class="card mb-3" style="padding:0;overflow:hidden;">' +
      // Top: identity + status
      '<div class="dest-card-top">' +
      '<div style="display:flex;align-items:flex-start;gap:0.75rem;min-width:0;">' +
      '<div style="width:2.5rem;height:2.5rem;border-radius:var(--radius);background:color-mix(in oklch, var(--primary) 10%, transparent);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + VR.icons.zap + '</div>' +
      '<div style="min-width:0;">' +
      '<p style="font-weight:600;font-size:0.875rem;line-height:1.3;">' + escapeHtml(s.name) + '</p>' +
      '<div style="display:flex;align-items:center;gap:0.375rem;font-size:0.75rem;color:var(--muted-foreground);margin-top:0.25rem;flex-wrap:wrap;">' +
      '<span>' + escapeHtml(s.operator) + '</span><span aria-hidden="true">\u00B7</span><span>' + escapeHtml(s.area) + '</span>' +
      '</div></div></div>' +
      '<span class="badge ' + statusCls + '" style="flex-shrink:0;"><span class="badge-dot"></span>' + statusLbl + '</span>' +
      '</div>' +
      // Distance + walk time strip
      '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:var(--muted);font-size:0.75rem;border-top:1px solid var(--border);border-bottom:1px solid var(--border);">' +
      '<span style="color:var(--primary);">' + VR.icons.navigation + '</span>' +
      (s.distance > 0
        ? '<span style="font-weight:500;">' + fmt1(s.distance) + ' km</span><span class="text-muted" aria-hidden="true">\u00B7</span><span class="text-muted">' + s.walkTimeMin + ' min walk</span>'
        : '<span class="text-muted">At this destination</span>') +
      '</div>' +
      // Three big metrics
      '<div class="dest-metrics">' +
      // Charge added
      '<div class="dest-metric"' + (isOperational ? ' style="background:color-mix(in oklch, var(--primary) 5%, transparent);"' : '') + '>' +
      '<div style="display:flex;align-items:center;gap:0.375rem;font-size:0.75rem;color:var(--muted-foreground);">' + VR.icons.battery + ' Charge added</div>' +
      (isOperational
        ? '<div style="font-size:1.5rem;font-weight:700;margin-top:0.25rem;"><span style="color:var(--primary);">' + fmt1(s.chargeAddedKWh) + '</span><span class="text-muted text-sm font-normal" style="margin-left:0.25rem;">kWh</span></div>' +
        '<div style="height:0.375rem;border-radius:9999px;background:var(--muted);overflow:hidden;margin-top:0.375rem;"><div style="height:100%;background:var(--primary);border-radius:9999px;width:' + chargePct + '%;transition:width 0.5s;"></div></div>'
        : '<div style="font-size:1.125rem;font-weight:600;margin-top:0.25rem;color:var(--muted-foreground);">Unavailable</div>') +
      '</div>' +
      // Range added
      '<div class="dest-metric">' +
      '<div style="display:flex;align-items:center;gap:0.375rem;font-size:0.75rem;color:var(--muted-foreground);">' + VR.icons.route + ' Range added</div>' +
      (isOperational
        ? '<div style="font-size:1.5rem;font-weight:700;margin-top:0.25rem;display:flex;align-items:center;gap:0.375rem;">' + VR.icons.car + ' <span>~' + s.rangeAddedKm + '<span class="text-muted text-sm font-normal" style="margin-left:0.25rem;">km</span></span></div>'
        : '<div style="font-size:1.125rem;font-weight:600;margin-top:0.25rem;color:var(--muted-foreground);">\u2014</div>') +
      '</div>' +
      // Estimated cost + charge time
      '<div class="dest-metric">' +
      '<div style="display:flex;align-items:center;gap:0.375rem;font-size:0.75rem;color:var(--muted-foreground);">' + VR.icons.wallet + ' Cost &amp; Time</div>' +
      (isOperational
        ? '<div style="font-size:1.25rem;font-weight:700;margin-top:0.25rem;">\u20B9' + s.estimatedCost.toLocaleString("en-IN") + '</div>' +
        '<div style="font-size:0.75rem;color:var(--muted-foreground);margin-top:0.25rem;display:flex;align-items:center;gap:0.25rem;">' + VR.icons.clock + ' ' + fmtDuration(s._chargeTimeMin || Math.round((s.chargeAddedKWh / s.powerKW) * 60)) + ' charging</div>'
        : '<div style="font-size:1.125rem;font-weight:600;margin-top:0.25rem;color:var(--muted-foreground);">\u2014</div>') +
      '</div>' +
      '</div>' +
      // Footer: connectors + buttons
      '<div class="dest-card-footer">' +
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.375rem;">' +
      connectors +
      '<span class="text-xs text-muted" style="margin-left:0.25rem;">\u00B7 ' + s.powerKW + ' kW \u00B7 ' + s.availablePorts + '/' + s.numberOfPorts + ' ports</span>' +
      '</div>' +
      '<div style="display:flex;gap:0.375rem;flex-shrink:0;">' +
      '<button class="btn btn-outline btn-sm" data-show-route="' + s.id + '">' + VR.icons.route + ' Show Route</button>' +
      '<a href="' + directionsUrl + '" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="text-decoration:none;">' + VR.icons.navigation + ' Directions</a>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  /* ============================================================
     PLANNER VIEW
     ============================================================ */

  var planner = {
    weeklyKm: 250,
    homeSectorName: "Sector 28",
    workSectorName: "Satellite",
    efficiency: 0.15,
    battery: 40,
    petrolMileage: 15,
    petrolPrice: 105,
    stations: [],
    stationsLoaded: false
  };

  VR.views.planner = function (container) {
    container.innerHTML =
      '<style>' +
      '.planner-grid { display:grid; grid-template-columns:1fr; gap:1.5rem; align-items:start; }' +
      '@media (min-width:1024px) { .planner-grid { grid-template-columns:1fr 1fr; } }' +
      '#planner-form { position:sticky; top:5rem; }' +
      '#planner-results { min-width:0; }' +
      '</style>' +
      '<div class="section" style="max-width:72rem;">' +
      '<div class="mb-6">' +
      '' +
      '<h1 class="text-2xl font-bold">EV Readiness Planner</h1>' +
      '<p class="text-sm text-muted mt-2" style="max-width:42rem;">Thinking of buying an EV? Tell us how much you drive and where \u2014 we\'ll show you whether public charging in Gandhinagar &amp; Ahmedabad works for you, and how long it takes for the fuel savings to pay off the extra cost of an EV.</p>' +
      '</div>' +
      // Lightbulb explainer
      '<div style="display:flex;align-items:flex-start;gap:0.625rem;border:1px solid color-mix(in oklch, var(--primary) 20%, transparent);background:color-mix(in oklch, var(--primary) 5%, transparent);border-radius:var(--radius);padding:0.75rem;max-width:48rem;margin-bottom:1.5rem;">' +
      '<span style="color:var(--primary);flex-shrink:0;margin-top:1px;">' + VR.icons.lightbulb + '</span>' +
      '<p class="text-xs text-muted" style="line-height:1.5;"><strong style="color:var(--foreground);">What is the "EV premium"?</strong> Electric cars cost more to buy than petrol cars \u2014 about <strong style="color:var(--primary);">\u20B92,00,000 extra</strong> for a similar model. But electricity is much cheaper than petrol, so you save money every month on fuel. This tool tells you how many months of those savings it takes to earn back that extra \u20B92 lakh.</p>' +
      '</div>' +
      '<div class="planner-grid">' +
      '<div id="planner-form"></div>' +
      '<div id="planner-results"></div>' +
      '</div>' +
      '</div>';

    var formEl = container.querySelector("#planner-form");
    var resultsEl = container.querySelector("#planner-results");

    renderPlannerForm(formEl, resultsEl);
    renderPlannerResults(resultsEl);

    if (!planner.stationsLoaded) {
      fetch("/api/stations").then(function (r) { return r.json(); }).then(function (data) {
        planner.stations = data.stations || [];
        planner.stationsLoaded = true;
        renderPlannerResults(resultsEl);
      }).catch(function () {
        planner.stations = [];
        planner.stationsLoaded = true;
        renderPlannerResults(resultsEl);
      });
    }
  };

  function buildAreaOptions(selectedName) {
    var g = GANDHINAGAR_SECTORS.map(function (s) {
      return '<option value="' + escapeHtml(s.name) + '"' + (selectedName === s.name ? " selected" : "") + '>' + escapeHtml(s.name) + '</option>';
    }).join("");
    var a = AHMEDABAD_AREAS.map(function (s) {
      return '<option value="' + escapeHtml(s.name) + '"' + (selectedName === s.name ? " selected" : "") + '>' + escapeHtml(s.name) + '</option>';
    }).join("");
    return '<optgroup label="Gandhinagar">' + g + '</optgroup><optgroup label="Ahmedabad">' + a + '</optgroup>';
  }

  function renderPlannerForm(formEl, resultsEl) {
    formEl.innerHTML =
      '<div class="card">' +
      '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">' +
      '<div style="width:2rem;height:2rem;border-radius:var(--radius);background:color-mix(in oklch, var(--primary) 15%, transparent);color:var(--primary);display:flex;align-items:center;justify-content:center;">' + VR.icons.calculator + '</div>' +
      '<div><p style="font-weight:600;font-size:0.875rem;">Your driving profile</p>' +
      '<p style="font-size:0.75rem;color:var(--muted-foreground);">Adjust the inputs \u2014 results update live.</p></div>' +
      '</div>' +
      // Weekly km
      '<div class="mb-4"><label class="label">' + VR.icons.route + ' Weekly distance</label>' +
      '<input class="input" type="number" id="planner-weekly-km" min="50" max="2000" step="10" value="' + planner.weeklyKm + '">' +
      '<p class="text-xs text-muted mt-2">Range 50\u20132000 km/week. Default 250.</p></div>' +
      '<div style="border-top:1px solid var(--border);margin:0.75rem 0;"></div>' +
      // Home sector
      '<div class="mb-4"><label class="label">' + VR.icons.mapPin + ' Home sector</label>' +
      '<select class="input" id="planner-home-sector">' + buildAreaOptions(planner.homeSectorName) + '</select></div>' +
      // Work sector
      '<div class="mb-4"><label class="label">' + VR.icons.mapPin + ' Work sector</label>' +
      '<select class="input" id="planner-work-sector">' + buildAreaOptions(planner.workSectorName) + '</select></div>' +
      '<div style="border-top:1px solid var(--border);margin:0.75rem 0;"></div>' +
      // EV efficiency
      '<div class="mb-4"><label class="label">' + VR.icons.zap + ' EV efficiency</label>' +
      '<select class="input" id="planner-efficiency">' +
      EFFICIENCY_PRESETS.map(function (p) {
        return '<option value="' + p.value + '"' + (planner.efficiency === p.value ? " selected" : "") + '>' + escapeHtml(p.label) + '</option>';
      }).join("") +
      '</select></div>' +
      // Battery capacity
      '<div class="mb-4"><label class="label">' + VR.icons.battery + ' Battery capacity</label>' +
      '<select class="input" id="planner-battery">' +
      BATTERY_OPTIONS.map(function (b) {
        return '<option value="' + b + '"' + (planner.battery === b ? " selected" : "") + '>' + b + ' kWh</option>';
      }).join("") +
      '</select></div>' +
      '<div style="border-top:1px solid var(--border);margin:0.75rem 0;"></div>' +
      // Petrol mileage
      '<div class="mb-4"><label class="label">' + VR.icons.fuel + ' Petrol car mileage</label>' +
      '<div style="display:flex;align-items:center;gap:0.5rem;">' +
      '<input class="input" type="number" id="planner-mileage" min="1" max="40" value="' + planner.petrolMileage + '">' +
      '<span class="text-sm text-muted" style="white-space:nowrap;">km/liter</span></div></div>' +
      // Petrol price
      '<div class="mb-2"><label class="label">' + VR.icons.wallet + ' Petrol price</label>' +
      '<div style="display:flex;align-items:center;gap:0.5rem;">' +
      '<input class="input" type="number" id="planner-price" min="1" max="300" value="' + planner.petrolPrice + '">' +
      '<span class="text-sm text-muted" style="white-space:nowrap;">\u20B9/liter</span></div></div>' +
      '</div>';

    // ---- Attach events (only re-render results, never the form, to preserve focus) ----

    var weeklyKmInput = formEl.querySelector("#planner-weekly-km");
    if (weeklyKmInput) {
      weeklyKmInput.addEventListener("input", function () {
        var v = Number(weeklyKmInput.value);
        if (!isNaN(v)) {
          planner.weeklyKm = Math.min(2000, Math.max(50, v));
          renderPlannerResults(resultsEl);
        }
      });
    }

    var homeSelect = formEl.querySelector("#planner-home-sector");
    if (homeSelect) {
      homeSelect.addEventListener("change", function () {
        planner.homeSectorName = homeSelect.value;
        renderPlannerResults(resultsEl);
      });
    }

    var workSelect = formEl.querySelector("#planner-work-sector");
    if (workSelect) {
      workSelect.addEventListener("change", function () {
        planner.workSectorName = workSelect.value;
        renderPlannerResults(resultsEl);
      });
    }

    var effSelect = formEl.querySelector("#planner-efficiency");
    if (effSelect) {
      effSelect.addEventListener("change", function () {
        planner.efficiency = Number(effSelect.value);
        renderPlannerResults(resultsEl);
      });
    }

    var batterySelect = formEl.querySelector("#planner-battery");
    if (batterySelect) {
      batterySelect.addEventListener("change", function () {
        planner.battery = Number(batterySelect.value);
        renderPlannerResults(resultsEl);
      });
    }

    var mileageInput = formEl.querySelector("#planner-mileage");
    if (mileageInput) {
      mileageInput.addEventListener("input", function () {
        var v = Number(mileageInput.value);
        if (!isNaN(v)) {
          planner.petrolMileage = v;
          renderPlannerResults(resultsEl);
        }
      });
    }

    var priceInput = formEl.querySelector("#planner-price");
    if (priceInput) {
      priceInput.addEventListener("input", function () {
        var v = Number(priceInput.value);
        if (!isNaN(v)) {
          planner.petrolPrice = v;
          renderPlannerResults(resultsEl);
        }
      });
    }
  }

  function computePlannerResults() {
    var home = findArea(planner.homeSectorName);
    var work = findArea(planner.workSectorName);

    var weeklyEnergy = planner.weeklyKm * planner.efficiency; // kWh / week
    var sessionsPerWeek = Math.max(1, Math.ceil(weeklyEnergy / planner.battery));
    var monthlyEnergy = weeklyEnergy * WEEKS_PER_MONTH;

    // Score stations by distance to home or work
    var scored = (planner.stations || []).map(function (s) {
      var dHome = home ? simpleDistanceKm(home.lat, home.lng, s.lat, s.lng) : Infinity;
      var dWork = work ? simpleDistanceKm(work.lat, work.lng, s.lat, s.lng) : Infinity;
      var nearest = Math.min(dHome, dWork);
      return { station: s, dHome: dHome, dWork: dWork, nearest: nearest };
    }).filter(function (x) { return x.nearest <= NEARBY_KM; })
      .sort(function (a, b) { return a.nearest - b.nearest; });

    var suitable = scored.slice(0, 5);

    // Average price from suitable stations (or all stations as fallback)
    var priceSource = suitable.length > 0
      ? suitable.map(function (x) { return x.station.pricePerKWh; })
      : (planner.stations || []).map(function (s) { return s.pricePerKWh; });
    var avgPrice = priceSource.length > 0
      ? priceSource.reduce(function (a, b) { return a + b; }, 0) / priceSource.length
      : DEFAULT_AVG_PRICE;

    var monthlyEV = monthlyEnergy * avgPrice;
    var monthlyPetrol = ((planner.weeklyKm * WEEKS_PER_MONTH) / Math.max(1, planner.petrolMileage)) * planner.petrolPrice;
    var monthlySavings = monthlyPetrol - monthlyEV;
    var annualSavings = monthlySavings * 12;
    var breakEvenYears = annualSavings > 0 ? EV_PREMIUM_INR / annualSavings : Infinity;

    // Verdict logic per task spec:
    //   green  if savings > 0 and sessions <= 3
    //   amber  if sessions 4-5
    //   red    if sessions > 5  (also red if no savings or no nearby stations)
    var verdict;
    if (suitable.length === 0) verdict = "challenging";
    else if (sessionsPerWeek > 5) verdict = "challenging";
    else if (sessionsPerWeek >= 4) verdict = "tight";
    else if (monthlySavings > 0) verdict = "ready";
    else verdict = "challenging";

    return {
      weeklyEnergy: weeklyEnergy,
      sessionsPerWeek: sessionsPerWeek,
      monthlyEnergy: monthlyEnergy,
      monthlyEV: monthlyEV,
      monthlyPetrol: monthlyPetrol,
      monthlySavings: monthlySavings,
      annualSavings: annualSavings,
      breakEvenYears: breakEvenYears,
      avgPrice: avgPrice,
      suitable: suitable,
      home: home,
      work: work,
      verdict: verdict
    };
  }

  function renderPlannerResults(resultsEl) {
    if (!planner.stationsLoaded) {
      resultsEl.innerHTML =
        '<div class="card" style="padding:3rem;text-align:center;">' +
        '<div class="skeleton" style="width:2rem;height:2rem;border-radius:50%;margin:0 auto 0.75rem;"></div>' +
        '<p class="text-sm text-muted">Loading charging network\u2026</p></div>';
      return;
    }

    var r = computePlannerResults();

    // ---- Verdict meta ----
    var verdictMeta = {
      ready: {
        title: "EV Ready \u2713",
        desc: "Public charging fits your weekly routine comfortably. Going electric looks like a smart move.",
        color: "var(--status-operational)",
        bg: "color-mix(in oklch, var(--status-operational) 10%, transparent)",
        border: "color-mix(in oklch, var(--status-operational) 30%, transparent)",
        icon: VR.icons.checkCircle
      },
      tight: {
        title: "Tight but doable",
        desc: "You'd be charging 4\u20135 times a week. Workable, but plan your top-ups \u2014 especially near your workplace.",
        color: "var(--status-maintenance)",
        bg: "color-mix(in oklch, var(--status-maintenance) 10%, transparent)",
        border: "color-mix(in oklch, var(--status-maintenance) 30%, transparent)",
        icon: VR.icons.alertCircle
      },
      challenging: {
        title: "Challenging",
        desc: "You'd need to charge too often, or there aren't enough public stations near your home/work. Home or workplace charging would change the math.",
        color: "var(--status-offline)",
        bg: "color-mix(in oklch, var(--status-offline) 10%, transparent)",
        border: "color-mix(in oklch, var(--status-offline) 30%, transparent)",
        icon: VR.icons.alertCircle
      }
    };
    var vm = verdictMeta[r.verdict];

    var html = '';

    // ---- Verdict card ----
    html +=
      '<div class="card mb-4" style="border:2px solid ' + vm.border + ';background:' + vm.bg + ';padding:1.25rem;">' +
      '<div style="display:flex;align-items:flex-start;gap:1rem;">' +
      '<div style="width:3.5rem;height:3.5rem;border-radius:var(--radius);background:color-mix(in oklch, ' + vm.color + ' 15%, transparent);color:' + vm.color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + vm.icon + '</div>' +
      '<div style="flex:1;min-width:0;">' +
      '<h2 style="font-size:1.5rem;font-weight:700;color:' + vm.color + ';">' + vm.title + '</h2>' +
      '<p class="text-sm text-muted mt-2" style="line-height:1.5;">' + vm.desc + '</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem;">' +
      '<span class="badge" style="border:1px solid var(--border);background:var(--card);">' + VR.icons.zap + ' ' + r.sessionsPerWeek + ' session' + (r.sessionsPerWeek !== 1 ? "s" : "") + '/week</span>' +
      '<span class="badge" style="border:1px solid var(--border);background:var(--card);">' + VR.icons.mapPin + ' ' + r.suitable.length + ' station' + (r.suitable.length !== 1 ? "s" : "") + ' on your route</span>' +
      (r.monthlySavings > 0
        ? '<span class="badge badge-success">' + VR.icons.trendingUp + ' Save ' + inr(r.monthlySavings) + '/mo</span>'
        : '<span class="badge badge-danger">' + VR.icons.trendingUp + ' EV costs more</span>') +
      '</div>' +
      '</div></div></div>';

    // ---- Big numbers: sessions + break-even ----
    html +=
      '<div class="grid grid-2 mb-4">' +
      '<div class="card" style="padding:1.25rem;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
      '<div><p class="text-xs text-muted" style="text-transform:uppercase;font-weight:500;display:flex;align-items:center;gap:0.375rem;">' + VR.icons.zap + ' Charging sessions / week</p>' +
      '<div style="display:flex;align-items:baseline;gap:0.5rem;margin-top:0.5rem;"><span style="font-size:2.5rem;font-weight:700;color:var(--primary);">' + r.sessionsPerWeek + '</span><span class="text-sm text-muted">top-up' + (r.sessionsPerWeek !== 1 ? "s" : "") + '</span></div>' +
      '<p class="text-xs text-muted mt-2">' + fmt1(r.weeklyEnergy) + ' kWh/week \u00F7 ' + planner.battery + ' kWh battery</p></div>' +
      '<div style="width:3.5rem;height:3.5rem;border-radius:var(--radius);background:color-mix(in oklch, var(--primary) 10%, transparent);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + VR.icons.battery + '</div>' +
      '</div></div>' +
      '<div class="card" style="padding:1.25rem;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="flex:1;min-width:0;"><p class="text-xs text-muted" style="text-transform:uppercase;font-weight:500;display:flex;align-items:center;gap:0.375rem;">' + VR.icons.calendarClock + ' When fuel savings pay off the extra EV cost</p>' +
      '<div style="display:flex;align-items:baseline;gap:0.5rem;margin-top:0.5rem;">' +
      (isFinite(r.breakEvenYears)
        ? '<span style="font-size:2.5rem;font-weight:700;color:var(--status-operational);">' + fmt1(r.breakEvenYears) + '</span>'
        : '<span style="font-size:1.875rem;font-weight:700;color:var(--status-offline);">Never</span>') +
      '<span class="text-sm text-muted">years</span></div>' +
      '<p class="text-xs text-muted mt-2">Time for fuel savings to cover the \u20B92L extra you paid for an EV</p></div>' +
      '<div style="width:3.5rem;height:3.5rem;border-radius:var(--radius);background:color-mix(in oklch, var(--status-operational) 10%, transparent);color:var(--status-operational);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + VR.icons.calendarClock + '</div>' +
      '</div></div>' +
      '</div>';

    // ---- Monthly cost comparison ----
    var costMax = Math.max(r.monthlyEV, r.monthlyPetrol, 1);
    var evBarPct = Math.round((r.monthlyEV / costMax) * 100);
    var petrolBarPct = Math.round((r.monthlyPetrol / costMax) * 100);
    var petrolLiters = (planner.weeklyKm * WEEKS_PER_MONTH) / Math.max(1, planner.petrolMileage);

    html +=
      '<div class="card mb-4" style="padding:1.25rem;">' +
      '<p style="font-weight:600;font-size:0.875rem;display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">' + VR.icons.wallet + ' Monthly cost comparison</p>' +
      '<p class="text-xs text-muted mb-4">Based on ' + fmt1(r.monthlyEnergy) + ' kWh/month EV energy &amp; ' + fmt1(petrolLiters) + ' liters/month petrol.</p>' +
      // EV bar
      '<div class="mb-4"><div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:0.375rem;">' +
      '<span style="display:flex;align-items:center;gap:0.375rem;font-weight:500;">' + VR.icons.zap + ' EV charging</span>' +
      '<span style="font-weight:600;color:var(--primary);">' + inr(r.monthlyEV) + '</span></div>' +
      '<div style="height:0.75rem;border-radius:9999px;background:var(--muted);overflow:hidden;"><div style="height:100%;background:var(--primary);border-radius:9999px;width:' + evBarPct + '%;transition:width 0.5s;"></div></div>' +
      '<p class="text-xs text-muted mt-2">' + fmt1(r.monthlyEnergy) + ' kWh \u00D7 \u20B9' + fmt1(r.avgPrice) + '/kWh</p></div>' +
      // Petrol bar
      '<div class="mb-4"><div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:0.375rem;">' +
      '<span style="display:flex;align-items:center;gap:0.375rem;font-weight:500;">' + VR.icons.fuel + ' Petrol</span>' +
      '<span style="font-weight:600;color:var(--status-maintenance);">' + inr(r.monthlyPetrol) + '</span></div>' +
      '<div style="height:0.75rem;border-radius:9999px;background:var(--muted);overflow:hidden;"><div style="height:100%;background:var(--status-maintenance);border-radius:9999px;width:' + petrolBarPct + '%;transition:width 0.5s;"></div></div>' +
      '<p class="text-xs text-muted mt-2">' + fmt1(petrolLiters) + ' liters \u00D7 \u20B9' + planner.petrolPrice + '/liter</p></div>' +
      // Savings row
      '<div style="border-top:1px solid var(--border);margin-top:0.75rem;padding-top:0.75rem;" class="grid grid-2">' +
      '<div style="text-align:center;border-radius:var(--radius);background:color-mix(in oklch, var(--status-operational) 10%, transparent);border:1px solid color-mix(in oklch, var(--status-operational) 20%, transparent);padding:0.75rem;">' +
      '<p class="text-xs text-muted" style="text-transform:uppercase;font-weight:500;display:flex;align-items:center;justify-content:center;gap:0.375rem;">' + VR.icons.trendingUp + ' Monthly savings</p>' +
      '<p style="font-size:1.5rem;font-weight:700;color:var(--status-operational);margin-top:0.25rem;">' + inr(Math.max(0, r.monthlySavings)) + '</p>' +
      '<p class="text-xs text-muted mt-2">' + (r.monthlySavings > 0 ? "You save this every month vs petrol" : "EV currently costs more than petrol") + '</p>' +
      '</div>' +
      '<div style="text-align:center;border-radius:var(--radius);background:color-mix(in oklch, var(--status-operational) 10%, transparent);border:1px solid color-mix(in oklch, var(--status-operational) 20%, transparent);padding:0.75rem;">' +
      '<p class="text-xs text-muted" style="text-transform:uppercase;font-weight:500;display:flex;align-items:center;justify-content:center;gap:0.375rem;">' + VR.icons.star + ' Annual savings</p>' +
      '<p style="font-size:1.5rem;font-weight:700;color:var(--status-operational);margin-top:0.25rem;">' + inr(Math.max(0, r.annualSavings)) + '</p>' +
      '<p class="text-xs text-muted mt-2">Over a year of driving ' + planner.weeklyKm + ' km/week</p>' +
      '</div></div>' +
      // Break-even text
      '<div style="margin-top:1rem;padding:0.75rem;border-radius:var(--radius);background:var(--muted);">' +
      '<p class="text-sm text-muted" style="line-height:1.5;">' +
      (isFinite(r.breakEvenYears) && r.breakEvenYears <= OWNERSHIP_HORIZON_YEARS
        ? 'You pay about <strong style="color:var(--foreground);">\u20B92,00,000 extra</strong> upfront for an EV. At your driving rate, your fuel savings will pay that back in <strong style="color:var(--status-operational);">' + fmt1(r.breakEvenYears) + ' years</strong>. After that, every kilometre you drive is money in your pocket.'
        : 'At your current driving, it would take more than <strong style="color:var(--foreground);">' + OWNERSHIP_HORIZON_YEARS + ' years</strong> for fuel savings to cover the \u20B92,00,000 extra cost of an EV. Driving more, or charging at cheaper stations, would tip the math in your favour.') +
      '</p></div>' +
      '</div>';

    // ---- Stations on your route ----
    html +=
      '<div class="card mb-4" style="padding:1.25rem;">' +
      '<p style="font-weight:600;font-size:0.875rem;display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">' + VR.icons.route + ' Stations on your route</p>' +
      '<p class="text-xs text-muted mb-4">Within ' + NEARBY_KM + ' km of your home (' + escapeHtml(planner.homeSectorName) + ') or work (' + escapeHtml(planner.workSectorName) + ') \u2014 ranked by nearest distance.</p>';

    if (r.suitable.length === 0) {
      html +=
        '<div style="border:1px dashed var(--border);border-radius:var(--radius);background:var(--muted);padding:1.5rem;text-align:center;">' +
        '<div style="width:2rem;height:2rem;margin:0 auto 0.5rem;color:var(--muted-foreground);">' + VR.icons.mapPin + '</div>' +
        '<p style="font-size:0.875rem;font-weight:500;">No public stations within ' + NEARBY_KM + ' km of your home or work.</p>' +
        '<p class="text-xs text-muted mt-2">This is the biggest blocker for EV adoption without home charging. Try different sectors, or explore the full network on the map.</p>' +
        '<button class="btn btn-outline btn-sm mt-3" data-nav="stations">' + VR.icons.mapPin + ' Open the map</button>' +
        '</div>';
    } else {
      html += '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
      r.suitable.forEach(function (x, i) {
        var s = x.station;
        var isNearHome = x.dHome <= x.dWork;
        var nearLabel = isNearHome ? "Near home" : "Near work";
        var statusColor = s.status === "OPERATIONAL" ? "var(--status-operational)" : s.status === "MAINTENANCE" ? "var(--status-maintenance)" : "var(--status-offline)";
        var shortLbl = shortStatusLabel(s.status);
        html +=
          '<div class="card" style="padding:0.75rem;display:flex;align-items:center;gap:0.75rem;cursor:pointer;transition:border-color 0.15s;" data-station-card="' + s.id + '">' +
          '<div style="width:2.25rem;height:2.25rem;border-radius:var(--radius);background:color-mix(in oklch, var(--primary) 10%, transparent);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:0.875rem;font-weight:600;flex-shrink:0;">' + (i + 1) + '</div>' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">' +
          '<p style="font-weight:500;font-size:0.875rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(s.name) + '</p>' +
          '<span class="badge" style="background:color-mix(in oklch, ' + statusColor + ' 15%, transparent);color:' + statusColor + ';">' + shortLbl + '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:0.75rem;font-size:0.75rem;color:var(--muted-foreground);margin-top:0.25rem;flex-wrap:wrap;">' +
          '<span style="display:flex;align-items:center;gap:0.25rem;">' + VR.icons.mapPin + ' ' + escapeHtml(s.operator) + '</span>' +
          '<span style="display:flex;align-items:center;gap:0.25rem;">' + VR.icons.zap + ' ' + s.powerKW + ' kW</span>' +
          '<span style="display:flex;align-items:center;gap:0.25rem;">' + VR.icons.wallet + ' \u20B9' + s.pricePerKWh + '/kWh</span>' +
          '</div>' +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0;">' +
          '<span class="badge mb-2" style="display:inline-flex;">' + VR.icons.mapPin + ' ' + nearLabel + '</span>' +
          '<p style="font-size:0.875rem;font-weight:600;color:var(--primary);">' + fmt1(Math.min(x.dHome, x.dWork)) + ' km</p>' +
          '</div>' +
          '</div>';
      });
      html += '</div>';
    }

    html += '</div>';

    // ---- Home charging note ----
    var fastFillHours = fmt1(planner.battery / 30);
    var slowFillHours = fmt1(planner.battery / 7.4);
    html +=
      '<div class="card" style="padding:1.25rem;background:color-mix(in oklch, var(--primary) 5%, transparent);border:1px solid color-mix(in oklch, var(--primary) 20%, transparent);">' +
      '<div style="display:flex;align-items:flex-start;gap:0.75rem;">' +
      '<div style="width:2.5rem;height:2.5rem;border-radius:var(--radius);background:color-mix(in oklch, var(--primary) 15%, transparent);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + VR.icons.info + '</div>' +
      '<div><h3 style="font-weight:600;font-size:0.875rem;">A note on home charging</h3>' +
      '<p class="text-sm text-muted mt-2" style="line-height:1.5;">Since you may not have home charging, you\'ll rely on public stations. Consider stations near your workplace for daytime top-ups while you work \u2014 a full ' + planner.battery + ' kWh fill from empty takes roughly <strong style="color:var(--foreground);">' + fastFillHours + '\u2013' + slowFillHours + ' hours</strong> on a typical 7.4\u201330 kW charger. Plan to plug in once or twice during your workday.</p></div>' +
      '</div></div>';

    resultsEl.innerHTML = html;

    // Attach station card click handlers (open detail modal)
    resultsEl.querySelectorAll("[data-station-card]").forEach(function (card) {
      card.addEventListener("click", function () {
        VR.openStationDetail(card.dataset.stationCard);
      });
    });
  }
})();
