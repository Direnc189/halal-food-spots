const SUPABASE_URL = "https://bjoxewglffzjdpuayiff.supabase.co";
const SUPABASE_KEY = "sb_publishable_8qRvMeEpTjBzPsCDGFYqcg_E9hhIqjB";
let currentTable = "Halalfood";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const map = L.map("map").setView([50.1109, 8.6821], 9);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap-Mitwirkende"
}).addTo(map);

const searchInput = document.getElementById("search");
const searchSuggestions = document.getElementById("search-suggestions");
const restaurantList = document.getElementById("restaurant-list");
const statusBox = document.getElementById("status");
const resultCount = document.getElementById("result-count");
const menuEntries = document.querySelectorAll(".menu-entry");
const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");
const resultsTitle = document.getElementById("results-title");

let restaurants = [];
let markerLayer = L.layerGroup().addTo(map);
let markerById = new Map();

function clean(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createAddress(item) {
  return [
    clean(item.adresse),
    [clean(item.postleitzahl), clean(item.stadt)].filter(Boolean).join(" ")
  ].filter(Boolean).join(", ");
}

function hasCoordinates(item) {
  return Number.isFinite(Number(item.latitude)) &&
         Number.isFinite(Number(item.longitude));
}

function popupContent(item) {
  const address = createAddress(item);

  return `
    <strong class="popup-title">${escapeHtml(item.name || "Restaurant")}</strong><br>
    ${escapeHtml(item.kategorie || "")}
    ${item.land_der_kueche ? " · " + escapeHtml(item.land_der_kueche) : ""}
    ${address ? "<br>" + escapeHtml(address) : ""}
    ${item.oeffnungszeiten ? "<br><br><strong>Öffnungszeiten:</strong><br>" + escapeHtml(item.oeffnungszeiten) : ""}
    ${item.telefonnummer ? "<br><br><strong>Telefon:</strong> " + escapeHtml(item.telefonnummer) : ""}
    ${item.hinweise ? `<p class="hinweis">ℹ️ ${escapeHtml(item.hinweise)}</p>` : ""}
    ${createMapLinks(item)}
  `;
}

function render(items) {
  restaurantList.innerHTML = "";
  markerLayer.clearLayers();
  markerById.clear();
  resultCount.textContent = `${items.length} ${items.length === 1 ? "Eintrag" : "Einträge"}`;

  if (items.length === 0) {
    restaurantList.innerHTML = '<div class="empty">Keine passenden Restaurants gefunden.</div>';
    return;
  }

  const coordinates = [];

  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "restaurant-card";

    const address = createAddress(item);
    const badges = [item.kategorie, item.land_der_kueche]
      .filter(Boolean)
      .map(value => `<span class="badge">${escapeHtml(value)}</span>`)
      .join("");

    card.innerHTML = `
      <h3>${escapeHtml(item.name || "Unbenanntes Restaurant")}</h3>
      <div>${badges}</div>
      ${address ? `<p>📍 ${escapeHtml(address)}</p>` : ""}
      ${item.oeffnungszeiten ? `<p>🕒 ${escapeHtml(item.oeffnungszeiten)}</p>` : ""}
      ${item.telefonnummer ? `<p>☎️ ${escapeHtml(item.telefonnummer)}</p>` : ""}
      ${item.webseite ? `<p><a href="${escapeHtml(item.webseite)}" target="_blank" rel="noopener">Webseite öffnen</a></p>` : ""}
      ${item.hinweise ? `<p class="hinweis">ℹ️ ${escapeHtml(item.hinweise)}</p>` : ""}
      ${createMapLinks(item)}
    `;

    restaurantList.appendChild(card);

    if (hasCoordinates(item)) {
      const lat = Number(item.latitude);
      const lng = Number(item.longitude);
      const marker = L.marker([lat, lng])
        .bindPopup(popupContent(item))
        .addTo(markerLayer);

      const key = clean(item.id) || String(index);
      markerById.set(key, marker);
      coordinates.push([lat, lng]);

      card.addEventListener("click", () => {
        map.setView([lat, lng], 16);
        marker.openPopup();
      });
    }
  });

  if (coordinates.length === 1) {
    map.setView(coordinates[0], 14);
  } else if (coordinates.length > 1) {
    map.fitBounds(coordinates, { padding: [35, 35] });
  }
}

async function loadRestaurants() {
  statusBox.style.display = "block";
  statusBox.textContent = "Daten werden geladen …";

  const { data, error } = await client
    .from(currentTable)
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    statusBox.innerHTML = `
      Die Daten konnten nicht geladen werden.<br>
      <small>${escapeHtml(error.message)}</small>
    `;
    return;
  }

  restaurants = data || [];
  statusBox.style.display = "none";
  render(restaurants);
}

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase().trim();

  searchSuggestions.innerHTML = "";

  if (query === "") {
    searchSuggestions.style.display = "none";
    return;
  }

  const filtered = restaurants.filter((item) => {
    return String(item.name || "")
      .toLowerCase()
      .includes(query);
  });

  if (filtered.length === 0) {
    searchSuggestions.innerHTML =
      '<div class="suggestion-empty">Kein Restaurant gefunden</div>';
    searchSuggestions.style.display = "block";
    return;
  }

  filtered.forEach((item) => {
    const suggestion = document.createElement("div");
    suggestion.className = "search-suggestion";
    suggestion.textContent = item.name || "Unbenanntes Restaurant";

    suggestion.addEventListener("click", () => {
      searchInput.value = item.name || "";
      searchSuggestions.style.display = "none";

      render([item]);
    });

    searchSuggestions.appendChild(suggestion);
  });

  searchSuggestions.style.display = "block";
});
function createMapLinks(item) {
  if (!hasCoordinates(item)) {
    return "";
  }

  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  const name = encodeURIComponent(clean(item.name || "Restaurant"));

  const googleMapsUrl =
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const appleMapsUrl =
    `https://maps.apple.com/?daddr=${lat},${lng}&q=${name}`;

  return `
    <div class="map-links">
      <a
        class="map-button"
        href="${googleMapsUrl}"
        target="_blank"
        rel="noopener"
      >
        Google Maps
      </a>

      <a
        class="map-button"
        href="${appleMapsUrl}"
        target="_blank"
        rel="noopener"
      >
        Apple Karten
      </a>
    </div>
  `;
}
function openMenu() {
  sideMenu.classList.add("open");
  menuOverlay.classList.add("visible");
}

function closeMenu() {
  sideMenu.classList.remove("open");
  menuOverlay.classList.remove("visible");
}

menuButton.addEventListener("click", openMenu);
menuClose.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", closeMenu);

menuEntries.forEach((entry) => {
  entry.addEventListener("click", () => {
    currentTable = entry.dataset.table;

    menuEntries.forEach((button) => {
      button.classList.remove("active");
    });

    entry.classList.add("active");

    pageTitle.textContent = entry.dataset.title;

    if (currentTable === "Halalfood") {
      pageSubtitle.textContent =
        "Restaurants über Suche und Karte entdecken";
    } else {
      pageSubtitle.textContent =
        "Metzgereien über Suche und Karte entdecken";
    }

    searchInput.value = "";
    searchSuggestions.innerHTML = "";
    searchSuggestions.style.display = "none";

    closeMenu();
    loadRestaurants();
  });
});
loadRestaurants();
