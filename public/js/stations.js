/* stations.js — Station finder: map + list + filters + detail modal */

(function () {
  "use strict";
  window.VR = window.VR || {};

  var mapInstance = null;
  var markers = [];

  VR.views.stations = function (container) {
    VR.state.filters = VR.state.filters || {};
    var mode = VR.state.displayMode || "split";

    container.innerHTML =
      '<div class="section">' +
      '<div class="mb-4"><h1 class="text-2xl font-bold">Find Charging Stations</h1>' +
      '<p class="text-sm text-muted mt-2">Discover EV charging stations across Gandhinagar, Ahmedabad & nearby areas. Use filters or "Near Me" to refine your search.</p></div>' +
      '<div id="stations-app"></div>' +
      '</div>';

    var app = container.querySelector("#stations-app");
    renderStationsApp(app);
  };

  function renderStationsApp(app) {
    var mode = VR.state.displayMode || "split";
    var filters = VR.state.filters || {};

    // Build query string
    var qs = Object.entries(filters)
      .filter(function (e) { return e[1] !== undefined && e[1] !== "" && e[1] !== null; })
      .map(function (e) { return e[0] + "=" + encodeURIComponent(e[1]); })
      .join("&");

    app.innerHTML =
      // Filter bar
      '<div class="filter-bar mb-4">' +
      '<div class="filter-search"><span>' + VR.icons.search + '</span><input class="input" id="search-input" placeholder="Search by name, area, operator..." value="' + (filters.search || "") + '"></div>' +
      '<button class="btn btn-outline" id="near-me-btn">' + VR.icons.crosshair + ' <span class="hidden sm:inline">Near Me</span><span class="sm:hidden">Near</span></button>' +
      '<div style="position:relative;"><button class="btn btn-outline" id="filters-btn">' + VR.icons.sliders + ' <span class="hidden sm:inline">Filters</span></button>' +
      '<div class="dropdown-menu" id="filters-menu" style="left:0;right:auto;width:20rem;padding:1rem;">' +
      '<div class="mb-2"><label class="label">City</label><select class="input" id="filter-city"><option value="">All cities</option><option value="Gandhinagar"' + (filters.city === "Gandhinagar" ? " selected" : "") + '>Gandhinagar</option><option value="Ahmedabad"' + (filters.city === "Ahmedabad" ? " selected" : "") + '>Ahmedabad</option></select></div>' +
      '<div class="mb-2"><label class="label">Operator</label><select class="input" id="filter-operator"><option value="">All operators</option>' +
      ["Tata Power", "ChargeZone", "Ather Grid", "Statiq", "Exicom", "Magenta"].map(function (o) { return '<option value="' + o + '"' + (filters.operator === o ? " selected" : "") + '>' + o + '</option>'; }).join("") +
      '</select></div>' +
      '<div class="mb-2"><label class="label">Connector Type</label><select class="input" id="filter-connector"><option value="">Any connector</option>' +
      ["CCS", "Type2", "CHAdeMO", "BharatAC"].map(function (c) { return '<option value="' + c + '"' + (filters.connectorType === c ? " selected" : "") + '>' + c + '</option>'; }).join("") +
      '</select></div>' +
      '<div class="mb-2"><label class="label">Min Power (kW)</label><select class="input" id="filter-power"><option value="">Any power</option><option value="7"' + (filters.minPower == 7 ? " selected" : "") + '>7+ kW</option><option value="30"' + (filters.minPower == 30 ? " selected" : "") + '>30+ kW</option><option value="50"' + (filters.minPower == 50 ? " selected" : "") + '>50+ kW</option><option value="100"' + (filters.minPower == 100 ? " selected" : "") + '>100+ kW</option><option value="150"' + (filters.minPower == 150 ? " selected" : "") + '>150+ kW</option></select></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;"><label class="label" for="filter-available" style="margin:0;">Available only</label><input type="checkbox" id="filter-available" ' + (filters.availableOnly ? "checked" : "") + ' style="width:1.25rem;height:1.25rem;"></div>' +
      '<button class="btn btn-sm w-full mt-3" id="apply-filters">Apply</button>' +
      '<button class="btn btn-ghost btn-sm w-full mt-1" id="reset-filters">Reset</button>' +
      '</div></div>' +
      '</div>' +
      // Active filter chips
      '<div id="filter-chips" class="mb-4"></div>' +
      // Result count + mode toggle
      '<div class="flex items-center justify-between mb-4 gap-2">' +
      '<div class="text-sm text-muted" id="result-count">Loading stations...</div>' +
      '<div class="mode-toggle">' +
      '<button class="mode-btn' + (mode === "split" ? " active" : "") + '" data-mode="split">' + VR.icons.grid + '<span>Split</span></button>' +
      '<button class="mode-btn' + (mode === "map" ? " active" : "") + '" data-mode="map">' + VR.icons.mapPin + '<span>Map</span></button>' +
      '<button class="mode-btn' + (mode === "list" ? " active" : "") + '" data-mode="list">' + VR.icons.list + '<span>List</span></button>' +
      '</div></div>' +
      // Content
      '<div id="stations-content"></div>';

    // Attach events
    attachFilterEvents(app);
    attachModeEvents(app);

    // Load stations
    loadStations(app, qs);
  }

  function attachFilterEvents(app) {
    // Search debounce
    var searchTimer;
    var searchInput = app.querySelector("#search-input");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          VR.state.filters = VR.state.filters || {};
          VR.state.filters.search = searchInput.value || undefined;
          renderStationsApp(app);
        }, 300);
      });
    }

    // Near Me
    var nearMeBtn = app.querySelector("#near-me-btn");
    if (nearMeBtn) {
      nearMeBtn.addEventListener("click", function () {
        if (!navigator.geolocation) { VR.toast("Geolocation not supported", "error"); return; }
        nearMeBtn.disabled = true;
        navigator.geolocation.getCurrentPosition(function (pos) {
          VR.state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          VR.state.filters = VR.state.filters || {};
          VR.state.filters.lat = pos.coords.latitude;
          VR.state.filters.lng = pos.coords.longitude;
          VR.state.filters.radiusKm = 20;
          nearMeBtn.disabled = false;
          VR.toast("Showing stations within 20 km of your location", "success");
          renderStationsApp(app);
        }, function (err) {
          nearMeBtn.disabled = false;
          VR.toast("Location permission denied", "error");
        }, { enableHighAccuracy: true, timeout: 10000 });
      });
    }

    // Filters dropdown
    var filtersBtn = app.querySelector("#filters-btn");
    var filtersMenu = app.querySelector("#filters-menu");
    if (filtersBtn && filtersMenu) {
      filtersBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        filtersMenu.classList.toggle("open");
      });
      document.addEventListener("click", function (e) {
        if (!filtersMenu.contains(e.target) && !filtersBtn.contains(e.target)) {
          filtersMenu.classList.remove("open");
        }
      });
    }

    // Apply filters
    var applyBtn = app.querySelector("#apply-filters");
    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        VR.state.filters = VR.state.filters || {};
        var city = app.querySelector("#filter-city").value;
        var operator = app.querySelector("#filter-operator").value;
        var connector = app.querySelector("#filter-connector").value;
        var power = app.querySelector("#filter-power").value;
        var available = app.querySelector("#filter-available").checked;
        VR.state.filters.city = city || undefined;
        VR.state.filters.operator = operator || undefined;
        VR.state.filters.connectorType = connector || undefined;
        VR.state.filters.minPower = power ? Number(power) : undefined;
        VR.state.filters.availableOnly = available || undefined;
        filtersMenu.classList.remove("open");
        renderStationsApp(app);
      });
    }

    // Reset filters
    var resetBtn = app.querySelector("#reset-filters");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        VR.state.filters = {};
        VR.state.userLocation = null;
        filtersMenu.classList.remove("open");
        renderStationsApp(app);
      });
    }
  }

  function attachModeEvents(app) {
    app.querySelectorAll("[data-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        VR.state.displayMode = btn.dataset.mode;
        renderStationsApp(app);
      });
    });
  }

  function loadStations(app, qs) {
    var content = app.querySelector("#stations-content");
    var countEl = app.querySelector("#result-count");
    var chipsEl = app.querySelector("#filter-chips");

    // Show loading
    var mode = VR.state.displayMode || "split";
    var showMap = mode === "split" || mode === "map";
    var showList = mode === "split" || mode === "list";

    content.innerHTML = '<div class="grid grid-2">' + Array.from({ length: 6 }).map(function () { return '<div class="skeleton" style="height:14rem;"></div>'; }).join("") + '</div>';

    // Render filter chips
    var chips = [];
    var f = VR.state.filters || {};
    if (f.city) chips.push({ label: f.city, key: "city" });
    if (f.operator) chips.push({ label: f.operator, key: "operator" });
    if (f.connectorType) chips.push({ label: f.connectorType, key: "connectorType" });
    if (f.minPower) chips.push({ label: f.minPower + "+ kW", key: "minPower" });
    if (f.availableOnly) chips.push({ label: "Available", key: "availableOnly" });
    if (f.radiusKm) chips.push({ label: "Within " + f.radiusKm + " km", key: "location" });

    if (chips.length > 0) {
      chipsEl.innerHTML = chips.map(function (c) {
        return '<span class="filter-chip">' + c.label + ' <button data-remove-filter="' + c.key + '">' + VR.icons.x + '</button></span>';
      }).join("") + '<span class="text-xs text-muted ml-2">' + chips.length + ' active</span>';

      chipsEl.querySelectorAll("[data-remove-filter]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.dataset.removeFilter;
          if (key === "location") {
            delete VR.state.filters.lat;
            delete VR.state.filters.lng;
            delete VR.state.filters.radiusKm;
            VR.state.userLocation = null;
          } else {
            delete VR.state.filters[key];
          }
          renderStationsApp(app);
        });
      });
    }

    fetch("/api/stations" + (qs ? "?" + qs : "")).then(function (r) { return r.json(); }).then(function (data) {
      var stations = data.stations || [];
      VR.state.stations = stations;

      countEl.innerHTML = '<span class="font-semibold" style="color:var(--foreground);">' + stations.length + '</span> station' + (stations.length !== 1 ? "s" : "") + " found";

      if (stations.length === 0) {
        content.innerHTML = '<div class="state-empty"><div class="state-icon">' + VR.icons.search + '</div><p class="state-title">No stations found</p><p class="state-desc">Try adjusting your filters or search query.</p></div>';
        return;
      }

      // Build content
      var html = '<div class="split-layout ' + (mode === "split" ? "split" : mode === "map" ? "" : "") + '">';

      // List
      if (showList) {
        html += '<div class="split-list ' + (mode === "split" ? "split custom-scroll" : "") + '">';
        html += '<div class="grid ' + (mode === "list" ? "grid-3" : "grid-2") + '">';
        stations.forEach(function (s) {
          html += renderStationCard(s);
        });
        html += '</div></div>';
      }

      // Map
      if (showMap) {
        html += '<div class="split-map ' + (mode === "split" ? "split" : mode === "map" ? "map-only" : "") + ' map-container"><div id="map"></div></div>';
      }

      html += '</div>';
      content.innerHTML = html;

      // Attach card events
      content.querySelectorAll("[data-station-card]").forEach(function (card) {
        card.addEventListener("click", function (e) {
          if (e.target.closest("[data-fav]")) return;
          openStationDetail(card.dataset.stationCard);
        });
      });

      content.querySelectorAll("[data-fav]").forEach(function (favBtn) {
        favBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          toggleFavorite(favBtn.dataset.fav, app);
        });
      });

      // Init map
      if (showMap) {
        setTimeout(function () { initMap(stations); }, 100);
      }
    }).catch(function (err) {
      content.innerHTML = '<div class="state-empty"><div class="state-icon" style="background:color-mix(in oklch, var(--destructive) 10%, transparent);">' + VR.icons.alertCircle + '</div><p class="state-title">Couldn\'t load stations</p><p class="state-desc">' + (err.message || "Something went wrong") + '</p><button class="btn btn-outline btn-sm mt-4" onclick="VR.render()">Retry</button></div>';
    });
  }

  // Estimated charge time for a typical 40kWh battery (20%→80% = 24kWh needed)
  function estChargeTime(powerKW) {
    var energyNeeded = 24; // 40kWh × 60%
    var hours = energyNeeded / powerKW;
    if (hours < 1) return Math.round(hours * 60) + " min";
    return Math.round(hours * 10) / 10 + " hr";
  }

  function renderStationCard(s) {
    var statusClass = s.status === "OPERATIONAL" ? "badge-success" : s.status === "MAINTENANCE" ? "badge-warning" : "badge-danger";
    var statusLabel = s.status === "OPERATIONAL" ? (s.availablePorts + "/" + s.numberOfPorts + " free") : s.status === "MAINTENANCE" ? "Maintenance" : "Offline";
    var availPct = s.numberOfPorts > 0 ? (s.availablePorts / s.numberOfPorts) * 100 : 0;
    var availColor = availPct > 50 ? "var(--status-operational)" : availPct > 0 ? "var(--status-maintenance)" : "var(--status-offline)";

    // Compact card — no image panel, just a colored header strip
    return '<div class="station-card' + (VR.state.activeStationId === s.id ? " active" : "") + '" data-station-card="' + s.id + '">' +
      '<div class="station-header">' +
      '<div class="station-header-left">' +
      '<span class="badge ' + statusClass + '"><span class="badge-dot"></span>' + statusLabel + '</span>' +
      '<span class="station-operator-name">' + s.operator + '</span>' +
      '</div>' +
      '<button class="station-fav' + (s.isFavorite ? " active" : "") + '" data-fav="' + s.id + '" aria-label="Toggle favorite">' + VR.icons.heart + '</button>' +
      '</div>' +
      '<div class="station-body">' +
      '<div class="station-name">' + s.name + '</div>' +
      '<div class="station-area">' + VR.icons.mapPin + ' ' + s.area + ', ' + s.city + '</div>' +
      (s.status === "OPERATIONAL" ? '<div class="station-avail-bar"><div class="station-avail-fill" style="width:' + availPct + '%;background:' + availColor + ';"></div></div>' : '') +
      '<div class="station-meta">' +
      '<span class="station-meta-item">' + VR.icons.zap + ' ' + s.powerKW + ' kW</span>' +
      '<span class="station-meta-item">' + VR.icons.battery + ' ₹' + s.pricePerKWh + '/kWh</span>' +
      '<span class="station-meta-item">' + VR.icons.clock + ' ~' + estChargeTime(s.powerKW) + '</span>' +
      (s.rating > 0 ? '<span class="station-meta-item" style="color:var(--star-color);">' + VR.icons.star + ' ' + s.rating + '</span>' : '') +
      '</div>' +
      '<div class="station-footer">' +
      '<div class="station-connectors">' + VR.icons.plug + ' <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">' + s.connectorTypes.join(", ") + '</span></div>' +
      (s.distance !== undefined && s.distance > 0 ? '<span class="station-distance">' + s.distance + ' km</span>' : '') +
      '</div>' +
      '</div></div>';
  }

  function initMap(stations) {
    // Clean up previous map
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
      markers = [];
    }

    var mapEl = document.getElementById("map");
    if (!mapEl || typeof L === "undefined") return;

    // Default center: between Gandhinagar and Ahmedabad
    mapInstance = L.map(mapEl).setView([23.0833, 72.6167], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapInstance);

    // User location
    if (VR.state.userLocation) {
      var ul = VR.state.userLocation;
      L.marker([ul.lat, ul.lng], {
        icon: L.divIcon({
          className: "ev-marker",
          html: '<div style="width:16px;height:16px;border-radius:50%;background:#0d9488;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16], iconAnchor: [8, 8],
        }),
      }).addTo(mapInstance).bindPopup("<b>You are here</b>");

      if (VR.state.filters && VR.state.filters.radiusKm) {
        L.circle([ul.lat, ul.lng], {
          radius: VR.state.filters.radiusKm * 1000,
          color: "#0d9488", fillColor: "#0d9488", fillOpacity: 0.08, weight: 1.5,
        }).addTo(mapInstance);
      }
    }

    // Station markers
    var bounds = [];
    stations.forEach(function (s) {
      var statusClass = s.status === "OPERATIONAL" ? "operational" : s.status === "MAINTENANCE" ? "maintenance" : "offline";
      var isActive = VR.state.activeStationId === s.id;
      var icon = L.divIcon({
        className: "ev-marker",
        html: '<div class="ev-marker-pin ' + statusClass + (isActive ? " active" : "") + '">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>' +
          '</div>',
        iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -34],
      });

      var marker = L.marker([s.lat, s.lng], { icon: icon }).addTo(mapInstance);
      marker.bindPopup(
        '<div style="min-width:200px;">' +
        '<div style="font-weight:600;font-size:0.875rem;">' + s.name + '</div>' +
        '<div style="font-size:0.75rem;color:var(--muted-foreground);margin-top:2px;">' + s.operator + ' · ' + s.area + '</div>' +
        '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">' +
        '<span class="badge ' + statusClass + '" style="font-size:10px;">' + (s.status === "OPERATIONAL" ? s.availablePorts + "/" + s.numberOfPorts + " free" : s.status) + '</span>' +
        '<span class="badge" style="font-size:10px;">' + s.powerKW + ' kW</span>' +
        '<span class="badge" style="font-size:10px;">₹' + s.pricePerKWh + '/kWh</span>' +
        '</div>' +
        '<button class="btn btn-sm w-full" style="margin-top:8px;font-size:0.75rem;" onclick="VR._openDetail(\'' + s.id + '\')">View Details</button>' +
        '</div>'
      );
      marker.on("click", function () { VR.state.activeStationId = s.id; });
      markers.push(marker);
      bounds.push([s.lat, s.lng]);
    });

    // Fit bounds
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        mapInstance.setView(bounds[0], 14);
      } else {
        mapInstance.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    // Invalidate size after layout settles
    setTimeout(function () { if (mapInstance) mapInstance.invalidateSize(); }, 200);
  }

  // Helper for popup button
  VR._openDetail = function (id) { openStationDetail(id); };

  function toggleFavorite(stationId, app) {
    if (!VR.state.session || !VR.state.session.user) {
      VR.openAuth("login");
      return;
    }
    var station = VR.state.stations.find(function (s) { return s.id === stationId; });
    if (!station) return;
    var isFav = !!station.isFavorite;

    // Optimistic update
    station.isFavorite = !isFav;

    var url = isFav ? "/api/favorites/" + stationId : "/api/favorites";
    var fetchOpts = isFav
      ? { method: "DELETE" }
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId }) };

    fetch(url, fetchOpts).then(function (r) { return r.json(); }).then(function () {
      VR.toast(isFav ? "Removed from favorites" : "Added to favorites", "success");
      // Update UI
      var favBtn = document.querySelector('[data-fav="' + stationId + '"]');
      if (favBtn) favBtn.classList.toggle("active", !isFav);
    }).catch(function () {
      station.isFavorite = isFav; // revert
      VR.toast("Failed to update favorite", "error");
    });
  }

  function openStationDetail(stationId) {
    // Lock background scroll while modal is open
    document.body.classList.add("modal-open");

    // Create modal overlay
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = '<div class="modal modal-lg"><div style="display:flex;align-items:center;justify-content:center;padding:4rem;"><div class="skeleton" style="width:3rem;height:3rem;border-radius:50%;"></div></div></div>';
    document.body.appendChild(overlay);

    // Close modal + unlock body scroll
    function closeModal() {
      overlay.remove();
      document.body.classList.remove("modal-open");
    }

    // Event delegation on overlay — handles close button + overlay click
    // Works even after modal content is re-rendered by the fetch
    overlay.addEventListener("click", function (e) {
      // Close if clicking the overlay itself OR the close button (or its children)
      if (e.target === overlay || e.target.closest(".modal-close")) {
        closeModal();
      }
    });

    // Fetch station details — use plain fetch (no Content-Type header for GETs
    // to avoid CORS preflight issues on the preview proxy)
    var detailUrl = "/api/stations/" + stationId;
    var planBUrl = "/api/stations/" + stationId + "/plan-b";

    Promise.all([
      fetch(detailUrl).then(function (r) { return r.json(); }),
      fetch(planBUrl).then(function (r) { return r.json(); }).catch(function () { return { planB: null }; }),
    ]).then(function (results) {
      var data = results[0];
      var planB = results[1];
      renderStationDetail(overlay, data, planB);
    }).catch(function (err) {
      overlay.querySelector(".modal").innerHTML = '<div class="state-empty"><div class="state-icon">' + VR.icons.alertCircle + '</div><p class="state-title">Failed to load station</p><p class="state-desc">' + (err.message || "Try again") + '</p></div>';
    });
  }

  function renderStationDetail(overlay, data, planB) {
    var statusClass = data.status === "OPERATIONAL" ? "badge-success" : data.status === "MAINTENANCE" ? "badge-warning" : "badge-danger";
    var statusLabel = data.status === "OPERATIONAL" ? data.availablePorts + "/" + data.numberOfPorts + " available" : data.status === "MAINTENANCE" ? "Maintenance" : "Offline";

    var img = '<div style="width:100%;height:100%;background:var(--muted);display:flex;align-items:center;justify-content:center;color:var(--primary);">' + VR.icons.zap + '</div>';

    var amenityIcons = { Restroom: "building", Cafe: "coffee", Parking: "car", Wifi: "wifi", ATM: "banknote" };

    var reviewsHTML = (data.reviews || []).map(function (r) {
      var stars = "";
      for (var i = 1; i <= 5; i++) {
        stars += '<span style="color:' + (i <= r.rating ? "var(--star-color)" : "var(--muted)") + ';">★</span>';
      }
      var userName = (r.user && r.user.name) || "Anonymous";
      var initials = userName.split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("").toUpperCase();
      return '<div class="card mb-2" style="padding:0.75rem;"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">' +
        '<div style="display:flex;gap:0.5rem;align-items:center;"><div class="user-avatar" style="width:1.75rem;height:1.75rem;font-size:0.625rem;">' + initials + '</div><div><p style="font-size:0.75rem;font-weight:600;">' + userName + '</p><div style="font-size:0.625rem;">' + stars + ' <span class="text-muted">' + new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + '</span></div></div></div>' +
        (VR.state.session && (VR.state.session.user.id === r.userId || VR.state.session.user.role === "ADMIN") ? '<button class="icon-btn" style="width:1.5rem;height:1.5rem;" data-delete-review="' + r.id + '" data-station="' + data.id + '">' + VR.icons.trash + '</button>' : '') +
        '</div>' + (r.comment ? '<p style="font-size:0.875rem;margin-top:0.375rem;">' + r.comment + '</p>' : '') + '</div>';
    }).join("");

    var planBHTML = "";
    if (planB && planB.planB) {
      var p = planB.planB;
      planBHTML = '<div style="border:1px dashed color-mix(in oklch, var(--primary) 40%, transparent);background:color-mix(in oklch, var(--primary) 5%, transparent);border-radius:var(--radius);padding:0.75rem;margin-top:0.75rem;">' +
        '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.375rem;"><span style="color:var(--primary);">' + VR.icons.shieldAlert + '</span><p style="font-size:0.875rem;font-weight:600;">If this one is busy or broken</p></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;"><div style="min-width:0;"><p style="font-size:0.875rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;">' + p.name + '</p><p style="font-size:0.75rem;color:var(--muted-foreground);margin-top:0.125rem;">' + p.operator + ' · ' + p.distance + ' km · ' + p.sharedConnectors.join(", ") + '</p></div>' +
        '<a href="' + p.googleMapsUrl + '" target="_blank" rel="noopener" class="btn btn-sm" style="flex-shrink:0;font-size:0.75rem;">' + VR.icons.navigation + ' Go</a></div></div>';
    } else if (planB) {
      planBHTML = '<div style="border:1px dashed var(--border);border-radius:var(--radius);padding:0.75rem;margin-top:0.75rem;"><p style="font-size:0.75rem;color:var(--muted-foreground);">' + planB.reason + '</p></div>';
    }

    overlay.querySelector(".modal").innerHTML =
      '<div style="position:relative;">' +
      '<div style="background:var(--secondary);padding:1rem;position:relative;border-bottom:1px solid var(--border);">' +
      '<button class="modal-close" style="background:var(--card);">' + VR.icons.x + '</button>' +
      '<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">' +
      '<span class="badge">' + data.operator + '</span>' +
      '<span class="badge ' + statusClass + '"><span class="badge-dot"></span>' + statusLabel + '</span>' +
      '</div>' +
      '<h2 style="font-size:1.125rem;font-weight:700;">' + data.name + '</h2>' +
      '<p style="font-size:0.75rem;color:var(--muted-foreground);margin-top:2px;display:flex;align-items:center;gap:0.25rem;">' + VR.icons.mapPin + ' ' + data.address + '</p>' +
      '</div>' +
      '<div class="modal-body">' +
      '<div class="grid grid-4 mb-4">' +
      '<div class="card" style="padding:0.625rem;text-align:center;">' + VR.icons.zap + '<p style="font-size:0.625rem;color:var(--muted-foreground);text-transform:uppercase;margin-top:4px;">Power</p><p style="font-size:0.875rem;font-weight:600;">' + data.powerKW + ' kW</p></div>' +
      '<div class="card" style="padding:0.625rem;text-align:center;">' + VR.icons.battery + '<p style="font-size:0.625rem;color:var(--muted-foreground);text-transform:uppercase;margin-top:4px;">Price</p><p style="font-size:0.875rem;font-weight:600;">₹' + data.pricePerKWh + '/kWh</p></div>' +
      '<div class="card" style="padding:0.625rem;text-align:center;">' + VR.icons.clock + '<p style="font-size:0.625rem;color:var(--muted-foreground);text-transform:uppercase;margin-top:4px;">Hours</p><p style="font-size:0.875rem;font-weight:600;">' + data.hours + '</p></div>' +
      '<div class="card" style="padding:0.625rem;text-align:center;">' + VR.icons.star + '<p style="font-size:0.625rem;color:var(--muted-foreground);text-transform:uppercase;margin-top:4px;">Rating</p><p style="font-size:0.875rem;font-weight:600;">' + (data.rating > 0 ? data.rating + " (" + data.reviewCount + ")" : "N/A") + '</p></div>' +
      '</div>' +
      '<div class="mb-4"><p style="font-size:0.75rem;font-weight:600;color:var(--muted-foreground);text-transform:uppercase;margin-bottom:0.5rem;display:flex;align-items:center;gap:0.375rem;">' + VR.icons.plug + ' Connector Types</p><div style="display:flex;flex-wrap:wrap;gap:0.375rem;">' + data.connectorTypes.map(function (c) { return '<span class="badge">' + c + '</span>'; }).join("") + '</div></div>' +
      (data.amenities.length > 0 ? '<div class="mb-4"><p style="font-size:0.75rem;font-weight:600;color:var(--muted-foreground);text-transform:uppercase;margin-bottom:0.5rem;display:flex;align-items:center;gap:0.375rem;">' + VR.icons.checkCircle + ' Amenities</p><div style="display:flex;flex-wrap:wrap;gap:0.5rem;">' + data.amenities.map(function (a) { return '<span class="badge" style="padding:0.25rem 0.625rem;">' + a + '</span>'; }).join("") + '</div></div>' : '') +
      (data.phone ? '<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.875rem;margin-bottom:1rem;">' + VR.icons.phone + ' <a href="tel:' + data.phone + '" style="color:var(--primary);">' + data.phone + '</a></div>' : '') +
      planBHTML +
      '<div style="border-top:1px solid var(--border);margin:1rem 0;"></div>' +
      '<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;"><p style="font-size:0.875rem;font-weight:600;">Reviews (' + data.reviewCount + ')</p>' + (data.rating > 0 ? '<div style="font-size:0.875rem;">' + VR.icons.star + ' <span style="font-weight:600;">' + data.rating + '</span> <span class="text-muted text-xs">/ 5</span></div>' : '') + '</div>' +
      (VR.state.session && VR.state.session.user && !data.myReview
        ? '<form id="review-form" style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;margin-bottom:0.75rem;background:var(--muted);"><div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;"><span class="text-xs text-muted">Your rating:</span><div id="review-stars" style="display:flex;gap:2px;">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-star="' + n + '" style="font-size:1.25rem;color:var(--muted);">★</button>'; }).join("") + '</div></div><textarea class="textarea" id="review-comment" placeholder="Share your experience..." style="min-height:4rem;"></textarea><button type="submit" class="btn btn-sm" style="margin-top:0.5rem;">' + VR.icons.check + ' Post Review</button></form>'
        : !VR.state.session ? '<p style="font-size:0.75rem;color:var(--muted-foreground);font-style:italic;text-align:center;padding:0.625rem;background:var(--muted);border-radius:var(--radius);">Sign in to leave a review</p>' : '') +
      '<div id="reviews-list">' + (reviewsHTML || '<p style="font-size:0.875rem;color:var(--muted-foreground);text-align:center;padding:1rem;">No reviews yet. Be the first to review!</p>') + '</div></div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button class="btn btn-outline flex-1" id="detail-fav">' + VR.icons.heart + (data.isFavorite ? " Saved" : " Save") + '</button>' +
      '<a href="https://www.google.com/maps/search/?api=1&query=' + data.lat + ',' + data.lng + '" target="_blank" rel="noopener" class="btn flex-1" style="text-decoration:none;">' + VR.icons.navigation + ' Get Directions</a>' +
      '</div></div>';

    // Close button handled by overlay event delegation above

    // Favorite toggle
    var favBtn = overlay.querySelector("#detail-fav");
    if (favBtn) {
      favBtn.addEventListener("click", function () {
        if (!VR.state.session || !VR.state.session.user) { VR.openAuth("login"); return; }
        var isFav = !!data.isFavorite;
        var url = isFav ? "/api/favorites/" + data.id : "/api/favorites";
        var fetchOpts = isFav
          ? { method: "DELETE" }
          : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId: data.id }) };
        fetch(url, fetchOpts).then(function (r) { return r.json(); }).then(function () {
          data.isFavorite = !isFav;
          favBtn.innerHTML = VR.icons.heart + (data.isFavorite ? " Saved" : " Save");
          favBtn.style.color = data.isFavorite ? "#ef4444" : "";
          VR.toast(isFav ? "Removed from favorites" : "Added to favorites", "success");
        }).catch(function () { VR.toast("Failed to update favorite", "error"); });
      });
      if (data.isFavorite) { favBtn.style.color = "#ef4444"; }
    }

    // Review stars
    var selectedRating = 0;
    var starBtns = overlay.querySelectorAll("[data-star]");
    starBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectedRating = Number(btn.dataset.star);
        starBtns.forEach(function (b) {
          b.style.color = Number(b.dataset.star) <= selectedRating ? "var(--star-color)" : "var(--muted)";
        });
      });
    });

    // Review form
    var reviewForm = overlay.querySelector("#review-form");
    if (reviewForm) {
      reviewForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (selectedRating < 1) { VR.toast("Please select a rating", "error"); return; }
        var comment = overlay.querySelector("#review-comment").value;
        fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationId: data.id, rating: selectedRating, comment: comment }),
        }).then(function (r) { return r.json(); }).then(function () {
          VR.toast("Review posted!", "success");
          closeModal();
          openStationDetail(data.id); // reload
        }).catch(function (err) { VR.toast(err.message || "Failed to post review", "error"); });
      });
    }

    // Delete review
    overlay.querySelectorAll("[data-delete-review]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var reviewId = btn.dataset.deleteReview;
        var stationId = btn.dataset.station;
        fetch("/api/reviews?id=" + reviewId, { method: "DELETE" }).then(function (r) { return r.json(); }).then(function () {
          VR.toast("Review deleted", "success");
          closeModal();
          openStationDetail(stationId);
        }).catch(function () { VR.toast("Failed to delete review", "error"); });
      });
    });
  }

  // Expose helpers for other view modules
  VR.renderStationCard = renderStationCard;
  VR.openStationDetail = openStationDetail;
  VR.toggleFavorite = toggleFavorite;
})();
