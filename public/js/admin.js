/* admin.js — Admin panel: overview stats, station CRUD, user management, review moderation */

(function () {
  "use strict";
  window.VR = window.VR || {};

  /* Persist active tab across re-renders */
  var activeTab = "overview";

  /* ============================================================
     Entry point — VR.views.admin
     ============================================================ */
  VR.views.admin = function (container) {
    // Access check
    if (!VR.state.session || !VR.state.session.user || VR.state.session.user.role !== "ADMIN") {
      container.innerHTML =
        '<div class="state-empty">' +
        '<div class="state-icon">' + VR.icons.shieldCheck + '</div>' +
        '<p class="state-title">Admin access required</p>' +
        '<p class="state-desc">You must be signed in as an administrator to view this panel.</p>' +
        '</div>';
      return;
    }

    container.innerHTML =
      '<style>' +
      '#admin-root .tab{display:inline-flex;align-items:center;gap:0.375rem;}' +
      '#admin-root .tab svg{width:0.875rem;height:0.875rem;}' +
      '#admin-root .kpi-icon{width:2.5rem;height:2.5rem;border-radius:var(--radius);background:color-mix(in oklch,var(--primary) 12%,transparent);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '#admin-root .kpi-icon svg{width:1.25rem;height:1.25rem;}' +
      '#admin-root .ic-1{width:1rem;height:1rem;display:inline-flex;flex-shrink:0;align-items:center;justify-content:center;}' +
      '#admin-root .ic-1 svg{width:100%;height:100%;}' +
      '#admin-root .bar-row{display:flex;align-items:center;gap:0.75rem;}' +
      '#admin-root .bar-label{width:7rem;font-size:0.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;}' +
      '#admin-root .bar-track{flex:1;height:0.5rem;background:var(--muted);border-radius:9999px;overflow:hidden;}' +
      '#admin-root .bar-fill{height:100%;background:var(--primary);border-radius:9999px;transition:width 0.3s ease;}' +
      '#admin-root .bar-count{width:2rem;font-size:0.75rem;font-weight:600;text-align:right;flex-shrink:0;}' +
      '</style>' +
      '<div class="section" id="admin-root">' +
      '<div class="mb-6">' +
      '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.375rem;">' +
      '<span class="ic-1" style="color:var(--primary);">' + VR.icons.layoutDashboard + '</span>' +
      '<span class="badge badge-primary">ADMIN</span>' +
      '</div>' +
      '<h1 class="text-2xl font-bold">Admin Panel</h1>' +
      '<p class="text-sm text-muted mt-2">Manage stations, users, and reviews across the PlugSpot network.</p>' +
      '</div>' +
      '<div class="tabs" id="admin-tabs">' +
      '<button class="tab' + (activeTab === "overview" ? " active" : "") + '" data-tab="overview">' + VR.icons.layoutDashboard + '<span>Overview</span></button>' +
      '<button class="tab' + (activeTab === "stations" ? " active" : "") + '" data-tab="stations">' + VR.icons.mapPin + '<span>Stations</span></button>' +
      '<button class="tab' + (activeTab === "users" ? " active" : "") + '" data-tab="users">' + VR.icons.user + '<span>Users</span></button>' +
      '<button class="tab' + (activeTab === "reviews" ? " active" : "") + '" data-tab="reviews">' + VR.icons.star + '<span>Reviews</span></button>' +
      '</div>' +
      '<div id="admin-content"></div>' +
      '</div>';

    var content = container.querySelector("#admin-content");

    function switchTab(tab) {
      activeTab = tab;
      container.querySelectorAll("#admin-tabs .tab").forEach(function (t) {
        t.classList.toggle("active", t.dataset.tab === tab);
      });
      if (tab === "overview") renderOverview(content);
      else if (tab === "stations") renderStations(content);
      else if (tab === "users") renderUsers(content);
      else if (tab === "reviews") renderReviews(content);
    }

    container.querySelectorAll("#admin-tabs .tab").forEach(function (t) {
      t.addEventListener("click", function () { switchTab(t.dataset.tab); });
    });

    switchTab(activeTab);
  };

  /* ============================================================
     Helpers
     ============================================================ */
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function nz(v, fallback) {
    return v != null ? v : (fallback != null ? fallback : "—");
  }

  function statusBadge(status) {
    if (status === "OPERATIONAL") return '<span class="badge badge-success"><span class="badge-dot"></span>Operational</span>';
    if (status === "MAINTENANCE") return '<span class="badge badge-warning"><span class="badge-dot"></span>Maintenance</span>';
    return '<span class="badge badge-danger"><span class="badge-dot"></span>Offline</span>';
  }

  function roleBadge(role) {
    return role === "ADMIN"
      ? '<span class="badge badge-primary">ADMIN</span>'
      : '<span class="badge">USER</span>';
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function fmtDateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function starsHTML(rating) {
    var s = "";
    var r = Number(rating) || 0;
    for (var i = 1; i <= 5; i++) {
      s += '<span style="color:' + (i <= r ? "var(--star-color, #f59e0b)" : "var(--muted)") + ';font-size:0.875rem;">★</span>';
    }
    return s;
  }

  function initialsOf(name) {
    if (!name) return "?";
    return name.split(/\s+/).map(function (p) { return p[0]; }).slice(0, 2).join("").toUpperCase();
  }

  function loadingHTML() {
    return '<div class="card" style="padding:2rem;">' +
      '<div class="skeleton" style="height:1rem;width:40%;margin-bottom:1rem;"></div>' +
      '<div class="skeleton" style="height:0.75rem;width:80%;margin-bottom:0.5rem;"></div>' +
      '<div class="skeleton" style="height:0.75rem;width:60%;"></div>' +
      '</div>';
  }

  function errorStateHTML(msg, retryable) {
    return '<div class="state-empty">' +
      '<div class="state-icon">' + VR.icons.alertCircle + '</div>' +
      '<p class="state-title">Failed to load</p>' +
      '<p class="state-desc">' + escapeHtml(msg || "Unknown error") + '</p>' +
      (retryable ? '<button class="btn btn-outline mt-4" id="retry-btn">' + VR.icons.rotateCw + ' Try Again</button>' : '') +
      '</div>';
  }

  function emptyStateHTML(icon, title, desc) {
    return '<div class="state-empty">' +
      '<div class="state-icon">' + (icon || VR.icons.info) + '</div>' +
      '<p class="state-title">' + escapeHtml(title || "Nothing here yet") + '</p>' +
      '<p class="state-desc">' + escapeHtml(desc || "") + '</p>' +
      '</div>';
  }

  function attachRetry(container, fn) {
    var retry = container.querySelector("#retry-btn");
    if (retry) retry.addEventListener("click", function () { fn(); });
  }

  /* ============================================================
     1. Overview tab
     ============================================================ */
  function renderOverview(container) {
    container.innerHTML = loadingHTML();

    fetch("/api/admin/stats").then(function(r){return r.json();}).then(function (data) {
      var t = data.totals || {};

      var kpis = [
        { label: "Stations", value: nz(t.stations, 0), icon: "mapPin" },
        { label: "Users", value: nz(t.users, 0), icon: "user" },
        { label: "Reviews", value: nz(t.reviews, 0), icon: "star" },
        { label: "Favorites", value: nz(t.favorites, 0), icon: "heart" },
        { label: "Total Power", value: nz(t.totalPowerKW, 0) + " kW", icon: "zap" },
        { label: "Avg Rating", value: t.avgRating != null ? Number(t.avgRating).toFixed(1) : "—", icon: "trendingUp" }
      ];

      var kpiHTML = '<div class="grid grid-3 mb-6">' + kpis.map(function (k) {
        return '<div class="card" style="padding:1.25rem;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;">' +
          '<div style="min-width:0;">' +
          '<p class="text-xs text-muted" style="text-transform:uppercase;letter-spacing:0.04em;">' + k.label + '</p>' +
          '<p class="text-2xl font-bold mt-2" style="font-variant-numeric:tabular-nums;">' + k.value + '</p>' +
          '</div>' +
          '<div class="kpi-icon">' + VR.icons[k.icon] + '</div>' +
          '</div></div>';
      }).join("") + '</div>';

      var barsHTML = '<div class="grid grid-2 mb-6">' +
        renderBarsCard("Stations by City", VR.icons.mapPin, data.byCity || [], "city") +
        renderBarsCard("Stations by Operator", VR.icons.layers, data.byOperator || [], "operator") +
        '</div>';

      var recentHTML = '<div>' +
        '<h3 class="text-lg font-semibold mb-4" style="display:flex;align-items:center;gap:0.5rem;">' +
        '<span class="ic-1" style="color:var(--primary);">' + VR.icons.clock + '</span> Recent Activity</h3>' +
        '<div class="grid grid-3">' +
        renderRecentList("Stations", VR.icons.mapPin, (data.recentStations || []).map(function (s) {
          return { title: s.name, sub: nz(s.city, "") + " · " + nz(s.operator, ""), time: s.createdAt };
        })) +
        renderRecentList("Users", VR.icons.user, (data.recentUsers || []).map(function (u) {
          return { title: u.name, sub: u.email, time: u.createdAt, badge: u.role };
        })) +
        renderRecentList("Reviews", VR.icons.star, (data.recentReviews || []).map(function (r) {
          return { title: nz(r.userName, "Anonymous") + " on " + nz(r.stationName, "Station"), sub: (r.comment || "").slice(0, 60), time: r.createdAt, rating: r.rating };
        })) +
        '</div></div>';

      container.innerHTML = kpiHTML + barsHTML + recentHTML;
    }).catch(function (err) {
      container.innerHTML = errorStateHTML(err.message, true);
      attachRetry(container, function () { renderOverview(container); });
    });
  }

  function renderBarsCard(title, icon, items, key) {
    var max = 1;
    items.forEach(function (it) { if (it.count > max) max = it.count; });

    var rows = items.map(function (it) {
      var pct = Math.max(4, Math.round((it.count / max) * 100));
      return '<div class="bar-row">' +
        '<div class="bar-label" title="' + escapeHtml(it[key]) + '">' + escapeHtml(it[key]) + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;"></div></div>' +
        '<div class="bar-count">' + it.count + '</div>' +
        '</div>';
    }).join("");

    return '<div class="card" style="padding:1.25rem;">' +
      '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">' +
      '<span class="ic-1" style="color:var(--primary);">' + icon + '</span>' +
      '<h3 class="text-base font-semibold">' + escapeHtml(title) + '</h3>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:0.625rem;">' +
      (rows || '<p class="text-sm text-muted">No data available.</p>') +
      '</div></div>';
  }

  function renderRecentList(title, icon, items) {
    var rows;
    if (items && items.length > 0) {
      rows = items.slice(0, 6).map(function (it) {
        var sub = it.sub ? '<p class="text-xs text-muted" style="margin-top:0.125rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(it.sub) + '</p>' : '';
        var badge = it.badge ? ' <span class="badge ' + (it.badge === "ADMIN" ? "badge-primary" : "") + '" style="font-size:0.625rem;margin-left:0.25rem;">' + escapeHtml(it.badge) + '</span>' : '';
        var rating = (typeof it.rating === "number") ? ' <span style="color:var(--star-color, #f59e0b);font-size:0.75rem;margin-left:0.25rem;">★ ' + it.rating + '</span>' : '';
        return '<div style="display:flex;gap:0.5rem;padding:0.5rem 0;border-bottom:1px solid var(--border);">' +
          '<div style="flex:1;min-width:0;">' +
          '<p class="text-sm font-medium" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(it.title) + badge + rating + '</p>' +
          sub +
          '</div>' +
          '<div class="text-xs text-muted" style="flex-shrink:0;white-space:nowrap;">' + fmtDate(it.time) + '</div>' +
          '</div>';
      }).join("");
    } else {
      rows = '<p class="text-sm text-muted" style="padding:0.5rem 0;">No recent items.</p>';
    }

    return '<div class="card" style="padding:1rem;">' +
      '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">' +
      '<span class="ic-1" style="color:var(--primary);">' + icon + '</span>' +
      '<h4 class="text-sm font-semibold">Recent ' + escapeHtml(title) + '</h4>' +
      '</div>' + rows + '</div>';
  }

  /* ============================================================
     2. Stations tab
     ============================================================ */
  function renderStations(container) {
    container.innerHTML =
      '<div class="flex items-center justify-between mb-4 flex-wrap gap-2">' +
      '<div><h3 class="text-lg font-semibold">All Stations</h3>' +
      '<p class="text-sm text-muted">Add, edit, or remove charging stations.</p></div>' +
      '<button class="btn" id="add-station-btn">' + VR.icons.plus + ' Add Station</button>' +
      '</div>' +
      '<div id="stations-table-wrap">' + loadingHTML() + '</div>';

    var wrap = container.querySelector("#stations-table-wrap");
    var addBtn = container.querySelector("#add-station-btn");
    if (addBtn) addBtn.addEventListener("click", function () { openStationModal(null, wrap); });

    fetchStationsTable(wrap);
  }

  function fetchStationsTable(wrap) {
    wrap.innerHTML = loadingHTML();
    fetch("/api/stations").then(function(r){return r.json();}).then(function (data) {
      var stations = data.stations || [];
      if (stations.length === 0) {
        wrap.innerHTML = emptyStateHTML(VR.icons.mapPin, "No stations yet", "Add your first charging station to get started.");
        return;
      }
      renderStationsTable(wrap, stations);
    }).catch(function (err) {
      wrap.innerHTML = errorStateHTML(err.message, true);
      attachRetry(wrap, function () { fetchStationsTable(wrap); });
    });
  }

  function renderStationsTable(wrap, stations) {
    var rows = stations.map(function (s) {
      var ports = nz(s.availablePorts, "—") + "/" + nz(s.numberOfPorts, "—");
      var rating = s.rating ? '★ ' + Number(s.rating).toFixed(1) : "—";
      return '<tr>' +
        '<td style="font-weight:600;">' + escapeHtml(s.name) + '</td>' +
        '<td>' + escapeHtml(s.city) + '</td>' +
        '<td>' + escapeHtml(s.operator) + '</td>' +
        '<td>' + statusBadge(s.status) + '</td>' +
        '<td>' + nz(s.powerKW, "—") + ' kW</td>' +
        '<td>₹' + nz(s.pricePerKWh, "—") + '</td>' +
        '<td>' + ports + '</td>' +
        '<td>' + rating + '</td>' +
        '<td><div class="flex gap-2">' +
        '<button class="btn btn-sm btn-outline" data-edit="' + escapeHtml(s.id) + '" title="Edit">' + VR.icons.edit + '</button>' +
        '<button class="btn btn-sm btn-danger" data-delete="' + escapeHtml(s.id) + '" data-name="' + escapeHtml(s.name) + '" title="Delete">' + VR.icons.trash + '</button>' +
        '</div></td>' +
        '</tr>';
    }).join("");

    wrap.innerHTML = '<div class="table-wrap"><table>' +
      '<thead><tr>' +
      '<th>Name</th><th>City</th><th>Operator</th><th>Status</th><th>Power</th><th>Price</th><th>Ports</th><th>Rating</th><th>Actions</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table></div>';

    wrap.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { openStationModal(btn.dataset.edit, wrap); });
    });
    wrap.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.delete;
        var name = btn.dataset.name;
        if (!confirm('Delete station "' + name + '"? This action cannot be undone.')) return;
        VR.api("/api/stations/" + encodeURIComponent(id), { method: "DELETE" }).then(function () {
          VR.toast("Station deleted", "success");
          fetchStationsTable(wrap);
        }).catch(function (err) { VR.toast(err.message || "Failed to delete station", "error"); });
      });
    });
  }

  function openStationModal(stationId, wrap) {
    var isEdit = !!stationId;
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = '<div class="modal modal-xl" style="position:relative;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--border);">' +
      '<div style="display:flex;align-items:center;gap:0.5rem;">' +
      '<span class="ic-1" style="color:var(--primary);">' + (isEdit ? VR.icons.edit : VR.icons.plus) + '</span>' +
      '<h3 class="text-lg font-semibold">' + (isEdit ? "Edit Station" : "Add Station") + '</h3>' +
      '</div>' +
      '<button class="modal-close" type="button" style="position:static;width:2rem;height:2rem;border-radius:50%;background:var(--muted);display:flex;align-items:center;justify-content:center;">' + VR.icons.x + '</button>' +
      '</div>' +
      '<div class="modal-body" style="padding:1.25rem;">' +
      '<div style="display:flex;justify-content:center;padding:2rem;"><div class="skeleton" style="width:3rem;height:3rem;border-radius:50%;"></div></div>' +
      '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector(".modal-close").addEventListener("click", function () { overlay.remove(); });

    if (isEdit) {
      fetch("/api/stations/" + encodeURIComponent(stationId)).then(function(r){return r.json();}).then(function (s) {
        renderStationForm(overlay, s, true, wrap);
      }).catch(function (err) {
        overlay.querySelector(".modal-body").innerHTML = errorStateHTML(err.message, false);
      });
    } else {
      renderStationForm(overlay, null, false, wrap);
    }
  }

  function renderStationForm(overlay, s, isEdit, wrap) {
    var operators = ["Tata Power", "ChargeZone", "Ather Grid", "Statiq", "Exicom", "Magenta"];
    var cities = ["Gandhinagar", "Ahmedabad"];
    var statuses = ["OPERATIONAL", "MAINTENANCE", "OFFLINE"];

    function opt(val, current) {
      return '<option value="' + escapeHtml(val) + '"' + (val === current ? " selected" : "") + ">" + escapeHtml(val) + "</option>";
    }

    function field(label, inner) {
      return '<div><label class="label">' + escapeHtml(label) + '</label>' + inner + '</div>';
    }

    var connectorVal = "";
    var amenitiesVal = "";
    if (s) {
      connectorVal = Array.isArray(s.connectorTypes) ? s.connectorTypes.join(", ") : (s.connectorTypes || "");
      amenitiesVal = Array.isArray(s.amenities) ? s.amenities.join(", ") : (s.amenities || "");
    }

    var defOperator = s ? s.operator : "Tata Power";
    var defCity = s ? s.city : "Gandhinagar";
    var defStatus = s ? s.status : "OPERATIONAL";

    overlay.querySelector(".modal-body").innerHTML =
      '<form id="station-form" style="display:flex;flex-direction:column;gap:1rem;">' +
      '<div class="grid grid-2">' +
      field("Name", '<input class="input" name="name" required value="' + (s ? escapeHtml(s.name) : "") + '" placeholder="e.g. Tata Power - Akshardham">') +
      field("Operator", '<select class="input" name="operator" required>' + operators.map(function (o) { return opt(o, defOperator); }).join("") + '</select>') +
      '</div>' +
      '<div class="grid grid-2">' +
      field("Address", '<input class="input" name="address" value="' + (s ? escapeHtml(s.address || "") : "") + '" placeholder="Street address">') +
      field("Area", '<input class="input" name="area" value="' + (s ? escapeHtml(s.area || "") : "") + '" placeholder="Sector / landmark">') +
      '</div>' +
      '<div class="grid grid-3">' +
      field("City", '<select class="input" name="city" required>' + cities.map(function (c) { return opt(c, defCity); }).join("") + '</select>') +
      field("Latitude", '<input class="input" name="lat" type="number" step="any" required value="' + (s ? s.lat : "") + '" placeholder="23.0833">') +
      field("Longitude", '<input class="input" name="lng" type="number" step="any" required value="' + (s ? s.lng : "") + '" placeholder="72.6167">') +
      '</div>' +
      '<div class="grid grid-2">' +
      field("Status", '<select class="input" name="status" required>' + statuses.map(function (st) { return opt(st, defStatus); }).join("") + '</select>') +
      field("Connector Types (comma-separated)", '<input class="input" name="connectorTypes" value="' + escapeHtml(connectorVal) + '" placeholder="CCS, Type2, CHAdeMO">') +
      '</div>' +
      '<div class="grid grid-4">' +
      field("Power (kW)", '<input class="input" name="powerKW" type="number" step="any" required value="' + (s ? s.powerKW : "") + '" placeholder="60">') +
      field("Price (₹/kWh)", '<input class="input" name="pricePerKWh" type="number" step="any" required value="' + (s ? s.pricePerKWh : "") + '" placeholder="18">') +
      field("Number of Ports", '<input class="input" name="numberOfPorts" type="number" required value="' + (s ? s.numberOfPorts : "") + '" placeholder="2">') +
      field("Available Ports", '<input class="input" name="availablePorts" type="number" required value="' + (s ? s.availablePorts : "") + '" placeholder="1">') +
      '</div>' +
      '<div class="grid grid-2">' +
      field("Amenities (comma-separated)", '<input class="input" name="amenities" value="' + escapeHtml(amenitiesVal) + '" placeholder="Restroom, Cafe, Parking">') +
      field("Hours", '<input class="input" name="hours" value="' + (s ? escapeHtml(s.hours || "") : "") + '" placeholder="24/7">') +
      '</div>' +
      '<div class="grid grid-2">' +
      field("Phone", '<input class="input" name="phone" value="' + (s ? escapeHtml(s.phone || "") : "") + '" placeholder="+91 98765 43210">') +
      field("Image URL", '<input class="input" name="image" value="' + (s ? escapeHtml(s.image || "") : "") + '" placeholder="https://...">') +
      '</div>' +
      '</form>';

    // Append footer (outside the form so it doesn't auto-submit)
    var modal = overlay.querySelector(".modal");
    var footer = document.createElement("div");
    footer.className = "modal-footer";
    footer.innerHTML =
      '<button type="button" class="btn btn-outline flex-1" id="station-cancel">Cancel</button>' +
      '<button type="button" class="btn flex-1" id="station-save">' + (isEdit ? VR.icons.check : VR.icons.plus) + ' ' + (isEdit ? "Save Changes" : "Create Station") + '</button>';
    modal.appendChild(footer);

    overlay.querySelector("#station-cancel").addEventListener("click", function () { overlay.remove(); });
    overlay.querySelector("#station-save").addEventListener("click", function () {
      saveStation(overlay, isEdit && s ? s.id : null, wrap);
    });
  }

  function saveStation(overlay, id, wrap) {
    var form = overlay.querySelector("#station-form");
    if (!form) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }

    function val(name) { var el = form.elements[name]; return el ? el.value : ""; }
    function num(name) { var v = val(name); return v === "" ? null : Number(v); }
    function csv(name) {
      var v = val(name);
      return v.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    }

    var payload = {
      name: val("name").trim(),
      operator: val("operator"),
      address: val("address").trim(),
      area: val("area").trim(),
      city: val("city"),
      lat: num("lat"),
      lng: num("lng"),
      status: val("status"),
      connectorTypes: csv("connectorTypes"),
      powerKW: num("powerKW"),
      pricePerKWh: num("pricePerKWh"),
      numberOfPorts: num("numberOfPorts"),
      availablePorts: num("availablePorts"),
      amenities: csv("amenities"),
      hours: val("hours").trim(),
      phone: val("phone").trim(),
      image: val("image").trim()
    };

    var saveBtn = overlay.querySelector("#station-save");
    var cancelBtn = overlay.querySelector("#station-cancel");
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving..."; }
    if (cancelBtn) { cancelBtn.disabled = true; }

    var url = id ? "/api/stations/" + encodeURIComponent(id) : "/api/stations";
    var method = id ? "PUT" : "POST";

    fetch(url, {method:method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)}).then(function(r){return r.json();}).then(function () {
      overlay.remove();
      VR.toast(id ? "Station updated successfully" : "Station created successfully", "success");
      fetchStationsTable(wrap);
    }).catch(function (err) {
      VR.toast(err.message || "Failed to save station", "error");
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = (id ? VR.icons.check : VR.icons.plus) + " " + (id ? "Save Changes" : "Create Station");
      }
      if (cancelBtn) { cancelBtn.disabled = false; }
    });
  }

  /* ============================================================
     3. Users tab
     ============================================================ */
  function renderUsers(container) {
    container.innerHTML =
      '<div class="mb-4"><h3 class="text-lg font-semibold">All Users</h3>' +
      '<p class="text-sm text-muted">Manage user roles and accounts.</p></div>' +
      '<div id="users-table-wrap">' + loadingHTML() + '</div>';

    var wrap = container.querySelector("#users-table-wrap");
    fetchUsersTable(wrap);
  }

  function fetchUsersTable(wrap) {
    wrap.innerHTML = loadingHTML();
    fetch("/api/admin/users").then(function(r){return r.json();}).then(function (data) {
      var users = data.users || [];
      if (users.length === 0) {
        wrap.innerHTML = emptyStateHTML(VR.icons.user, "No users yet", "Registered users will appear here.");
        return;
      }
      renderUsersTable(wrap, users);
    }).catch(function (err) {
      wrap.innerHTML = errorStateHTML(err.message, true);
      attachRetry(wrap, function () { fetchUsersTable(wrap); });
    });
  }

  function renderUsersTable(wrap, users) {
    var me = VR.state.session && VR.state.session.user ? VR.state.session.user.id : null;

    var rows = users.map(function (u) {
      var isSelf = u.id === me;
      var role = u.role || "USER";
      var newRole = role === "ADMIN" ? "USER" : "ADMIN";

      var actions;
      if (isSelf) {
        actions = '<span class="text-xs text-muted" style="font-style:italic;">This is you</span>';
      } else {
        actions = '<div class="flex gap-2">' +
          '<button class="btn btn-sm btn-outline" data-toggle-role="' + escapeHtml(u.id) + '" data-role="' + newRole + '">Make ' + newRole + '</button>' +
          '<button class="btn btn-sm btn-danger" data-delete-user="' + escapeHtml(u.id) + '" data-name="' + escapeHtml(u.name) + '" title="Delete user">' + VR.icons.trash + '</button>' +
          '</div>';
      }

      return '<tr>' +
        '<td style="font-weight:600;">' + escapeHtml(u.name) + (isSelf ? ' <span class="badge badge-primary" style="margin-left:0.25rem;">YOU</span>' : '') + '</td>' +
        '<td>' + escapeHtml(u.email) + '</td>' +
        '<td>' + roleBadge(role) + '</td>' +
        '<td class="text-muted">' + fmtDate(u.createdAt) + '</td>' +
        '<td>' + nz(u.reviewCount, 0) + '</td>' +
        '<td>' + nz(u.favoriteCount, 0) + '</td>' +
        '<td>' + actions + '</td>' +
        '</tr>';
    }).join("");

    wrap.innerHTML = '<div class="table-wrap"><table>' +
      '<thead><tr>' +
      '<th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Reviews</th><th>Favorites</th><th>Actions</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table></div>';

    wrap.querySelectorAll("[data-toggle-role]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.toggleRole;
        var role = btn.dataset.role;
        fetch("/api/admin/users", {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:id, role:role})}).then(function(r){return r.json();}).then(function () {
          VR.toast("User role updated to " + role, "success");
          fetchUsersTable(wrap);
        }).catch(function (err) { VR.toast(err.message || "Failed to update role", "error"); });
      });
    });
    wrap.querySelectorAll("[data-delete-user]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.deleteUser;
        var name = btn.dataset.name;
        if (!confirm('Delete user "' + name + '"? Their reviews and favorites will also be removed.')) return;
        fetch("/api/admin/users", {method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:id})}).then(function(r){return r.json();}).then(function () {
          VR.toast("User deleted", "success");
          fetchUsersTable(wrap);
        }).catch(function (err) { VR.toast(err.message || "Failed to delete user", "error"); });
      });
    });
  }

  /* ============================================================
     4. Reviews tab
     ============================================================ */
  function renderReviews(container) {
    container.innerHTML =
      '<div class="mb-4"><h3 class="text-lg font-semibold">All Reviews</h3>' +
      '<p class="text-sm text-muted">Moderate user-submitted reviews.</p></div>' +
      '<div id="reviews-list-wrap">' + loadingHTML() + '</div>';

    var wrap = container.querySelector("#reviews-list-wrap");
    fetchReviews(wrap);
  }

  function fetchReviews(wrap) {
    wrap.innerHTML = loadingHTML();
    Promise.all([
      fetch("/api/reviews").then(function(r){return r.json();}),
      VR.api("/api/stations")
    ]).then(function (results) {
      var data = results[0];
      var stationsData = results[1];
      var stationMap = {};
      (stationsData.stations || []).forEach(function (s) { stationMap[s.id] = s.name; });
      var reviews = data.reviews || [];
      if (reviews.length === 0) {
        wrap.innerHTML = emptyStateHTML(VR.icons.star, "No reviews yet", "User reviews will appear here for moderation.");
        return;
      }
      renderReviewsList(wrap, reviews, stationMap);
    }).catch(function (err) {
      wrap.innerHTML = errorStateHTML(err.message, true);
      attachRetry(wrap, function () { fetchReviews(wrap); });
    });
  }

  function renderReviewsList(wrap, reviews, stationMap) {
    var cards = reviews.map(function (r) {
      var userName = (r.user && r.user.name) || "Anonymous";
      var userEmail = (r.user && r.user.email) || "";
      var stationName = stationMap[r.stationId] || ("Station #" + r.stationId);
      var init = initialsOf(userName);

      return '<div class="card mb-4" style="padding:1rem;">' +
        '<div style="display:flex;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;">' +
        '<div style="display:flex;gap:0.625rem;align-items:center;flex:1;min-width:0;">' +
        '<div class="user-avatar" style="width:2.5rem;height:2.5rem;font-size:0.75rem;flex-shrink:0;">' + escapeHtml(init) + '</div>' +
        '<div style="min-width:0;">' +
        '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">' +
        '<p class="text-sm font-semibold">' + escapeHtml(userName) + '</p>' +
        (userEmail ? '<span class="text-xs text-muted">' + escapeHtml(userEmail) + '</span>' : '') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.25rem;flex-wrap:wrap;">' +
        '<div>' + starsHTML(r.rating) + '</div>' +
        '<span class="text-xs text-muted">on</span>' +
        '<span class="badge badge-primary" style="font-size:0.625rem;">' + escapeHtml(stationName) + '</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem;">' +
        '<span class="text-xs text-muted" style="white-space:nowrap;">' + fmtDateTime(r.createdAt) + '</span>' +
        '<button class="btn btn-sm btn-danger" data-delete-review="' + escapeHtml(r.id) + '" data-station="' + escapeHtml(stationName) + '">' + VR.icons.trash + ' Delete</button>' +
        '</div>' +
        '</div>' +
        (r.comment ? '<p class="text-sm mt-3" style="line-height:1.5;white-space:pre-wrap;">' + escapeHtml(r.comment) + '</p>' : '') +
        '</div>';
    }).join("");

    wrap.innerHTML = '<div>' + cards + '</div>';

    wrap.querySelectorAll("[data-delete-review]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.deleteReview;
        var stationName = btn.dataset.station;
        if (!confirm('Delete this review on "' + stationName + '"?')) return;
        fetch("/api/reviews?id=" + encodeURIComponent(id), {method:"DELETE"}).then(function(r){return r.json();}).then(function () {
          VR.toast("Review deleted", "success");
          fetchReviews(wrap);
        }).catch(function (err) { VR.toast(err.message || "Failed to delete review", "error"); });
      });
    });
  }
})();
