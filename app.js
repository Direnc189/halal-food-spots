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

let entries = [];
let markerLayer = L.layerGroup().addTo(map);

function clean(value) {
  return value === null || value === undefined
    ? ""
    : String(value).trim();
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
    [clean(item.postleitzahl), clean(item.stadt)]
      .filter(Boolean)
      .join(" ")
  ]
    .filter(Boolean)
    .join(", ");
}

function hasCoordinates(item) {
  return (
    Number.isFinite(Number(item.latitude)) &&
    Number.isFinite(Number(item.longitude))
  );
}

function formatOpeningHours(value) {
  const text = clean(value);

  if (!text) {
    return "";
  }

  const days = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag"
  ];

  let normalized = text
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .replace(/\s+/g, " ")
    .trim();

  days.forEach((day) => {
    normalized = normalized.replace(
      new RegExp(`\\s*${day}\\s*`, "gi"),
      `|${day}#`
    );
  });

  const rows = normalized
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("#");

      if (separatorIndex === -1) {
        return "";
      }

      const day = part.slice(0, separatorIndex).trim();
      const hours = part.slice(separatorIndex + 1).trim();

      const formattedHours = hours
        .replace(/\s*;\s*/g, "<br>")
        .replace(/\s*\/\s*/g, "<br>")
        .replace(/\s*,\s*(?=\d{1,2}:\d{2})/g, "<br>");

      return `
        <div class="opening-row">
          <strong>${escapeHtml(day)}</strong>
          <span>${formattedHours}</span>
        </div>
      `;
    })
    .join("");

  return `
    <details class="opening-details">
      <summary>🕒 Öffnungszeiten anzeigen</summary>

      <div class="opening-list">
        ${rows}
      </div>
    </details>
  `;
}

function createMapLinks(item) {
  if (!hasCoordinates(item)) {
    return "";
  }

  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  const name = encodeURIComponent(clean(item.name || "Eintrag"));

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

function popupContent(item) {
  const address = createAddress(item);

  return `
    <strong>${escapeHtml(item.name || "Eintrag")}</strong>

    ${address ? `<br>${escapeHtml(address)}` : ""}

    ${formatOpeningHours(item.oeffnungszeiten)}

    ${
      item.telefonnummer
        ? `<p><strong>Telefon:</strong><br>${escapeHtml(item.telefonnummer)}</p>`
        : ""
    }

    ${
      item.hinweise
        ? `<div class="hinweis">ℹ️ ${escapeHtml(item.hinweise)}</div>`
        : ""
    }

    ${createMapLinks(item)}
  `;
}

function render(items) {
  restaurantList.innerHTML = "";
  markerLayer.clearLayers();

  resultCount.textContent =
    `${items.length} ${items.length === 1 ? "Eintrag" : "Einträge"}`;

  if (items.length === 0) {
    restaurantList.innerHTML =
      '<div class="empty">Keine passenden Einträge gefunden.</div>';
    return;
  }

  const coordinates = [];

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "restaurant-card";

    const address = createAddress(item);

    const badges = [item.kategorie, item.land_der_kueche]
      .filter(Boolean)
      .map(
        (value) =>
          `<span class="badge">${escapeHtml(value)}</span>`
      )
      .join("");

    card.innerHTML = `
      <h3>${escapeHtml(item.name || "Unbenannter Eintrag")}</h3>

      ${badges ? `<div>${badges}</div>` : ""}

      ${address ? `<p>📍 ${escapeHtml(address)}</p>` : ""}

      ${formatOpeningHours(item.oeffnungszeiten)}

      ${
        item.telefonnummer
          ? `<p>☎️ ${escapeHtml(item.telefonnummer)}</p>`
          : ""
      }

      ${
        item.webseite
          ? `
            <p>
              <a
                href="${escapeHtml(item.webseite)}"
                target="_blank"
                rel="noopener"
              >
                Webseite öffnen
              </a>
            </p>
          `
          : ""
      }

      ${
        item.hinweise
          ? `<p class="hinweis">ℹ️ ${escapeHtml(item.hinweise)}</p>`
          : ""
      }

      ${createMapLinks(item)}
    `;

    card.querySelectorAll("a, summary").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    });

    restaurantList.appendChild(card);

    if (hasCoordinates(item)) {
      const lat = Number(item.latitude);
      const lng = Number(item.longitude);

      const marker = L.marker([lat, lng])
        .bindPopup(popupContent(item))
        .addTo(markerLayer);

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
    map.fitBounds(coordinates, {
      padding: [35, 35]
    });
  }
}

async function loadEntries() {
  entries = [];
  restaurantList.innerHTML = "";
  markerLayer.clearLayers();
  resultCount.textContent = "0 Einträge";

  statusBox.style.display = "block";
  statusBox.textContent = "Daten werden geladen …";

  const { data, error } = await client
    .from(currentTable)
    .select("*")
    .order("name", {
      ascending: true
    });

  if (error) {
    console.error(error);

    statusBox.innerHTML = `
      Die Daten konnten nicht geladen werden.<br>
      <small>${escapeHtml(error.message)}</small>
    `;

    return;
  }

  entries = data || [];
  statusBox.style.display = "none";

  render(entries);
}

searchInput.addEventListener("input", () => {
  const query = searchInput.value
    .toLowerCase()
    .trim();

  searchSuggestions.innerHTML = "";

  if (!query) {
    searchSuggestions.style.display = "none";
    render(entries);
    return;
  }

  const filtered = entries.filter((item) =>
    String(item.name || "")
      .toLowerCase()
      .includes(query)
  );

  if (filtered.length === 0) {
    searchSuggestions.innerHTML =
      '<div class="suggestion-empty">Kein Eintrag gefunden</div>';

    searchSuggestions.style.display = "block";
    return;
  }

  filtered.forEach((item) => {
    const suggestion = document.createElement("div");

    suggestion.className = "search-suggestion";
    suggestion.textContent =
      item.name || "Unbenannter Eintrag";

    suggestion.addEventListener("click", () => {
      searchInput.value = item.name || "";
      searchSuggestions.style.display = "none";

      render([item]);
    });

    searchSuggestions.appendChild(suggestion);
  });

  searchSuggestions.style.display = "block";
});

document.addEventListener("click", (event) => {
  if (
    !searchInput.contains(event.target) &&
    !searchSuggestions.contains(event.target)
  ) {
    searchSuggestions.style.display = "none";
  }
});

menuEntries.forEach((entry) => {
  entry.addEventListener("click", () => {
    currentTable = entry.dataset.table;

    menuEntries.forEach((button) => {
      button.classList.remove("active");
    });

    entry.classList.add("active");

    pageTitle.textContent = entry.dataset.title;
    pageSubtitle.textContent = entry.dataset.subtitle;
    resultsTitle.textContent = entry.dataset.resultsTitle;

    searchInput.value = "";
    searchSuggestions.innerHTML = "";
    searchSuggestions.style.display = "none";

    loadEntries();
  });
});

loadEntries();
